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

tsc_promise_t* tsc_promise_resolve(tsc_value_t value) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_FULFILLED;
    p->result = value;
    p->ptr_result = tsc_value_gc_root(value);
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
    tsc_value_t* resources;
    size_t count;
    size_t next_index;
    tsc_promise_t* result;
    tsc_promise_t* output;
    tsc_promise_t* current_dispose;
    bool has_rejection;
    tsc_value_t first_rejection;
} tsc_promise_after_async_dispose_many_env_t;

static void tsc_promise_after_async_dispose_many_step(void* env);

static void tsc_promise_after_async_dispose_many_start(
    tsc_promise_after_async_dispose_many_env_t* state
) {
    if (!state || !state->result || !state->output) return;
    if (state->next_index == 0) {
        if (state->has_rejection) {
            tsc_promise_reject_in_place(state->output, state->first_rejection);
        } else {
            tsc_promise_adopt_into(state->output, state->result);
        }
        return;
    }
    state->current_dispose = tsc_value_dispose_async(state->resources[--state->next_index]);
    if (!state->current_dispose) {
        state->has_rejection = true;
        state->first_rejection = tsc_value_string(tsc_str_from_cstr("async disposal failed"));
        tsc_promise_after_async_dispose_many_start(state);
    } else if (tsc_promise_is_pending(state->current_dispose)) {
        tsc_promise_add_callback(state->current_dispose, tsc_promise_after_async_dispose_many_step, state);
    } else {
        tsc_queue_microtask(tsc_promise_after_async_dispose_many_step, state);
    }
}

static void tsc_promise_after_async_dispose_many_step(void* env) {
    tsc_promise_after_async_dispose_many_env_t* state =
        (tsc_promise_after_async_dispose_many_env_t*)env;
    if (!state || !state->current_dispose) return;
    if (tsc_promise_is_pending(state->current_dispose)) return;
    if (tsc_promise_is_rejected(state->current_dispose) && !state->has_rejection) {
        state->has_rejection = true;
        state->first_rejection = tsc_promise_reason(state->current_dispose);
    }
    state->current_dispose = NULL;
    tsc_promise_after_async_dispose_many_start(state);
}

tsc_promise_t* tsc_promise_after_async_dispose_many(
    const tsc_value_t* resources,
    size_t count,
    tsc_promise_t* result
) {
    if (!result) result = tsc_promise_resolve(tsc_value_undefined());
    tsc_promise_t* output = tsc_promise_pending();
    tsc_promise_after_async_dispose_many_env_t* state =
        (tsc_promise_after_async_dispose_many_env_t*)TSC_GC_MALLOC(sizeof(tsc_promise_after_async_dispose_many_env_t));
    state->resources = count > 0
        ? (tsc_value_t*)TSC_GC_MALLOC(count * sizeof(tsc_value_t))
        : NULL;
    for (size_t i = 0; i < count; i++) state->resources[i] = resources[i];
    state->count = count;
    state->next_index = count;
    state->result = result;
    state->output = output;
    state->current_dispose = NULL;
    state->has_rejection = false;
    state->first_rejection = tsc_value_undefined();
    tsc_promise_after_async_dispose_many_start(state);
    return output;
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
    TSC_TRY_FRAME(eh);
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
    TSC_TRY_FRAME(eh);
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
    tsc_value_t iterator;
} tsc_async_from_sync_iterator_t;

typedef struct {
    tsc_promise_t* source;
    tsc_promise_t* result;
    bool done;
} tsc_async_from_sync_result_env_t;

static tsc_value_t async_from_sync_result_object(tsc_value_t value, bool done) {
    tsc_object_t* result = tsc_object_new();
    tsc_object_set(result, tsc_str_from_lit("done", 4), tsc_value_bool(done));
    tsc_object_set(result, tsc_str_from_lit("value", 5), value);
    return tsc_value_object(result);
}

static void async_from_sync_result_callback(void* env) {
    tsc_async_from_sync_result_env_t* state = (tsc_async_from_sync_result_env_t*)env;
    if (!state || !state->source || !state->result) return;
    if (tsc_promise_is_rejected(state->source)) {
        tsc_promise_reject_in_place(state->result, tsc_promise_reason(state->source));
        return;
    }
    if (!tsc_promise_is_fulfilled(state->source)) return;
    tsc_promise_fulfill_in_place(
        state->result,
        async_from_sync_result_object(tsc_promise_value(state->source), state->done)
    );
}

