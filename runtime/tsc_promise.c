#include "tsc_internal.h"

/* NaN-boxed pointer payloads are not recognizable conservative-GC roots.
 * Keep the decoded pointer beside a promise result for as long as that result
 * is observable.  Typed pointer promises already use the same field. */
void* tsc_value_gc_root(tsc_value_t value) {
    if (!value_is_box(value)) return NULL;
    switch (value_tag(value)) {
        case TSC_VALUE_TAG_STRING:
        case TSC_VALUE_TAG_ARRAY:
        case TSC_VALUE_TAG_OBJECT:
        case TSC_VALUE_TAG_FUNCTION:
        case TSC_VALUE_TAG_BIGINT:
        case TSC_VALUE_TAG_SYMBOL:
            return value_ptr(value);
        default:
            return NULL;
    }
}

static tsc_promise_t* promise_allocate(tsc_promise_state_t state, tsc_value_t value, void* root) {
    void* volatile value_gc_root = root;
    tsc_promise_t* promise = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(*promise));
    *promise = (tsc_promise_t){ .state = state, .result = value, .ptr_result = value_gc_root };
    promise->object = tsc_object_new_with_prototype(tsc_promise_prototype_value());
    promise->object->class_ptr = promise;
    promise->object->is_promise = true;
    (void)value_gc_root;
    return promise;
}

tsc_promise_t* tsc_promise_resolve(tsc_value_t value) {
    return promise_allocate(TSC_PROMISE_FULFILLED, value, tsc_value_gc_root(value));
}

tsc_promise_t* tsc_promise_resolve_fs_stats(tsc_fs_stats_t* value) {
    return promise_allocate(TSC_PROMISE_FULFILLED, tsc_value_undefined(), value);
}

tsc_promise_t* tsc_promise_resolve_buffer(tsc_buffer_t* value) {
    return promise_allocate(TSC_PROMISE_FULFILLED, tsc_value_undefined(), value);
}

tsc_promise_t* tsc_promise_resolve_array(tsc_array_t* value) {
    return promise_allocate(TSC_PROMISE_FULFILLED, tsc_value_undefined(), value);
}

/** A resolving-function pair shares one AlreadyResolved cell. Each queued
 * thenable job creates its own pair over the same target Promise. */
typedef struct {
    tsc_promise_t* promise;
    bool already_resolved;
} tsc_promise_resolution_t;

typedef struct {
    tsc_promise_t* promise;
    tsc_value_t thenable;
    void* thenable_gc_root;
    tsc_value_t then_method;
    void* then_method_gc_root;
    tsc_realm_t* realm;
} tsc_promise_thenable_job_t;

void tsc_promise_trigger_callbacks(tsc_promise_t* p) {
    if (!p || !p->callbacks) return;
    for (size_t i = 0; i < p->callbacks_len; i++) {
        tsc_queue_microtask(p->callbacks[i].fn, p->callbacks[i].env);
    }
    p->callbacks = NULL;
    p->callbacks_len = 0;
    p->callbacks_cap = 0;
}

void tsc_promise_add_callback(tsc_promise_t* p, void (*fn)(void*), void* env) {
    if (!p || !fn) return;
    if(p->state!=TSC_PROMISE_PENDING){tsc_queue_microtask(fn,env);return;}
    if (p->callbacks_len == p->callbacks_cap) {
        size_t next = p->callbacks_cap ? p->callbacks_cap * 2 : 4;
        tsc_promise_callback_t* entries = (tsc_promise_callback_t*)TSC_GC_REALLOC(p->callbacks, next * sizeof(tsc_promise_callback_t));
        if (!entries) tsc_panic("tsc_promise_add_callback: out of memory");
        p->callbacks = entries;
        p->callbacks_cap = next;
    }
    p->callbacks[p->callbacks_len++] = (tsc_promise_callback_t){ fn, env };
}

typedef struct {
    tsc_promise_t* dest;
    tsc_promise_t* source;
} tsc_promise_adopt_env_t;

static void tsc_promise_adopt_callback(void* env) {
    tsc_promise_adopt_env_t* state = (tsc_promise_adopt_env_t*)env;
    tsc_promise_adopt_into(state->dest, state->source);
}

void tsc_promise_adopt_into(tsc_promise_t* dest, tsc_promise_t* source) {
    if (!dest || dest->state != TSC_PROMISE_PENDING || !source) return;
    if (tsc_promise_is_fulfilled(source)) {
        dest->state = TSC_PROMISE_FULFILLED;
        dest->result = source->result;
        dest->ptr_result = source->ptr_result;
        /* An async result may already carry its consumer's physical-value
         * codec while the adopted native producer has none. Keep that ABI
         * contract until a producer supplies its own explicit codec. */
        if (source->box_pointer_result) dest->box_pointer_result = source->box_pointer_result;
        tsc_promise_trigger_callbacks(dest);
    } else if (tsc_promise_is_rejected(source)) {
        dest->state = TSC_PROMISE_REJECTED;
        dest->result = source->result;
        dest->ptr_result = source->ptr_result;
        tsc_promise_trigger_callbacks(dest);
    } else if (tsc_promise_is_pending(source)) {
        tsc_promise_adopt_env_t* env = (tsc_promise_adopt_env_t*)TSC_GC_MALLOC(sizeof(tsc_promise_adopt_env_t));
        env->dest = dest;
        env->source = source;
        tsc_promise_add_callback(source, tsc_promise_adopt_callback, env);
    }
}

static tsc_promise_resolution_t* promise_resolution_new(tsc_promise_t* promise) {
    tsc_promise_resolution_t* record = TSC_GC_MALLOC(sizeof(*record));
    *record = (tsc_promise_resolution_t){ .promise = promise };
    return record;
}

static void promise_resolution_reject(tsc_promise_resolution_t* record, tsc_value_t reason) {
    if (record->already_resolved) return;
    record->already_resolved = true;
    tsc_promise_reject_in_place(record->promise, reason);
}

static void promise_resolution_resolve(tsc_promise_resolution_t* record, tsc_value_t value);

static tsc_value_t promise_resolving_resolve(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    promise_resolution_resolve((tsc_promise_resolution_t*)env,
        args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined());
    return tsc_value_undefined();
}

static tsc_value_t promise_resolving_reject(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    promise_resolution_reject((tsc_promise_resolution_t*)env,
        args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined());
    return tsc_value_undefined();
}

static tsc_value_t promise_resolving_function(tsc_promise_resolution_t* record, bool reject) {
    return tsc_value_function_builtin_named(reject ? promise_resolving_reject : promise_resolving_resolve,
        record, 1.0, tsc_str_from_lit("", 0));
}

static tsc_array_t* promise_resolving_arguments(tsc_promise_resolution_t* record) {
    tsc_array_t* arguments = tsc_array_new(sizeof(tsc_value_t), 2);
    tsc_array_push_value(arguments, promise_resolving_function(record, false));
    tsc_array_push_value(arguments, promise_resolving_function(record, true));
    return arguments;
}

static void promise_thenable_job(void* env) {
    tsc_promise_thenable_job_t* job = env;
    tsc_realm_t* previous_realm = tsc_realm_swap(job->realm ? job->realm : tsc_realm_current());
    tsc_promise_resolution_t* record = promise_resolution_new(job->promise);
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) == 0) {
        (void)tsc_value_apply_function(job->then_method, job->thenable,
            tsc_value_array(promise_resolving_arguments(record)));
        tsc_try_pop();
    } else {
        tsc_value_t error = tsc_current_error_value();
        tsc_try_pop();
        promise_resolution_reject(record, error);
    }
    (void)tsc_realm_swap(previous_realm);
}

static tsc_realm_t* promise_thenable_realm(tsc_value_t then) {
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) == 0) {
        tsc_realm_t* realm = tsc_value_function_realm(then);
        tsc_try_pop();
        return realm;
    }
    /* NewPromiseResolveThenableJob ignores GetFunctionRealm's abrupt
     * completion, including a revoked callable Proxy. The job still calls it. */
    tsc_try_pop();
    return NULL;
}

static void promise_resolution_resolve(tsc_promise_resolution_t* record, tsc_value_t value) {
    if (record->already_resolved) return;
    record->already_resolved = true;
    void* volatile value_gc_root = tsc_value_gc_root(value);
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) == 0) {
        if (tsc_value_is_promise(value) && tsc_value_as_promise(value) == record->promise) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_lit("Promise resolved with itself", 28));
        }
        if (!tsc_value_is_object(value)) {
            tsc_promise_fulfill_in_place(record->promise, value);
        } else {
            tsc_value_t then = tsc_value_get_prop(value, tsc_str_from_lit("then", 4));
            void* volatile then_gc_root = tsc_value_gc_root(then);
            if (!tsc_value_is_callable(then)) {
                tsc_promise_fulfill_in_place(record->promise, value);
            } else {
                tsc_promise_thenable_job_t* job = TSC_GC_MALLOC(sizeof(*job));
                *job = (tsc_promise_thenable_job_t){ .promise = record->promise,
                    .thenable = value, .thenable_gc_root = value_gc_root,
                    .then_method = then, .then_method_gc_root = then_gc_root };
                job->realm = promise_thenable_realm(then);
                tsc_queue_microtask(promise_thenable_job, job);
            }
            (void)then_gc_root;
        }
        tsc_try_pop();
    } else {
        tsc_value_t error = tsc_current_error_value();
        tsc_try_pop();
        tsc_promise_reject_in_place(record->promise, error);
    }
    (void)value_gc_root;
}

void tsc_promise_resolve_into(tsc_promise_t* promise, tsc_value_t value) {
    if (!tsc_promise_is_pending(promise)) return;
    void* volatile value_gc_root = tsc_value_gc_root(value);
    promise_resolution_resolve(promise_resolution_new(promise), value);
    (void)value_gc_root;
}

tsc_promise_t* tsc_promise_resolve_thenable(tsc_value_t value) {
    void* volatile value_gc_root = tsc_value_gc_root(value);
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_promise_resolve_into(promise, value);
    (void)value_gc_root;
    return promise;
}

static tsc_value_t promise_argument(const tsc_array_t* args, size_t index) {
    return args && index < args->len ? TSC_ARR(tsc_value_t, args, index) : tsc_value_undefined();
}

