#include "tsc_internal.h"

tsc_promise_t* tsc_promise_resolve(tsc_value_t value) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_FULFILLED;
    p->result = value;
    p->ptr_result = NULL;
    p->callbacks = NULL;
    p->callbacks_len = 0;
    p->callbacks_cap = 0;
    return p;
}

tsc_promise_t* tsc_promise_resolve_fs_stats(tsc_fs_stats_t* value) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_FULFILLED;
    p->result = tsc_value_undefined();
    p->ptr_result = value;
    p->callbacks = NULL;
    p->callbacks_len = 0;
    p->callbacks_cap = 0;
    return p;
}

tsc_promise_t* tsc_promise_resolve_buffer(tsc_buffer_t* value) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_FULFILLED;
    p->result = tsc_value_undefined();
    p->ptr_result = value;
    p->callbacks = NULL;
    p->callbacks_len = 0;
    p->callbacks_cap = 0;
    return p;
}

tsc_promise_t* tsc_promise_resolve_array(tsc_array_t* value) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_FULFILLED;
    p->result = tsc_value_undefined();
    p->ptr_result = value;
    p->callbacks = NULL;
    p->callbacks_len = 0;
    p->callbacks_cap = 0;
    return p;
}

typedef struct {
    tsc_promise_t* promise;
    tsc_value_t thenable;
    tsc_value_t then_fn;
    tsc_array_t* seen;
    bool done;
} tsc_promise_thenable_state_t;

static tsc_promise_t* tsc_promise_resolve_thenable_seen(tsc_value_t value, tsc_array_t* seen);

static bool promise_seen_contains(tsc_array_t* seen, tsc_value_t value) {
    if (!seen) return false;
    for (size_t i = 0; i < seen->len; i++) {
        if (tsc_value_eq(TSC_ARR(tsc_value_t, seen, i), value)) return true;
    }
    return false;
}

static tsc_value_t promise_dynamic_item(const tsc_array_t* src, size_t index) {
    if (!src || src->es != sizeof(tsc_value_t) || index >= src->len) {
        return tsc_value_undefined();
    }
    return tsc_value_get_index(tsc_value_array((tsc_array_t*)src), (double)index);
}

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

static void promise_adopt_into(tsc_promise_t* dest, tsc_promise_t* source) {
    tsc_promise_adopt_into(dest, source);
}

static tsc_value_t promise_thenable_resolve(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_promise_thenable_state_t* state = (tsc_promise_thenable_state_t*)env;
    tsc_value_t value = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    if (state && state->promise) {
        if (state->done) return tsc_value_undefined();
        state->done = true;
        if (
            tsc_value_eq(value, state->thenable) ||
            (tsc_value_is_promise(value) && tsc_value_as_promise(value) == state->promise)
        ) {
            tsc_promise_reject_in_place(state->promise, tsc_value_string(tsc_str_from_cstr("TypeError: Promise resolved with itself")));
            return tsc_value_undefined();
        }
        promise_adopt_into(state->promise, tsc_promise_resolve_thenable_seen(value, state->seen));
    }
    return tsc_value_undefined();
}

static tsc_value_t promise_thenable_reject(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_promise_thenable_state_t* state = (tsc_promise_thenable_state_t*)env;
    tsc_value_t reason = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    if (state && state->promise) {
        if (state->done) return tsc_value_undefined();
        state->done = true;
        tsc_promise_reject_in_place(state->promise, reason);
    }
    return tsc_value_undefined();
}

static bool is_ecma_object(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    tsc_value_tag_t tag = value_tag(v);
    return tag == TSC_VALUE_TAG_OBJECT || tag == TSC_VALUE_TAG_ARRAY || tag == TSC_VALUE_TAG_FUNCTION;
}

