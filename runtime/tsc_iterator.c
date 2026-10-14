#include "tsc_internal.h"

static tsc_value_t iterator_self_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    return this_arg;
}

static const char iterator_prototype_realm_state_key = 0;
static const char iterator_constructor_realm_state_key = 0;
static const char iterator_wrapper_prototype_realm_state_key = 0;
static const char async_iterator_prototype_realm_state_key = 0;
static const bool iterator_accessor_keys[] = {false, true};
static tsc_str_t* iterator_accessor_key(bool tag) {
    return tag ? tsc_symbol_property_key(tsc_symbol_to_string_tag()) : tsc_str_from_lit("constructor", 11);
}
static tsc_value_t iterator_metadata_get(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver; (void)args;
    return *(const bool*)env ? tsc_value_string(tsc_str_from_lit("Iterator", 8)) : tsc_iterator_constructor_value();
}
static tsc_value_t iterator_metadata_set(void* env, tsc_value_t receiver, tsc_array_t* args) {
    if (!tsc_value_is_object(receiver) || receiver == tsc_iterator_prototype_value())
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator prototype metadata cannot be assigned on this receiver"));
    bool tag = *(const bool*)env;
    tsc_str_t* key = iterator_accessor_key(tag);
    tsc_value_t value = args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    void* volatile value_root = tsc_value_gc_root(value);
    tsc_value_t descriptor = tsc_value_get_own_property_descriptor(receiver, key);
    bool success = tsc_value_is_undefined(descriptor)
        ? tsc_value_create_data_property(receiver, tag ? tsc_value_symbol(tsc_symbol_to_string_tag()) : tsc_value_string(key), value)
        : tsc_value_set_prop(receiver, key, value);
    if (!success) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator metadata assignment failed"));
    (void)value_root;
    return tsc_value_undefined();
}
static tsc_value_t iterator_constructor_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)receiver; (void)args;
    tsc_value_t new_target = tsc_value_current_new_target();
    if (tsc_value_is_undefined(new_target) || new_target == tsc_iterator_constructor_value())
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator requires a derived constructor"));
    tsc_value_t prototype = tsc_value_get_prototype_from_constructor(new_target, TSC_INTRINSIC_DEFAULT_ITERATOR_PROTOTYPE);
    void* volatile prototype_root = tsc_value_gc_root(prototype);
    tsc_value_t result = tsc_value_object(tsc_object_new_with_prototype(prototype));
    (void)prototype_root;
    return result;
}
static tsc_value_t iterator_wrapper_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)args;
    tsc_object_t* object = value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_OBJECT ? value_ptr(receiver) : NULL;
    tsc_iterator_record_t* record = object ? object->wrapped_iterator : NULL;
    if (!record) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator wrapper receiver lacks its internal slot"));
    tsc_value_t method = record->next_method;
    if (env) {
        method = tsc_value_get_prop(record->iterator, tsc_str_from_lit("return", 6));
        if (tsc_value_is_nullish(method)) return tsc_iterator_result(tsc_value_undefined(), true);
    }
    void* volatile method_root = tsc_value_gc_root(method);
    tsc_value_t result = tsc_value_apply_function(method, record->iterator,
        tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 0)));
    (void)method_root;
    return result;
}
static tsc_value_t iterator_from_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)receiver;
    tsc_value_t source = args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    if (!tsc_value_is_object(source) && !(value_is_box(source) && value_tag(source) == TSC_VALUE_TAG_STRING))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator.from requires an object or string"));
    tsc_iterator_record_t* volatile record = TSC_GC_MALLOC(sizeof(*record));
    *record = (tsc_iterator_record_t){ .source = source, .source_gc_root = tsc_value_gc_root(source) };
    tsc_value_t method = tsc_value_get_symbol_prop(source, tsc_symbol_iterator());
    *record = tsc_value_is_nullish(method) ? tsc_sync_iterator_open_direct(source)
        : tsc_sync_iterator_open_with_method(source, method);
    if (tsc_value_instanceof(record->iterator, tsc_iterator_constructor_value())) return record->iterator;
    tsc_object_t* prototype = tsc_realm_state_get(&iterator_wrapper_prototype_realm_state_key);
    if (!prototype) {
        prototype = tsc_object_new_with_prototype(tsc_iterator_prototype_value());
        tsc_realm_state_set(&iterator_wrapper_prototype_realm_state_key, prototype);
        tsc_object_define(prototype, tsc_str_from_lit("next", 4),
            tsc_value_function_builtin_named(iterator_wrapper_apply, NULL, 0, tsc_str_from_lit("next", 4)), true, false, true);
        tsc_object_define(prototype, tsc_str_from_lit("return", 6),
            tsc_value_function_builtin_named(iterator_wrapper_apply, (void*)1, 0, tsc_str_from_lit("return", 6)), true, false, true);
    }
    tsc_object_t* object = tsc_object_new_with_prototype(tsc_value_object(prototype));
    object->wrapped_iterator = record;
    return tsc_value_object(object);
}
tsc_value_t tsc_iterator_constructor_value(void) {
    tsc_function_identity_t* identity = tsc_realm_state_get(&iterator_constructor_realm_state_key);
    if (!identity) {
        tsc_value_t constructor = tsc_value_function_named_kind(iterator_constructor_apply, iterator_constructor_apply, NULL,
            0, tsc_str_from_lit("Iterator", 8), TSC_FUNCTION_IDENTITY_BUILTIN);
        identity = value_ptr(constructor);
        tsc_realm_state_set(&iterator_constructor_realm_state_key, identity);
        identity->construct_allocates_receiver = false;
        identity->construct_default_prototype = TSC_INTRINSIC_DEFAULT_ITERATOR_PROTOTYPE;
        tsc_function_identity_set_own_prototype(identity, tsc_iterator_prototype_value());
        identity->func_prototype_writable = false;
        (void)tsc_value_define_property_desc(constructor, tsc_str_from_lit("from", 4),
            tsc_value_function_builtin_named(iterator_from_apply, NULL, 1, tsc_str_from_lit("from", 4)),
            true, true, true, false, true, true, true);
        (void)tsc_value_define_property_desc(constructor, tsc_str_from_lit("concat", 6),
            tsc_iterator_concat_value(), true, true, true, false, true, true, true);
    }
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)identity);
}
typedef enum { FOR_EACH, REDUCE, SOME, EVERY, FIND, TO_ARRAY } iterator_consumer_operation_t;
static const struct { const char* name; iterator_consumer_operation_t operation; size_t length; } consumers[] = {
#define TSC_ITERATOR_CONSUMER(name, operation, length) {#name, operation, length},
#include "tsc_iterator_consumers.def"
#undef TSC_ITERATOR_CONSUMER
};
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
        for (size_t index = 0; index < sizeof(consumers) / sizeof(*consumers); ++index) {
            tsc_str_t* name = tsc_str_from_cstr(consumers[index].name);
            tsc_object_define(prototype, name, tsc_value_function_builtin_named(iterator_consume,
                (void*)&consumers[index].operation, consumers[index].length, name), true, false, true);
        }
        tsc_iterator_install_helpers(prototype);
        for (size_t index = 0; index < sizeof(iterator_accessor_keys) / sizeof(*iterator_accessor_keys); ++index) {
            const bool* tag = &iterator_accessor_keys[index];
            const char* name = *tag ? "[Symbol.toStringTag]" : "constructor";
            tsc_object_t* volatile descriptor = tsc_object_new();
            tsc_object_set(descriptor, tsc_str_from_lit("get", 3),
                tsc_value_function_builtin_named(iterator_metadata_get, (void*)tag, 0,
                    tsc_str_concat(tsc_str_from_lit("get ", 4), tsc_str_from_cstr(name))));
            tsc_object_set(descriptor, tsc_str_from_lit("set", 3),
                tsc_value_function_builtin_named(iterator_metadata_set, (void*)tag, 1,
                    tsc_str_concat(tsc_str_from_lit("set ", 4), tsc_str_from_cstr(name))));
            tsc_object_set(descriptor, tsc_str_from_lit("configurable", 12), tsc_value_bool(true));
            (void)tsc_value_define_computed_property_descriptor(tsc_value_object(prototype),
                *tag ? tsc_value_symbol(tsc_symbol_to_string_tag()) : tsc_value_string(tsc_str_from_lit("constructor", 11)),
                tsc_value_object(descriptor));
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

/* CreateForInIterator retains one current object, remaining-key List and
 * visited-key Set. OwnPropertyKeys is captured on entering each prototype;
 * descriptors stay live until a key is processed. Neither property values nor
 * user-visible iterator methods participate in enumeration. */
typedef struct {
    tsc_value_t object;
    void* object_gc_root;
    bool object_was_visited;
    tsc_array_t* remaining_keys;
    size_t key_index;
    tsc_set_t* visited_keys;
} for_in_iterator_state_t;

static tsc_value_t for_in_iterator_next(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;
    (void)args;
    for_in_iterator_state_t* state = env;
    for (;;) {
        if (tsc_value_is_nullish(state->object)) return tsc_iterator_result(tsc_value_undefined(), true);
        if (!state->object_was_visited) {
            state->remaining_keys = tsc_value_own_keys(state->object);
            state->key_index = 0;
            state->object_was_visited = true;
        }
        while (state->key_index < state->remaining_keys->len) {
            tsc_str_t* key = TSC_ARR(tsc_str_t*, state->remaining_keys, state->key_index++);
            if (tsc_set_has_raw(state->visited_keys, &key)) continue;
            tsc_value_t descriptor = tsc_value_get_own_property_descriptor(state->object, key);
            void* volatile descriptor_root = tsc_value_gc_root(descriptor);
            (void)descriptor_root;
            if (tsc_value_is_undefined(descriptor)) continue;
            tsc_set_add_raw(state->visited_keys, &key);
            if (tsc_value_is_truthy(tsc_value_get_prop(descriptor, tsc_str_from_lit("enumerable", 10))))
                return tsc_iterator_result(tsc_value_string(key), false);
        }
        state->object = tsc_value_get_prototype_of(state->object);
        state->object_gc_root = tsc_value_gc_root(state->object);
        state->object_was_visited = false;
        state->remaining_keys = NULL;
    }
}

tsc_sync_iterator_t tsc_for_in_iterator_open(tsc_value_t source) {
    if (tsc_value_is_nullish(source)) return (tsc_sync_iterator_t){ .done = true };
    void* volatile source_root = tsc_value_gc_root(source);
    for_in_iterator_state_t* state = TSC_GC_MALLOC(sizeof(*state));
    *state = (for_in_iterator_state_t){ .object = tsc_value_to_object(source) };
    state->object_gc_root = tsc_value_gc_root(state->object);
    state->visited_keys = tsc_set_new(sizeof(tsc_str_t*), TSC_KEY_STR, 0);
    tsc_object_t* iterator = tsc_object_new();
    tsc_object_define(iterator, tsc_str_from_lit("next", 4),
        tsc_value_function_builtin_named(for_in_iterator_next, state, 0, tsc_str_from_lit("next", 4)),
        true, false, true);
    /* These internal methods are never invoked. Own null values prevent
     * Object.prototype mutation from adding observable close operations. */
    tsc_object_define(iterator, tsc_str_from_lit("return", 6), tsc_value_null(), true, false, true);
    tsc_object_define(iterator, tsc_str_from_lit("throw", 5), tsc_value_null(), true, false, true);
    tsc_sync_iterator_t record = tsc_sync_iterator_open_direct(tsc_value_object(iterator));
    record.source = source;
    record.source_gc_root = (void*)source_root;
    return record;
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
    const iterator_consumer_operation_t operation = *(const iterator_consumer_operation_t*)env;
    const bool reduce = operation == REDUCE;
    if (!tsc_value_is_object(receiver)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator consumer receiver is not an object"));
    }
    iterator_consumer_t* volatile state = TSC_GC_MALLOC(sizeof(*state));
    *state = (iterator_consumer_t){ .iterator = {
        .source = receiver, .iterator = receiver, .next_method = tsc_value_undefined(),
        .source_gc_root = tsc_value_gc_root(receiver), .iterator_gc_root = tsc_value_gc_root(receiver),
    }, .callback = args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined(),
       .accumulator = tsc_value_undefined() };
    state->callback_root = tsc_value_gc_root(state->callback);
    if (operation != TO_ARRAY && !tsc_value_is_callable(state->callback)) {
        tsc_sync_iterator_close_abrupt(&state->iterator,
            tsc_value_error(tsc_error_new_named(tsc_str_from_lit("TypeError", 9),
                tsc_str_from_cstr("Iterator consumer callback is not callable"))));
    }
    state->iterator = tsc_sync_iterator_open_direct(receiver);
    state->counter = tsc_bigint_from_lit("0");
    tsc_array_t* volatile items = operation == TO_ARRAY ? tsc_array_new(sizeof(tsc_value_t), 0) : NULL;
    if (items) tsc_array_use_value_storage(items);
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
        if (items) { tsc_array_push_value(items, value); continue; }
        tsc_array_t* volatile actual = tsc_array_new(sizeof(tsc_value_t), reduce ? 3 : 2);
        tsc_array_use_value_storage(actual);
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
        if ((operation == SOME || operation == FIND) && tsc_value_is_truthy(result) ||
            operation == EVERY && !tsc_value_is_truthy(result)) {
            state->accumulator = operation == FIND ? value : tsc_value_bool(operation == SOME);
            state->accumulator_root = tsc_value_gc_root(state->accumulator);
            tsc_sync_iterator_close(&state->iterator);
            return state->accumulator;
        }
        mpz_add_ui(state->counter->value, state->counter->value, 1);
        (void)value_root;
    }
    if (items) return tsc_value_array(items);
    if (operation == SOME || operation == EVERY) return tsc_value_bool(operation == EVERY);
    return state->accumulator;
}