static tsc_value_t promise_constructor_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)receiver;
    tsc_value_t new_target = tsc_value_current_new_target();
    if (tsc_value_is_undefined(new_target))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Promise requires new"));
    tsc_value_t executor = promise_argument(args, 0);
    void* volatile executor_root = tsc_value_gc_root(executor);
    if (!tsc_value_is_callable(executor))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Promise executor is not callable"));
    /* Validate the executor before the observable newTarget.prototype read. */
    tsc_value_t prototype = tsc_value_get_prototype_from_constructor(new_target,
        TSC_INTRINSIC_DEFAULT_PROMISE_PROTOTYPE);
    void* volatile prototype_root = tsc_value_gc_root(prototype);
    tsc_promise_t* promise = tsc_promise_pending();
    promise->object->prototype = prototype;
    promise->object->prototype_gc_root = prototype_root;
    tsc_promise_resolution_t* record = promise_resolution_new(promise);
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) == 0) {
        (void)tsc_value_apply_function(executor, tsc_value_undefined(),
            tsc_value_array(promise_resolving_arguments(record)));
        tsc_try_pop();
    } else {
        tsc_value_t error = tsc_current_error_value();
        tsc_try_pop();
        promise_resolution_reject(record, error);
    }
    (void)executor_root; (void)prototype_root;
    return tsc_value_promise(promise);
}

tsc_promise_t* tsc_promise_new_executor(tsc_array_t* arguments) {
    return tsc_value_as_promise(tsc_value_construct(tsc_promise_constructor_value(),
        tsc_value_array(arguments)));
}

/* NewPromiseCapability retains actual function/object identities. A custom
 * constructor can return an arbitrary object and provide arbitrary callbacks. */
typedef struct {
    tsc_value_t promise, resolve, reject;
    void *promise_root, *resolve_root, *reject_root;
} tsc_promise_capability_t;

static tsc_value_t promise_capability_executor(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;
    tsc_promise_capability_t* capability = env;
    if (!tsc_value_is_undefined(capability->resolve) || !tsc_value_is_undefined(capability->reject))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Promise capability executor already called"));
    capability->resolve = promise_argument(args, 0);
    capability->resolve_root = tsc_value_gc_root(capability->resolve);
    capability->reject = promise_argument(args, 1);
    capability->reject_root = tsc_value_gc_root(capability->reject);
    return tsc_value_undefined();
}

static tsc_promise_capability_t* promise_new_capability(tsc_value_t constructor) {
    if (!tsc_value_is_constructable(constructor))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Promise capability requires a constructor"));
    void* volatile constructor_root = tsc_value_gc_root(constructor);
    tsc_promise_capability_t* capability = TSC_GC_MALLOC(sizeof(*capability));
    *capability = (tsc_promise_capability_t){ .promise = tsc_value_undefined(),
        .resolve = tsc_value_undefined(), .reject = tsc_value_undefined() };
    tsc_array_t* arguments = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_array_push_value(arguments, tsc_value_function_builtin_named(promise_capability_executor,
        capability, 2, tsc_str_from_lit("", 0)));
    capability->promise = tsc_value_construct(constructor, tsc_value_array(arguments));
    capability->promise_root = tsc_value_gc_root(capability->promise);
    if (!tsc_value_is_callable(capability->resolve) || !tsc_value_is_callable(capability->reject))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Promise capability callbacks are not callable"));
    (void)constructor_root;
    return capability;
}

static tsc_array_t* promise_single_arg(tsc_value_t value) {
    void* volatile value_root = tsc_value_gc_root(value);
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_array_push_value(args, value);
    (void)value_root;
    return args;
}

static void promise_call_resolving(tsc_value_t function, tsc_value_t value) {
    void* volatile function_root = tsc_value_gc_root(function);
    (void)tsc_value_apply_function(function, tsc_value_undefined(),
        tsc_value_array(promise_single_arg(value)));
    (void)function_root;
}

static tsc_value_t promise_resolve_constructor(tsc_value_t constructor, tsc_value_t value) {
    if (!tsc_value_is_object(constructor))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Promise.resolve receiver must be an object"));
    void* volatile value_root = tsc_value_gc_root(value);
    if (tsc_value_is_promise(value)) {
        tsc_value_t value_constructor = tsc_value_get_prop(value, tsc_str_from_lit("constructor", 11));
        if (value_constructor == constructor) { (void)value_root; return value; }
    }
    tsc_promise_capability_t* capability = promise_new_capability(constructor);
    promise_call_resolving(capability->resolve, value);
    (void)value_root;
    return capability->promise;
}

static tsc_value_t promise_static_resolve(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    return promise_resolve_constructor(receiver, promise_argument(args, 0));
}

tsc_promise_t* tsc_promise_await(tsc_value_t value) {
    return tsc_value_as_promise(promise_resolve_constructor(tsc_promise_constructor_value(), value));
}
static tsc_value_t promise_static_reject(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    tsc_promise_capability_t* capability = promise_new_capability(receiver);
    promise_call_resolving(capability->reject, promise_argument(args, 0));
    return capability->promise;
}
static tsc_value_t promise_static_with_resolvers(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)args;
    tsc_promise_capability_t* capability = promise_new_capability(receiver);
    tsc_object_t* record = tsc_object_new();
    tsc_object_set(record, tsc_str_from_lit("promise", 7), capability->promise);
    tsc_object_set(record, tsc_str_from_lit("resolve", 7), capability->resolve);
    tsc_object_set(record, tsc_str_from_lit("reject", 6), capability->reject);
    return tsc_value_object(record);
}

typedef struct {
    tsc_value_t value;
    void* value_root;
    bool abrupt;
} tsc_promise_call_completion_t;

/* Call completion is rooted before returning to the capability invocation.
 * Catch the source callback only; a capability callback failure propagates. */
static tsc_promise_call_completion_t* promise_call_completion(tsc_value_t callback, tsc_array_t* args) {
    void* volatile callback_root = tsc_value_gc_root(callback);
    tsc_array_t* volatile arguments_root = args;
    tsc_promise_call_completion_t* completion = TSC_GC_MALLOC(sizeof(*completion));
    *completion = (tsc_promise_call_completion_t){ .value = tsc_value_undefined() };
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) == 0) {
        completion->value = tsc_value_apply_function(callback, tsc_value_undefined(), tsc_value_array(args));
    } else {
        completion->abrupt = true;
        completion->value = tsc_current_error_value();
    }
    completion->value_root = tsc_value_gc_root(completion->value);
    tsc_try_pop();
    (void)callback_root; (void)arguments_root;
    return completion;
}

static tsc_value_t promise_static_try(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    tsc_value_t callback = promise_argument(args, 0);
    void* volatile callback_root = tsc_value_gc_root(callback);
    tsc_array_t* volatile arguments_root = args;
    tsc_promise_capability_t* capability = promise_new_capability(receiver);
    tsc_promise_call_completion_t* completion = promise_call_completion(callback,
        tsc_array_slice(args, 1, args ? (double)args->len : 0));
    promise_call_resolving(completion->abrupt ? capability->reject : capability->resolve, completion->value);
    (void)callback_root; (void)arguments_root;
    return capability->promise;
}

typedef enum { PROMISE_ALL, PROMISE_RACE, PROMISE_ANY, PROMISE_ALL_SETTLED } promise_combination_t;

/* One ordered List, completion record and per-element gate collection owns
 * every combinator. The initial remaining sentinel keeps synchronous then
 * callbacks from completing the List before iterator exhaustion. */
typedef struct {
    promise_combination_t operation;
    tsc_promise_capability_t* capability;
    tsc_sync_iterator_t iterator;
    tsc_array_t* values;
    size_t remaining;
    tsc_value_t constructor, resolve, error;
    void *constructor_root, *resolve_root, *error_root;
} promise_combination_state_t;

typedef struct {
    promise_combination_state_t* state;
    size_t index;
    bool* already_called;
    bool rejected;
} promise_combination_element_t;

static tsc_array_t* promise_combination_snapshot(tsc_array_t* values) {
    tsc_array_t* snapshot = tsc_array_new(sizeof(tsc_value_t), values->len ? values->len : 1);
    for (size_t index = 0; index < values->len; ++index) {
        tsc_array_push_value(snapshot, TSC_ARR(tsc_value_t, values, index));
    }
    return snapshot;
}

static tsc_value_t promise_combination_complete(promise_combination_state_t* state) {
    tsc_array_t* snapshot = promise_combination_snapshot(state->values);
    tsc_value_t value = tsc_value_array(snapshot);
    tsc_value_t callback = state->capability->resolve;
    if (state->operation == PROMISE_ANY) {
        /* A newly created AggregateError has the intrinsic prototype and a
         * non-enumerable errors property. No invented message is supplied. */
        value = tsc_value_error(tsc_aggregate_error_new(snapshot, NULL));
        void* volatile aggregate_root = tsc_value_gc_root(value);
        tsc_object_define(value_ptr(value), tsc_str_from_lit("errors", 6),
            tsc_value_array(snapshot), true, false, true);
        callback = state->capability->reject;
        (void)aggregate_root;
    }
    void* volatile value_root = tsc_value_gc_root(value);
    tsc_value_t result = tsc_value_apply_function(callback, tsc_value_undefined(),
        tsc_value_array(promise_single_arg(value)));
    (void)value_root;
    return result;
}

static tsc_value_t promise_combination_element(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;
    promise_combination_element_t* element = env;
    if (*element->already_called) return tsc_value_undefined();
    *element->already_called = true;
    promise_combination_state_t* state = element->state;
    tsc_value_t value = promise_argument(args, 0);
    void* volatile value_root = tsc_value_gc_root(value);
    if (state->operation == PROMISE_ALL_SETTLED) {
        tsc_object_t* record = tsc_object_new();
        tsc_object_define(record, tsc_str_from_lit("status", 6), tsc_value_string(tsc_str_from_cstr(
            element->rejected ? "rejected" : "fulfilled")), true, true, true);
        tsc_object_define(record, tsc_str_from_cstr(element->rejected ? "reason" : "value"), value,
            true, true, true);
        value = tsc_value_object(record);
    }
    tsc_array_store_raw(state->values, element->index, &value);
    (void)value_root;
    if (--state->remaining == 0) return promise_combination_complete(state);
    return tsc_value_undefined();
}

static tsc_value_t promise_combination_callback(promise_combination_state_t* state,
    size_t index, bool* gate, bool rejected) {
    promise_combination_element_t* element = TSC_GC_MALLOC(sizeof(*element));
    *element = (promise_combination_element_t){ .state = state, .index = index,
        .already_called = gate, .rejected = rejected };
    return tsc_value_function_builtin_named(promise_combination_element, element, 1, tsc_str_from_lit("", 0));
}