static void promise_thenable_job(void* env) {
    tsc_promise_thenable_state_t* state = (tsc_promise_thenable_state_t*)env;
    if (!state || !state->promise) return;
    tsc_try_frame_t eh;
    tsc_try_push(&eh);
    if (setjmp(eh.jb) == 0) {
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_value_t resolve = tsc_value_function_closure_named(promise_thenable_resolve, state, 1.0, tsc_str_from_lit("", 0));
        tsc_value_t reject = tsc_value_function_closure_named(promise_thenable_reject, state, 1.0, tsc_str_from_lit("", 0));
        tsc_array_push_value(args, resolve);
        tsc_array_push_value(args, reject);
        (void)tsc_value_apply_function(state->then_fn, state->thenable, tsc_value_array(args));
        tsc_try_pop();
        return;
    }
    tsc_try_pop();
    if (!state->done && tsc_promise_is_pending(state->promise)) {
        state->done = true;
        tsc_promise_reject_in_place(state->promise, tsc_value_string(tsc_current_error()));
    }
}

static tsc_promise_t* tsc_promise_resolve_thenable_seen(tsc_value_t value, tsc_array_t* seen) {
    tsc_promise_t* volatile out = NULL;
    tsc_promise_thenable_state_t* volatile state = NULL;
    tsc_try_frame_t eh;
    tsc_try_push(&eh);
    if (setjmp(eh.jb) == 0) {
        if (tsc_value_is_promise(value)) {
            tsc_try_pop();
            return tsc_promise_adopt(tsc_value_as_promise(value));
        }
        if (promise_seen_contains(seen, value)) {
            tsc_try_pop();
            return tsc_promise_reject(tsc_value_string(tsc_str_from_cstr("TypeError: Promise resolution cycle")));
        }
        if (!is_ecma_object(value)) {
            tsc_try_pop();
            return tsc_promise_resolve(value);
        }
        tsc_value_t then = tsc_value_get_prop(value, tsc_str_from_lit("then", 4));
        if (tsc_value_is_nullish(then) || !tsc_value_is_callable(then)) {
            tsc_try_pop();
            return tsc_promise_resolve(value);
        }
        if (!seen) seen = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(seen, value);
        out = tsc_promise_pending();
        state = (tsc_promise_thenable_state_t*)TSC_GC_MALLOC(sizeof(tsc_promise_thenable_state_t));
        state->promise = out;
        state->thenable = value;
        state->then_fn = then;
        state->seen = seen;
        state->done = false;
        tsc_queue_microtask(promise_thenable_job, state);
        tsc_try_pop();
        return (tsc_promise_t*)out;
    }
    tsc_try_pop();
    if (state && state->done && out) {
        return (tsc_promise_t*)out;
    }
    if (out && tsc_promise_is_pending((tsc_promise_t*)out)) {
        tsc_promise_reject_in_place((tsc_promise_t*)out, tsc_value_string(tsc_current_error()));
        return (tsc_promise_t*)out;
    }
    if (out) return (tsc_promise_t*)out;
    return tsc_promise_reject(tsc_value_string(tsc_current_error()));
}

tsc_promise_t* tsc_promise_resolve_thenable(tsc_value_t value) {
    return tsc_promise_resolve_thenable_seen(value, NULL);
}

typedef struct {
    tsc_promise_t* result;
    tsc_array_t* values;
    size_t remaining;
    bool settled;
} tsc_promise_all_dynamic_state_t;

typedef struct {
    tsc_promise_all_dynamic_state_t* state;
    tsc_promise_t* item;
    size_t index;
} tsc_promise_all_dynamic_item_t;

static void promise_all_dynamic_callback(void* env) {
    tsc_promise_all_dynamic_item_t* item = (tsc_promise_all_dynamic_item_t*)env;
    tsc_promise_all_dynamic_state_t* state = item ? item->state : NULL;
    if (!state || state->settled || !tsc_promise_is_pending(state->result)) return;
    if (tsc_promise_is_rejected(item->item)) {
        state->settled = true;
        tsc_promise_reject_in_place(state->result, tsc_promise_reason(item->item));
        return;
    }
    if (tsc_promise_is_fulfilled(item->item)) {
        TSC_ARR(tsc_value_t, state->values, item->index) = tsc_promise_value(item->item);
        if (state->remaining > 0) state->remaining--;
        if (state->remaining == 0) {
            state->settled = true;
            tsc_promise_fulfill_in_place(state->result, tsc_value_array(state->values));
        }
    }
}