/* Object.fromEntries consumes the same captured Iterator Record as other
 * iterable consumers. Entry shape does not select a layout: ordinary Get
 * supplies both positional values through native owner codecs when needed. */
tsc_value_t tsc_value_object_from_entries(tsc_value_t entries) {
    void* volatile entries_root = tsc_value_gc_root(entries);
    if (tsc_value_is_nullish(entries))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.fromEntries requires an iterable"));
    tsc_value_t output = tsc_value_object(tsc_object_new());
    void* volatile output_root = tsc_value_gc_root(output);
    tsc_sync_iterator_t* iterator = TSC_GC_MALLOC(sizeof(*iterator));
    *iterator = tsc_sync_iterator_open(entries);
    for (;;) {
        tsc_value_t entry;
        // IteratorStepValue failures propagate directly. Entry validation,
        // property Gets and the adder close with incoming throw precedence.
        if (!tsc_sync_iterator_step(iterator, &entry)) break;
        void* volatile entry_root = tsc_value_gc_root(entry);
        TSC_TRY_FRAME(frame);
        tsc_try_push(&frame);
        if (setjmp(frame.jb) != 0) {
            tsc_value_t error = tsc_current_error_value();
            tsc_try_pop();
            tsc_sync_iterator_close_abrupt(iterator, error);
        }
        if (!tsc_value_is_object(entry))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.fromEntries entry is not an object"));
        tsc_value_t key = tsc_value_get_prop(entry, tsc_str_from_lit("0", 1));
        void* volatile key_root = tsc_value_gc_root(key);
        tsc_value_t value = tsc_value_get_prop(entry, tsc_str_from_lit("1", 1));
        void* volatile value_root = tsc_value_gc_root(value);
        if (!tsc_value_create_data_property(output, key, value))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.fromEntries property could not be created"));
        tsc_try_pop();
        (void)entry_root; (void)key_root; (void)value_root;
    }
    (void)entries_root; (void)output_root;
    return output;
}