static tsc_value_t promise_static_combine(void* env, tsc_value_t receiver, tsc_array_t* args) {
    const promise_combination_t operation = *(const promise_combination_t*)env;
    /* Capability errors escape synchronously. Intake and perform errors reject
     * that capability; rejection callback failures escape outside this frame. */
    tsc_promise_capability_t* capability = promise_new_capability(receiver);
    promise_combination_state_t* state = TSC_GC_MALLOC(sizeof(*state));
    *state = (promise_combination_state_t){ .operation = operation, .capability = capability,
        .iterator = { .done = true }, .remaining = 1,
        .constructor = receiver, .constructor_root = tsc_value_gc_root(receiver),
        .resolve = tsc_value_undefined(), .error = tsc_value_undefined() };
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) != 0) {
        state->error = tsc_current_error_value();
        state->error_root = tsc_value_gc_root(state->error);
        tsc_try_pop();
        state->error = tsc_sync_iterator_close_with_error(&state->iterator, state->error);
        promise_call_resolving(capability->reject, state->error);
        return capability->promise;
    }
    state->resolve = tsc_value_get_prop(receiver, tsc_str_from_lit("resolve", 7));
    state->resolve_root = tsc_value_gc_root(state->resolve);
    if (!tsc_value_is_callable(state->resolve))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Promise resolve property is not callable"));
    state->iterator = tsc_sync_iterator_open(promise_argument(args, 0));
    if (operation != PROMISE_RACE) state->values = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_value_t value;
    while (tsc_sync_iterator_step(&state->iterator, &value)) {
        void* volatile value_root = tsc_value_gc_root(value);
        size_t index = 0;
        if (operation != PROMISE_RACE) {
            index = state->values->len;
            tsc_array_push_value(state->values, tsc_value_undefined());
        }
        tsc_value_t next_promise = tsc_value_apply_function(state->resolve, state->constructor,
            tsc_value_array(promise_single_arg(value)));
        void* volatile next_root = tsc_value_gc_root(next_promise);
        tsc_value_t fulfilled = capability->resolve, rejected = capability->reject;
        if (operation != PROMISE_RACE) {
            bool* gate = TSC_GC_MALLOC(sizeof(*gate));
            *gate = false;
            if (operation != PROMISE_ANY) fulfilled = promise_combination_callback(state, index, gate, false);
            void* volatile fulfilled_root = tsc_value_gc_root(fulfilled);
            if (operation != PROMISE_ALL) rejected = promise_combination_callback(state, index, gate, true);
            state->remaining++;
            (void)fulfilled_root;
        }
        void* volatile fulfilled_root = tsc_value_gc_root(fulfilled);
        void* volatile rejected_root = tsc_value_gc_root(rejected);
        tsc_array_t* actual = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_array_push_value(actual, fulfilled);
        tsc_array_push_value(actual, rejected);
        tsc_value_t then = tsc_value_get_prop(next_promise, tsc_str_from_lit("then", 4));
        (void)tsc_value_apply_function(then, next_promise, tsc_value_array(actual));
        (void)value_root; (void)next_root; (void)fulfilled_root; (void)rejected_root;
    }
    if (operation != PROMISE_RACE && --state->remaining == 0) (void)promise_combination_complete(state);
    tsc_try_pop();
    return capability->promise;
}

tsc_promise_t* tsc_promise_all(tsc_value_t iterable) {
    static const promise_combination_t operation = PROMISE_ALL;
    void* volatile iterable_root = tsc_value_gc_root(iterable);
    tsc_value_t result = promise_static_combine((void*)&operation, tsc_promise_constructor_value(),
        promise_single_arg(iterable));
    (void)iterable_root;
    return tsc_value_as_promise(result);
}

/* Async and sync protocols retain the same captured Iterator Record. A
 * wrapper owns the original record; protocol methods use the actual receiver. */
typedef struct {
    tsc_promise_t* source;
    tsc_promise_t* result;
    tsc_iterator_record_t* iterator;
    bool done;
    bool close_on_rejection;
} tsc_async_from_sync_result_env_t;

static tsc_value_t async_from_sync_result_object(tsc_value_t value, bool done) {
    void* volatile value_root = tsc_value_gc_root(value);
    tsc_object_t* result = tsc_object_new();
    tsc_object_set(result, tsc_str_from_lit("value", 5), value);
    tsc_object_set(result, tsc_str_from_lit("done", 4), tsc_value_bool(done));
    (void)value_root;
    return tsc_value_object(result);
}

/* IteratorClose itself does not consult or update [[Done]]. The shared sync
 * consumer helper does, so adapt a record view without completing the wrapper. */
static tsc_value_t async_from_sync_close_with_error(tsc_iterator_record_t* iterator, tsc_value_t error) {
    tsc_iterator_record_t closing = *iterator;
    closing.done = false;
    return tsc_sync_iterator_close_with_error(&closing, error);
}

static void async_from_sync_result_callback(void* env) {
    tsc_async_from_sync_result_env_t* state = env;
    if (tsc_promise_is_rejected(state->source)) {
        tsc_value_t error = tsc_promise_reason(state->source);
        if (!state->done && state->close_on_rejection)
            error = async_from_sync_close_with_error(state->iterator, error);
        tsc_promise_reject_in_place(state->result, error);
    } else if (tsc_promise_is_fulfilled(state->source)) {
        tsc_promise_resolve_into(state->result,
            async_from_sync_result_object(tsc_promise_value(state->source), state->done));
    }
}

static void async_from_sync_continue(tsc_value_t result, tsc_promise_t* output,
        tsc_iterator_record_t* iterator, bool close_on_rejection) {
    if (!tsc_value_is_object(result))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Sync iterator result is not an object"));
    void* volatile result_root = tsc_value_gc_root(result);
    bool done = tsc_value_is_truthy(tsc_value_get_prop(result, tsc_str_from_lit("done", 4)));
    tsc_value_t value = tsc_value_get_prop(result, tsc_str_from_lit("value", 5));
    void* volatile value_root = tsc_value_gc_root(value);
    tsc_async_from_sync_result_env_t* state = TSC_GC_MALLOC(sizeof(*state));
    *state = (tsc_async_from_sync_result_env_t){ .result = output, .iterator = iterator,
        .done = done, .close_on_rejection = close_on_rejection };
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) != 0) {
        tsc_value_t error = tsc_current_error_value();
        tsc_try_pop();
        if (!done && close_on_rejection) error = async_from_sync_close_with_error(iterator, error);
        tsc_throw_value(error);
    }
    state->source = tsc_promise_await(value);
    tsc_try_pop();
    if (tsc_promise_is_pending(state->source))
        tsc_promise_add_callback(state->source, async_from_sync_result_callback, state);
    else tsc_queue_microtask(async_from_sync_result_callback, state);
    (void)result_root; (void)value_root;
}

static tsc_value_t async_from_sync_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    const tsc_completion_kind_t kind = *(const tsc_completion_kind_t*)env;
    tsc_promise_t* output = tsc_promise_pending();
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) != 0) {
        tsc_value_t error = tsc_current_error_value();
        tsc_try_pop();
        tsc_promise_reject_in_place(output, error);
        return tsc_value_promise(output);
    }
    tsc_object_t* object = value_is_object_value(receiver) ? value_ptr(receiver) : NULL;
    tsc_iterator_record_t* iterator = object ? object->async_from_sync_iterator : NULL;
    if (!iterator)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Async-from-sync iterator method called on incompatible receiver"));
    tsc_value_t method = iterator->next_method;
    if (kind != TSC_COMPLETION_NORMAL) {
        method = tsc_value_get_prop(iterator->iterator,
            tsc_str_from_cstr(kind == TSC_COMPLETION_RETURN ? "return" : "throw"));
        if (tsc_value_is_nullish(method)) {
            if (kind == TSC_COMPLETION_RETURN) {
                tsc_promise_resolve_into(output, async_from_sync_result_object(promise_argument(args, 0), true));
                tsc_try_pop();
                return tsc_value_promise(output);
            }
            tsc_iterator_record_t closing = *iterator;
            closing.done = false;
            tsc_sync_iterator_close(&closing);
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Sync iterator has no throw method"));
        }
        if (!tsc_value_is_callable(method))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Sync iterator method is not callable"));
    }
    void* volatile method_root = tsc_value_gc_root(method);
    tsc_array_t* actual = tsc_array_new(sizeof(tsc_value_t), args && args->len ? 1 : 0);
    if (args && args->len) tsc_array_push_value(actual, promise_argument(args, 0));
    tsc_value_t result = tsc_value_apply_function(method, iterator->iterator, tsc_value_array(actual));
    async_from_sync_continue(result, output, iterator, kind != TSC_COMPLETION_RETURN);
    tsc_try_pop();
    (void)method_root;
    return tsc_value_promise(output);
}

static const char async_from_sync_prototype_key = 0;
static tsc_value_t async_from_sync_iterator_wrap(tsc_iterator_record_t original) {
    tsc_iterator_record_t* record = TSC_GC_MALLOC(sizeof(*record));
    *record = original;
    tsc_object_t* prototype = tsc_realm_state_get(&async_from_sync_prototype_key);
    if (!prototype) {
        prototype = tsc_object_new_with_prototype(tsc_async_iterator_prototype_value());
        tsc_realm_state_set(&async_from_sync_prototype_key, prototype);
        static const struct { const char* name; tsc_completion_kind_t kind; } methods[] = {
            { "next", TSC_COMPLETION_NORMAL }, { "return", TSC_COMPLETION_RETURN }, { "throw", TSC_COMPLETION_THROW }
        };
        for (size_t index = 0; index < sizeof(methods) / sizeof(*methods); ++index) {
            tsc_str_t* name = tsc_str_from_cstr(methods[index].name);
            tsc_object_define(prototype, name, tsc_value_function_builtin_named(async_from_sync_apply,
                (void*)&methods[index].kind, 1, name), true, false, true);
        }
    }
    tsc_object_t* wrapper = tsc_object_new_with_prototype(tsc_value_object(prototype));
    wrapper->async_from_sync_iterator = record;
    return tsc_value_object(wrapper);
}

tsc_iterator_record_t tsc_async_iterator_from_sync(tsc_iterator_record_t sync) {
    tsc_value_t wrapper = async_from_sync_iterator_wrap(sync);
    tsc_iterator_record_t record = tsc_sync_iterator_open_direct(wrapper);
    record.source = sync.source;
    record.source_gc_root = sync.source_gc_root;
    return record;
}

tsc_iterator_record_t tsc_async_iterator_open(tsc_value_t value) {
    void* volatile value_root = tsc_value_gc_root(value);
    tsc_value_t method = tsc_value_get_symbol_prop(value, tsc_symbol_async_iterator());
    if (!tsc_value_is_nullish(method)) return tsc_sync_iterator_open_with_method(value, method);
    tsc_iterator_record_t sync = tsc_sync_iterator_open(value);
    (void)value_root;
    return tsc_async_iterator_from_sync(sync);
}

tsc_value_t tsc_async_iterator_next(tsc_iterator_record_t* iterator) {
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 0);
    return tsc_value_apply_function(iterator->next_method, iterator->iterator, tsc_value_array(args));
}