tsc_promise_t* tsc_promise_all_dynamic(tsc_array_t* src) {
    tsc_promise_all_dynamic_state_t* state = (tsc_promise_all_dynamic_state_t*)TSC_GC_MALLOC(sizeof(tsc_promise_all_dynamic_state_t));
    state->result = tsc_promise_pending();
    state->values = tsc_array_new(sizeof(tsc_value_t), src && src->len ? src->len : 1);
    state->remaining = src ? src->len : 0;
    state->settled = false;
    for (size_t i = 0; src && i < src->len; i++) {
        tsc_value_t value = tsc_value_undefined();
        tsc_array_push_raw(state->values, &value);
    }
    for (size_t i = 0; src && i < src->len; i++) {
        tsc_promise_t* item = tsc_promise_resolve_thenable(promise_dynamic_item(src, i));
        if (tsc_promise_is_rejected(item)) {
            state->settled = true;
            tsc_promise_reject_in_place(state->result, tsc_promise_reason(item));
            break;
        }
        if (tsc_promise_is_pending(item)) {
            tsc_promise_all_dynamic_item_t* env = (tsc_promise_all_dynamic_item_t*)TSC_GC_MALLOC(sizeof(tsc_promise_all_dynamic_item_t));
            env->state = state;
            env->item = item;
            env->index = i;
            tsc_promise_add_callback(item, promise_all_dynamic_callback, env);
            continue;
        }
        TSC_ARR(tsc_value_t, state->values, i) = tsc_promise_value(item);
        if (state->remaining > 0) state->remaining--;
    }
    if (!state->settled && state->remaining == 0) {
        state->settled = true;
        tsc_promise_fulfill_in_place(state->result, tsc_value_array(state->values));
    }
    return state->result;
}

typedef struct {
    tsc_promise_t* result;
    bool settled;
} tsc_promise_race_dynamic_state_t;

typedef struct {
    tsc_promise_race_dynamic_state_t* state;
    tsc_promise_t* item;
} tsc_promise_race_dynamic_item_t;

static void promise_race_dynamic_callback(void* env) {
    tsc_promise_race_dynamic_item_t* item = (tsc_promise_race_dynamic_item_t*)env;
    tsc_promise_race_dynamic_state_t* state = item ? item->state : NULL;
    if (!state || state->settled || !tsc_promise_is_pending(state->result)) return;
    state->settled = true;
    if (tsc_promise_is_rejected(item->item)) {
        tsc_promise_reject_in_place(state->result, tsc_promise_reason(item->item));
    } else if (tsc_promise_is_fulfilled(item->item)) {
        tsc_promise_fulfill_in_place(state->result, tsc_promise_value(item->item));
    } else {
        state->settled = false;
    }
}

tsc_promise_t* tsc_promise_race_dynamic(tsc_array_t* src) {
    tsc_promise_race_dynamic_state_t* state = (tsc_promise_race_dynamic_state_t*)TSC_GC_MALLOC(sizeof(tsc_promise_race_dynamic_state_t));
    state->result = tsc_promise_pending();
    state->settled = false;
    for (size_t i = 0; src && i < src->len; i++) {
        tsc_promise_t* item = tsc_promise_resolve_thenable(promise_dynamic_item(src, i));
        if (tsc_promise_is_pending(item)) {
            tsc_promise_race_dynamic_item_t* env = (tsc_promise_race_dynamic_item_t*)TSC_GC_MALLOC(sizeof(tsc_promise_race_dynamic_item_t));
            env->state = state;
            env->item = item;
            tsc_promise_add_callback(item, promise_race_dynamic_callback, env);
            continue;
        }
        state->settled = true;
        if (tsc_promise_is_rejected(item)) {
            tsc_promise_reject_in_place(state->result, tsc_promise_reason(item));
        } else {
            tsc_promise_fulfill_in_place(state->result, tsc_promise_value(item));
        }
        break;
    }
    return state->result;
}

typedef struct {
    tsc_promise_t* result;
    tsc_array_t* errors;
    size_t remaining;
    bool settled;
} tsc_promise_any_dynamic_state_t;

typedef struct {
    tsc_promise_any_dynamic_state_t* state;
    tsc_promise_t* item;
    size_t index;
} tsc_promise_any_dynamic_item_t;