typedef struct tsc_keyed_group {
    tsc_value_t key;
    void* key_root;
    tsc_array_t* elements;
    struct tsc_keyed_group* next;
} tsc_keyed_group_t;

typedef struct {
    tsc_sync_iterator_t iterator;
    tsc_value_t callback;
    void* callback_root;
    tsc_keyed_group_t* head;
    tsc_keyed_group_t* tail;
    double index;
} tsc_group_by_state_t;

static tsc_keyed_group_t* group_by_collect(tsc_value_t items, tsc_value_t callback, bool property_keys) {
    void* volatile items_root = tsc_value_gc_root(items);
    void* volatile callback_root = tsc_value_gc_root(callback);
    if (tsc_value_is_nullish(items))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("GroupBy items are null or undefined"));
    if (!tsc_value_is_callable(callback))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("GroupBy callback is not callable"));
    tsc_group_by_state_t* state = TSC_GC_MALLOC(sizeof(*state));
    *state = (tsc_group_by_state_t){ .callback = callback, .callback_root = tsc_value_gc_root(callback) };
    state->iterator = tsc_sync_iterator_open(items);
    (void)items_root; (void)callback_root;
    for (;;) {
        if (state->index >= 0x1fffffffffffffp0)
            tsc_sync_iterator_close_abrupt(&state->iterator,
                tsc_value_error(tsc_error_new_named(tsc_str_from_lit("TypeError", 9),
                    tsc_str_from_cstr("GroupBy index exceeds the maximum safe integer"))));
        tsc_value_t value;
        // IteratorStepValue errors propagate directly. Callback and key
        // conversion failures close the captured record with throw precedence.
        if (!tsc_sync_iterator_step(&state->iterator, &value)) return state->head;
        void* volatile value_root = tsc_value_gc_root(value);
        tsc_array_t* actual = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_array_push_value(actual, value);
        tsc_array_push_value(actual, tsc_value_num(state->index));
        TSC_TRY_FRAME(frame);
        tsc_try_push(&frame);
        if (setjmp(frame.jb) != 0) {
            tsc_value_t error = tsc_current_error_value();
            tsc_try_pop();
            tsc_sync_iterator_close_abrupt(&state->iterator, error);
        }
        tsc_value_t key = tsc_value_apply_function(state->callback, tsc_value_undefined(), tsc_value_array(actual));
        void* volatile key_root = tsc_value_gc_root(key);
        if (property_keys) key = tsc_value_to_property_key(key);
        else key = tsc_value_canonicalize_collection_key(key);
        key_root = tsc_value_gc_root(key);
        tsc_keyed_group_t* group = state->head;
        while (group && !tsc_value_object_is(group->key, key)) group = group->next;
        if (!group) {
            group = TSC_GC_MALLOC(sizeof(*group));
            *group = (tsc_keyed_group_t){ .key = key, .key_root = tsc_value_gc_root(key),
                .elements = tsc_array_new(sizeof(tsc_value_t), 0) };
            if (state->tail) state->tail->next = group;
            else state->head = group;
            state->tail = group;
        }
        tsc_array_push_value(group->elements, value);
        tsc_try_pop();
        state->index++;
        (void)value_root; (void)key_root;
    }
}

