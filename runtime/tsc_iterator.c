#include "tsc_internal.h"

static tsc_value_t iterator_self_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    return this_arg;
}

static const char iterator_prototype_realm_state_key = 0;
static const char async_iterator_prototype_realm_state_key = 0;
static tsc_value_t iterator_consume(void* env, tsc_value_t receiver, tsc_array_t* args);

tsc_value_t tsc_async_iterator_prototype_value(void) {
    tsc_object_t* prototype = tsc_realm_state_get(&async_iterator_prototype_realm_state_key);
    if (!prototype) {
        prototype = tsc_object_new();
        tsc_realm_state_set(&async_iterator_prototype_realm_state_key, prototype);
        tsc_object_define(prototype, tsc_symbol_property_key(tsc_symbol_async_iterator()),
            tsc_value_function_builtin_named(iterator_self_apply, NULL, 0,
                tsc_str_from_lit("[Symbol.asyncIterator]", 22)), true, false, true);
    }
    return tsc_value_object(prototype);
}

tsc_value_t tsc_iterator_prototype_value(void) {
    tsc_object_t* prototype = tsc_realm_state_get(&iterator_prototype_realm_state_key);
    if (!prototype) {
        prototype = tsc_object_new();
        tsc_realm_state_set(&iterator_prototype_realm_state_key, prototype);
        tsc_object_define(prototype, tsc_symbol_property_key(tsc_symbol_iterator()),
            tsc_value_function_builtin_named(iterator_self_apply, NULL, 0.0,
                tsc_str_from_lit("[Symbol.iterator]", 17)), true, false, true);
        static const struct { const char* name; bool reduce; } consumers[] = {
            { "forEach", false }, { "reduce", true },
        };
        for (size_t index = 0; index < sizeof(consumers) / sizeof(*consumers); ++index) {
            tsc_str_t* name = tsc_str_from_cstr(consumers[index].name);
            tsc_object_define(prototype, name, tsc_value_function_builtin_named(iterator_consume,
                (void*)&consumers[index].reduce, 1, name), true, false, true);
        }
    }
    return tsc_value_object(prototype);
}

/* GetIteratorDirect and GetIterator share the same rooted record. The direct
 * operation observes next without requesting an @@iterator method. */
tsc_sync_iterator_t tsc_sync_iterator_open_direct(tsc_value_t iterator) {
    tsc_sync_iterator_t record = {
        .source = iterator, .iterator = iterator, .next_method = tsc_value_undefined(),
        .source_gc_root = tsc_value_gc_root(iterator), .iterator_gc_root = tsc_value_gc_root(iterator),
    };
    if (!tsc_value_is_object(iterator)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator is not an object"));
    }
    record.next_method = tsc_value_get_prop(iterator, tsc_str_from_lit("next", 4));
    record.next_method_gc_root = tsc_value_gc_root(record.next_method);
    return record;
}


tsc_sync_iterator_t tsc_sync_iterator_open_with_method(
    tsc_value_t source,
    tsc_value_t method
) {
    if (tsc_value_is_nullish(source)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Value is not iterable"));
    }
    tsc_sync_iterator_t record = {
        .source = source,
        .iterator = tsc_value_undefined(),
        .next_method = tsc_value_undefined(),
        .source_gc_root = tsc_value_gc_root(source),
        .iterator_gc_root = NULL,
        .next_method_gc_root = NULL,
        .completion_gc_root = NULL,
        .done = false,
    };
    void* volatile method_gc_root = tsc_value_gc_root(method);
    (void)method_gc_root;
    if (!tsc_value_is_callable(method)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Value is not iterable"));
    }
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    record.iterator = tsc_value_apply_function(method, source, tsc_value_array(args));
    if (!tsc_value_is_object(record.iterator)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator method returned a non-object"));
    }
    tsc_sync_iterator_t direct = tsc_sync_iterator_open_direct(record.iterator);
    direct.source = record.source;
    direct.source_gc_root = record.source_gc_root;
    return direct;
}

tsc_sync_iterator_t tsc_sync_iterator_open(tsc_value_t source) {
    void* volatile source_gc_root = tsc_value_gc_root(source);
    (void)source_gc_root;
    tsc_value_t method = tsc_value_get_symbol_prop(source, tsc_symbol_iterator());
    return tsc_sync_iterator_open_with_method(source, method);
}