tsc_promise_t* tsc_async_iterator_close(tsc_iterator_record_t* iterator, bool preserve_throw) {
    if (iterator->done) return NULL;
    iterator->done = true;
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) != 0) {
        tsc_value_t error = tsc_current_error_value();
        tsc_try_pop();
        if (preserve_throw) return NULL;
        tsc_throw_value(error);
    }
    tsc_value_t method = tsc_value_get_prop(iterator->iterator, tsc_str_from_lit("return", 6));
    if (tsc_value_is_nullish(method)) return NULL;
    if (!tsc_value_is_callable(method))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Async iterator return method is not callable"));
    void* volatile method_root = tsc_value_gc_root(method);
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 0);
    tsc_value_t result = tsc_value_apply_function(method, iterator->iterator, tsc_value_array(args));
    tsc_promise_t* awaited = tsc_promise_await(result);
    tsc_try_pop();
    (void)method_root;
    return awaited;
}

tsc_value_t tsc_value_promise(tsc_promise_t* p) {
    return p ? tsc_value_object(p->object) : tsc_value_null();
}

typedef struct {
    tsc_promise_t* receiver;
    tsc_promise_capability_t* capability;
    tsc_value_t on_fulfilled, on_rejected;
    void *on_fulfilled_root, *on_rejected_root;
} tsc_promise_reaction_t;

static void promise_reaction_job(void* env) {
    tsc_promise_reaction_t* reaction = env;
    const bool rejected = tsc_promise_is_rejected(reaction->receiver);
    tsc_value_t handler = rejected ? reaction->on_rejected : reaction->on_fulfilled;
    tsc_value_t value = rejected ? tsc_promise_reason(reaction->receiver) : tsc_promise_value(reaction->receiver);
    void* volatile value_root = tsc_value_gc_root(value);
    if (!tsc_value_is_callable(handler)) {
        promise_call_resolving(rejected ? reaction->capability->reject : reaction->capability->resolve, value);
        (void)value_root;
        return;
    }
    tsc_promise_call_completion_t* completion = promise_call_completion(handler, promise_single_arg(value));
    promise_call_resolving(completion->abrupt ? reaction->capability->reject : reaction->capability->resolve,
        completion->value);
    (void)value_root;
}

static tsc_value_t promise_prototype_then(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    if (!tsc_value_is_promise(receiver))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Promise then called on incompatible receiver"));
    tsc_promise_t* promise = tsc_value_as_promise(receiver);
    tsc_value_t constructor = tsc_value_species_constructor(receiver, tsc_promise_constructor_value());
    tsc_promise_capability_t* capability = promise_new_capability(constructor);
    tsc_promise_reaction_t* reaction = TSC_GC_MALLOC(sizeof(*reaction));
    *reaction = (tsc_promise_reaction_t){ .receiver = promise, .capability = capability,
        .on_fulfilled = promise_argument(args, 0), .on_rejected = promise_argument(args, 1) };
    reaction->on_fulfilled_root = tsc_value_gc_root(reaction->on_fulfilled);
    reaction->on_rejected_root = tsc_value_gc_root(reaction->on_rejected);
    if (tsc_promise_is_pending(promise)) tsc_promise_add_callback(promise, promise_reaction_job, reaction);
    else tsc_queue_microtask(promise_reaction_job, reaction);
    return capability->promise;
}

static tsc_value_t promise_invoke_then(tsc_value_t receiver, tsc_value_t fulfilled, tsc_value_t rejected) {
    void* volatile receiver_root = tsc_value_gc_root(receiver);
    void* volatile fulfilled_root = tsc_value_gc_root(fulfilled);
    void* volatile rejected_root = tsc_value_gc_root(rejected);
    tsc_value_t then = tsc_value_get_prop(receiver, tsc_str_from_lit("then", 4));
    void* volatile then_root = tsc_value_gc_root(then);
    tsc_array_t* arguments = tsc_array_new(sizeof(tsc_value_t), 2);
    tsc_array_push_value(arguments, fulfilled); tsc_array_push_value(arguments, rejected);
    tsc_value_t result = tsc_value_apply_function(then, receiver, tsc_value_array(arguments));
    (void)receiver_root; (void)fulfilled_root; (void)rejected_root; (void)then_root;
    return result;
}
static tsc_value_t promise_prototype_catch(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    return promise_invoke_then(receiver, tsc_value_undefined(), promise_argument(args, 0));
}

typedef struct {
    tsc_value_t constructor, finalizer, value;
    void *constructor_root, *finalizer_root, *value_root;
    bool rejected;
} tsc_promise_finally_t;

static tsc_value_t promise_finally_value(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver; (void)args;
    tsc_promise_finally_t* record = env;
    if (record->rejected) tsc_throw_value(record->value);
    return record->value;
}
static tsc_value_t promise_finally_handler(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;
    tsc_promise_finally_t* template = env;
    /* Each invocation retains its own incoming value, including reentrant
     * invocations through an overridden then method. */
    tsc_promise_finally_t* record = TSC_GC_MALLOC(sizeof(*record));
    *record = *template;
    record->value = promise_argument(args, 0); record->value_root = tsc_value_gc_root(record->value);
    tsc_value_t result = tsc_value_apply_function(record->finalizer, tsc_value_undefined(),
        tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 0)));
    tsc_value_t promise = promise_resolve_constructor(record->constructor, result);
    void* volatile promise_root = tsc_value_gc_root(promise);
    tsc_value_t handler = tsc_value_function_builtin_named(promise_finally_value, record, 0, tsc_str_from_lit("", 0));
    tsc_value_t output = promise_invoke_then(promise, handler, tsc_value_undefined());
    (void)promise_root;
    return output;
}
static tsc_value_t promise_prototype_finally(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    if (!tsc_value_is_object(receiver))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Promise finally receiver must be an object"));
    tsc_value_t constructor = tsc_value_species_constructor(receiver, tsc_promise_constructor_value());
    void* volatile constructor_root = tsc_value_gc_root(constructor);
    tsc_value_t finalizer = promise_argument(args, 0);
    void* volatile finalizer_root = tsc_value_gc_root(finalizer);
    if (!tsc_value_is_callable(finalizer)) return promise_invoke_then(receiver, finalizer, finalizer);
    tsc_promise_finally_t* fulfilled = TSC_GC_MALLOC(sizeof(*fulfilled));
    *fulfilled = (tsc_promise_finally_t){ .constructor = constructor, .constructor_root = constructor_root,
        .finalizer = finalizer, .finalizer_root = finalizer_root, .value = tsc_value_undefined() };
    tsc_promise_finally_t* rejected = TSC_GC_MALLOC(sizeof(*rejected));
    *rejected = *fulfilled; rejected->rejected = true;
    tsc_value_t then_finally = tsc_value_function_builtin_named(promise_finally_handler, fulfilled, 1, tsc_str_from_lit("", 0));
    void* volatile then_finally_root = tsc_value_gc_root(then_finally);
    tsc_value_t catch_finally = tsc_value_function_builtin_named(promise_finally_handler, rejected, 1, tsc_str_from_lit("", 0));
    tsc_value_t output = promise_invoke_then(receiver, then_finally, catch_finally);
    (void)constructor_root; (void)finalizer_root; (void)then_finally_root;
    return output;
}

static tsc_value_t promise_species_get(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)args; return receiver;
}
static const char promise_intrinsics_realm_key = 0;
typedef struct {
    tsc_object_t* prototype;
    tsc_value_t constructor;
    void* constructor_root;
} tsc_promise_intrinsics_t;

tsc_value_t tsc_promise_prototype_value(void) {
    tsc_promise_intrinsics_t* state = tsc_realm_state_get(&promise_intrinsics_realm_key);
    if (state) return tsc_value_object(state->prototype);
    tsc_runtime_lock();
    state = tsc_realm_state_get(&promise_intrinsics_realm_key);
    if (!state) {
        state = TSC_GC_MALLOC(sizeof(*state));
        *state = (tsc_promise_intrinsics_t){ .prototype = tsc_object_new() };
        tsc_realm_state_set(&promise_intrinsics_realm_key, state);
        state->constructor = tsc_value_function_named_kind(promise_constructor_apply,
            promise_constructor_apply, NULL, 1, tsc_str_from_lit("Promise", 7), TSC_FUNCTION_IDENTITY_BUILTIN);
        state->constructor_root = tsc_value_gc_root(state->constructor);
        tsc_function_identity_t* identity = value_ptr(state->constructor);
        identity->construct_allocates_receiver = false;
        identity->construct_default_prototype = TSC_INTRINSIC_DEFAULT_PROMISE_PROTOTYPE;
        tsc_function_identity_set_own_prototype(identity, tsc_value_object(state->prototype));
        identity->func_prototype_writable = false;
        tsc_object_define(state->prototype, tsc_str_from_lit("constructor", 11), state->constructor, true, false, true);
        static const struct { const char* name; double length; tsc_generic_function_t apply; bool is_static;
            promise_combination_t combination; } methods[] = {
            { "resolve", 1, promise_static_resolve, true }, { "reject", 1, promise_static_reject, true },
            { "withResolvers", 0, promise_static_with_resolvers, true },
            { "try", 1, promise_static_try, true },
            { "all", 1, promise_static_combine, true, PROMISE_ALL },
            { "race", 1, promise_static_combine, true, PROMISE_RACE },
            { "any", 1, promise_static_combine, true, PROMISE_ANY },
            { "allSettled", 1, promise_static_combine, true, PROMISE_ALL_SETTLED },
            { "then", 2, promise_prototype_then, false }, { "catch", 1, promise_prototype_catch, false },
            { "finally", 1, promise_prototype_finally, false }
        };
        for (size_t index = 0; index < sizeof(methods) / sizeof(*methods); index++) {
            tsc_str_t* name = tsc_str_from_cstr(methods[index].name);
            tsc_value_t function = tsc_value_function_builtin_named(methods[index].apply,
                (void*)&methods[index].combination, methods[index].length, name);
            tsc_value_define_property_desc(methods[index].is_static ? state->constructor : tsc_value_object(state->prototype),
                name, function, true, true, true, false, true, true, true);
        }
        tsc_value_define_symbol_property_desc(tsc_value_object(state->prototype), tsc_symbol_to_string_tag(),
            tsc_value_string(tsc_str_from_lit("Promise", 7)), true, false, true, false, true, true, true);
        tsc_object_t* descriptor = tsc_object_new();
        tsc_object_set(descriptor, tsc_str_from_lit("get", 3),
            tsc_value_function_builtin_named(promise_species_get, NULL, 0, tsc_str_from_lit("get [Symbol.species]", 20)));
        tsc_object_set(descriptor, tsc_str_from_lit("configurable", 12), tsc_value_bool(true));
        tsc_value_define_property_descriptor(state->constructor, tsc_symbol_property_key(tsc_symbol_species()), tsc_value_object(descriptor));
    }
    tsc_runtime_unlock();
    return tsc_value_object(state->prototype);
}
tsc_value_t tsc_promise_constructor_value(void) {
    (void)tsc_promise_prototype_value();
    tsc_promise_intrinsics_t* state = tsc_realm_state_get(&promise_intrinsics_realm_key);
    return state->constructor;
}