tsc_value_t tsc_value_object_group_by(tsc_value_t items, tsc_value_t callback) {
    tsc_keyed_group_t* groups = group_by_collect(items, callback, true);
    tsc_value_t output = tsc_value_object_create(tsc_value_null());
    void* volatile output_root = tsc_value_gc_root(output);
    for (tsc_keyed_group_t* group = groups; group; group = group->next) {
        tsc_value_t elements = tsc_value_array(group->elements);
        if (!tsc_value_create_data_property(output, group->key, elements))
            tsc_panic("GroupBy result property could not be created");
    }
    (void)output_root;
    return output;
}

struct tsc_map* tsc_value_map_group_by(tsc_value_t items, tsc_value_t callback,
        const tsc_group_by_map_layout_t* layout) {
    tsc_keyed_group_t* groups = group_by_collect(items, callback, false);
    size_t key_size = layout ? layout->key_size : sizeof(tsc_value_t);
    tsc_map_t* map = tsc_map_new(key_size, layout ? sizeof(tsc_array_t*) : sizeof(tsc_value_t),
        layout ? layout->key_kind : TSC_KEY_VALUE, 0);
    if (layout) tsc_map_set_value_codecs(map, layout->box_key, layout->unbox_key, layout->box_group, layout->unbox_group);
    void* key_storage = TSC_GC_MALLOC(key_size);
    for (tsc_keyed_group_t* group = groups; group; group = group->next) {
        tsc_value_t elements = tsc_value_array(group->elements);
        if (layout) {
            if (layout->unbox_key) layout->unbox_key(group->key, key_storage);
            else memcpy(key_storage, &group->key, sizeof(group->key));
            tsc_array_t* native_elements = NULL;
            if (!layout->unbox_group || !layout->unbox_group(elements, &native_elements))
                tsc_panic("GroupBy result storage cannot represent its elements");
            tsc_map_set_raw(map, key_storage, &native_elements);
        } else tsc_map_set_raw(map, &group->key, &elements);
    }
    return map;
}

