#include "tsc_internal.h"

/* Optional GCD-style dispatch backend. This file is compiled into a program
 * only when the emitter saw a dispatch API use. TSC_THREADS selects the real
 * libdispatch backend; TSC_DISPATCH_SERIAL selects the no-dependency fallback. */
#if defined(TSC_THREADS) || defined(TSC_DISPATCH_SERIAL)

#ifdef TSC_THREADS
#include <dispatch/dispatch.h>
#include <pthread.h>
#include <signal.h>
#endif

struct tsc_dispatch_queue {
#ifdef TSC_THREADS
    dispatch_queue_t queue;
#endif
    tsc_str_t* label;
    bool concurrent;
};

#ifdef TSC_DISPATCH_SERIAL

tsc_dispatch_queue_t* tsc_dispatch_queue_serial(tsc_str_t* label) {
    tsc_dispatch_queue_t* q = (tsc_dispatch_queue_t*)TSC_GC_MALLOC(sizeof(tsc_dispatch_queue_t));
    q->label = label ? label : tsc_str_from_lit("", 0);
    q->concurrent = false;
    return q;
}

tsc_dispatch_queue_t* tsc_dispatch_queue_concurrent(void) {
    tsc_dispatch_queue_t* q = (tsc_dispatch_queue_t*)TSC_GC_MALLOC(sizeof(tsc_dispatch_queue_t));
    q->label = tsc_str_from_lit("concurrent", 10);
    q->concurrent = true;
    return q;
}

typedef struct {
    tsc_dispatch_task_fn_t fn;
    void* env;
    tsc_promise_t* promise;
    double delay_ms;
} tsc_dispatch_serial_task_t;

static void tsc_dispatch_serial_trampoline(void* ctx) {
    tsc_dispatch_serial_task_t* task = (tsc_dispatch_serial_task_t*)ctx;
    tsc_value_t result = tsc_value_undefined();
    bool is_error = false;
    TSC_TRY_FRAME(eh);
    tsc_try_push(&eh);
    if (setjmp(eh.jb) == 0) {
        result = task->fn(task->env);
        tsc_try_pop();
    } else {
        is_error = true;
        result = tsc_value_string(tsc_current_error());
    }
    if (is_error) tsc_promise_reject_in_place(task->promise, result);
    else tsc_promise_fulfill_in_place(task->promise, result);
}

tsc_promise_t* tsc_dispatch_async(tsc_dispatch_queue_t* q, tsc_dispatch_task_fn_t fn, void* env) {
    if (!q || !fn) tsc_throw_str(tsc_str_from_cstr("dispatch.async: invalid queue or task"));
    tsc_dispatch_serial_task_t* task =
        (tsc_dispatch_serial_task_t*)TSC_GC_MALLOC(sizeof(tsc_dispatch_serial_task_t));
    task->fn = fn;
    task->env = env;
    task->promise = tsc_promise_pending();
    task->delay_ms = 0.0;
    tsc_set_immediate(tsc_dispatch_serial_trampoline, task);
    return task->promise;
}

tsc_promise_t* tsc_dispatch_after(
    tsc_dispatch_queue_t* q,
    tsc_dispatch_task_fn_t fn,
    void* env,
    double delay_ms
) {
    if (!q || !fn) tsc_throw_str(tsc_str_from_cstr("dispatch.after: invalid queue or task"));
    if (!(delay_ms > 0.0)) delay_ms = 0.0;
    tsc_dispatch_serial_task_t* task =
        (tsc_dispatch_serial_task_t*)TSC_GC_MALLOC(sizeof(tsc_dispatch_serial_task_t));
    task->fn = fn;
    task->env = env;
    task->promise = tsc_promise_pending();
    task->delay_ms = delay_ms;
    tsc_set_timeout(tsc_dispatch_serial_trampoline, task, delay_ms);
    return task->promise;
}

tsc_promise_t* tsc_dispatch_barrier(tsc_dispatch_queue_t* q, tsc_dispatch_task_fn_t fn, void* env) {
    if (!q || !fn) tsc_throw_str(tsc_str_from_cstr("dispatch.barrier: invalid queue or task"));
    if (!q->concurrent) tsc_throw_str(tsc_str_from_cstr("dispatch.barrier requires a concurrent queue"));
    tsc_dispatch_serial_task_t* task =
        (tsc_dispatch_serial_task_t*)TSC_GC_MALLOC(sizeof(tsc_dispatch_serial_task_t));
    task->fn = fn;
    task->env = env;
    task->promise = tsc_promise_pending();
    task->delay_ms = 0.0;
    tsc_set_immediate(tsc_dispatch_serial_trampoline, task);
    return task->promise;
}