bool tsc_value_is_promise(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        return o->is_promise;
    }
    return false;
}

tsc_promise_t* tsc_value_as_promise(tsc_value_t v) {
    if (tsc_value_is_promise(v)) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        return (tsc_promise_t*)o->class_ptr;
    }
    tsc_panic("value is not a promise instance");
    return NULL;
}

tsc_promise_t* tsc_promise_reject(tsc_value_t reason) {
    return promise_allocate(TSC_PROMISE_REJECTED, reason, tsc_value_gc_root(reason));
}

tsc_promise_t* tsc_promise_pending(void) {
    return promise_allocate(TSC_PROMISE_PENDING, tsc_value_undefined(), NULL);
}

typedef struct {
    tsc_promise_t* promise;
    tsc_value_t value;
    void* value_gc_root;
    bool rejected;
} tsc_promise_immediate_settlement_t;

static void tsc_promise_run_immediate_settlement(void* env) {
    tsc_promise_immediate_settlement_t* state =
        (tsc_promise_immediate_settlement_t*)env;
    if (!state || !state->promise) return;
    if (state->rejected) {
        tsc_promise_reject_in_place(state->promise, state->value);
    } else {
        tsc_promise_fulfill_in_place(state->promise, state->value);
    }
    state->value_gc_root = NULL;
}

tsc_promise_t* tsc_promise_settle_immediate(tsc_value_t value, bool rejected) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_promise_immediate_settlement_t* state =
        (tsc_promise_immediate_settlement_t*)TSC_GC_MALLOC(sizeof(*state));
    state->promise = promise;
    state->value = value;
    state->value_gc_root = tsc_value_gc_root(value);
    state->rejected = rejected;
    (void)tsc_set_immediate(tsc_promise_run_immediate_settlement, state);
    return promise;
}

tsc_value_t tsc_promise_with_resolvers(void) {
    return promise_static_with_resolvers(NULL, tsc_promise_constructor_value(), NULL);
}

tsc_promise_t* tsc_promise_adopt(tsc_promise_t* promise) {
    return promise ? promise : tsc_promise_resolve(tsc_value_undefined());
}

void tsc_promise_fulfill_in_place(tsc_promise_t* p, tsc_value_t value) {
    if (!p || p->state != TSC_PROMISE_PENDING) return;
    p->state = TSC_PROMISE_FULFILLED;
    p->result = value;
    p->ptr_result = tsc_value_gc_root(value);
    tsc_promise_trigger_callbacks(p);
}

void tsc_promise_fulfill_in_place_ptr(tsc_promise_t* p, void* ptr_result) {
    if (!p || p->state != TSC_PROMISE_PENDING) return;
    p->state = TSC_PROMISE_FULFILLED;
    p->result = tsc_value_undefined();
    p->ptr_result = ptr_result;
    tsc_promise_trigger_callbacks(p);
}

void tsc_promise_reject_in_place(tsc_promise_t* p, tsc_value_t reason) {
    if (!p || p->state != TSC_PROMISE_PENDING) return;
    p->state = TSC_PROMISE_REJECTED;
    p->result = reason;
    p->ptr_result = tsc_value_gc_root(reason);
    tsc_promise_trigger_callbacks(p);
}

bool tsc_promise_is_fulfilled(const tsc_promise_t* p) {
    return p && p->state == TSC_PROMISE_FULFILLED;
}

bool tsc_promise_is_rejected(const tsc_promise_t* p) {
    return p && p->state == TSC_PROMISE_REJECTED;
}

bool tsc_promise_is_pending(const tsc_promise_t* p) {
    return p && p->state == TSC_PROMISE_PENDING;
}

tsc_value_t tsc_promise_value(const tsc_promise_t* p) {
    if (p && p->box_pointer_result && tsc_value_is_undefined(p->result) && p->ptr_result) {
        tsc_promise_t* mutable = (tsc_promise_t*)p;
        mutable->result = p->box_pointer_result(p->ptr_result);
        mutable->ptr_result = tsc_value_gc_root(mutable->result);
    }
    return p ? p->result : tsc_value_undefined();
}

tsc_promise_t* tsc_promise_set_value_codec(tsc_promise_t* promise, tsc_value_t (*box)(void*)) {
    if (promise && box && !promise->box_pointer_result) promise->box_pointer_result = box;
    return promise;
}

tsc_fs_stats_t* tsc_promise_fs_stats_value(const tsc_promise_t* p) {
    if (p && value_is_object_value(p->result)) return (tsc_fs_stats_t*)tsc_value_as_class(p->result);
    return p ? (tsc_fs_stats_t*)p->ptr_result : NULL;
}

tsc_buffer_t* tsc_promise_buffer_value(const tsc_promise_t* p) {
    if (p && value_is_object_value(p->result)) return tsc_value_as_buffer(p->result);
    return p ? (tsc_buffer_t*)p->ptr_result : NULL;
}

tsc_array_t* tsc_promise_array_value(const tsc_promise_t* p) {
    if (!p) return NULL;
    if (p->ptr_result) return (tsc_array_t*)p->ptr_result;
    if (value_is_box(p->result) && value_tag(p->result) == TSC_VALUE_TAG_ARRAY) {
        return (tsc_array_t*)value_ptr(p->result);
    }
    return NULL;
}

tsc_value_t tsc_promise_reason(const tsc_promise_t* p) {
    return p ? p->result : tsc_value_undefined();
}

tsc_event_emitter_t* tsc_event_emitter_new(void) {
    tsc_event_emitter_t* ee = (tsc_event_emitter_t*)TSC_GC_MALLOC(sizeof(tsc_event_emitter_t));
    ee->object_owner = (tsc_native_object_owner_t){0};
    ee->len = 0;
    ee->cap = 0;
    ee->next_order = 1;
    ee->max_listeners = 0.0;
    ee->has_own_max_listeners = false;
    ee->paused = false;
    ee->listeners = NULL;
    return ee;
}

void event_emitter_reserve(tsc_event_emitter_t* ee, size_t cap) {
    if (!ee || ee->cap >= cap) return;
    size_t next = ee->cap ? ee->cap * 2 : 4;
    if (next < cap) next = cap;
    tsc_event_listener_t* items = (tsc_event_listener_t*)TSC_GC_MALLOC(sizeof(tsc_event_listener_t) * next);
    if (ee->listeners && ee->len > 0) {
        memcpy(items, ee->listeners, sizeof(tsc_event_listener_t) * ee->len);
    }
    ee->listeners = items;
    ee->cap = next;
}

void tsc_event_emitter_on(tsc_event_emitter_t* ee, tsc_str_t* event, tsc_event_listener_fn_t fn, void* env, void* identity, bool once, bool prepend) {
    if (!ee || !event || !fn) return;
    event_emitter_reserve(ee, ee->len + 1);
    size_t idx = ee->len;
    if (prepend) {
        for (size_t i = 0; i < ee->len; i++) {
            if (tsc_str_eq(ee->listeners[i].event, event)) {
                idx = i;
                break;
            }
        }
        for (size_t i = ee->len; i > idx; i--) {
            ee->listeners[i] = ee->listeners[i - 1];
        }
    }
    ee->listeners[idx].event = event;
    ee->listeners[idx].fn = fn;
    ee->listeners[idx].env = env;
    ee->listeners[idx].identity = identity ? identity : env;
    ee->listeners[idx].order = ee->next_order++;
    ee->listeners[idx].once = once;
    ee->len++;
}

void tsc_event_emitter_off(tsc_event_emitter_t* ee, const tsc_str_t* event, tsc_event_listener_fn_t fn, void* identity) {
    if (!ee || !event || !fn) return;
    size_t found = SIZE_MAX;
    uint64_t found_order = 0;
    for (size_t i = 0; i < ee->len; i++) {
        if (!tsc_str_eq(ee->listeners[i].event, event)) continue;
        if (ee->listeners[i].fn != fn || ee->listeners[i].identity != identity) continue;
        if (found == SIZE_MAX || ee->listeners[i].order > found_order) {
            found = i;
            found_order = ee->listeners[i].order;
        }
    }
    if (found != SIZE_MAX) {
        for (size_t j = found + 1; j < ee->len; j++) ee->listeners[j - 1] = ee->listeners[j];
        ee->len--;
    }
}

void tsc_event_emitter_remove_all(tsc_event_emitter_t* ee, const tsc_str_t* event) {
    if (!ee) return;
    if (!event) {
        ee->len = 0;
        return;
    }
    size_t out = 0;
    for (size_t i = 0; i < ee->len; i++) {
        if (tsc_str_eq(ee->listeners[i].event, event)) continue;
        if (out != i) ee->listeners[out] = ee->listeners[i];
        out++;
    }
    ee->len = out;
}

tsc_array_t* event_args_copy_as_values(tsc_array_t* args) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), args && args->len ? args->len : 1);
    if (!args) return out;
    for (size_t i = 0; i < args->len; i++) {
        tsc_value_t value = TSC_ARR(tsc_value_t, args, i);
        tsc_array_push_raw(out, &value);
    }
    return out;
}

void event_once_promise_resolve_listener(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args);
void event_once_promise_reject_listener(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args);

static tsc_value_t event_once_promise_abort_reason(const tsc_event_once_promise_env_t* state) {
    if (!state || !state->signal) return tsc_value_undefined();
    return tsc_value_get_prop(
        tsc_value_object(state->signal),
        tsc_str_from_lit("reason", 6)
    );
}

static tsc_value_t event_once_promise_abort_listener_value(const tsc_event_once_promise_env_t* state) {
    if (!state || !state->abort_listener) return tsc_value_undefined();
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)state->abort_listener);
}

static void event_once_promise_remove_abort_listener(tsc_event_once_promise_env_t* state) {
    if (!state || !state->signal || !state->abort_listener) return;
    tsc_value_t signal = tsc_value_object(state->signal);
    tsc_value_t remove = tsc_value_get_prop(
        signal,
        tsc_str_from_lit("removeEventListener", 19)
    );
    if (!tsc_value_is_callable(remove)) return;
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 2);
    tsc_value_t type = tsc_value_string(tsc_str_from_lit("abort", 5));
    tsc_value_t listener = event_once_promise_abort_listener_value(state);
    tsc_array_push_raw(args, &type);
    tsc_array_push_raw(args, &listener);
    (void)tsc_value_apply_function(remove, signal, tsc_value_array(args));
    state->abort_listener = NULL;
}

static tsc_value_t event_once_promise_abort(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    (void)args;
    tsc_event_once_promise_env_t* state = (tsc_event_once_promise_env_t*)env;
    if (!state || !state->promise || !tsc_promise_is_pending(state->promise)) {
        return tsc_value_undefined();
    }
    tsc_event_emitter_off(state->emitter, state->event, event_once_promise_resolve_listener, state);
    tsc_event_emitter_off(state->emitter, tsc_str_from_lit("error", 5), event_once_promise_reject_listener, state);
    tsc_promise_reject_in_place(state->promise, event_once_promise_abort_reason(state));
    return tsc_value_undefined();
}