static tsc_value_t async_from_sync_result_promise(tsc_value_t result) {
    tsc_promise_t* output = tsc_promise_pending();
    if (!tsc_value_is_object(result)) {
        tsc_promise_reject_in_place(
            output,
            tsc_value_string(tsc_str_from_lit("sync iterator result is not an object", 37))
        );
        return tsc_value_promise(output);
    }
    tsc_value_t done = tsc_value_get_prop(result, tsc_str_from_lit("done", 4));
    tsc_value_t value = tsc_value_get_prop(result, tsc_str_from_lit("value", 5));
    tsc_promise_t* value_promise = tsc_promise_resolve_thenable(value);
    tsc_async_from_sync_result_env_t* env =
        (tsc_async_from_sync_result_env_t*)TSC_GC_MALLOC(sizeof(tsc_async_from_sync_result_env_t));
    env->source = value_promise;
    env->result = output;
    env->done = tsc_value_is_truthy(done);
    if (tsc_promise_is_pending(value_promise)) {
        tsc_promise_add_callback(value_promise, async_from_sync_result_callback, env);
    } else {
        async_from_sync_result_callback(env);
    }
    return tsc_value_promise(output);
}

static tsc_value_t async_from_sync_next(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_async_from_sync_iterator_t* state = (tsc_async_from_sync_iterator_t*)env;
    tsc_value_t next = tsc_value_get_prop(state->iterator, tsc_str_from_lit("next", 4));
    if (!tsc_value_is_callable(next)) {
        tsc_throw_str(tsc_str_from_lit("sync iterator next is not callable", 34));
    }
    return async_from_sync_result_promise(
        tsc_value_apply_function(next, state->iterator, tsc_value_array(args))
    );
}

static tsc_value_t async_from_sync_return(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_async_from_sync_iterator_t* state = (tsc_async_from_sync_iterator_t*)env;
    tsc_value_t close = tsc_value_get_prop(state->iterator, tsc_str_from_lit("return", 6));
    if (!tsc_value_is_callable(close)) {
        tsc_value_t value = args && args->len > 0
            ? TSC_ARR(tsc_value_t, args, 0)
            : tsc_value_undefined();
        return tsc_value_promise(tsc_promise_resolve(async_from_sync_result_object(value, true)));
    }
    return async_from_sync_result_promise(
        tsc_value_apply_function(close, state->iterator, tsc_value_array(args))
    );
}

static tsc_value_t async_from_sync_throw(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_async_from_sync_iterator_t* state = (tsc_async_from_sync_iterator_t*)env;
    tsc_value_t throw_method = tsc_value_get_prop(state->iterator, tsc_str_from_lit("throw", 5));
    if (!tsc_value_is_callable(throw_method)) {
        tsc_throw_str(tsc_str_from_lit("sync iterator throw is not callable", 35));
    }
    return async_from_sync_result_promise(
        tsc_value_apply_function(throw_method, state->iterator, tsc_value_array(args))
    );
}

static tsc_value_t async_from_sync_async_iterator(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    return this_arg;
}

static tsc_value_t async_from_sync_iterator_wrap(tsc_value_t iterator) {
    tsc_async_from_sync_iterator_t* state =
        (tsc_async_from_sync_iterator_t*)TSC_GC_MALLOC(sizeof(tsc_async_from_sync_iterator_t));
    state->iterator = iterator;
    tsc_object_t* wrapper = tsc_object_new();
    tsc_object_set(
        wrapper,
        tsc_str_from_lit("next", 4),
        tsc_value_function_builtin_named(async_from_sync_next, state, 1.0, tsc_str_from_lit("next", 4))
    );
    tsc_object_set(
        wrapper,
        tsc_str_from_lit("return", 6),
        tsc_value_function_builtin_named(async_from_sync_return, state, 1.0, tsc_str_from_lit("return", 6))
    );
    tsc_object_set(
        wrapper,
        tsc_str_from_lit("throw", 5),
        tsc_value_function_builtin_named(async_from_sync_throw, state, 1.0, tsc_str_from_lit("throw", 5))
    );
    tsc_object_set(
        wrapper,
        tsc_symbol_property_key(tsc_symbol_async_iterator()),
        tsc_value_function_builtin_named(
            async_from_sync_async_iterator,
            state,
            0.0,
            tsc_str_from_lit("[Symbol.asyncIterator]", 22)
        )
    );
    return tsc_value_object(wrapper);
}