tsc_value_t tsc_dispatch_sync(tsc_dispatch_queue_t* q, tsc_dispatch_task_fn_t fn, void* env) {
    if (!q || !fn) tsc_throw_str(tsc_str_from_cstr("dispatch.sync: invalid queue or task"));
    tsc_value_t result = tsc_value_undefined();
    tsc_str_t* error = NULL;
    TSC_TRY_FRAME(eh);
    tsc_try_push(&eh);
    if (setjmp(eh.jb) == 0) {
        result = fn(env);
        tsc_try_pop();
    } else {
        error = tsc_current_error();
    }
    if (error) tsc_throw_str(error);
    return result;
}

#else

/* Queue-specific key used to detect dispatch.sync onto the queue that is
 * already running the calling task (a guaranteed deadlock otherwise). */
static char g_tsc_queue_key;

/* libdispatch holds scheduled task envelopes in non-GC memory, so the
 * collector cannot see them between dispatch_async_f and the trampoline
 * running. Keep every in-flight envelope in a GC-visible registry. */
static pthread_mutex_t g_inflight_mutex = PTHREAD_MUTEX_INITIALIZER;
static void** g_inflight = NULL;
static size_t g_inflight_len = 0;
static size_t g_inflight_cap = 0;

static void tsc_dispatch_inflight_add(void* task) {
    pthread_mutex_lock(&g_inflight_mutex);
    if (g_inflight_len == g_inflight_cap) {
        size_t next = g_inflight_cap ? g_inflight_cap * 2 : 8;
        void** entries = (void**)TSC_GC_REALLOC(g_inflight, next * sizeof(void*));
        if (!entries) tsc_panic("dispatch: out of memory");
        g_inflight = entries;
        g_inflight_cap = next;
    }
    g_inflight[g_inflight_len++] = task;
    pthread_mutex_unlock(&g_inflight_mutex);
}

static void tsc_dispatch_inflight_remove(void* task) {
    pthread_mutex_lock(&g_inflight_mutex);
    for (size_t i = 0; i < g_inflight_len; i++) {
        if (g_inflight[i] == task) {
            g_inflight[i] = g_inflight[--g_inflight_len];
            break;
        }
    }
    pthread_mutex_unlock(&g_inflight_mutex);
}

/* libdispatch owns its worker threads and destroys idle ones, so a worker
 * must not stay GC-registered past the task (Boehm's stop-the-world signal
 * would target a dead thread and abort). Register on task entry, and have the
 * caller unregister only when this call did the registration — dispatch_sync
 * may run the task inline on an already-registered thread (GC_DUPLICATE),
 * including the main thread, which must never be unregistered. */
static bool tsc_dispatch_register_gc_thread(void) {
#ifndef TSC_NO_GC
    /* libdispatch's Linux workqueue threads start with all signals blocked;
     * Boehm suspends registered threads with a signal, so it must be
     * deliverable here or every stop-the-world aborts. */
    sigset_t gc_signals;
    sigemptyset(&gc_signals);
    sigaddset(&gc_signals, GC_get_suspend_signal());
    sigaddset(&gc_signals, GC_get_thr_restart_signal());
    pthread_sigmask(SIG_UNBLOCK, &gc_signals, NULL);
    struct GC_stack_base sb;
    if (GC_get_stack_base(&sb) == GC_SUCCESS) {
        return GC_register_my_thread(&sb) == GC_SUCCESS;
    }
#endif
    return false;
}

static void tsc_dispatch_unregister_gc_thread(bool registered_here) {
#ifndef TSC_NO_GC
    if (registered_here) GC_unregister_my_thread();
#else
    (void)registered_here;
#endif
}

tsc_dispatch_queue_t* tsc_dispatch_queue_serial(tsc_str_t* label) {
    tsc_dispatch_queue_t* q = (tsc_dispatch_queue_t*)TSC_GC_MALLOC(sizeof(tsc_dispatch_queue_t));
    char name[128];
    size_t n = label && label->len < sizeof(name) - 1 ? label->len : sizeof(name) - 1;
    if (label && n > 0) memcpy(name, label->data, n);
    name[n] = '\0';
    q->queue = dispatch_queue_create(name, DISPATCH_QUEUE_SERIAL);
    dispatch_queue_set_specific(q->queue, &g_tsc_queue_key, q, NULL);
    q->label = label ? label : tsc_str_from_lit("", 0);
    q->concurrent = false;
    return q;
}

tsc_dispatch_queue_t* tsc_dispatch_queue_concurrent(void) {
    tsc_dispatch_queue_t* q = (tsc_dispatch_queue_t*)TSC_GC_MALLOC(sizeof(tsc_dispatch_queue_t));
    q->queue = dispatch_queue_create("concurrent", DISPATCH_QUEUE_CONCURRENT);
    q->label = tsc_str_from_lit("concurrent", 10);
    q->concurrent = true;
    return q;
}

typedef struct {
    tsc_dispatch_task_fn_t fn;
    void* env;
    tsc_promise_t* promise;
} tsc_dispatch_async_task_t;