/* Ordinary generator owners project one retained graph through the three
 * protocol operations. No yielded-value queue or eager body execution exists. */

static void async_generator_drain(tsc_generator_t* generator);
static tsc_value_t async_generator_apply(void* env, tsc_value_t receiver, tsc_array_t* args);

static void async_generator_complete_step(tsc_generator_t* generator,
        tsc_completion_kind_t kind, tsc_value_t value, bool done) {
    tsc_generator_request_t* request = generator->queue_head;
    if (!request) tsc_panic("Async generator has no current request");
    void* volatile value_root = tsc_value_gc_root(value);
    generator->queue_head = request->next;
    if (!generator->queue_head) generator->queue_tail = NULL;
    tsc_completion_record_clear(&generator->request);
    if (kind == TSC_COMPLETION_THROW) tsc_promise_reject_in_place(request->capability, value);
    else {
        tsc_realm_t* previous = tsc_realm_swap(generator->caller_realm);
        tsc_value_t result = tsc_iterator_result(value, done);
        (void)tsc_realm_swap(previous);
        tsc_promise_resolve_into(request->capability, result);
    }
    tsc_completion_record_clear(&request->completion);
    request->next = NULL;
    (void)value_root;
}

bool tsc_generator_resume_enter(tsc_generator_t* generator, tsc_realm_t* caller_realm) {
    bool previous = generator->processing;
    generator->processing = true;
    generator->caller_realm = caller_realm;
    return previous;
}
void tsc_generator_resume_leave(tsc_generator_t* generator, bool was_processing) {
    generator->processing = was_processing;
    if (generator->asynchronous && !was_processing) async_generator_drain(generator);
}

