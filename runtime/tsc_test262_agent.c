#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include "tsc_internal.h"
#include <pthread.h>
#include <time.h>

typedef struct agent_group agent_group_t;
typedef struct agent_worker agent_worker_t;
typedef struct agent_delivery {
    tsc_array_buffer_t* buffer;
    tsc_value_t value;
    void* value_root;
    size_t* outstanding;
    struct agent_delivery* next;
} agent_delivery_t;
typedef struct agent_report {tsc_str_t* text;struct agent_report* next;} agent_report_t;
struct agent_worker {
    tsc_agent_t* agent;
    agent_group_t* group;
    tsc_str_t* source;
    pthread_t thread;
    bool started,left,joined;
    agent_delivery_t *head,*tail;
    struct agent_worker* next;
};
struct agent_group {
    tsc_agent_t* owner;
    agent_worker_t *workers,*tail;
    agent_report_t *reports,*report_tail;
    tsc_str_t* failure;
    bool stopping;
    struct agent_group* next;
};
static pthread_mutex_t group_mutex=PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t group_condition=PTHREAD_COND_INITIALIZER;
static agent_group_t* groups;
static tsc_test262_eval_script_callback_t source_callback;
static const char agent_realm_key;
void tsc_test262_set_agent_callback(tsc_test262_eval_script_callback_t callback){source_callback=callback;}
static tsc_value_t actual(tsc_array_t* args,size_t index){return args&&index<args->len?TSC_ARR(tsc_value_t,args,index):tsc_value_undefined();}
static void acknowledge(agent_delivery_t* delivery){if(delivery->outstanding&&*delivery->outstanding)--*delivery->outstanding;delivery->outstanding=NULL;}
static void leave_locked(agent_worker_t* worker){
    worker->left=true;
    for(agent_delivery_t* delivery=worker->head;delivery;delivery=delivery->next)acknowledge(delivery);
    worker->head=worker->tail=NULL;pthread_cond_broadcast(&group_condition);
}
static void check_failure(agent_group_t* group){if(group->failure)tsc_throw_error(TSC_ERROR_ERROR,group->failure);}
#ifdef TSC_THREADS
static void* worker_main(void* environment){
    agent_worker_t* worker=environment;tsc_agent_swap(worker->agent);tsc_runtime_lock();
    tsc_parse_unit_swap(tsc_parse_unit_new());tsc_atomics_set_can_block(true);tsc_agent_hold(worker->agent,true);
    tsc_try_frame_t frame={0};tsc_try_push(&frame);
    if(!setjmp(frame.jb)){
        tsc_test262_install_current_realm_globals();
        pthread_mutex_lock(&group_mutex);worker->started=true;pthread_cond_broadcast(&group_condition);pthread_mutex_unlock(&group_mutex);
        (void)source_callback(worker->source);tsc_run_event_loop();
    }else{
        tsc_str_t* volatile failure=tsc_str_from_cstr("Test262 agent script threw");
        pthread_mutex_lock(&group_mutex);worker->group->failure=failure;worker->started=true;pthread_cond_broadcast(&group_condition);pthread_mutex_unlock(&group_mutex);
    }
    tsc_try_pop();tsc_agent_hold(worker->agent,false);
    pthread_mutex_lock(&group_mutex);leave_locked(worker);pthread_mutex_unlock(&group_mutex);
    tsc_runtime_unlock();tsc_agent_swap(NULL);return NULL;
}
#endif
static void start_worker(agent_group_t* group,tsc_value_t value){
    tsc_str_t* volatile source=tsc_value_to_string(value);
    if(!source_callback)tsc_throw_error(TSC_ERROR_TYPE,tsc_str_from_cstr("agent.start has no finite AOT source graph"));
#ifdef TSC_THREADS
    agent_worker_t* worker=TSC_GC_MALLOC(sizeof(*worker));memset(worker,0,sizeof(*worker));
    worker->source=source;worker->group=group;worker->agent=tsc_agent_new();
    pthread_mutex_lock(&group_mutex);if(group->tail)group->tail->next=worker;else group->workers=worker;group->tail=worker;pthread_mutex_unlock(&group_mutex);
    if(pthread_create(&worker->thread,NULL,worker_main,worker)){
        pthread_mutex_lock(&group_mutex);agent_worker_t** link=&group->workers;agent_worker_t* previous=NULL;
        while(*link&&*link!=worker){previous=*link;link=&(*link)->next;}
        if(*link)*link=worker->next;if(group->tail==worker)group->tail=previous;
        pthread_mutex_unlock(&group_mutex);tsc_agent_release(worker->agent);worker->agent=NULL;worker->source=NULL;
        tsc_throw_error(TSC_ERROR_ERROR,tsc_str_from_cstr("Test262 agent thread could not start"));
    }
    size_t depth=tsc_runtime_suspend();pthread_mutex_lock(&group_mutex);
    while(!worker->started)pthread_cond_wait(&group_condition,&group_mutex);
    pthread_mutex_unlock(&group_mutex);tsc_runtime_resume(depth);check_failure(group);
#else
    (void)group;tsc_throw_error(TSC_ERROR_TYPE,tsc_str_from_cstr("agent.start requires the threaded runtime"));
#endif
}
static void broadcast(agent_group_t* group,tsc_array_t* args){
    tsc_array_buffer_t* volatile buffer=tsc_value_as_array_buffer(actual(args,0));
    if(!buffer||!buffer->shared)tsc_throw_error(TSC_ERROR_TYPE,tsc_str_from_cstr("agent.broadcast requires shared storage"));
    tsc_value_t input=actual(args,1);tsc_value_t value=(value_is_box(input)&&value_tag(input)==TSC_VALUE_TAG_BIGINT)?input:tsc_value_num((double)tsc_to_int32(tsc_value_to_number(input)));
    void* volatile value_root=tsc_value_gc_root(value);size_t* volatile outstanding=TSC_GC_MALLOC(sizeof(*outstanding));*outstanding=0;
    for(agent_worker_t* worker=group->workers;worker;worker=worker->next){
        agent_delivery_t* delivery=TSC_GC_MALLOC(sizeof(*delivery));memset(delivery,0,sizeof(*delivery));delivery->buffer=buffer;delivery->value=value;delivery->value_root=value_root;delivery->outstanding=outstanding;
        pthread_mutex_lock(&group_mutex);
        if(!worker->left){++*outstanding;if(worker->tail)worker->tail->next=delivery;else worker->head=delivery;worker->tail=delivery;}
        pthread_cond_broadcast(&group_condition);pthread_mutex_unlock(&group_mutex);
    }
    size_t depth=tsc_runtime_suspend();pthread_mutex_lock(&group_mutex);
    while(*outstanding&&!group->failure)pthread_cond_wait(&group_condition,&group_mutex);
    pthread_mutex_unlock(&group_mutex);tsc_runtime_resume(depth);check_failure(group);
}
typedef struct {agent_worker_t* worker;tsc_promise_t* promise;} agent_callback_monitor_t;
static void monitor_callback(void* environment){
    agent_callback_monitor_t* monitor=environment;
    if(tsc_promise_is_rejected(monitor->promise)){
        tsc_str_t* volatile failure=tsc_str_from_cstr("Test262 agent callback rejected");
        pthread_mutex_lock(&group_mutex);monitor->worker->group->failure=failure;pthread_cond_broadcast(&group_condition);pthread_mutex_unlock(&group_mutex);
        tsc_agent_hold(monitor->worker->agent,false);
    }
    monitor->promise=NULL;monitor->worker=NULL;
}
static tsc_value_t receive(agent_worker_t* worker,tsc_value_t callback){
    if(!tsc_value_is_callable(callback))tsc_throw_error(TSC_ERROR_TYPE,tsc_str_from_cstr("agent.receiveBroadcast requires a callable"));
    size_t depth=tsc_runtime_suspend();pthread_mutex_lock(&group_mutex);
    while(!worker->head&&!worker->group->stopping)pthread_cond_wait(&group_condition,&group_mutex);
    agent_delivery_t* volatile delivery=worker->head;
    if(delivery){worker->head=delivery->next;if(!worker->head)worker->tail=NULL;delivery->next=NULL;acknowledge(delivery);pthread_cond_broadcast(&group_condition);}
    pthread_mutex_unlock(&group_mutex);tsc_runtime_resume(depth);
    if(!delivery)return tsc_value_undefined();
    tsc_array_t* volatile args=tsc_array_new(sizeof(tsc_value_t),2);
    tsc_array_push_value(args,tsc_value_array_buffer(tsc_shared_array_buffer_clone(delivery->buffer)));tsc_array_push_value(args,delivery->value);
    delivery->buffer=NULL;delivery->value_root=NULL;delivery->value=tsc_value_undefined();
    tsc_value_t result=tsc_value_apply_function(callback,tsc_value_undefined(),tsc_value_array(args));
    if(tsc_value_is_promise(result)){
        tsc_promise_t* volatile promise=tsc_value_as_promise(result);
        agent_callback_monitor_t* monitor=TSC_GC_MALLOC(sizeof(*monitor));monitor->worker=worker;monitor->promise=promise;
        tsc_promise_add_callback(monitor->promise,monitor_callback,monitor);
    }
    return result;
}
static double monotonic_now(void){struct timespec now;clock_gettime(CLOCK_MONOTONIC,&now);return (double)now.tv_sec*1000+(double)now.tv_nsec/1000000;}
static void sleep_agent(agent_group_t* group,tsc_value_t value){
    double delay=tsc_value_to_number(value);if(isnan(delay)||delay<=0)return;
    double started=monotonic_now();size_t depth=tsc_runtime_suspend();
    pthread_mutex_lock(&group_mutex);
    while(!group->stopping&&delay-(monotonic_now()-started)>0){
        double remaining=fmin(delay-(monotonic_now()-started),5000);struct timespec limit;clock_gettime(CLOCK_REALTIME,&limit);
        limit.tv_sec+=(time_t)(remaining/1000);limit.tv_nsec+=(long)(fmod(remaining,1000)*1000000);
        if(limit.tv_nsec>=1000000000){++limit.tv_sec;limit.tv_nsec-=1000000000;}
        pthread_cond_timedwait(&group_condition,&group_mutex,&limit);
    }
    pthread_mutex_unlock(&group_mutex);
    tsc_runtime_resume(depth);
}
typedef enum {
#define TSC_AGENT_MEMBER(name,op,arity,role) AGENT_##op,
#include "tsc_test262_agent.def"
#undef TSC_AGENT_MEMBER
} agent_operation_t;
typedef struct {const char* name;agent_operation_t operation;unsigned arity,role;} agent_member_t;
static const agent_member_t members[]={
#define TSC_AGENT_MEMBER(name,op,arity,role) {#name,AGENT_##op,arity,role},
#include "tsc_test262_agent.def"
#undef TSC_AGENT_MEMBER
};
typedef struct {const agent_member_t* member;agent_group_t* group;agent_worker_t* worker;} agent_binding_t;
static tsc_value_t member_apply(void* environment,tsc_value_t receiver,tsc_array_t* args){
    (void)receiver;agent_binding_t* binding=environment;agent_group_t* group=binding->group;agent_worker_t* worker=binding->worker;
    switch(binding->member->operation){
        case AGENT_START:start_worker(group,actual(args,0));break;
        case AGENT_BROADCAST:broadcast(group,args);break;
        case AGENT_RECEIVE:return receive(worker,actual(args,0));
        case AGENT_REPORT:{tsc_str_t* volatile text=tsc_value_to_string(actual(args,0));agent_report_t* report=TSC_GC_MALLOC(sizeof(*report));report->text=text;report->next=NULL;
            pthread_mutex_lock(&group_mutex);if(group->report_tail)group->report_tail->next=report;else group->reports=report;group->report_tail=report;pthread_mutex_unlock(&group_mutex);break;}
        case AGENT_GET_REPORT:{check_failure(group);pthread_mutex_lock(&group_mutex);agent_report_t* report=group->reports;
            if(report){group->reports=report->next;if(!group->reports)group->report_tail=NULL;report->next=NULL;}
            pthread_mutex_unlock(&group_mutex);return report?tsc_value_string(report->text):tsc_value_null();}
        case AGENT_LEAVING:pthread_mutex_lock(&group_mutex);leave_locked(worker);pthread_mutex_unlock(&group_mutex);tsc_agent_hold(worker->agent,false);break;
        case AGENT_SLEEP:sleep_agent(group,actual(args,0));break;
        case AGENT_NOW:return tsc_value_num(monotonic_now());
    }
    return tsc_value_undefined();
}
tsc_value_t tsc_test262_agent_object(void){
    tsc_object_t* object=tsc_realm_state_get(&agent_realm_key);if(object)return tsc_value_object(object);
    tsc_agent_t* agent=tsc_agent_current();agent_group_t* group=NULL;agent_worker_t* worker=NULL;
    for(agent_group_t* cursor=groups;cursor&&!group;cursor=cursor->next){
        if(cursor->owner==agent)group=cursor;
        for(agent_worker_t* item=cursor->workers;item;item=item->next)if(item->agent==agent){group=cursor;worker=item;break;}
    }
    if(!group){group=TSC_GC_MALLOC(sizeof(*group));memset(group,0,sizeof(*group));group->owner=agent;group->next=groups;groups=group;}
    object=tsc_object_new();tsc_realm_state_set(&agent_realm_key,object);
    for(size_t i=0;i<sizeof(members)/sizeof(*members);++i)if(members[i].role&(worker?2:1)){
        agent_binding_t* binding=TSC_GC_MALLOC(sizeof(*binding));*binding=(agent_binding_t){&members[i],group,worker};
        tsc_object_define_desc(object,tsc_str_from_cstr(members[i].name),tsc_value_function_builtin_named(member_apply,binding,members[i].arity,tsc_str_from_cstr(members[i].name)),true,true,true,true,true,true,true);
    }
    return tsc_value_object(object);
}
static void cleanup_agents(bool report_failure){
    agent_group_t* group=NULL;for(agent_group_t* cursor=groups;cursor;cursor=cursor->next)if(cursor->owner==tsc_agent_current()){group=cursor;break;}if(!group)return;
    pthread_mutex_lock(&group_mutex);group->stopping=true;pthread_cond_broadcast(&group_condition);pthread_mutex_unlock(&group_mutex);
    for(agent_worker_t* worker=group->workers;worker;worker=worker->next)if(!worker->joined){tsc_agent_hold(worker->agent,false);tsc_atomics_abandon_agent(worker->agent);}
    size_t depth=tsc_runtime_suspend();
    for(agent_worker_t* worker=group->workers;worker;worker=worker->next)if(!worker->joined){pthread_join(worker->thread,NULL);worker->joined=true;}
    tsc_runtime_resume(depth);
    for(agent_worker_t* worker=group->workers;worker;worker=worker->next){tsc_agent_release(worker->agent);worker->agent=NULL;worker->source=NULL;}
    group->workers=group->tail=NULL;if(report_failure)check_failure(group);
}
void tsc_test262_agents_finish(void){cleanup_agents(true);}
void tsc_test262_agents_abort(void){cleanup_agents(false);}