static tsc_value_t promise_any_aggregate(tsc_array_t* errors) {
    tsc_object_t* aggregate = tsc_object_new();
    tsc_object_set(aggregate, tsc_str_from_lit("name", 4), tsc_value_string(tsc_str_from_lit("AggregateError", 14)));
    tsc_object_set(aggregate, tsc_str_from_lit("message", 7), tsc_value_string(tsc_str_from_lit("All promises were rejected", 26)));
    tsc_object_set(aggregate, tsc_str_from_lit("errors", 6), tsc_value_array(errors));
    return tsc_value_object(aggregate);
}

static void promise_any_dynamic_callback(void* env) {
    tsc_promise_any_dynamic_item_t* item = (tsc_promise_any_dynamic_item_t*)env;
    tsc_promise_any_dynamic_state_t* state = item ? item->state : NULL;
    if (!state || state->settled || !tsc_promise_is_pending(state->result)) return;
    if (tsc_promise_is_fulfilled(item->item)) {
        state->settled = true;
        tsc_promise_fulfill_in_place(state->result, tsc_promise_value(item->item));
        return;
    }
    if (tsc_promise_is_rejected(item->item)) {
        TSC_ARR(tsc_value_t, state->errors, item->index) = tsc_promise_reason(item->item);
        if (state->remaining > 0) state->remaining--;
        if (state->remaining == 0) {
            state->settled = true;
            tsc_promise_reject_in_place(state->result, promise_any_aggregate(state->errors));
        }
    }
}

tsc_promise_t* tsc_promise_any_dynamic(tsc_array_t* src) {
    tsc_promise_any_dynamic_state_t* state = (tsc_promise_any_dynamic_state_t*)TSC_GC_MALLOC(sizeof(tsc_promise_any_dynamic_state_t));
    state->result = tsc_promise_pending();
    state->errors = tsc_array_new(sizeof(tsc_value_t), src && src->len ? src->len : 1);
    state->remaining = src ? src->len : 0;
    state->settled = false;
    for (size_t i = 0; src && i < src->len; i++) {
        tsc_value_t value = tsc_value_undefined();
        tsc_array_push_raw(state->errors, &value);
    }
    for (size_t i = 0; src && i < src->len; i++) {
        tsc_promise_t* item = tsc_promise_resolve_thenable(promise_dynamic_item(src, i));
        if (tsc_promise_is_fulfilled(item)) {
            state->settled = true;
            tsc_promise_fulfill_in_place(state->result, tsc_promise_value(item));
            break;
        }
        if (tsc_promise_is_pending(item)) {
            tsc_promise_any_dynamic_item_t* env = (tsc_promise_any_dynamic_item_t*)TSC_GC_MALLOC(sizeof(tsc_promise_any_dynamic_item_t));
            env->state = state;
            env->item = item;
            env->index = i;
            tsc_promise_add_callback(item, promise_any_dynamic_callback, env);
            continue;
        }
        TSC_ARR(tsc_value_t, state->errors, i) = tsc_promise_reason(item);
        if (state->remaining > 0) state->remaining--;
    }
    if (!state->settled && state->remaining == 0) {
        state->settled = true;
        tsc_promise_reject_in_place(state->result, promise_any_aggregate(state->errors));
    }
    return state->result;
}

typedef struct {
    tsc_promise_t* result;
    tsc_array_t* values;
    size_t remaining;
    bool settled;
} tsc_promise_all_settled_dynamic_state_t;

typedef struct {
    tsc_promise_all_settled_dynamic_state_t* state;
    tsc_promise_t* item;
    size_t index;
} tsc_promise_all_settled_dynamic_item_t;

static tsc_value_t promise_settled_result(tsc_promise_t* item) {
    tsc_object_t* obj = tsc_object_new();
    if (tsc_promise_is_fulfilled(item)) {
        tsc_object_set(obj, tsc_str_from_lit("status", 6), tsc_value_string(tsc_str_from_lit("fulfilled", 9)));
        tsc_object_set(obj, tsc_str_from_lit("value", 5), tsc_promise_value(item));
    } else {
        tsc_object_set(obj, tsc_str_from_lit("status", 6), tsc_value_string(tsc_str_from_lit("rejected", 8)));
        tsc_object_set(obj, tsc_str_from_lit("reason", 6), tsc_promise_reason(item));
    }
    return tsc_value_object(obj);
}