tsc_value_t tsc_async_iterator_get(tsc_value_t value) {
    tsc_value_t method = tsc_value_get_symbol_prop(value, tsc_symbol_async_iterator());
    if (!tsc_value_is_undefined(method) && !tsc_value_is_nullish(method)) {
        if (!tsc_value_is_callable(method)) {
            tsc_throw_str(tsc_str_from_lit("async iterator method is not callable", 37));
        }
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 0);
        tsc_value_t iterator = tsc_value_apply_function(method, value, tsc_value_array(args));
        if (!tsc_value_is_object(iterator)) {
            tsc_throw_str(tsc_str_from_lit("async iterator method must return an object", 43));
        }
        return iterator;
    }

    tsc_value_t sync_method = tsc_value_get_symbol_prop(value, tsc_symbol_iterator());
    tsc_value_t sync_iterator;
    if (tsc_value_is_undefined(sync_method) && value_is_box(value) && value_tag(value) == TSC_VALUE_TAG_STRING) {
        sync_iterator = tsc_value_symbol_iterator(value);
    } else {
        if (!tsc_value_is_callable(sync_method)) {
            if (tsc_value_is_callable(tsc_value_get_prop(value, tsc_str_from_lit("next", 4)))) {
                return value;
            }
            tsc_throw_str(tsc_str_from_lit("value is not async iterable", 27));
        }
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 0);
        sync_iterator = tsc_value_apply_function(sync_method, value, tsc_value_array(args));
    }
    if (!tsc_value_is_object(sync_iterator)) {
        tsc_throw_str(tsc_str_from_lit("sync iterator method must return an object", 42));
    }
    return async_from_sync_iterator_wrap(sync_iterator);
}

tsc_promise_t* tsc_async_iterator_next(tsc_value_t iterator) {
    TSC_TRY_FRAME(eh);
    tsc_try_push(&eh);
    if (setjmp(eh.jb) == 0) {
        tsc_value_t next = tsc_value_get_prop(iterator, tsc_str_from_lit("next", 4));
        if (!tsc_value_is_callable(next)) {
            tsc_throw_str(tsc_str_from_lit("async iterator next is not callable", 35));
        }
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 0);
        tsc_value_t result = tsc_value_apply_function(next, iterator, tsc_value_array(args));
        tsc_try_pop();
        return tsc_promise_resolve_thenable(result);
    }
    tsc_try_pop();
    return tsc_promise_reject(tsc_value_string(tsc_current_error()));
}

tsc_promise_t* tsc_async_iterator_return(tsc_value_t iterator) {
    TSC_TRY_FRAME(eh);
    tsc_try_push(&eh);
    if (setjmp(eh.jb) == 0) {
        tsc_value_t close = tsc_value_get_prop(iterator, tsc_str_from_lit("return", 6));
        if (!tsc_value_is_callable(close)) {
            tsc_try_pop();
            return tsc_promise_resolve(tsc_value_object(tsc_object_new()));
        }
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 0);
        tsc_value_t result = tsc_value_apply_function(close, iterator, tsc_value_array(args));
        tsc_try_pop();
        return tsc_promise_resolve_thenable(result);
    }
    tsc_try_pop();
    return tsc_promise_reject(tsc_value_string(tsc_current_error()));
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
        tsc_value_t value = tsc_promise_value(item->item);
        tsc_array_store_raw(state->values, item->index, &value);
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
        tsc_value_t value = tsc_promise_value(item);
        tsc_array_store_raw(state->values, i, &value);
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
        tsc_value_t reason = tsc_promise_reason(item->item);
        tsc_array_store_raw(state->errors, item->index, &reason);
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
        tsc_value_t reason = tsc_promise_reason(item);
        tsc_array_store_raw(state->errors, i, &reason);
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
    tsc_value_t value = promise_settled_result(item->item);
    tsc_array_store_raw(state->values, item->index, &value);
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
        tsc_value_t value = promise_settled_result(item);
        tsc_array_store_raw(state->values, i, &value);
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