static void event_once_promise_add_abort_listener(tsc_event_once_promise_env_t* state, tsc_value_t signal) {
    if (!state || !value_is_box(signal) || value_tag(signal) != TSC_VALUE_TAG_OBJECT) return;
    tsc_value_t add = tsc_value_get_prop(signal, tsc_str_from_lit("addEventListener", 16));
    if (!tsc_value_is_callable(add)) return;
    state->signal = (tsc_object_t*)value_ptr(signal);
    tsc_value_t listener = tsc_value_function_builtin_named(
        event_once_promise_abort,
        state,
        1.0,
        tsc_str_from_lit("eventOncePromiseAbort", 21)
    );
    state->abort_listener = (tsc_function_identity_t*)value_ptr(listener);
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 2);
    tsc_value_t type = tsc_value_string(tsc_str_from_lit("abort", 5));
    tsc_array_push_raw(args, &type);
    tsc_array_push_raw(args, &listener);
    (void)tsc_value_apply_function(add, signal, tsc_value_array(args));
}

void event_once_promise_resolve_listener(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args) {
    (void)emitter;
    tsc_event_once_promise_env_t* state = (tsc_event_once_promise_env_t*)env;
    if (!state || !state->promise || !tsc_promise_is_pending(state->promise)) return;
    tsc_event_emitter_off(state->emitter, tsc_str_from_lit("error", 5), event_once_promise_reject_listener, state);
    event_once_promise_remove_abort_listener(state);
    tsc_promise_fulfill_in_place(state->promise, tsc_value_array(event_args_copy_as_values(args)));
}

void event_once_promise_reject_listener(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args) {
    (void)emitter;
    tsc_event_once_promise_env_t* state = (tsc_event_once_promise_env_t*)env;
    if (!state || !state->promise || !tsc_promise_is_pending(state->promise)) return;
    tsc_event_emitter_off(state->emitter, state->event, event_once_promise_resolve_listener, state);
    event_once_promise_remove_abort_listener(state);
    tsc_value_t reason = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_string(tsc_str_from_lit("Unhandled error event", 21));
    tsc_promise_reject_in_place(state->promise, reason);
}

tsc_promise_t* tsc_event_emitter_once_promise(tsc_event_emitter_t* ee, tsc_str_t* event, tsc_value_t signal) {
    tsc_promise_t* promise = tsc_promise_pending();
    if (!ee || !event) return promise;
    tsc_event_once_promise_env_t* env = (tsc_event_once_promise_env_t*)TSC_GC_MALLOC(sizeof(tsc_event_once_promise_env_t));
    env->emitter = ee;
    env->event = event;
    env->promise = promise;
    env->signal = NULL;
    env->abort_listener = NULL;
    event_once_promise_add_abort_listener(env, signal);
    if (tsc_promise_is_rejected(promise)) return promise;
    tsc_event_emitter_on(ee, event, event_once_promise_resolve_listener, env, env, true, false);
    if (!str_lit_eq(event, "error")) {
        tsc_event_emitter_on(ee, tsc_str_from_lit("error", 5), event_once_promise_reject_listener, env, env, true, false);
    }
    return promise;
}

typedef enum { TSC_TIMERS_QUEUE_DELAYED, TSC_TIMERS_QUEUE_IMMEDIATE } tsc_timers_queue_t;
typedef struct {
    const char* name;
    int delay_argument, payload_argument, options_argument;
    tsc_timers_queue_t queue;
    bool interval;
} tsc_timers_promise_descriptor_t;
static const tsc_timers_promise_descriptor_t timers_promise_operations[] = {
#define TSC_TIMERS_PROMISE_OPERATION(name, operation, delay, payload, options, queue, interval) \
    [TSC_TIMERS_PROMISE_##operation] = { name, delay, payload, options, TSC_TIMERS_QUEUE_##queue, interval },
#include "tsc_timers_promises.def"
#undef TSC_TIMERS_PROMISE_OPERATION
};

/* A retained actual List owns all source arguments. A second value List owns
 * projected options, including fresh values returned by getters. Both use the
 * canonical array codec and its decoded-root vector, independently of length. */
typedef struct {
    const tsc_timers_promise_descriptor_t* operation;
    tsc_array_t* arguments;
    tsc_array_t* options;
    tsc_promise_t* promise;
    tsc_object_t* iterator;
    double timer_id, delay;
    tsc_array_t* queued;
    tsc_array_t* pending;
    tsc_object_t* signal;
    bool started, closed, aborted, abort_delivered;
} tsc_timers_promises_record_t;

static tsc_value_t timers_promises_argument(const tsc_timers_promises_record_t* state, int index) {
    return index < 0 ? tsc_value_undefined() : promise_argument(state->arguments, (size_t)index);
}

static void timers_promises_validate_signal(tsc_value_t signal) {
    if (tsc_value_is_undefined(signal)) return;
    if (tsc_value_is_nullish(signal) || !str_lit_eq(tsc_value_typeof(signal), "object") ||
        !tsc_value_has_prop(signal, tsc_str_from_lit("aborted", 7)))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("timers/promises signal must be an AbortSignal"));
    if (!tsc_abort_signal_is_native(signal))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("timers/promises requires a native AbortSignal"));
}

static void timers_promises_validate_ref(tsc_value_t ref) {
    if (!str_lit_eq(tsc_value_typeof(ref), "boolean"))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("timers/promises ref must be a Boolean"));
}

typedef struct {
    const char* name;
    void (*validate)(tsc_value_t);
    bool default_ref;
} tsc_timers_option_descriptor_t;
static const tsc_timers_option_descriptor_t timers_promise_options[] = {
    { "signal", timers_promises_validate_signal, false },
    { "ref", timers_promises_validate_ref, true },
};

static void timers_promises_validate(tsc_timers_promises_record_t* state) {
    tsc_value_t delay = timers_promises_argument(state, state->operation->delay_argument);
    if (!tsc_value_is_undefined(delay) && !str_lit_eq(tsc_value_typeof(delay), "number"))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("timers/promises delay must be a Number"));
    state->delay = tsc_value_is_undefined(delay) ? 1.0 : tsc_value_as_num(delay);
    if (!isfinite(state->delay) || state->delay < 1.0 || state->delay > 2147483647.0) state->delay = 1.0;
    tsc_value_t options = timers_promises_argument(state, state->operation->options_argument);
    if (tsc_value_is_undefined(options)) return;
    if (tsc_value_is_nullish(options) || tsc_value_is_array(options) ||
        !str_lit_eq(tsc_value_typeof(options), "object"))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("timers/promises options must be an Object"));
    for (size_t index = 0; index < sizeof(timers_promise_options) / sizeof(*timers_promise_options); ++index) {
        const tsc_timers_option_descriptor_t* field = &timers_promise_options[index];
        tsc_str_t* key = tsc_str_from_lit(field->name, strlen(field->name));
        tsc_value_t value = tsc_value_get_prop(options, key);
        void* volatile value_gc_root = tsc_value_gc_root(value);
        if (!tsc_value_is_undefined(value)) {
            tsc_value_t validated = tsc_value_get_prop(options, key);
            void* volatile validated_gc_root = tsc_value_gc_root(validated);
            field->validate(validated);
            (void)validated_gc_root;
        }
        (void)value_gc_root;
    }
}

static void timers_promises_project_options(tsc_timers_promises_record_t* state) {
    tsc_value_t options = timers_promises_argument(state, state->operation->options_argument);
    for (size_t index = 0; index < sizeof(timers_promise_options) / sizeof(*timers_promise_options); ++index) {
        const tsc_timers_option_descriptor_t* field = &timers_promise_options[index];
        tsc_value_t value = tsc_value_is_undefined(options) ? tsc_value_undefined() :
            tsc_value_get_prop(options, tsc_str_from_lit(field->name, strlen(field->name)));
        if (tsc_value_is_undefined(value) && field->default_ref) value = tsc_value_bool(true);
        tsc_array_push_value(state->options, value);
    }
}

static void timers_promises_interval_abort(void* env);
static void timers_promises_interval_tick(void* env);

static void timers_promises_complete(void* env) {
    tsc_timers_promises_record_t* state = env;
    tsc_promise_resolve_into(state->promise,
        timers_promises_argument(state, state->operation->payload_argument));
}

static void timers_promises_schedule(tsc_timers_promises_record_t* state) {
    timers_promises_project_options(state);
    tsc_value_t signal = TSC_ARR(tsc_value_t, state->options, 0);
    bool referenced = tsc_value_is_truthy(TSC_ARR(tsc_value_t, state->options, 1));
    if (state->operation->interval) {
        state->signal = value_is_box(signal) && value_tag(signal) == TSC_VALUE_TAG_OBJECT ? value_ptr(signal) : NULL;
        if (!tsc_value_is_undefined(signal)) tsc_abort_signal_add_callback(signal, timers_promises_interval_abort, state);
        if (!state->closed) state->timer_id = tsc_set_interval(timers_promises_interval_tick, state, state->delay);
    } else if (state->operation->queue == TSC_TIMERS_QUEUE_IMMEDIATE) {
        state->timer_id = tsc_set_immediate(timers_promises_complete, state);
        if (!referenced) tsc_unref_immediate(state->timer_id);
        if (!tsc_value_is_undefined(signal)) {
            tsc_abort_signal_add_promise(signal, state->promise);
            tsc_abort_signal_add_immediate(signal, state->timer_id);
        }
    } else {
        state->timer_id = tsc_set_timeout(timers_promises_complete, state, state->delay);
        if (!tsc_value_is_undefined(signal)) {
            tsc_abort_signal_add_promise(signal, state->promise);
            tsc_abort_signal_add_timeout(signal, state->timer_id);
        }
    }
    if (!referenced && state->operation->queue == TSC_TIMERS_QUEUE_DELAYED) tsc_unref_timeout(state->timer_id);
}

static tsc_value_t timers_promises_interval_result(tsc_value_t value, bool done) {
    tsc_object_t* result = tsc_object_new();
    tsc_object_set(result, tsc_str_from_lit("value", 5), value);
    tsc_object_set(result, tsc_str_from_lit("done", 4), tsc_value_bool(done));
    return tsc_value_object(result);
}

static void timers_promises_interval_remove_first(tsc_array_t* values) {
    if (!values || values->len == 0) return;
    if (values->len > 1) {
        memmove(values->data, (char*)values->data + values->es, (values->len - 1) * values->es);
        if (values->value_roots) memmove(values->value_roots, values->value_roots + 1, (values->len - 1) * sizeof(void*));
    }
    values->len--;
    if (values->dense_len > values->len) values->dense_len = values->len;
    if (values->value_roots) values->value_roots[values->len] = NULL;
}