static void promise_all_settled_dynamic_callback(void* env) {
    tsc_promise_all_settled_dynamic_item_t* item = (tsc_promise_all_settled_dynamic_item_t*)env;
    tsc_promise_all_settled_dynamic_state_t* state = item ? item->state : NULL;
    if (!state || state->settled || !tsc_promise_is_pending(state->result)) return;
    if (!tsc_promise_is_fulfilled(item->item) && !tsc_promise_is_rejected(item->item)) return;
    TSC_ARR(tsc_value_t, state->values, item->index) = promise_settled_result(item->item);
    if (state->remaining > 0) state->remaining--;
    if (state->remaining == 0) {
        state->settled = true;
        tsc_promise_fulfill_in_place(state->result, tsc_value_array(state->values));
    }
}

tsc_promise_t* tsc_promise_all_settled_dynamic(tsc_array_t* src) {
    tsc_promise_all_settled_dynamic_state_t* state = (tsc_promise_all_settled_dynamic_state_t*)TSC_GC_MALLOC(sizeof(tsc_promise_all_settled_dynamic_state_t));
    state->result = tsc_promise_pending();
    state->values = tsc_array_new(sizeof(tsc_value_t), src && src->len ? src->len : 1);
    state->remaining = src ? src->len : 0;
    state->settled = false;
    for (size_t i = 0; src && i < src->len; i++) {
        tsc_value_t value = tsc_value_undefined();
        tsc_array_push_raw(state->values, &value);
    }
    for (size_t i = 0; src && i < src->len; i++) {
        tsc_promise_t* item = tsc_promise_resolve_thenable(promise_dynamic_item(src, i));
        if (tsc_promise_is_pending(item)) {
            tsc_promise_all_settled_dynamic_item_t* env = (tsc_promise_all_settled_dynamic_item_t*)TSC_GC_MALLOC(sizeof(tsc_promise_all_settled_dynamic_item_t));
            env->state = state;
            env->item = item;
            env->index = i;
            tsc_promise_add_callback(item, promise_all_settled_dynamic_callback, env);
            continue;
        }
        TSC_ARR(tsc_value_t, state->values, i) = promise_settled_result(item);
        if (state->remaining > 0) state->remaining--;
    }
    if (!state->settled && state->remaining == 0) {
        state->settled = true;
        tsc_promise_fulfill_in_place(state->result, tsc_value_array(state->values));
    }
    return state->result;
}

tsc_value_t tsc_value_promise(tsc_promise_t* p) {
    if (!p) return tsc_value_null();
    tsc_object_t* o = tsc_object_new_class(p);
    o->is_promise = true;
    return tsc_value_object(o);
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
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_REJECTED;
    p->result = reason;
    p->ptr_result = NULL;
    p->callbacks = NULL;
    p->callbacks_len = 0;
    p->callbacks_cap = 0;
    return p;
}

tsc_promise_t* tsc_promise_pending(void) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_PENDING;
    p->result = tsc_value_undefined();
    p->ptr_result = NULL;
    p->callbacks = NULL;
    p->callbacks_len = 0;
    p->callbacks_cap = 0;
    return p;
}

tsc_promise_t* tsc_promise_adopt(tsc_promise_t* promise) {
    return promise ? promise : tsc_promise_resolve(tsc_value_undefined());
}

void tsc_promise_fulfill_in_place(tsc_promise_t* p, tsc_value_t value) {
    if (!p || p->state != TSC_PROMISE_PENDING) return;
    p->state = TSC_PROMISE_FULFILLED;
    p->result = value;
    p->ptr_result = NULL;
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
    p->ptr_result = NULL;
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
    return p ? p->result : tsc_value_undefined();
}

tsc_fs_stats_t* tsc_promise_fs_stats_value(const tsc_promise_t* p) {
    return p ? (tsc_fs_stats_t*)p->ptr_result : NULL;
}