typedef struct {
    tsc_promise_t* receiver;
    tsc_promise_t* result_promise;
    tsc_value_t on_fulfilled;
    tsc_value_t on_rejected;
} tsc_dynamic_promise_then_env_t;

static tsc_array_t* promise_single_arg(tsc_value_t value) {
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_array_push_value(args, value);
    return args;
}

static tsc_promise_t* promise_call_dynamic_callback(tsc_value_t fn, tsc_value_t arg, bool has_arg) {
    TSC_TRY_FRAME(eh);
    tsc_try_push(&eh);
    if (setjmp(eh.jb) == 0) {
        tsc_array_t* args = has_arg
            ? promise_single_arg(arg)
            : tsc_array_new(sizeof(tsc_value_t), 0);
        tsc_value_t result = tsc_value_apply_function(fn, tsc_value_undefined(), tsc_value_array(args));
        tsc_try_pop();
        return tsc_promise_resolve_thenable(result);
    }
    tsc_try_pop();
    return tsc_promise_reject(tsc_value_string(tsc_current_error()));
}

static void tsc_dynamic_promise_then_callback(void* env) {
    tsc_dynamic_promise_then_env_t* state = (tsc_dynamic_promise_then_env_t*)env;
    if (!state || !state->receiver || !state->result_promise) return;
    tsc_promise_t* next = NULL;
    if (tsc_promise_is_fulfilled(state->receiver)) {
        if (tsc_value_is_callable(state->on_fulfilled)) {
            next = promise_call_dynamic_callback(state->on_fulfilled, tsc_promise_value(state->receiver), true);
        } else {
            next = tsc_promise_resolve(tsc_promise_value(state->receiver));
        }
    } else if (tsc_promise_is_rejected(state->receiver)) {
        if (tsc_value_is_callable(state->on_rejected)) {
            next = promise_call_dynamic_callback(state->on_rejected, tsc_promise_reason(state->receiver), true);
        } else {
            next = tsc_promise_reject(tsc_promise_reason(state->receiver));
        }
    } else {
        return;
    }
    tsc_promise_adopt_into(state->result_promise, next);
}

typedef struct {
    tsc_promise_t* result_promise;
    tsc_promise_t* finalizer_promise;
    bool rejected;
    tsc_value_t value;
} tsc_dynamic_promise_finally_settle_env_t;

static void tsc_dynamic_promise_finally_settle_callback(void* env) {
    tsc_dynamic_promise_finally_settle_env_t* state = (tsc_dynamic_promise_finally_settle_env_t*)env;
    if (!state || !state->result_promise || !state->finalizer_promise) return;
    if (tsc_promise_is_pending(state->finalizer_promise)) return;
    if (tsc_promise_is_rejected(state->finalizer_promise)) {
        tsc_promise_reject_in_place(state->result_promise, tsc_promise_reason(state->finalizer_promise));
        return;
    }
    if (state->rejected) {
        tsc_promise_reject_in_place(state->result_promise, state->value);
    } else {
        tsc_promise_fulfill_in_place(state->result_promise, state->value);
    }
}

typedef struct {
    tsc_promise_t* receiver;
    tsc_promise_t* result_promise;
    tsc_value_t on_finally;
} tsc_dynamic_promise_finally_env_t;

static void tsc_dynamic_promise_finally_callback(void* env) {
    tsc_dynamic_promise_finally_env_t* state = (tsc_dynamic_promise_finally_env_t*)env;
    if (!state || !state->receiver || !state->result_promise) return;
    if (tsc_promise_is_pending(state->receiver)) return;
    bool rejected = tsc_promise_is_rejected(state->receiver);
    tsc_value_t value = rejected
        ? tsc_promise_reason(state->receiver)
        : tsc_promise_value(state->receiver);
    if (!tsc_value_is_callable(state->on_finally)) {
        if (rejected) tsc_promise_reject_in_place(state->result_promise, value);
        else tsc_promise_fulfill_in_place(state->result_promise, value);
        return;
    }
    tsc_promise_t* finalizer = promise_call_dynamic_callback(state->on_finally, tsc_value_undefined(), false);
    if (tsc_promise_is_pending(finalizer)) {
        tsc_dynamic_promise_finally_settle_env_t* settle = (tsc_dynamic_promise_finally_settle_env_t*)TSC_GC_MALLOC(sizeof(tsc_dynamic_promise_finally_settle_env_t));
        settle->result_promise = state->result_promise;
        settle->finalizer_promise = finalizer;
        settle->rejected = rejected;
        settle->value = value;
        tsc_promise_add_callback(finalizer, tsc_dynamic_promise_finally_settle_callback, settle);
        return;
    }
    tsc_dynamic_promise_finally_settle_env_t settle = {
        state->result_promise,
        finalizer,
        rejected,
        value,
    };
    tsc_dynamic_promise_finally_settle_callback(&settle);
}