static tsc_value_t timers_promises_interval_abort_reason(const tsc_timers_promises_record_t* state) {
    if (!state || !state->signal) return tsc_value_undefined();
    return tsc_value_get_prop(
        tsc_value_object(state->signal),
        tsc_str_from_lit("reason", 6)
    );
}

static void timers_promises_interval_abort(void* env) {
    tsc_timers_promises_record_t* state = (tsc_timers_promises_record_t*)env;
    if (!state || state->closed) return;
    state->closed = true;
    state->aborted = true;
    state->abort_delivered = false;
    if (state->timer_id > 0.0) tsc_clear_timeout(state->timer_id);
    state->queued->len = 0;
    if (state->pending->len > 0) {
        tsc_promise_t* promise = TSC_ARR(tsc_promise_t*, state->pending, 0);
        timers_promises_interval_remove_first(state->pending);
        state->abort_delivered = true;
        tsc_promise_reject_in_place(promise, timers_promises_interval_abort_reason(state));
    }
}

static void timers_promises_interval_tick(void* env) {
    tsc_timers_promises_record_t* state = (tsc_timers_promises_record_t*)env;
    if (!state || state->closed) return;
    if (state->pending->len > 0) {
        tsc_promise_t* promise = TSC_ARR(tsc_promise_t*, state->pending, 0);
        timers_promises_interval_remove_first(state->pending);
        tsc_promise_fulfill_in_place(promise, timers_promises_interval_result(timers_promises_argument(state, state->operation->payload_argument), false));
        return;
    }
    tsc_value_t value = timers_promises_argument(state, state->operation->payload_argument);
    tsc_array_push_raw(state->queued, &value);
}

static tsc_value_t timers_promises_interval_next(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    (void)args;
    tsc_timers_promises_record_t* state = (tsc_timers_promises_record_t*)env;
    if (!state) return tsc_value_promise(tsc_promise_resolve(timers_promises_interval_result(tsc_value_undefined(), true)));
    if (state->queued->len > 0) {
        tsc_value_t value = TSC_ARR(tsc_value_t, state->queued, 0);
        timers_promises_interval_remove_first(state->queued);
        return tsc_value_promise(tsc_promise_resolve(timers_promises_interval_result(value, false)));
    }
    if (state->aborted) {
        if (!state->abort_delivered) {
            state->abort_delivered = true;
            return tsc_value_promise(tsc_promise_reject(timers_promises_interval_abort_reason(state)));
        }
        return tsc_value_promise(tsc_promise_resolve(timers_promises_interval_result(tsc_value_undefined(), true)));
    }
    if (state->closed) {
        return tsc_value_promise(tsc_promise_resolve(timers_promises_interval_result(tsc_value_undefined(), true)));
    }
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_array_push_raw(state->pending, &promise);
    if (!state->started) {
        state->started = true;
        TSC_TRY_FRAME(frame);
        tsc_try_push(&frame);
        if (setjmp(frame.jb) == 0) {
            timers_promises_validate(state);
            timers_promises_schedule(state);
            tsc_try_pop();
        } else {
            tsc_value_t error = tsc_current_error_value();
            tsc_try_pop();
            state->closed = true;
            state->pending->len = state->pending->dense_len = 0;
            tsc_promise_reject_in_place(promise, error);
        }
    }
    return tsc_value_promise(promise);
}

static tsc_value_t timers_promises_interval_return(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_timers_promises_record_t* state = (tsc_timers_promises_record_t*)env;
    if (!state) return tsc_value_promise(tsc_promise_resolve(timers_promises_interval_result(tsc_value_undefined(), true)));
    if (!state->closed) {
        state->closed = true;
        if (state->timer_id > 0.0) tsc_clear_timeout(state->timer_id);
        state->queued->len = 0;
    }
    while (state->pending->len > 0) {
        tsc_promise_t* promise = TSC_ARR(tsc_promise_t*, state->pending, 0);
        timers_promises_interval_remove_first(state->pending);
        tsc_promise_fulfill_in_place(promise, timers_promises_interval_result(tsc_value_undefined(), true));
    }
    tsc_value_t value = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    return tsc_value_promise(tsc_promise_resolve(timers_promises_interval_result(value, true)));
}

static tsc_value_t timers_promises_interval_async_iterator(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    (void)args;
    tsc_timers_promises_record_t* state = (tsc_timers_promises_record_t*)env;
    return state ? tsc_value_object(state->iterator) : tsc_value_undefined();
}

tsc_value_t tsc_timers_promises_call(tsc_timers_promise_operation_t operation, tsc_array_t* arguments) {
    if ((unsigned)operation >= sizeof(timers_promise_operations) / sizeof(*timers_promise_operations))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("timers/promises requires a canonical operation descriptor"));
    tsc_timers_promises_record_t* state = TSC_GC_MALLOC(sizeof(*state));
    *state = (tsc_timers_promises_record_t){ .operation = &timers_promise_operations[operation], .arguments = arguments };
    state->options = tsc_array_new(sizeof(tsc_value_t), 1);
    if (state->operation->interval) {
        state->queued = tsc_array_new(sizeof(tsc_value_t), 1);
        state->pending = tsc_array_new(sizeof(tsc_promise_t*), 1);
        state->iterator = tsc_object_new();
        tsc_object_set(state->iterator, tsc_str_from_lit("next", 4), tsc_value_function_builtin_named(timers_promises_interval_next, state, 0.0, tsc_str_from_lit("next", 4)));
        tsc_object_set(state->iterator, tsc_str_from_lit("return", 6), tsc_value_function_builtin_named(timers_promises_interval_return, state, 0.0, tsc_str_from_lit("return", 6)));
        tsc_value_set_symbol_prop(tsc_value_object(state->iterator), tsc_symbol_async_iterator(),
            tsc_value_function_builtin_named(timers_promises_interval_async_iterator, state, 0.0, tsc_str_from_lit("[Symbol.asyncIterator]", 22)));
        return tsc_value_object(state->iterator);
    }
    state->promise = tsc_promise_pending();
    state->started = true;
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) == 0) {
        timers_promises_validate(state);
        tsc_try_pop();
    } else {
        tsc_value_t error = tsc_current_error_value();
        tsc_try_pop();
        tsc_promise_reject_in_place(state->promise, error);
        return tsc_value_promise(state->promise);
    }
    /* Native one-shot validation rejects its Promise. Subsequent option
     * projection runs in the caller; interval activation runs inside next. */
    timers_promises_schedule(state);
    return tsc_value_promise(state->promise);
}

typedef struct {
    tsc_event_emitter_t* emitter;
    tsc_str_t* event;
    tsc_array_t* close_events;
    tsc_array_t* queued;
    tsc_array_t* pending;
    tsc_value_t iterator;
    tsc_object_t* signal;
    tsc_function_identity_t* abort_listener;
    bool error_listener_installed;
    tsc_value_t error_reason;
    bool closed;
    bool aborted;
    bool abort_delivered;
    bool errored;
    bool error_delivered;
    double high_water_mark;
    double low_water_mark;
    bool paused_by_iterator;
} tsc_event_async_iterator_t;

static tsc_value_t event_async_iterator_result(tsc_value_t value, bool done) {
    tsc_object_t* result = tsc_object_new();
    tsc_object_set(result, tsc_str_from_lit("value", 5), value);
    tsc_object_set(result, tsc_str_from_lit("done", 4), tsc_value_bool(done));
    return tsc_value_object(result);
}

static void event_async_iterator_remove_first(tsc_array_t* values) {
    if (!values || values->len == 0) return;
    if (values->len > 1) {
        memmove(values->data, (char*)values->data + values->es, (values->len - 1) * values->es);
    }
    values->len--;
}

static void event_async_iterator_resolve_pending(tsc_event_async_iterator_t* state, tsc_array_t* args) {
    if (!state || state->pending->len == 0) return;
    tsc_promise_t* promise = TSC_ARR(tsc_promise_t*, state->pending, 0);
    event_async_iterator_remove_first(state->pending);
    tsc_promise_fulfill_in_place(promise, event_async_iterator_result(tsc_value_array(event_args_copy_as_values(args)), false));
}

static void event_async_iterator_resume_if_needed(tsc_event_async_iterator_t* state) {
    if (!state || !state->paused_by_iterator) return;
    tsc_event_emitter_resume(state->emitter);
    state->paused_by_iterator = false;
}

static void event_async_iterator_pause_if_needed(tsc_event_async_iterator_t* state) {
    if (!state || state->closed || state->paused_by_iterator) return;
    if (state->queued->len <= state->high_water_mark) return;
    if (tsc_event_emitter_is_paused(state->emitter)) return;
    tsc_event_emitter_pause(state->emitter);
    state->paused_by_iterator = true;
}

static void event_async_iterator_maybe_resume(tsc_event_async_iterator_t* state) {
    if (!state || state->queued->len >= state->low_water_mark) return;
    event_async_iterator_resume_if_needed(state);
}

static void event_async_iterator_listener(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args) {
    (void)emitter;
    tsc_event_async_iterator_t* state = (tsc_event_async_iterator_t*)env;
    if (!state || state->closed) return;
    if (state->pending->len > 0) {
        event_async_iterator_resolve_pending(state, args);
        return;
    }
    tsc_array_t* copy = event_args_copy_as_values(args);
    tsc_array_push_raw(state->queued, &copy);
    event_async_iterator_pause_if_needed(state);
}

static tsc_value_t event_async_iterator_abort_reason(const tsc_event_async_iterator_t* state) {
    if (!state || !state->signal) return tsc_value_undefined();
    return tsc_value_get_prop(
        tsc_value_object(state->signal),
        tsc_str_from_lit("reason", 6)
    );
}

static tsc_value_t event_async_iterator_abort_listener_value(const tsc_event_async_iterator_t* state) {
    if (!state || !state->abort_listener) return tsc_value_undefined();
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)state->abort_listener);
}

static void event_async_iterator_remove_abort_listener(tsc_event_async_iterator_t* state) {
    if (!state || !state->signal || !state->abort_listener) return;
    tsc_value_t signal = tsc_value_object(state->signal);
    tsc_value_t remove = tsc_value_get_prop(
        signal,
        tsc_str_from_lit("removeEventListener", 19)
    );
    if (!tsc_value_is_callable(remove)) return;
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 2);
    tsc_value_t type = tsc_value_string(tsc_str_from_lit("abort", 5));
    tsc_value_t listener = event_async_iterator_abort_listener_value(state);
    tsc_array_push_raw(args, &type);
    tsc_array_push_raw(args, &listener);
    (void)tsc_value_apply_function(remove, signal, tsc_value_array(args));
}

static void event_async_iterator_error(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args);
static void event_async_iterator_close_listener(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args);
static void event_async_iterator_close_internal(tsc_event_async_iterator_t* state, bool clear_queued);
static void event_async_iterator_close(tsc_event_async_iterator_t* state);

