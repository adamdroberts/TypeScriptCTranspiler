#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include "tsc_internal.h"
#include <pthread.h>
#include <time.h>

struct tsc_atomic_waiter {
    void* block;
    uint8_t* bytes;
    size_t offset,width;
    uint64_t expected;
    double timeout,started,timer;
    tsc_atomic_wait_status_t status;
    tsc_promise_t* promise;
    tsc_realm_t* realm;
    const void* agent;
    struct tsc_atomic_waiter *next,*ready_next;
};
static pthread_mutex_t waiter_mutex=PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t waiter_condition;
static pthread_once_t waiter_once=PTHREAD_ONCE_INIT;
static tsc_atomic_waiter_t *waiting_head,*waiting_tail,*ready_head,*ready_tail;
static _Thread_local unsigned char agent_identity;
static _Thread_local bool can_block=true;
bool tsc_atomics_can_block(void){return can_block;}
void tsc_atomics_set_can_block(bool value){can_block=value;}
static void initialize_condition(void){
    pthread_condattr_t attribute;pthread_condattr_init(&attribute);pthread_condattr_setclock(&attribute,CLOCK_MONOTONIC);
    pthread_cond_init(&waiter_condition,&attribute);pthread_condattr_destroy(&attribute);
}
static double monotonic_ms(void){struct timespec now;clock_gettime(CLOCK_MONOTONIC,&now);return (double)now.tv_sec*1000+(double)now.tv_nsec/1000000;}
static struct timespec deadline(double delay){
    /* Physical sleeps use bounded slices; the record's mathematical timeout
     * remains unchanged, including fractional and arbitrarily large values. */
    struct timespec result;clock_gettime(CLOCK_MONOTONIC,&result);delay=fmin(fmax(delay,0),5000);
    result.tv_sec+=(time_t)(delay/1000);result.tv_nsec+=(long)(fmod(delay,1000)*1000000);
    if(result.tv_nsec>=1000000000){++result.tv_sec;result.tv_nsec-=1000000000;}return result;
}
static void release_payload(tsc_atomic_waiter_t* waiter){waiter->block=NULL;waiter->bytes=NULL;waiter->promise=NULL;waiter->realm=NULL;waiter->agent=NULL;}
/* One terminal transition unlinks the canonical pending record and routes
 * its completion according to the sync/async capability on that record. */