tsc_buffer_t* tsc_promise_buffer_value(const tsc_promise_t* p) {
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
    ee->len = 0;
    ee->cap = 0;
    ee->next_order = 1;
    ee->max_listeners = 0.0;
    ee->has_own_max_listeners = false;
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

void event_once_promise_resolve_listener(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args) {
    (void)emitter;
    tsc_event_once_promise_env_t* state = (tsc_event_once_promise_env_t*)env;
    if (!state || !state->promise) return;
    tsc_event_emitter_off(state->emitter, tsc_str_from_lit("error", 5), event_once_promise_reject_listener, state);
    tsc_promise_fulfill_in_place(state->promise, tsc_value_array(event_args_copy_as_values(args)));
}

void event_once_promise_reject_listener(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args) {
    (void)emitter;
    tsc_event_once_promise_env_t* state = (tsc_event_once_promise_env_t*)env;
    if (!state || !state->promise) return;
    tsc_event_emitter_off(state->emitter, state->event, event_once_promise_resolve_listener, state);
    tsc_value_t reason = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_string(tsc_str_from_lit("Unhandled error event", 21));
    tsc_promise_reject_in_place(state->promise, reason);
}

tsc_promise_t* tsc_event_emitter_once_promise(tsc_event_emitter_t* ee, tsc_str_t* event) {
    tsc_promise_t* promise = tsc_promise_pending();
    if (!ee || !event) return promise;
    tsc_event_once_promise_env_t* env = (tsc_event_once_promise_env_t*)TSC_GC_MALLOC(sizeof(tsc_event_once_promise_env_t));
    env->emitter = ee;
    env->event = event;
    env->promise = promise;
    tsc_event_emitter_on(ee, event, event_once_promise_resolve_listener, env, env, true, false);
    if (!str_lit_eq(event, "error")) {
        tsc_event_emitter_on(ee, tsc_str_from_lit("error", 5), event_once_promise_reject_listener, env, env, true, false);
    }
    return promise;
}

typedef struct {
    tsc_event_emitter_t* emitter;
    tsc_str_t* event;
    tsc_array_t* queued;
    tsc_array_t* pending;
    bool closed;
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
}

static void event_async_iterator_close(tsc_event_async_iterator_t* state) {
    if (!state || state->closed) return;
    state->closed = true;
    tsc_event_emitter_off(state->emitter, state->event, event_async_iterator_listener, state);
    while (state->pending->len > 0) {
        tsc_promise_t* promise = TSC_ARR(tsc_promise_t*, state->pending, 0);
        event_async_iterator_remove_first(state->pending);
        tsc_promise_fulfill_in_place(promise, event_async_iterator_result(tsc_value_undefined(), true));
    }
    state->queued->len = 0;
}

static tsc_value_t event_async_iterator_next(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    (void)args;
    tsc_event_async_iterator_t* state = (tsc_event_async_iterator_t*)env;
    if (!state || state->closed) {
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

tsc_value_t tsc_event_emitter_on_async_iterator(tsc_event_emitter_t* ee, tsc_str_t* event) {
    if (!ee || !event) return tsc_value_undefined();
    tsc_event_async_iterator_t* state = (tsc_event_async_iterator_t*)TSC_GC_MALLOC(sizeof(tsc_event_async_iterator_t));
    state->emitter = ee;
    state->event = event;
    state->queued = tsc_array_new(sizeof(tsc_array_t*), 4);
    state->pending = tsc_array_new(sizeof(tsc_promise_t*), 4);
    state->closed = false;
    tsc_object_t* iterator = tsc_object_new();
    tsc_object_set(iterator, tsc_str_from_lit("next", 4), tsc_value_function_builtin_named(event_async_iterator_next, state, 0.0, tsc_str_from_lit("next", 4)));
    tsc_object_set(iterator, tsc_str_from_lit("return", 6), tsc_value_function_builtin_named(event_async_iterator_return, state, 0.0, tsc_str_from_lit("return", 6)));
    tsc_event_emitter_on(ee, event, event_async_iterator_listener, state, state, false, false);
    return tsc_value_object(iterator);
}