static void tsc_dispatch_async_trampoline(void* ctx) {
    tsc_dispatch_async_task_t* task = (tsc_dispatch_async_task_t*)ctx;
    bool registered_here = tsc_dispatch_register_gc_thread();
    tsc_value_t result = tsc_value_undefined();
    bool is_error = false;
    TSC_TRY_FRAME(eh);
    tsc_try_push(&eh);
    if (setjmp(eh.jb) == 0) {
        result = task->fn(task->env);
        tsc_try_pop();
    } else {
        is_error = true;
        result = tsc_value_string(tsc_current_error());
    }
    tsc_cross_post_settle(task->promise, result, is_error);
    tsc_dispatch_inflight_remove(task);
    tsc_dispatch_unregister_gc_thread(registered_here);
}

tsc_promise_t* tsc_dispatch_async(tsc_dispatch_queue_t* q, tsc_dispatch_task_fn_t fn, void* env) {
    if (!q || !fn) tsc_throw_str(tsc_str_from_cstr("dispatch.async: invalid queue or task"));
    tsc_dispatch_async_task_t* task =
        (tsc_dispatch_async_task_t*)TSC_GC_MALLOC(sizeof(tsc_dispatch_async_task_t));
    task->fn = fn;
    task->env = env;
    task->promise = tsc_promise_pending();
    tsc_dispatch_task_scheduled();
    tsc_dispatch_inflight_add(task);
    dispatch_async_f(q->queue, task, tsc_dispatch_async_trampoline);
    return task->promise;
}

tsc_promise_t* tsc_dispatch_after(
    tsc_dispatch_queue_t* q,
    tsc_dispatch_task_fn_t fn,
    void* env,
    double delay_ms
) {
    if (!q || !fn) tsc_throw_str(tsc_str_from_cstr("dispatch.after: invalid queue or task"));
    if (!(delay_ms > 0.0)) delay_ms = 0.0;
    const double max_delay_ms = 9000000000000.0;
    if (delay_ms > max_delay_ms) delay_ms = max_delay_ms;
    tsc_dispatch_async_task_t* task =
        (tsc_dispatch_async_task_t*)TSC_GC_MALLOC(sizeof(tsc_dispatch_async_task_t));
    task->fn = fn;
    task->env = env;
    task->promise = tsc_promise_pending();
    tsc_dispatch_task_scheduled();
    tsc_dispatch_inflight_add(task);
    dispatch_after_f(
        dispatch_time(DISPATCH_TIME_NOW, (int64_t)(delay_ms * 1000000.0)),
        q->queue,
        task,
        tsc_dispatch_async_trampoline
    );
    return task->promise;
}

tsc_promise_t* tsc_dispatch_barrier(tsc_dispatch_queue_t* q, tsc_dispatch_task_fn_t fn, void* env) {
    if (!q || !fn) tsc_throw_str(tsc_str_from_cstr("dispatch.barrier: invalid queue or task"));
    if (!q->concurrent) tsc_throw_str(tsc_str_from_cstr("dispatch.barrier requires a concurrent queue"));
    tsc_dispatch_async_task_t* task =
        (tsc_dispatch_async_task_t*)TSC_GC_MALLOC(sizeof(tsc_dispatch_async_task_t));
    task->fn = fn;
    task->env = env;
    task->promise = tsc_promise_pending();
    tsc_dispatch_task_scheduled();
    tsc_dispatch_inflight_add(task);
    dispatch_barrier_async_f(q->queue, task, tsc_dispatch_async_trampoline);
    return task->promise;
}

typedef struct {
    tsc_dispatch_task_fn_t fn;
    void* env;
    tsc_value_t result;
    tsc_str_t* error;
} tsc_dispatch_sync_task_t;

static void tsc_dispatch_sync_trampoline(void* ctx) {
    tsc_dispatch_sync_task_t* task = (tsc_dispatch_sync_task_t*)ctx;
    bool registered_here = tsc_dispatch_register_gc_thread();
    TSC_TRY_FRAME(eh);
    tsc_try_push(&eh);
    if (setjmp(eh.jb) == 0) {
        task->result = task->fn(task->env);
        tsc_try_pop();
    } else {
        task->error = tsc_current_error();
    }
    tsc_dispatch_unregister_gc_thread(registered_here);
}

tsc_value_t tsc_dispatch_sync(tsc_dispatch_queue_t* q, tsc_dispatch_task_fn_t fn, void* env) {
    if (!q || !fn) tsc_throw_str(tsc_str_from_cstr("dispatch.sync: invalid queue or task"));
    if (!q->concurrent && dispatch_get_specific(&g_tsc_queue_key) == q) {
        tsc_throw_str(tsc_str_from_cstr("dispatch.sync onto the current serial queue would deadlock"));
    }
    tsc_dispatch_sync_task_t task;
    task.fn = fn;
    task.env = env;
    task.result = tsc_value_undefined();
    task.error = NULL;
    dispatch_sync_f(q->queue, &task, tsc_dispatch_sync_trampoline);
    if (task.error) tsc_throw_str(task.error);
    return task.result;
}

#endif /* TSC_DISPATCH_SERIAL */
#endif /* TSC_THREADS || TSC_DISPATCH_SERIAL */
