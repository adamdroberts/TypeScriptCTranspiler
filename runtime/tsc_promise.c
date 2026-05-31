#include "tsc_internal.h"

tsc_promise_t* tsc_promise_resolve(tsc_value_t value) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_FULFILLED;
    p->result = value;
    p->ptr_result = NULL;
    return p;
}

tsc_promise_t* tsc_promise_resolve_fs_stats(tsc_fs_stats_t* value) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_FULFILLED;
    p->result = tsc_value_undefined();
    p->ptr_result = value;
    return p;
}

tsc_promise_t* tsc_promise_resolve_buffer(tsc_buffer_t* value) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_FULFILLED;
    p->result = tsc_value_undefined();
    p->ptr_result = value;
    return p;
}

tsc_promise_t* tsc_promise_resolve_array(tsc_array_t* value) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_FULFILLED;
    p->result = tsc_value_undefined();
    p->ptr_result = value;
    return p;
}

typedef struct {
    tsc_promise_t* promise;
    tsc_value_t thenable;
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

static void promise_adopt_into(tsc_promise_t* dest, tsc_promise_t* source) {
    if (!dest || dest->state != TSC_PROMISE_PENDING || !source) return;
    if (tsc_promise_is_fulfilled(source)) {
        tsc_promise_fulfill_in_place(dest, tsc_promise_value(source));
    } else if (tsc_promise_is_rejected(source)) {
        tsc_promise_reject_in_place(dest, tsc_promise_reason(source));
    }
}

static tsc_value_t promise_thenable_resolve(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_promise_thenable_state_t* state = (tsc_promise_thenable_state_t*)env;
    tsc_value_t value = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    if (state && state->promise) {
        if (state->done) return tsc_value_undefined();
        state->done = true;
        if (tsc_value_eq(value, state->thenable)) {
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
        state->seen = seen;
        state->done = false;
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_value_t resolve = tsc_value_function_generic_arity(promise_thenable_resolve, state, 1.0);
        tsc_value_t reject = tsc_value_function_generic_arity(promise_thenable_reject, state, 1.0);
        tsc_array_push_value(args, resolve);
        tsc_array_push_value(args, reject);
        (void)tsc_value_apply_function(then, value, tsc_value_array(args));
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
    return p;
}

tsc_promise_t* tsc_promise_pending(void) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_PENDING;
    p->result = tsc_value_undefined();
    p->ptr_result = NULL;
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
}

void tsc_promise_reject_in_place(tsc_promise_t* p, tsc_value_t reason) {
    if (!p || p->state != TSC_PROMISE_PENDING) return;
    p->state = TSC_PROMISE_REJECTED;
    p->result = reason;
    p->ptr_result = NULL;
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