bool tsc_sync_iterator_step(tsc_sync_iterator_t* record, tsc_value_t* value) {
    if (!record || record->done) return false;
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) != 0) {
        /* IteratorStepValue marks the record complete on abrupt next, done,
         * or value evaluation. Consumers must not subsequently close it. */
        record->done = true;
        tsc_value_t error = tsc_current_error_value();
        void* volatile error_gc_root = tsc_value_gc_root(error);
        (void)error_gc_root;
        tsc_try_pop();
        tsc_throw_value(error);
    }
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_value_t result = tsc_value_apply_function(
        record->next_method,
        record->iterator,
        tsc_value_array(args)
    );
    if (!tsc_value_is_object(result)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator result is not an object"));
    }
    void* volatile result_gc_root = tsc_value_gc_root(result);
    (void)result_gc_root;
    if (tsc_value_is_truthy(tsc_value_get_prop(result, tsc_str_from_lit("done", 4)))) {
        record->done = true;
        return false;
    }
    if (value) {
        *value = tsc_value_get_prop(result, tsc_str_from_lit("value", 5));
    }
    return true;
}

void tsc_sync_iterator_close(tsc_sync_iterator_t* record) {
    if (!record || record->done) return;
    record->done = true;
    tsc_value_t return_method = tsc_value_get_prop(
        record->iterator,
        tsc_str_from_lit("return", 6)
    );
    void* volatile return_method_gc_root = tsc_value_gc_root(return_method);
    (void)return_method_gc_root;
    if (tsc_value_is_nullish(return_method)) return;
    if (!tsc_value_is_callable(return_method)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator return method is not callable"));
    }
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_value_t result = tsc_value_apply_function(
        return_method,
        record->iterator,
        tsc_value_array(args)
    );
    if (!tsc_value_is_object(result)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator return method returned a non-object"));
    }
}

void tsc_sync_iterator_scope_cleanup(tsc_sync_iterator_t** record) {
    if (!record || !*record) return;
    tsc_sync_iterator_close(*record);
    /* Keep this read after Close so the owner, including its pending value
     * root, stays observable throughout any allocating user callback. */
    (void)(*record)->completion_gc_root;
    (*record)->completion_gc_root = NULL;
}

tsc_value_t tsc_sync_iterator_close_with_error(tsc_sync_iterator_t* record, tsc_value_t error) {
    void* volatile error_gc_root = tsc_value_gc_root(error);
    (void)error_gc_root;
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) == 0) {
        tsc_sync_iterator_close(record);
        tsc_try_pop();
    } else {
        /* GetMethod(return), Call, and result validation cannot replace an
         * incoming throw completion. Closing still performs their effects. */
        tsc_try_pop();
    }
    return error;
}

_Noreturn void tsc_sync_iterator_close_abrupt(tsc_sync_iterator_t* record, tsc_value_t error) {
    tsc_throw_value(tsc_sync_iterator_close_with_error(record, error));
}

typedef struct {
    tsc_sync_iterator_t iterator;
    tsc_value_t callback, accumulator;
    void* callback_root;
    void* accumulator_root;
    tsc_bigint_t* counter;
} iterator_consumer_t;

static tsc_value_t iterator_consume(void* env, tsc_value_t receiver, tsc_array_t* args) {
    const bool reduce = *(const bool*)env;
    if (!tsc_value_is_object(receiver)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator consumer receiver is not an object"));
    }
    iterator_consumer_t* state = TSC_GC_MALLOC(sizeof(*state));
    *state = (iterator_consumer_t){ .iterator = {
        .source = receiver, .iterator = receiver, .next_method = tsc_value_undefined(),
        .source_gc_root = tsc_value_gc_root(receiver), .iterator_gc_root = tsc_value_gc_root(receiver),
    }, .callback = args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined(),
       .accumulator = tsc_value_undefined() };
    state->callback_root = tsc_value_gc_root(state->callback);
    if (!tsc_value_is_callable(state->callback)) {
        tsc_sync_iterator_close_abrupt(&state->iterator,
            tsc_value_error(tsc_error_new_named(tsc_str_from_lit("TypeError", 9),
                tsc_str_from_cstr("Iterator consumer callback is not callable"))));
    }
    state->iterator = tsc_sync_iterator_open_direct(receiver);
    state->counter = tsc_bigint_from_lit("0");
    if (reduce) {
        if (args && args->len > 1) state->accumulator = TSC_ARR(tsc_value_t, args, 1);
        else {
            if (!tsc_sync_iterator_step(&state->iterator, &state->accumulator)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator reduce has no initial value"));
            }
            mpz_add_ui(state->counter->value, state->counter->value, 1);
        }
        state->accumulator_root = tsc_value_gc_root(state->accumulator);
    }
    tsc_value_t value;
    while (tsc_sync_iterator_step(&state->iterator, &value)) {
        void* volatile value_root = tsc_value_gc_root(value);
        tsc_array_t* actual = tsc_array_new(sizeof(tsc_value_t), reduce ? 3 : 2);
        if (reduce) tsc_array_push_raw(actual, &state->accumulator);
        tsc_array_push_raw(actual, &value);
        tsc_value_t index = tsc_value_num(tsc_bigint_to_number(state->counter));
        tsc_array_push_raw(actual, &index);
        TSC_TRY_FRAME(frame);
        tsc_try_push(&frame);
        if (setjmp(frame.jb) != 0) {
            tsc_value_t error = tsc_current_error_value();
            tsc_try_pop();
            tsc_sync_iterator_close_abrupt(&state->iterator, error);
        }
        tsc_value_t result = tsc_value_apply_function(state->callback, tsc_value_undefined(), tsc_value_array(actual));
        if (reduce) {
            state->accumulator = result;
            state->accumulator_root = tsc_value_gc_root(result);
        }
        tsc_try_pop();
        mpz_add_ui(state->counter->value, state->counter->value, 1);
        (void)value_root;
    }
    return state->accumulator;
}