void tsc_generator_suspend_result(tsc_generator_t* generator, tsc_value_t result) {
    if (generator->asynchronous) tsc_panic("Async delegation requires a canonical operation");
    tsc_completion_record_set(&generator->result, TSC_COMPLETION_NORMAL, result, -1);
    generator->state = TSC_GENERATOR_SUSPENDED_YIELD;
}
void tsc_generator_suspend(tsc_generator_t* generator, tsc_value_t value) {
    if (generator->asynchronous) {
        generator->state = TSC_GENERATOR_SUSPENDED_YIELD;
        async_generator_complete_step(generator, TSC_COMPLETION_NORMAL, value, false);
    } else tsc_generator_suspend_result(generator, tsc_iterator_result(value, false));
}
void tsc_generator_complete(tsc_generator_t* generator, tsc_completion_kind_t kind, tsc_value_t value) {
    tsc_completion_record_set(&generator->result, kind, value, -1);
    generator->state = generator->asynchronous ? TSC_GENERATOR_DRAINING_QUEUE : TSC_GENERATOR_COMPLETED;
    generator->resume = NULL;
    generator->env = NULL;
    if (generator->asynchronous) {
        async_generator_complete_step(generator, kind, value, true);
        tsc_completion_record_clear(&generator->result);
    }
}