static void event_async_iterator_remove_error_listener(tsc_event_async_iterator_t* state) {
    if (!state || !state->error_listener_installed || !state->emitter || !state->event) return;
    if (str_lit_eq(state->event, "error")) return;
    tsc_event_emitter_off(
        state->emitter,
        tsc_str_from_lit("error", 5),
        event_async_iterator_error,
        state
    );
    state->error_listener_installed = false;
}

static void event_async_iterator_remove_close_listeners(tsc_event_async_iterator_t* state) {
    if (!state || !state->close_events || !state->emitter) return;
    for (size_t i = 0; i < state->close_events->len; i++) {
        tsc_str_t* event = TSC_ARR(tsc_str_t*, state->close_events, i);
        if (event) tsc_event_emitter_off(state->emitter, event, event_async_iterator_close_listener, state);
    }
}

static tsc_value_t event_async_iterator_abort(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    (void)args;
    tsc_event_async_iterator_t* state = (tsc_event_async_iterator_t*)env;
    if (!state || state->aborted) return tsc_value_undefined();
    state->aborted = true;
    state->closed = true;
    event_async_iterator_resume_if_needed(state);
    tsc_event_emitter_off(state->emitter, state->event, event_async_iterator_listener, state);
    event_async_iterator_remove_error_listener(state);
    event_async_iterator_remove_close_listeners(state);
    tsc_value_t reason = event_async_iterator_abort_reason(state);
    if (state->pending->len > 0) {
        tsc_promise_t* promise = TSC_ARR(tsc_promise_t*, state->pending, 0);
        event_async_iterator_remove_first(state->pending);
        tsc_promise_reject_in_place(promise, reason);
        state->abort_delivered = true;
    }
    while (state->pending->len > 0) {
        tsc_promise_t* promise = TSC_ARR(tsc_promise_t*, state->pending, 0);
        event_async_iterator_remove_first(state->pending);
        tsc_promise_fulfill_in_place(promise, event_async_iterator_result(tsc_value_undefined(), true));
    }
    return tsc_value_undefined();
}

static void event_async_iterator_error(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args) {
    (void)emitter;
    tsc_event_async_iterator_t* state = (tsc_event_async_iterator_t*)env;
    if (!state || state->errored || state->aborted) return;
    state->errored = true;
    state->closed = true;
    event_async_iterator_resume_if_needed(state);
    state->error_reason = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_event_emitter_off(state->emitter, state->event, event_async_iterator_listener, state);
    tsc_event_emitter_off(state->emitter, tsc_str_from_lit("error", 5), event_async_iterator_error, state);
    state->error_listener_installed = false;
    event_async_iterator_remove_close_listeners(state);
    event_async_iterator_remove_abort_listener(state);
    if (state->pending->len > 0) {
        tsc_promise_t* promise = TSC_ARR(tsc_promise_t*, state->pending, 0);
        event_async_iterator_remove_first(state->pending);
        tsc_promise_reject_in_place(promise, state->error_reason);
        state->error_delivered = true;
    }
    while (state->pending->len > 0) {
        tsc_promise_t* promise = TSC_ARR(tsc_promise_t*, state->pending, 0);
        event_async_iterator_remove_first(state->pending);
        tsc_promise_fulfill_in_place(promise, event_async_iterator_result(tsc_value_undefined(), true));
    }
}

static void event_async_iterator_add_abort_listener(tsc_event_async_iterator_t* state, tsc_value_t signal) {
    if (!state || !value_is_box(signal) || value_tag(signal) != TSC_VALUE_TAG_OBJECT) return;
    tsc_value_t add = tsc_value_get_prop(signal, tsc_str_from_lit("addEventListener", 16));
    if (!tsc_value_is_callable(add)) return;
    state->signal = (tsc_object_t*)value_ptr(signal);
    tsc_value_t listener = tsc_value_function_builtin_named(
        event_async_iterator_abort,
        state,
        1.0,
        tsc_str_from_lit("eventAsyncIteratorAbort", 24)
    );
    state->abort_listener = (tsc_function_identity_t*)value_ptr(listener);
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 2);
    tsc_value_t type = tsc_value_string(tsc_str_from_lit("abort", 5));
    tsc_array_push_raw(args, &type);
    tsc_array_push_raw(args, &listener);
    (void)tsc_value_apply_function(add, signal, tsc_value_array(args));
}

static void event_async_iterator_close_internal(tsc_event_async_iterator_t* state, bool clear_queued) {
    if (!state) return;
    event_async_iterator_resume_if_needed(state);
    if (!state->closed) {
        state->closed = true;
        tsc_event_emitter_off(state->emitter, state->event, event_async_iterator_listener, state);
        event_async_iterator_remove_error_listener(state);
        event_async_iterator_remove_close_listeners(state);
        if (!state->aborted) event_async_iterator_remove_abort_listener(state);
    }
    while (state->pending->len > 0) {
        tsc_promise_t* promise = TSC_ARR(tsc_promise_t*, state->pending, 0);
        event_async_iterator_remove_first(state->pending);
        tsc_promise_fulfill_in_place(promise, event_async_iterator_result(tsc_value_undefined(), true));
    }
    if (clear_queued && !state->aborted) state->queued->len = 0;
}

static void event_async_iterator_close(tsc_event_async_iterator_t* state) {
    event_async_iterator_close_internal(state, true);
}

static void event_async_iterator_close_listener(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args) {
    (void)emitter;
    (void)args;
    event_async_iterator_close_internal((tsc_event_async_iterator_t*)env, false);
}

static tsc_value_t event_async_iterator_next(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    (void)args;
    tsc_event_async_iterator_t* state = (tsc_event_async_iterator_t*)env;
    if (!state) {
        return tsc_value_promise(tsc_promise_resolve(event_async_iterator_result(tsc_value_undefined(), true)));
    }
    if (state->queued->len > 0) {
        tsc_array_t* values = TSC_ARR(tsc_array_t*, state->queued, 0);
        event_async_iterator_remove_first(state->queued);
        event_async_iterator_maybe_resume(state);
        return tsc_value_promise(tsc_promise_resolve(event_async_iterator_result(tsc_value_array(values), false)));
    }
    if (state->errored) {
        if (!state->error_delivered) {
            state->error_delivered = true;
            return tsc_value_promise(tsc_promise_reject(state->error_reason));
        }
        return tsc_value_promise(tsc_promise_resolve(event_async_iterator_result(tsc_value_undefined(), true)));
    }
    if (state->aborted) {
        if (!state->abort_delivered) {
            state->abort_delivered = true;
            return tsc_value_promise(tsc_promise_reject(event_async_iterator_abort_reason(state)));
        }
        return tsc_value_promise(tsc_promise_resolve(event_async_iterator_result(tsc_value_undefined(), true)));
    }
    if (state->closed) {
        return tsc_value_promise(tsc_promise_resolve(event_async_iterator_result(tsc_value_undefined(), true)));
    }
    if (state->queued->len > 0) {
        tsc_array_t* values = TSC_ARR(tsc_array_t*, state->queued, 0);
        event_async_iterator_remove_first(state->queued);
        return tsc_value_promise(tsc_promise_resolve(event_async_iterator_result(tsc_value_array(values), false)));
    }
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_array_push_raw(state->pending, &promise);
    return tsc_value_promise(promise);
}

static tsc_value_t event_async_iterator_return(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_event_async_iterator_t* state = (tsc_event_async_iterator_t*)env;
    event_async_iterator_close(state);
    tsc_value_t value = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    return tsc_value_promise(tsc_promise_resolve(event_async_iterator_result(value, true)));
}

static tsc_value_t event_async_iterator_async_iterator(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    (void)args;
    tsc_event_async_iterator_t* state = (tsc_event_async_iterator_t*)env;
    return state ? state->iterator : tsc_value_undefined();
}

static bool event_async_iterator_valid_watermark(double value) {
    return isfinite(value) && value >= 0.0 && floor(value) == value && value <= 9007199254740991.0;
}

tsc_value_t tsc_event_emitter_on_async_iterator(tsc_event_emitter_t* ee, tsc_str_t* event, tsc_value_t signal, tsc_array_t* close_events, double high_water_mark, double low_water_mark) {
    if (!ee || !event) return tsc_value_undefined();
    if (!event_async_iterator_valid_watermark(high_water_mark) || !event_async_iterator_valid_watermark(low_water_mark)) {
        tsc_throw_str(tsc_str_from_cstr("events.on highWaterMark and lowWaterMark must be non-negative integers"));
        return tsc_value_undefined();
    }
    tsc_event_async_iterator_t* state = (tsc_event_async_iterator_t*)TSC_GC_MALLOC(sizeof(tsc_event_async_iterator_t));
    state->emitter = ee;
    state->event = event;
    state->close_events = close_events;
    state->queued = tsc_array_new(sizeof(tsc_array_t*), 4);
    state->pending = tsc_array_new(sizeof(tsc_promise_t*), 4);
    state->signal = NULL;
    state->abort_listener = NULL;
    state->error_listener_installed = false;
    state->error_reason = tsc_value_undefined();
    state->closed = false;
    state->aborted = false;
    state->abort_delivered = false;
    state->errored = false;
    state->error_delivered = false;
    state->high_water_mark = high_water_mark;
    state->low_water_mark = low_water_mark;
    state->paused_by_iterator = false;
    tsc_object_t* iterator = tsc_object_new();
    state->iterator = tsc_value_object(iterator);
    tsc_object_set(iterator, tsc_str_from_lit("next", 4), tsc_value_function_builtin_named(event_async_iterator_next, state, 0.0, tsc_str_from_lit("next", 4)));
    tsc_object_set(iterator, tsc_str_from_lit("return", 6), tsc_value_function_builtin_named(event_async_iterator_return, state, 0.0, tsc_str_from_lit("return", 6)));
    tsc_value_set_symbol_prop(
        state->iterator,
        tsc_symbol_async_iterator(),
        tsc_value_function_builtin_named(
            event_async_iterator_async_iterator,
            state,
            0.0,
            tsc_str_from_lit("[Symbol.asyncIterator]", 22)
        )
    );
    event_async_iterator_add_abort_listener(state, signal);
    if (!state->closed) {
        tsc_event_emitter_on(ee, event, event_async_iterator_listener, state, state, false, false);
        if (!str_lit_eq(event, "error")) {
            state->error_listener_installed = true;
            tsc_event_emitter_on(ee, tsc_str_from_lit("error", 5), event_async_iterator_error, state, state, false, false);
        }
        if (close_events) {
            for (size_t i = 0; i < close_events->len; i++) {
                tsc_str_t* close_event = TSC_ARR(tsc_str_t*, close_events, i);
                if (close_event) {
                    tsc_event_emitter_on(ee, close_event, event_async_iterator_close_listener, state, state, false, false);
                }
            }
        }
    }
    return state->iterator;
}