static tsc_value_t tsc_dynamic_promise_then(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_promise_t* receiver = (tsc_promise_t*)env;
    tsc_promise_t* result = tsc_promise_pending();
    tsc_dynamic_promise_then_env_t* state = (tsc_dynamic_promise_then_env_t*)TSC_GC_MALLOC(sizeof(tsc_dynamic_promise_then_env_t));
    state->receiver = receiver;
    state->result_promise = result;
    state->on_fulfilled = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    state->on_rejected = args && args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    if (tsc_promise_is_pending(receiver)) {
        tsc_promise_add_callback(receiver, tsc_dynamic_promise_then_callback, state);
    } else {
        tsc_queue_microtask(tsc_dynamic_promise_then_callback, state);
    }
    return tsc_value_promise(result);
}

static tsc_value_t tsc_dynamic_promise_catch(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_promise_t* receiver = (tsc_promise_t*)env;
    tsc_promise_t* result = tsc_promise_pending();
    tsc_dynamic_promise_then_env_t* state = (tsc_dynamic_promise_then_env_t*)TSC_GC_MALLOC(sizeof(tsc_dynamic_promise_then_env_t));
    state->receiver = receiver;
    state->result_promise = result;
    state->on_fulfilled = tsc_value_undefined();
    state->on_rejected = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    if (tsc_promise_is_pending(receiver)) {
        tsc_promise_add_callback(receiver, tsc_dynamic_promise_then_callback, state);
    } else {
        tsc_queue_microtask(tsc_dynamic_promise_then_callback, state);
    }
    return tsc_value_promise(result);
}

static tsc_value_t tsc_dynamic_promise_finally(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_promise_t* receiver = (tsc_promise_t*)env;
    tsc_promise_t* result = tsc_promise_pending();
    tsc_dynamic_promise_finally_env_t* state = (tsc_dynamic_promise_finally_env_t*)TSC_GC_MALLOC(sizeof(tsc_dynamic_promise_finally_env_t));
    state->receiver = receiver;
    state->result_promise = result;
    state->on_finally = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    if (tsc_promise_is_pending(receiver)) {
        tsc_promise_add_callback(receiver, tsc_dynamic_promise_finally_callback, state);
    } else {
        tsc_queue_microtask(tsc_dynamic_promise_finally_callback, state);
    }
    return tsc_value_promise(result);
}

tsc_value_t tsc_promise_get_method(tsc_promise_t* promise, const tsc_str_t* key) {
    if (!promise || !key) return tsc_value_undefined();
    if (str_lit_eq(key, "then")) {
        return tsc_value_function_builtin_named(tsc_dynamic_promise_then, promise, 2.0, tsc_str_from_lit("then", 4));
    }
    if (str_lit_eq(key, "catch")) {
        return tsc_value_function_builtin_named(tsc_dynamic_promise_catch, promise, 1.0, tsc_str_from_lit("catch", 5));
    }
    if (str_lit_eq(key, "finally")) {
        return tsc_value_function_builtin_named(tsc_dynamic_promise_finally, promise, 1.0, tsc_str_from_lit("finally", 7));
    }
    return tsc_value_undefined();
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
    p->ptr_result = tsc_value_gc_root(reason);
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

tsc_value_t tsc_promise_with_resolvers(void) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_promise_thenable_state_t* state =
        (tsc_promise_thenable_state_t*)TSC_GC_MALLOC(sizeof(tsc_promise_thenable_state_t));
    state->promise = promise;
    state->thenable = tsc_value_promise(promise);
    state->then_fn = tsc_value_undefined();
    state->seen = NULL;
    state->done = false;

    tsc_object_t* record = tsc_object_new();
    tsc_object_set(record, tsc_str_from_lit("promise", 7), tsc_value_promise(promise));
    tsc_object_set(record, tsc_str_from_lit("resolve", 7),
        tsc_value_function_closure_named(promise_thenable_resolve, state, 1.0, tsc_str_from_lit("resolve", 7)));
    tsc_object_set(record, tsc_str_from_lit("reject", 6),
        tsc_value_function_closure_named(promise_thenable_reject, state, 1.0, tsc_str_from_lit("reject", 6)));
    return tsc_value_object(record);
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

typedef struct {
    double timer_id;
    tsc_value_t value;
    tsc_value_t iterator;
    tsc_array_t* queued;
    tsc_array_t* pending;
    tsc_object_t* signal;
    bool closed;
    bool aborted;
    bool abort_delivered;
} tsc_timers_promises_interval_state_t;

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
    }
    values->len--;
}