static tsc_value_t generator_resume(void* env, tsc_value_t receiver, tsc_array_t* args) {
    tsc_completion_kind_t kind = *(const tsc_completion_kind_t*)env;
    tsc_object_t* object = value_is_object_value(receiver) ? (tsc_object_t*)value_ptr(receiver) : NULL;
    tsc_generator_t* generator = object ? object->generator : NULL;
    if (!generator || generator->asynchronous) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Generator method called on incompatible receiver"));
    if (generator->state == TSC_GENERATOR_EXECUTING)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Generator is already executing"));
    tsc_value_t value = args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    if (generator->state == TSC_GENERATOR_SUSPENDED_START) {
        if (kind != TSC_COMPLETION_NORMAL) tsc_generator_complete(generator, kind, tsc_value_undefined());
        else value = tsc_value_undefined();
    }
    if (generator->state == TSC_GENERATOR_COMPLETED) {
        if (kind == TSC_COMPLETION_THROW) tsc_throw_value(value);
        return tsc_iterator_result(kind == TSC_COMPLETION_RETURN ? value : tsc_value_undefined(), true);
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
    /* GeneratorStart removes its execution context before constructing a
     * completed IteratorResult. Yielded results were already created by the
     * generator continuation and retain their original Realm. */
    (void)tsc_realm_swap(previous);
    tsc_value_t result = generator->state == TSC_GENERATOR_SUSPENDED_YIELD
        ? generator->result.value : tsc_iterator_result(generator->result.value, true);
    void* volatile result_root = tsc_value_gc_root(result);
    if (generator->state == TSC_GENERATOR_COMPLETED) tsc_completion_record_clear(&generator->result);
    (void)result_root;
    return result;
}

static const char generator_graph_prototype_key = 0;
static const char async_generator_graph_prototype_key = 0;
tsc_value_t tsc_generator_prototype_value(bool asynchronous) {
    const void* key = asynchronous ? &async_generator_graph_prototype_key : &generator_graph_prototype_key;
    tsc_object_t* prototype = tsc_realm_state_get(key);
    if (!prototype) {
        prototype = tsc_object_new_with_prototype(asynchronous
            ? tsc_async_iterator_prototype_value() : tsc_iterator_prototype_value());
        tsc_realm_state_set(key, prototype);
        static const struct { const char* name; tsc_completion_kind_t kind; } methods[] = {
            { "next", TSC_COMPLETION_NORMAL }, { "return", TSC_COMPLETION_RETURN }, { "throw", TSC_COMPLETION_THROW }
        };
        for (size_t index = 0; index < sizeof(methods) / sizeof(*methods); ++index) {
            tsc_str_t* name = tsc_str_from_cstr(methods[index].name);
            tsc_object_define(prototype, name, tsc_value_function_builtin_named(asynchronous ? async_generator_apply : generator_resume,
                (void*)&methods[index].kind, 1, name), true, false, true);
        }
        tsc_object_define(prototype, tsc_symbol_property_key(tsc_symbol_to_string_tag()),
            tsc_value_string(tsc_str_from_cstr(asynchronous ? "AsyncGenerator" : "Generator")), false, false, true);
        tsc_object_define(prototype, tsc_str_from_lit("constructor", 11),
            tsc_dynamic_function_prototype(asynchronous ? TSC_DYNAMIC_FUNCTION_ASYNC_GENERATOR : TSC_DYNAMIC_FUNCTION_GENERATOR),
            false, false, true);
    }
    return tsc_value_object(prototype);
}

tsc_generator_t* tsc_generator_new(void (*resume)(void*), void* env, bool asynchronous) {
    tsc_value_t callee = tsc_value_current_callee();
    tsc_value_t prototype = tsc_value_is_callable(callee)
        ? tsc_value_get_prop(callee, tsc_str_from_lit("prototype", 9)) : tsc_value_undefined();
    if (!tsc_value_is_object(prototype)) prototype = tsc_generator_prototype_value(asynchronous);
    void* volatile prototype_root = tsc_value_gc_root(prototype);
    tsc_generator_t* generator = TSC_GC_MALLOC(sizeof(*generator));
    *generator = (tsc_generator_t){ .object = tsc_object_new_with_prototype(prototype),
        .realm = tsc_realm_current(), .caller_realm = tsc_realm_current(), .resume = resume, .env = env,
        .asynchronous = asynchronous, .state = TSC_GENERATOR_SUSPENDED_START };
    generator->object->generator = generator;
    tsc_completion_record_clear(&generator->request);
    tsc_completion_record_clear(&generator->result);
    (void)prototype_root;
    return generator;
}
tsc_value_t tsc_generator_value(tsc_generator_t* generator) { return tsc_value_object(generator->object); }

/* Async requests are one FIFO worklist. A processing guard keeps reentrant
 * enqueues and successive ready requests off the native call stack. */
typedef struct {
    tsc_generator_t* generator;
    tsc_promise_t* source;
    tsc_realm_t* realm;
    bool resuming;
} async_generator_return_t;

static void async_generator_return_callback(void* env) {
    async_generator_return_t* state = env;
    tsc_generator_t* generator = state->generator;
    tsc_realm_t* previous = tsc_realm_swap(state->realm);
    bool rejected = tsc_promise_is_rejected(state->source);
    tsc_value_t value = rejected ? tsc_promise_reason(state->source) : tsc_promise_value(state->source);
    generator->awaiting_return = false;
    if (state->resuming) {
        tsc_completion_record_set(&generator->queue_head->completion,
            rejected ? TSC_COMPLETION_THROW : TSC_COMPLETION_RETURN, value, -1);
        generator->queue_head->unwrapped = true;
        generator->state = TSC_GENERATOR_SUSPENDED_YIELD;
    } else {
        generator->caller_realm = state->realm;
        bool processing = generator->processing;
        generator->processing = true;
        async_generator_complete_step(generator, rejected ? TSC_COMPLETION_THROW : TSC_COMPLETION_NORMAL, value, true);
        generator->processing = processing;
    }
    async_generator_drain(generator);
    (void)tsc_realm_swap(previous);
}

static bool async_generator_await_return(tsc_generator_t* generator, bool resuming) {
    async_generator_return_t* state = TSC_GC_MALLOC(sizeof(*state));
    *state = (async_generator_return_t){ .generator = generator, .realm = tsc_realm_current(), .resuming = resuming };
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) != 0) {
        tsc_value_t error = tsc_current_error_value();
        tsc_try_pop();
        if (resuming) {
            tsc_completion_record_set(&generator->queue_head->completion, TSC_COMPLETION_THROW, error, -1);
            generator->queue_head->unwrapped = true;
            generator->state = TSC_GENERATOR_SUSPENDED_YIELD;
        } else async_generator_complete_step(generator, TSC_COMPLETION_THROW, error, true);
        return false;
    }
    state->source = tsc_promise_await(generator->queue_head->completion.value);
    tsc_try_pop();
    generator->awaiting_return = true;
    generator->state = resuming ? TSC_GENERATOR_EXECUTING : TSC_GENERATOR_DRAINING_QUEUE;
    if (tsc_promise_is_pending(state->source))
        tsc_promise_add_callback(state->source, async_generator_return_callback, state);
    else tsc_queue_microtask(async_generator_return_callback, state);
    return true;
}

static void async_generator_drain(tsc_generator_t* generator) {
    if (generator->processing || generator->awaiting_return) return;
    generator->processing = true;
    while (generator->queue_head && generator->state != TSC_GENERATOR_EXECUTING) {
        tsc_generator_request_t* request = generator->queue_head;
        if (generator->state == TSC_GENERATOR_SUSPENDED_START && request->completion.kind != TSC_COMPLETION_NORMAL) {
            generator->state = TSC_GENERATOR_DRAINING_QUEUE;
            generator->resume = NULL;
            generator->env = NULL;
        }
        if (generator->state == TSC_GENERATOR_DRAINING_QUEUE || generator->state == TSC_GENERATOR_COMPLETED) {
            generator->state = TSC_GENERATOR_DRAINING_QUEUE;
            generator->caller_realm = tsc_realm_current();
            if (request->completion.kind == TSC_COMPLETION_RETURN) {
                if (async_generator_await_return(generator, false)) break;
            } else async_generator_complete_step(generator, request->completion.kind,
                request->completion.kind == TSC_COMPLETION_THROW ? request->completion.value : tsc_value_undefined(), true);
            continue;
        }
        if (generator->state == TSC_GENERATOR_SUSPENDED_YIELD &&
                request->completion.kind == TSC_COMPLETION_RETURN && !request->unwrapped) {
            if (async_generator_await_return(generator, true)) break;
            continue;
        }
        tsc_completion_record_set(&generator->request, request->completion.kind,
            generator->state == TSC_GENERATOR_SUSPENDED_START ? tsc_value_undefined() : request->completion.value, -1);
        generator->state = TSC_GENERATOR_EXECUTING;
        generator->resume(generator->env);
    }
    if (!generator->queue_head && generator->state == TSC_GENERATOR_DRAINING_QUEUE)
        generator->state = TSC_GENERATOR_COMPLETED;
    generator->processing = false;
}