/* Ordinary generator owners project one retained graph through the three
 * protocol operations. No yielded-value queue or eager body execution exists. */
static tsc_value_t generator_result(tsc_value_t value, bool done) {
    void* volatile value_root = tsc_value_gc_root(value);
    tsc_object_t* result = tsc_object_new();
    tsc_object_set(result, tsc_str_from_lit("value", 5), value);
    tsc_object_set(result, tsc_str_from_lit("done", 4), tsc_value_bool(done));
    (void)value_root;
    return tsc_value_object(result);
}

void tsc_generator_suspend_result(tsc_generator_t* generator, tsc_value_t result) {
    tsc_completion_record_set(&generator->result, TSC_COMPLETION_NORMAL, result, -1);
    generator->state = TSC_GENERATOR_SUSPENDED_YIELD;
}
void tsc_generator_suspend(tsc_generator_t* generator, tsc_value_t value) {
    tsc_generator_suspend_result(generator, generator_result(value, false));
}
void tsc_generator_complete(tsc_generator_t* generator, tsc_completion_kind_t kind, tsc_value_t value) {
    tsc_completion_record_set(&generator->result, kind, value, -1);
    generator->state = TSC_GENERATOR_COMPLETED;
    generator->resume = NULL;
    generator->env = NULL;
}

static tsc_value_t generator_resume(void* env, tsc_value_t receiver, tsc_array_t* args) {
    tsc_completion_kind_t kind = *(const tsc_completion_kind_t*)env;
    tsc_object_t* object = value_is_object_value(receiver) ? (tsc_object_t*)value_ptr(receiver) : NULL;
    tsc_generator_t* generator = object ? object->generator : NULL;
    if (!generator) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Generator method called on incompatible receiver"));
    if (generator->state == TSC_GENERATOR_EXECUTING)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Generator is already executing"));
    tsc_value_t value = args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    if (generator->state == TSC_GENERATOR_SUSPENDED_START) {
        if (kind != TSC_COMPLETION_NORMAL) tsc_generator_complete(generator, kind, tsc_value_undefined());
        else value = tsc_value_undefined();
    }
    if (generator->state == TSC_GENERATOR_COMPLETED) {
        if (kind == TSC_COMPLETION_THROW) tsc_throw_value(value);
        return generator_result(kind == TSC_COMPLETION_RETURN ? value : tsc_value_undefined(), true);
    }
    tsc_completion_record_set(&generator->request, kind, value, -1);
    tsc_completion_record_clear(&generator->result);
    generator->state = TSC_GENERATOR_EXECUTING;
    tsc_realm_t* previous = tsc_realm_swap(generator->realm);
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) == 0) {
        generator->resume(generator->env);
        tsc_try_pop();
    } else {
        tsc_value_t error = tsc_current_error_value();
        tsc_try_pop();
        tsc_generator_complete(generator, TSC_COMPLETION_THROW, error);
    }
    tsc_completion_record_clear(&generator->request);
    if (generator->state == TSC_GENERATOR_EXECUTING) {
        generator->state = TSC_GENERATOR_COMPLETED;
        (void)tsc_realm_swap(previous);
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Invalid generator continuation state"));
    }
    if (generator->result.kind == TSC_COMPLETION_THROW) {
        tsc_value_t error = generator->result.value;
        void* volatile error_root = tsc_value_gc_root(error);
        tsc_completion_record_clear(&generator->result);
        (void)tsc_realm_swap(previous);
        (void)error_root;
        tsc_throw_value(error);
    }
    tsc_value_t result = generator->state == TSC_GENERATOR_SUSPENDED_YIELD
        ? generator->result.value : generator_result(generator->result.value, true);
    void* volatile result_root = tsc_value_gc_root(result);
    if (generator->state == TSC_GENERATOR_COMPLETED) tsc_completion_record_clear(&generator->result);
    (void)tsc_realm_swap(previous);
    (void)result_root;
    return result;
}