static tsc_value_t timers_promises_interval_abort_reason(const tsc_timers_promises_interval_state_t* state) {
    if (!state || !state->signal) return tsc_value_undefined();
    return tsc_value_get_prop(
        tsc_value_object(state->signal),
        tsc_str_from_lit("reason", 6)
    );
}

static void timers_promises_interval_abort(void* env) {
    tsc_timers_promises_interval_state_t* state = (tsc_timers_promises_interval_state_t*)env;
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
    tsc_timers_promises_interval_state_t* state = (tsc_timers_promises_interval_state_t*)env;
    if (!state || state->closed) return;
    if (state->pending->len > 0) {
        tsc_promise_t* promise = TSC_ARR(tsc_promise_t*, state->pending, 0);
        timers_promises_interval_remove_first(state->pending);
        tsc_promise_fulfill_in_place(promise, timers_promises_interval_result(state->value, false));
        return;
    }
    tsc_value_t value = state->value;
    tsc_array_push_raw(state->queued, &value);
}

static tsc_value_t timers_promises_interval_next(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    (void)args;
    tsc_timers_promises_interval_state_t* state = (tsc_timers_promises_interval_state_t*)env;
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
    return tsc_value_promise(promise);
}

static tsc_value_t timers_promises_interval_return(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_timers_promises_interval_state_t* state = (tsc_timers_promises_interval_state_t*)env;
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
    tsc_timers_promises_interval_state_t* state = (tsc_timers_promises_interval_state_t*)env;
    return state ? state->iterator : tsc_value_undefined();
}

tsc_value_t tsc_timers_promises_set_interval(tsc_value_t value, double delay, tsc_value_t signal) {
    tsc_timers_promises_interval_state_t* state = (tsc_timers_promises_interval_state_t*)TSC_GC_MALLOC(sizeof(tsc_timers_promises_interval_state_t));
    state->timer_id = 0.0;
    state->value = value;
    state->queued = tsc_array_new(sizeof(tsc_value_t), 4);
    state->pending = tsc_array_new(sizeof(tsc_promise_t*), 4);
    state->signal = value_is_box(signal) && value_tag(signal) == TSC_VALUE_TAG_OBJECT
        ? (tsc_object_t*)value_ptr(signal)
        : NULL;
    state->closed = false;
    state->aborted = false;
    state->abort_delivered = false;
    tsc_object_t* iterator = tsc_object_new();
    state->iterator = tsc_value_object(iterator);
    tsc_object_set(iterator, tsc_str_from_lit("next", 4), tsc_value_function_builtin_named(timers_promises_interval_next, state, 0.0, tsc_str_from_lit("next", 4)));
    tsc_object_set(iterator, tsc_str_from_lit("return", 6), tsc_value_function_builtin_named(timers_promises_interval_return, state, 0.0, tsc_str_from_lit("return", 6)));
    tsc_value_set_symbol_prop(
        state->iterator,
        tsc_symbol_async_iterator(),
        tsc_value_function_builtin_named(timers_promises_interval_async_iterator, state, 0.0, tsc_str_from_lit("[Symbol.asyncIterator]", 22))
    );
    if (state->signal) {
        tsc_abort_signal_add_callback(signal, timers_promises_interval_abort, state);
    }
    if (!state->closed) {
        state->timer_id = tsc_set_interval(timers_promises_interval_tick, state, delay);
    }
    return state->iterator;
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