static void complete_locked(tsc_atomic_waiter_t* waiter,tsc_atomic_wait_status_t result){
    if(waiter->status!=TSC_WAIT_PENDING)return;
    tsc_atomic_waiter_t* previous=NULL;
    for(tsc_atomic_waiter_t* cursor=waiting_head;cursor;cursor=cursor->next){
        if(cursor==waiter){if(previous)previous->next=cursor->next;else waiting_head=cursor->next;if(waiting_tail==cursor)waiting_tail=previous;break;}
        previous=cursor;
    }
    waiter->next=NULL;waiter->status=result;waiter->block=NULL;waiter->bytes=NULL;
    if(waiter->promise){
        if(ready_tail)ready_tail->ready_next=waiter;else ready_head=waiter;ready_tail=waiter;
    }
    pthread_cond_broadcast(&waiter_condition);
}
tsc_atomic_waiter_t* tsc_atomic_waiter_new(void* block,uint8_t* bytes,size_t offset,size_t width,uint64_t expected,double timeout,tsc_promise_t* promise){
    pthread_once(&waiter_once,initialize_condition);
    tsc_atomic_waiter_t* waiter=TSC_GC_MALLOC(sizeof(*waiter));memset(waiter,0,sizeof(*waiter));
    waiter->block=block;waiter->bytes=bytes;waiter->offset=offset;waiter->width=width;waiter->expected=width==8?expected:expected&((UINT64_C(1)<<(width*8))-1);
    waiter->timeout=timeout;waiter->promise=promise;waiter->realm=promise?tsc_realm_current():NULL;waiter->agent=promise?&agent_identity:NULL;
    return waiter;
}
tsc_atomic_wait_status_t tsc_atomic_waiter_begin(tsc_atomic_waiter_t* waiter){
    pthread_mutex_lock(&waiter_mutex);
    uint64_t read=tsc_atomic_word_update(waiter->bytes+waiter->offset,waiter->width,TSC_ATOMIC_LOAD,0,0);
    if(read!=waiter->expected){waiter->status=TSC_WAIT_NOT_EQUAL;release_payload(waiter);}
    else if(waiter->promise&&waiter->timeout==0){waiter->status=TSC_WAIT_TIMED_OUT;release_payload(waiter);}
    else{waiter->started=monotonic_ms();if(waiting_tail)waiting_tail->next=waiter;else waiting_head=waiter;waiting_tail=waiter;}
    tsc_atomic_wait_status_t result=waiter->status;pthread_mutex_unlock(&waiter_mutex);return result;
}
tsc_atomic_wait_status_t tsc_atomic_waiter_suspend(tsc_atomic_waiter_t* waiter){
    size_t depth=tsc_runtime_suspend();pthread_mutex_lock(&waiter_mutex);
    while(waiter->status==TSC_WAIT_PENDING){
        double remaining=waiter->timeout-(monotonic_ms()-waiter->started);
        if(remaining<=0){complete_locked(waiter,TSC_WAIT_TIMED_OUT);break;}
        if(isinf(remaining))pthread_cond_wait(&waiter_condition,&waiter_mutex);
        else{struct timespec limit=deadline(remaining);pthread_cond_timedwait(&waiter_condition,&waiter_mutex,&limit);}
    }
    tsc_atomic_wait_status_t result=waiter->status;release_payload(waiter);pthread_mutex_unlock(&waiter_mutex);tsc_runtime_resume(depth);return result;
}
static void resolve_waiter(void* environment){
    tsc_atomic_waiter_t* waiter=environment;tsc_realm_t* previous=tsc_realm_swap(waiter->realm);
    tsc_promise_t* volatile promise=waiter->promise;
    tsc_value_t result=tsc_value_string(tsc_str_from_cstr(waiter->status==TSC_WAIT_OK?"ok":"timed-out"));
    release_payload(waiter);tsc_promise_resolve_into(promise,result);tsc_realm_swap(previous);
}
void tsc_atomics_schedule_completions(void){
    tsc_atomic_waiter_t* volatile local_head=NULL;tsc_atomic_waiter_t *local_tail=NULL,*previous=NULL;
    pthread_mutex_lock(&waiter_mutex);tsc_atomic_waiter_t* waiter=ready_head;
    while(waiter){
        tsc_atomic_waiter_t* next=waiter->ready_next;
        if(waiter->agent==&agent_identity){
            if(previous)previous->ready_next=next;else ready_head=next;if(ready_tail==waiter)ready_tail=previous;
            waiter->ready_next=NULL;if(local_tail)local_tail->ready_next=waiter;else local_head=waiter;local_tail=waiter;
        }else previous=waiter;
        waiter=next;
    }
    pthread_mutex_unlock(&waiter_mutex);
    while(local_head){tsc_atomic_waiter_t* volatile current=local_head;local_head=current->ready_next;current->ready_next=NULL;
        if(current->timer){tsc_clear_timeout(current->timer);current->timer=0;}
        tsc_queue_microtask(resolve_waiter,current);
    }
}
static bool has_completions_locked(void){for(tsc_atomic_waiter_t* waiter=ready_head;waiter;waiter=waiter->ready_next)if(waiter->agent==&agent_identity)return true;return false;}
bool tsc_atomics_has_completions(void){pthread_mutex_lock(&waiter_mutex);bool ready=has_completions_locked();pthread_mutex_unlock(&waiter_mutex);return ready;}
void tsc_atomics_idle_wait(double delay){
    pthread_once(&waiter_once,initialize_condition);pthread_mutex_lock(&waiter_mutex);
    if(!has_completions_locked()&&delay>0){struct timespec limit=deadline(delay);pthread_cond_timedwait(&waiter_condition,&waiter_mutex,&limit);}
    pthread_mutex_unlock(&waiter_mutex);
}
static void timeout_waiter(void* environment){
    tsc_atomic_waiter_t* waiter=environment;pthread_mutex_lock(&waiter_mutex);complete_locked(waiter,TSC_WAIT_TIMED_OUT);pthread_mutex_unlock(&waiter_mutex);
    tsc_atomics_schedule_completions();
}
void tsc_atomic_waiter_schedule(tsc_atomic_waiter_t* waiter){
    if(isfinite(waiter->timeout))waiter->timer=tsc_set_timeout_unbounded(timeout_waiter,waiter,fmax(waiter->timeout-(monotonic_ms()-waiter->started),0));
    tsc_atomics_schedule_completions();
}
size_t tsc_atomic_waiter_notify(void* block,size_t offset,double count){
    size_t notified=0;pthread_mutex_lock(&waiter_mutex);tsc_atomic_waiter_t* waiter=waiting_head;
    while(waiter&&(double)notified<count){tsc_atomic_waiter_t* next=waiter->next;if(waiter->block==block&&waiter->offset==offset){complete_locked(waiter,TSC_WAIT_OK);++notified;}waiter=next;}
    pthread_mutex_unlock(&waiter_mutex);if(notified)tsc_runtime_wake_event_loop();return notified;
}
size_t tsc_atomic_waiter_count(void* block,size_t offset){
    size_t count=0;pthread_mutex_lock(&waiter_mutex);for(tsc_atomic_waiter_t* waiter=waiting_head;waiter;waiter=waiter->next)if(waiter->block==block&&waiter->offset==offset)++count;pthread_mutex_unlock(&waiter_mutex);return count;
}