static tsc_value_t async_generator_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    tsc_completion_kind_t kind = *(const tsc_completion_kind_t*)env;
    tsc_promise_t* capability = tsc_promise_pending();
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) != 0) {
        tsc_value_t error = tsc_current_error_value();
        tsc_try_pop();
        tsc_promise_reject_in_place(capability, error);
        return tsc_value_promise(capability);
    }
    tsc_object_t* object = value_is_object_value(receiver) ? value_ptr(receiver) : NULL;
    tsc_generator_t* generator = object ? object->generator : NULL;
    if (!generator || !generator->asynchronous)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Async generator method called on incompatible receiver"));
    tsc_generator_request_t* request = TSC_GC_MALLOC(sizeof(*request));
    *request = (tsc_generator_request_t){ .capability = capability };
    tsc_completion_record_set(&request->completion, kind,
        args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined(), -1);
    if (generator->queue_tail) generator->queue_tail->next = request;
    else generator->queue_head = request;
    generator->queue_tail = request;
    async_generator_drain(generator);
    tsc_try_pop();
    return tsc_value_promise(capability);
}

/* Both delegation protocols share actual method lookup, captured next,
 * one-element argument Lists and the same rooted completion representation. */
tsc_delegation_phase_t tsc_generator_delegate_invoke(tsc_iterator_record_t* iterator,
        const tsc_completion_record_t* request, tsc_completion_record_t* output) {
    tsc_value_t method = iterator->next_method;
    tsc_completion_kind_t kind = TSC_COMPLETION_NORMAL;
    if (request->kind != TSC_COMPLETION_NORMAL) {
        const char* name = request->kind == TSC_COMPLETION_RETURN ? "return" : "throw";
        method = tsc_value_get_prop(iterator->iterator, tsc_str_from_cstr(name));
        if (tsc_value_is_nullish(method)) {
            tsc_completion_record_set(output, request->kind, request->value, -1);
            return request->kind == TSC_COMPLETION_RETURN ? TSC_DELEGATION_RETURN : TSC_DELEGATION_CLOSE;
        }
        if (!tsc_value_is_callable(method))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Delegated iterator method is not callable"));
        if (request->kind == TSC_COMPLETION_RETURN) kind = TSC_COMPLETION_RETURN;
    }
    void* volatile method_root = tsc_value_gc_root(method);
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_array_push_value(args, request->value);
    tsc_value_t result = tsc_value_apply_function(method, iterator->iterator, tsc_value_array(args));
    tsc_completion_record_set(output, kind, result, -1);
    (void)method_root;
    return TSC_DELEGATION_RESULT;
}

/* Sync delegation forwards incomplete iterator result objects unchanged,
 * without reading value. Async delegation projects different result phases. */
bool tsc_generator_delegate_step(tsc_sync_iterator_t* iterator,
        const tsc_completion_record_t* request, tsc_completion_record_t* output) {
    tsc_delegation_phase_t phase = tsc_generator_delegate_invoke(iterator, request, output);
    if (phase == TSC_DELEGATION_RETURN) { iterator->done = true; return true; }
    if (phase == TSC_DELEGATION_CLOSE) {
        tsc_sync_iterator_close(iterator);
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Delegated iterator has no throw method"));
    }
    tsc_value_t result = output->value;
    if (!tsc_value_is_object(result))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Delegated iterator result is not an object"));
    bool done = tsc_value_is_truthy(tsc_value_get_prop(result, tsc_str_from_lit("done", 4)));
    if (done) tsc_completion_record_set(output, output->kind,
        tsc_value_get_prop(result, tsc_str_from_lit("value", 5)), -1);
    else output->kind = TSC_COMPLETION_NORMAL;
    iterator->done = done;
    return done;
}