static const char generator_graph_prototype_key = 0;
static tsc_value_t generator_prototype_value(void) {
    tsc_object_t* prototype = tsc_realm_state_get(&generator_graph_prototype_key);
    if (!prototype) {
        prototype = tsc_object_new_with_prototype(tsc_iterator_prototype_value());
        tsc_realm_state_set(&generator_graph_prototype_key, prototype);
        static const struct { const char* name; tsc_completion_kind_t kind; } methods[] = {
            { "next", TSC_COMPLETION_NORMAL }, { "return", TSC_COMPLETION_RETURN }, { "throw", TSC_COMPLETION_THROW }
        };
        for (size_t index = 0; index < sizeof(methods) / sizeof(*methods); ++index) {
            tsc_str_t* name = tsc_str_from_cstr(methods[index].name);
            tsc_object_define(prototype, name, tsc_value_function_builtin_named(generator_resume,
                (void*)&methods[index].kind, 1, name), true, false, true);
        }
        tsc_object_define(prototype, tsc_symbol_property_key(tsc_symbol_to_string_tag()),
            tsc_value_string(tsc_str_from_lit("Generator", 9)), false, false, true);
    }
    return tsc_value_object(prototype);
}

tsc_value_t tsc_generator_function_value(tsc_value_t function) {
    if (!value_is_box(function) || value_tag(function) != TSC_VALUE_TAG_FUNCTION) return function;
    tsc_function_identity_t* identity = value_ptr(function);
    if (!identity->is_generator) {
        void* volatile function_root = tsc_value_gc_root(function);
        tsc_object_t* prototype = tsc_object_new_with_prototype(generator_prototype_value());
        tsc_function_identity_set_own_prototype(identity, tsc_value_object(prototype));
        identity->func_prototype_initialized = true;
        identity->has_prototype_property = true;
        identity->is_generator = true;
        (void)function_root;
    }
    return function;
}

tsc_generator_t* tsc_generator_new(void (*resume)(void*), void* env) {
    tsc_value_t callee = tsc_value_current_callee();
    tsc_value_t prototype = tsc_value_is_callable(callee)
        ? tsc_value_get_prop(callee, tsc_str_from_lit("prototype", 9)) : tsc_value_undefined();
    if (!tsc_value_is_object(prototype)) prototype = generator_prototype_value();
    void* volatile prototype_root = tsc_value_gc_root(prototype);
    tsc_generator_t* generator = TSC_GC_MALLOC(sizeof(*generator));
    *generator = (tsc_generator_t){ .object = tsc_object_new_with_prototype(prototype),
        .realm = tsc_realm_current(), .resume = resume, .env = env, .state = TSC_GENERATOR_SUSPENDED_START };
    generator->object->generator = generator;
    tsc_completion_record_clear(&generator->request);
    tsc_completion_record_clear(&generator->result);
    (void)prototype_root;
    return generator;
}
tsc_value_t tsc_generator_value(tsc_generator_t* generator) { return tsc_value_object(generator->object); }

/* Yield delegation preserves the actual iterator result object while it is
 * incomplete. In particular it must not read value until done is true. */
bool tsc_generator_delegate_step(tsc_sync_iterator_t* iterator,
        const tsc_completion_record_t* request, tsc_completion_record_t* output) {
    tsc_value_t method = iterator->next_method;
    tsc_completion_kind_t kind = TSC_COMPLETION_NORMAL;
    if (request->kind != TSC_COMPLETION_NORMAL) {
        const char* name = request->kind == TSC_COMPLETION_RETURN ? "return" : "throw";
        method = tsc_value_get_prop(iterator->iterator, tsc_str_from_cstr(name));
        if (tsc_value_is_nullish(method)) {
            if (request->kind == TSC_COMPLETION_RETURN) {
                iterator->done = true;
                tsc_completion_record_set(output, TSC_COMPLETION_RETURN, request->value, -1);
                return true;
            }
            tsc_sync_iterator_close(iterator);
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Delegated iterator has no throw method"));
        }
        if (!tsc_value_is_callable(method))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Delegated iterator method is not callable"));
        if (request->kind == TSC_COMPLETION_RETURN) kind = TSC_COMPLETION_RETURN;
    }
    void* volatile method_root = tsc_value_gc_root(method);
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_array_push_value(args, request->value);
    tsc_value_t result = tsc_value_apply_function(method, iterator->iterator, tsc_value_array(args));
    if (!tsc_value_is_object(result))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Delegated iterator result is not an object"));
    void* volatile result_root = tsc_value_gc_root(result);
    bool done = tsc_value_is_truthy(tsc_value_get_prop(result, tsc_str_from_lit("done", 4)));
    tsc_completion_record_set(output, done ? kind : TSC_COMPLETION_NORMAL,
        done ? tsc_value_get_prop(result, tsc_str_from_lit("value", 5)) : result, -1);
    iterator->done = done;
    (void)method_root; (void)result_root;
    return done;
}
