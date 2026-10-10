#include "tsc_internal.h"

/* ---------------- arrays ---------------- */

typedef struct tsc_template_map_entry {
    const tsc_template_site_t* site;
    tsc_parse_unit_t* unit;
    tsc_array_t* array;
    struct tsc_template_map_entry* next;
} tsc_template_map_entry_t;

static const char template_map_realm_state_key = 0;

tsc_array_t* tsc_template_object(const tsc_template_site_t* site) {
    tsc_parse_unit_t* unit = site->runtime_parse ? tsc_parse_unit_current() : NULL;
    if (site->runtime_parse && !unit)
        tsc_panic("template site requires runtime parse ownership");
    tsc_runtime_lock();
    tsc_template_map_entry_t* entries = tsc_realm_state_get(&template_map_realm_state_key);
    for (tsc_template_map_entry_t* entry = entries; entry; entry = entry->next) {
        if (entry->site == site && entry->unit == unit) {
            tsc_runtime_unlock();
            return entry->array;
        }
    }
    tsc_array_t* volatile cooked = tsc_array_new(sizeof(tsc_value_t), site->count);
    tsc_array_t* volatile raw = tsc_array_new(sizeof(tsc_value_t), site->count);
    for (size_t index = 0; index < site->count; ++index) {
        const tsc_template_segment_t* segment = &site->segments[index];
        tsc_array_push_value(raw, tsc_value_string(tsc_str_from_units_range(
            segment->raw, 0, segment->raw_length)));
        tsc_array_push_value(cooked, segment->cooked_valid
            ? tsc_value_string(tsc_str_from_units_range(segment->cooked, 0, segment->cooked_length))
            : tsc_value_undefined());
    }
    (void)tsc_value_freeze(tsc_value_array(raw));
    (void)tsc_value_define_property_desc(tsc_value_array(cooked), tsc_str_from_lit("raw", 3),
        tsc_value_array(raw), true, false, true, false, true, false, true);
    (void)tsc_value_freeze(tsc_value_array(cooked));
    tsc_template_map_entry_t* entry = TSC_GC_MALLOC(sizeof(*entry));
    entry->site = site;
    entry->unit = unit;
    entry->array = cooked;
    entry->next = entries;
    tsc_realm_state_set(&template_map_realm_state_key, entry);
    tsc_runtime_unlock();
    return cooked;
}

typedef struct {
    bool prototype_initializing;
    bool prototype_initialized;
    bool default_prototype_initialized;
    tsc_value_t default_prototype;
    /* `tsc_value_t` stores pointers in a NaN-boxed payload that a
     * conservative collector cannot recognize. */
    tsc_array_t* volatile prototype_gc_root;
    bool constructor_initialized;
    tsc_value_t constructor;
    bool unscopables_initialized;
    tsc_value_t unscopables;
} tsc_array_intrinsics_t;

static const char array_intrinsics_realm_state_key = 0;

static tsc_array_intrinsics_t* array_intrinsics_for_current_realm(void) {
    tsc_array_intrinsics_t* intrinsics =
        (tsc_array_intrinsics_t*)tsc_realm_state_get(
            &array_intrinsics_realm_state_key
        );
    if (intrinsics) return intrinsics;
    tsc_runtime_lock();
    intrinsics = (tsc_array_intrinsics_t*)tsc_realm_state_get(
        &array_intrinsics_realm_state_key
    );
    if (!intrinsics) {
        intrinsics = (tsc_array_intrinsics_t*)TSC_GC_MALLOC(sizeof(*intrinsics));
        memset(intrinsics, 0, sizeof(*intrinsics));
        tsc_realm_state_set(&array_intrinsics_realm_state_key, intrinsics);
    }
    tsc_runtime_unlock();
    return intrinsics;
}

#define array_prototype_initializing (array_intrinsics_for_current_realm()->prototype_initializing)
#define array_prototype_initialized (array_intrinsics_for_current_realm()->prototype_initialized)
#define array_prototype_gc_root (array_intrinsics_for_current_realm()->prototype_gc_root)
#define array_constructor_initialized (array_intrinsics_for_current_realm()->constructor_initialized)
#define array_constructor_value (array_intrinsics_for_current_realm()->constructor)
#define array_unscopables_initialized (array_intrinsics_for_current_realm()->unscopables_initialized)
#define array_unscopables_value (array_intrinsics_for_current_realm()->unscopables)

static tsc_value_t array_constructor_result(tsc_array_t* result, tsc_value_t receiver) {
    if (!tsc_value_is_undefined(tsc_value_current_new_target())) {
        result->prototype = tsc_value_get_prototype_of(receiver);
    }
    return tsc_value_array(result);
}

static tsc_value_t array_create_with_length(double length) {
    if (
        !isfinite(length) ||
        length < 0.0 ||
        floor(length) != length ||
        length > 4294967295.0
    ) {
        tsc_throw_error(
            TSC_ERROR_RANGE,
            tsc_str_from_cstr("Invalid array length")
        );
    }
    const size_t count = (size_t)length;
    tsc_array_t* array = tsc_array_new(sizeof(tsc_value_t), 0);
    array->len = count;
    return tsc_value_array(array);
}

/* ArraySpeciesCreate borrows the canonical constructor/Realm/Proxy owners. */
tsc_array_output_t tsc_array_output_species(tsc_value_t original, size_t length) {
    tsc_value_t constructor = tsc_value_undefined();
    void* volatile constructor_gc_root = NULL; (void)constructor_gc_root;
    if (tsc_value_is_array(original)) {
        constructor = tsc_value_get_prop(original, tsc_str_from_lit("constructor", 11));
        constructor_gc_root = tsc_value_gc_root(constructor);
        if (tsc_value_is_constructable(constructor)) {
            tsc_realm_t* realm = tsc_value_function_realm(constructor);
            if (realm != tsc_realm_current()) {
                tsc_realm_t* previous = tsc_realm_swap(realm);
                tsc_value_t intrinsic = tsc_array_constructor_value();
                (void)tsc_realm_swap(previous);
                if (tsc_value_object_is(constructor, intrinsic)) constructor = tsc_value_undefined();
            }
        }
        if (tsc_value_is_object(constructor)) {
            constructor = tsc_value_get_symbol_prop(constructor, tsc_symbol_species());
            constructor_gc_root = tsc_value_gc_root(constructor);
            if (tsc_value_eq(constructor, tsc_value_null())) constructor = tsc_value_undefined();
        }
    }
    tsc_value_t object;
    if (tsc_value_is_undefined(constructor)) object = array_create_with_length((double)length);
    else {
        if (!tsc_value_is_constructable(constructor))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array species is not a constructor"));
        tsc_array_t* arguments = tsc_array_new(sizeof(tsc_value_t), 1);
        tsc_array_push_value(arguments, tsc_value_num((double)length));
        object = tsc_value_construct(constructor, tsc_value_array(arguments));
    }
    return (tsc_array_output_t){object, tsc_value_gc_root(object), 0};
}

static tsc_value_t array_static_create_result(
    tsc_value_t constructor,
    double length,
    bool pass_length
) {
    if (!tsc_value_is_constructable(constructor)) {
        return array_create_with_length(length);
    }
    tsc_array_t* arguments = tsc_array_new(sizeof(tsc_value_t), pass_length ? 1 : 0);
    if (pass_length) tsc_array_push_value(arguments, tsc_value_num(length));
    return tsc_value_construct(constructor, tsc_value_array(arguments));
}

static void array_create_data_property_or_throw(tsc_value_t target, double index, tsc_value_t value) {
    if (!tsc_value_create_data_property(target, tsc_value_num(index), value))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array result could not create an indexed property"));
}

void tsc_array_output_create(tsc_array_output_t* output, size_t index, tsc_value_t value) {
    array_create_data_property_or_throw(output->object, (double)index, value);
}

void tsc_array_output_append(tsc_array_output_t* output, tsc_value_t value) {
    if (output->index >= UINT64_C(9007199254740991))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array result exceeds the integer limit"));
    tsc_array_output_create(output, output->index, value);
    ++output->index;
}

static void array_set_length_or_throw(tsc_value_t target, double length) {
    if (!tsc_value_set_prop(
        target,
        tsc_str_from_lit("length", 6),
        tsc_value_num(length)
    )) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Array factory could not set length")
        );
    }
}

void tsc_array_output_set_length(tsc_array_output_t* output, size_t length) {
    array_set_length_or_throw(output->object, (double)length);
}


static _Noreturn void array_iterator_close_preserving_throw(
    tsc_sync_iterator_t* iterator,
    tsc_value_t abrupt
) {
    void* volatile abrupt_gc_root = tsc_value_gc_root(abrupt);
    (void)abrupt_gc_root;
    TSC_TRY_FRAME(close_frame);
    tsc_try_push(&close_frame);
    if (setjmp(close_frame.jb) == 0) {
        tsc_sync_iterator_close(iterator);
        tsc_try_pop();
    } else {
        /* IteratorClose preserves an existing throw completion even when
         * retrieving or calling `return` produces another abrupt result. */
        tsc_try_pop();
    }
    tsc_throw_value(abrupt);
}

static tsc_value_t array_from_map_with_close(
    tsc_sync_iterator_t* iterator,
    tsc_value_t mapper,
    tsc_value_t mapper_this,
    tsc_value_t value,
    double index
) {
    TSC_TRY_FRAME(map_frame);
    tsc_try_push(&map_frame);
    if (setjmp(map_frame.jb) == 0) {
        tsc_array_t* arguments = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_array_push_value(arguments, value);
        tsc_array_push_value(arguments, tsc_value_num(index));
        tsc_value_t mapped = tsc_value_apply_function(
            mapper,
            mapper_this,
            tsc_value_array(arguments)
        );
        tsc_try_pop();
        return mapped;
    }
    tsc_value_t abrupt = tsc_current_error_value();
    tsc_try_pop();
    array_iterator_close_preserving_throw(iterator, abrupt);
}

static void array_from_create_data_property_with_close(
    tsc_sync_iterator_t* iterator,
    tsc_value_t target,
    double index,
    tsc_value_t value
) {
    TSC_TRY_FRAME(define_frame);
    tsc_try_push(&define_frame);
    if (setjmp(define_frame.jb) == 0) {
        array_create_data_property_or_throw(target, index, value);
        tsc_try_pop();
        return;
    }
    tsc_value_t abrupt = tsc_current_error_value();
    tsc_try_pop();
    array_iterator_close_preserving_throw(iterator, abrupt);
}

static double array_length_of_array_like(tsc_value_t source) {
    tsc_value_t raw_length = tsc_value_get_prop(
        source,
        tsc_str_from_lit("length", 6)
    );
    double length = tsc_value_to_number(raw_length);
    if (isnan(length) || length <= 0.0) return 0.0;
    if (isinf(length) || length >= 9007199254740991.0) {
        return 9007199254740991.0;
    }
    return floor(length);
}

static tsc_value_t array_constructor_generic(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    size_t count = args ? args->len : 0;
    if (count == 1) {
        tsc_value_t first = TSC_ARR(tsc_value_t, args, 0);
        if (!value_is_box(first)) {
            double length = tsc_value_as_num(first);
            tsc_value_t created = array_create_with_length(length);
            return array_constructor_result(tsc_value_as_array(created), this_arg);
        }
    }
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), count ? count : 1);
    for (size_t i = 0; i < count; i++) {
        tsc_value_t value = TSC_ARR(tsc_value_t, args, i);
        tsc_array_push_raw(out, &value);
    }
    return array_constructor_result(out, this_arg);
}

static tsc_value_t array_constructor_species_getter(void* env, tsc_value_t receiver) {
    (void)env;
    return receiver;
}

static tsc_value_t array_static_is_array(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t value = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_undefined();
    return tsc_value_bool(tsc_value_is_array(value));
}

static tsc_value_t array_static_of(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    size_t count = args ? args->len : 0;
    tsc_value_t result = array_static_create_result(this_arg, (double)count, true);
    void* volatile result_gc_root = tsc_value_gc_root(result);
    (void)result_gc_root;
    for (size_t i = 0; i < count; i++) {
        tsc_value_t value = TSC_ARR(tsc_value_t, args, i);
        array_create_data_property_or_throw(result, (double)i, value);
    }
    array_set_length_or_throw(result, (double)count);
    return result;
}

static tsc_value_t array_static_from(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    tsc_value_t source = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_undefined();
    tsc_value_t mapper = args && args->len > 1
        ? TSC_ARR(tsc_value_t, args, 1)
        : tsc_value_undefined();
    tsc_value_t mapper_this = args && args->len > 2
        ? TSC_ARR(tsc_value_t, args, 2)
        : tsc_value_undefined();
    const bool mapping = !tsc_value_is_undefined(mapper);
    if (mapping && !tsc_value_is_callable(mapper)) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Array.from mapper must be callable")
        );
    }
    if (tsc_value_is_nullish(source)) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Array.from source must not be null or undefined")
        );
    }

    tsc_value_t iterator_method = tsc_value_get_symbol_prop(
        source,
        tsc_symbol_iterator()
    );
    void* volatile iterator_method_gc_root = tsc_value_gc_root(iterator_method);
    (void)iterator_method_gc_root;
    const bool string_iterator_fallback =
        value_is_box(source) && value_tag(source) == TSC_VALUE_TAG_STRING;
    if (!tsc_value_is_nullish(iterator_method) || string_iterator_fallback) {
        if (!string_iterator_fallback && !tsc_value_is_callable(iterator_method)) {
            tsc_throw_error(
                TSC_ERROR_TYPE,
                tsc_str_from_cstr("Array.from iterator method must be callable")
            );
        }
        tsc_value_t result = array_static_create_result(this_arg, 0.0, false);
        void* volatile result_gc_root = tsc_value_gc_root(result);
        (void)result_gc_root;
        tsc_sync_iterator_t iterator = tsc_sync_iterator_open_with_method(
            source,
            iterator_method
        );
        double index = 0.0;
        for (;;) {
            if (index >= 9007199254740991.0) {
                tsc_value_t error = tsc_value_error(tsc_error_new_named(
                    tsc_str_from_lit("TypeError", 9),
                    tsc_str_from_cstr("Array.from result exceeds the maximum safe length")
                ));
                array_iterator_close_preserving_throw(&iterator, error);
            }
            tsc_value_t next;
            if (!tsc_sync_iterator_step(&iterator, &next)) {
                array_set_length_or_throw(result, index);
                return result;
            }
            void* volatile next_gc_root = tsc_value_gc_root(next);
            (void)next_gc_root;
            tsc_value_t mapped = mapping
                ? array_from_map_with_close(
                    &iterator,
                    mapper,
                    mapper_this,
                    next,
                    index
                )
                : next;
            void* volatile mapped_gc_root = tsc_value_gc_root(mapped);
            (void)mapped_gc_root;
            array_from_create_data_property_with_close(
                &iterator,
                result,
                index,
                mapped
            );
            index += 1.0;
        }
    }

    const double length = array_length_of_array_like(source);
    tsc_value_t result = array_static_create_result(this_arg, length, true);
    void* volatile result_gc_root = tsc_value_gc_root(result);
    (void)result_gc_root;
    for (double index = 0.0; index < length; index += 1.0) {
        tsc_value_t value = tsc_value_get_index(source, index);
        void* volatile value_gc_root = tsc_value_gc_root(value);
        (void)value_gc_root;
        if (mapping) {
            tsc_array_t* mapper_arguments = tsc_array_new(sizeof(tsc_value_t), 2);
            tsc_array_push_value(mapper_arguments, value);
            tsc_array_push_value(mapper_arguments, tsc_value_num(index));
            value = tsc_value_apply_function(
                mapper,
                mapper_this,
                tsc_value_array(mapper_arguments)
            );
            value_gc_root = tsc_value_gc_root(value);
        }
        array_create_data_property_or_throw(result, index, value);
    }
    array_set_length_or_throw(result, length);
    return result;
}

/* One retained Iterator Record and one phase worklist implement the async
 * factory. Every Await schedules a job, including already settled inputs. */
typedef enum {
    ARRAY_ASYNC_START, ARRAY_ASYNC_READ, ARRAY_ASYNC_NEXT,
    ARRAY_ASYNC_INPUT, ARRAY_ASYNC_MAP, ARRAY_ASYNC_MAPPED,
    ARRAY_ASYNC_DEFINE, ARRAY_ASYNC_CLOSE, ARRAY_ASYNC_DONE
} array_async_phase_t;

typedef enum {
    ARRAY_ASYNC_CONSTRUCTOR, ARRAY_ASYNC_SOURCE, ARRAY_ASYNC_MAPPER,
    ARRAY_ASYNC_THIS, ARRAY_ASYNC_RESULT, ARRAY_ASYNC_VALUE,
    ARRAY_ASYNC_ERROR, ARRAY_ASYNC_SLOT_COUNT
} array_async_slot_t;

typedef struct {
    tsc_value_t values[ARRAY_ASYNC_SLOT_COUNT];
    void* roots[ARRAY_ASYNC_SLOT_COUNT];
    tsc_iterator_record_t iterator;
    tsc_promise_t* output;
    tsc_promise_t* awaited;
    tsc_realm_t* realm;
    tsc_environment_t* environment;
    double index, length;
    array_async_phase_t phase;
    bool iterable, mapping, close_on_abrupt;
} array_async_state_t;

static void array_async_store(array_async_state_t* state, array_async_slot_t slot, tsc_value_t value) {
    state->values[slot] = value;
    state->roots[slot] = tsc_value_gc_root(value);
}

static void array_from_async_resume(void* env);

static void array_async_wait(array_async_state_t* state, tsc_promise_t* promise, array_async_phase_t phase) {
    state->awaited = promise;
    state->phase = phase;
    if (tsc_promise_is_pending(promise))
        tsc_promise_add_callback(promise, array_from_async_resume, state);
    else tsc_queue_microtask(array_from_async_resume, state);
}

static tsc_value_t array_async_awaited_value(array_async_state_t* state) {
    if (tsc_promise_is_rejected(state->awaited))
        tsc_throw_value(tsc_promise_reason(state->awaited));
    return tsc_promise_value(state->awaited);
}

static void array_async_reject(array_async_state_t* state, tsc_value_t error) {
    array_async_store(state, ARRAY_ASYNC_ERROR, error);
    if (state->iterable && state->close_on_abrupt) {
        state->close_on_abrupt = false;
        tsc_promise_t* closing = tsc_async_iterator_close(&state->iterator, true);
        if (closing) {
            array_async_wait(state, closing, ARRAY_ASYNC_CLOSE);
            return;
        }
    }
    state->phase = ARRAY_ASYNC_DONE;
    tsc_promise_reject_in_place(state->output, state->values[ARRAY_ASYNC_ERROR]);
}

static void array_from_async_resume(void* env) {
    array_async_state_t* state = env;
    tsc_realm_t* previous_realm = tsc_realm_swap(state->realm);
    tsc_environment_t* previous_environment = tsc_environment_swap(state->environment);
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) != 0) {
        tsc_value_t error = tsc_current_error_value();
        tsc_try_pop();
        array_async_reject(state, error);
        goto restored;
    }
    for (;;) {
        switch (state->phase) {
        case ARRAY_ASYNC_START: {
            state->mapping = !tsc_value_is_undefined(state->values[ARRAY_ASYNC_MAPPER]);
            if (state->mapping && !tsc_value_is_callable(state->values[ARRAY_ASYNC_MAPPER]))
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.fromAsync mapper must be callable"));
            tsc_value_t source = state->values[ARRAY_ASYNC_SOURCE];
            if (tsc_value_is_nullish(source))
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.from source must not be null or undefined"));
            tsc_value_t method = tsc_value_get_symbol_prop(source, tsc_symbol_async_iterator());
            void* volatile method_root = tsc_value_gc_root(method);
            if (!tsc_value_is_nullish(method)) {
                state->iterator = tsc_sync_iterator_open_with_method(source, method);
                state->iterable = true;
            } else {
                method = tsc_value_get_symbol_prop(source, tsc_symbol_iterator());
                method_root = tsc_value_gc_root(method);
                if (!tsc_value_is_nullish(method)) {
                    state->iterator = tsc_async_iterator_from_sync(tsc_sync_iterator_open_with_method(source, method));
                    state->iterable = true;
                }
            }
            (void)method_root;
            if (!state->iterable) {
                array_async_store(state, ARRAY_ASYNC_SOURCE, tsc_value_to_object(source));
                state->length = array_length_of_array_like(state->values[ARRAY_ASYNC_SOURCE]);
            }
            array_async_store(state, ARRAY_ASYNC_RESULT, array_static_create_result(
                state->values[ARRAY_ASYNC_CONSTRUCTOR], state->length, !state->iterable));
            state->phase = ARRAY_ASYNC_READ;
            break;
        }
        case ARRAY_ASYNC_READ: {
            state->close_on_abrupt = false;
            if (state->iterable) {
                if (state->index >= 9007199254740991.0) {
                    state->close_on_abrupt = true;
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.fromAsync result exceeds the maximum safe length"));
                }
                tsc_value_t next = tsc_async_iterator_next(&state->iterator);
                void* volatile next_root = tsc_value_gc_root(next);
                array_async_wait(state, tsc_promise_await(next), ARRAY_ASYNC_NEXT);
                (void)next_root;
                goto suspended;
            }
            if (state->index >= state->length) {
                array_set_length_or_throw(state->values[ARRAY_ASYNC_RESULT], state->length);
                state->phase = ARRAY_ASYNC_DONE;
                tsc_promise_resolve_into(state->output, state->values[ARRAY_ASYNC_RESULT]);
                goto suspended;
            }
            array_async_store(state, ARRAY_ASYNC_VALUE,
                tsc_value_get_index(state->values[ARRAY_ASYNC_SOURCE], state->index));
            array_async_wait(state, tsc_promise_await(state->values[ARRAY_ASYNC_VALUE]), ARRAY_ASYNC_INPUT);
            goto suspended;
        }
        case ARRAY_ASYNC_NEXT: {
            array_async_store(state, ARRAY_ASYNC_VALUE, array_async_awaited_value(state));
            tsc_value_t next = state->values[ARRAY_ASYNC_VALUE];
            if (!tsc_value_is_object(next))
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Async iterator result is not an object"));
            if (tsc_value_is_truthy(tsc_value_get_prop(next, tsc_str_from_lit("done", 4)))) {
                state->iterator.done = true;
                array_set_length_or_throw(state->values[ARRAY_ASYNC_RESULT], state->index);
                state->phase = ARRAY_ASYNC_DONE;
                tsc_promise_resolve_into(state->output, state->values[ARRAY_ASYNC_RESULT]);
                goto suspended;
            }
            array_async_store(state, ARRAY_ASYNC_VALUE, tsc_value_get_prop(next, tsc_str_from_lit("value", 5)));
            state->phase = ARRAY_ASYNC_MAP;
            break;
        }
        case ARRAY_ASYNC_INPUT:
            array_async_store(state, ARRAY_ASYNC_VALUE, array_async_awaited_value(state));
            state->phase = ARRAY_ASYNC_MAP;
            break;
        case ARRAY_ASYNC_MAP:
            if (state->mapping) {
                state->close_on_abrupt = state->iterable;
                tsc_array_t* arguments = tsc_array_new(sizeof(tsc_value_t), 2);
                tsc_array_push_value(arguments, state->values[ARRAY_ASYNC_VALUE]);
                tsc_array_push_value(arguments, tsc_value_num(state->index));
                array_async_store(state, ARRAY_ASYNC_VALUE, tsc_value_apply_function(
                    state->values[ARRAY_ASYNC_MAPPER], state->values[ARRAY_ASYNC_THIS], tsc_value_array(arguments)));
                array_async_wait(state, tsc_promise_await(state->values[ARRAY_ASYNC_VALUE]), ARRAY_ASYNC_MAPPED);
                goto suspended;
            }
            state->phase = ARRAY_ASYNC_DEFINE;
            break;
        case ARRAY_ASYNC_MAPPED:
            array_async_store(state, ARRAY_ASYNC_VALUE, array_async_awaited_value(state));
            state->phase = ARRAY_ASYNC_DEFINE;
            break;
        case ARRAY_ASYNC_DEFINE:
            state->close_on_abrupt = state->iterable;
            array_create_data_property_or_throw(state->values[ARRAY_ASYNC_RESULT], state->index,
                state->values[ARRAY_ASYNC_VALUE]);
            state->index += 1.0;
            state->phase = ARRAY_ASYNC_READ;
            break;
        case ARRAY_ASYNC_CLOSE:
            /* AsyncIteratorClose awaits return but incoming throws win over
             * return rejection and non-object results. */
            state->phase = ARRAY_ASYNC_DONE;
            tsc_promise_reject_in_place(state->output, state->values[ARRAY_ASYNC_ERROR]);
            goto suspended;
        case ARRAY_ASYNC_DONE:
            goto suspended;
        }
    }
suspended:
    tsc_try_pop();
restored:
    (void)tsc_environment_swap(previous_environment);
    (void)tsc_realm_swap(previous_realm);
}

static tsc_value_t array_static_from_async(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    array_async_state_t* state = TSC_GC_MALLOC(sizeof(*state));
    *state = (array_async_state_t){ .realm = tsc_realm_current(), .environment = tsc_environment_current() };
    for (size_t slot = 0; slot < ARRAY_ASYNC_SLOT_COUNT; ++slot)
        array_async_store(state, (array_async_slot_t)slot, tsc_value_undefined());
    array_async_store(state, ARRAY_ASYNC_CONSTRUCTOR, receiver);
    const array_async_slot_t argument_slots[] = { ARRAY_ASYNC_SOURCE, ARRAY_ASYNC_MAPPER, ARRAY_ASYNC_THIS };
    for (size_t index = 0; index < sizeof(argument_slots) / sizeof(*argument_slots); ++index)
        if (args && index < args->len) array_async_store(state, argument_slots[index], TSC_ARR(tsc_value_t, args, index));
    state->output = tsc_promise_pending();
    array_from_async_resume(state);
    return tsc_value_promise(state->output);
}

static void array_constructor_define_method(tsc_value_t constructor, const char* name, size_t len, double arity, tsc_generic_function_t fn) {
    (void)tsc_value_define_property_desc(
        constructor,
        tsc_str_from_lit(name, len),
        tsc_value_function_builtin_named(fn, NULL, arity, tsc_str_from_lit(name, len)),
        true,
        true,
        true,
        false,
        true,
        true,
        true
    );
}

tsc_value_t tsc_array_constructor_value(void) {
    tsc_runtime_lock();
    if (!array_constructor_initialized) {
        array_constructor_value = tsc_value_function_generic_named(
            array_constructor_generic,
            NULL,
            1.0,
            tsc_str_from_lit("Array", 5)
        );
        ((tsc_function_identity_t*)value_ptr(array_constructor_value))
            ->construct_default_prototype = TSC_INTRINSIC_DEFAULT_ARRAY_PROTOTYPE;
        (void)tsc_value_define_accessor_desc(
            array_constructor_value,
            tsc_symbol_property_key(tsc_symbol_species()),
            array_constructor_species_getter,
            NULL,
            true,
            NULL,
            NULL,
            false,
            false,
            true,
            true,
            true
        );
        array_constructor_define_method(array_constructor_value, "isArray", 7, 1.0, array_static_is_array);
        array_constructor_define_method(array_constructor_value, "from", 4, 1.0, array_static_from);
        array_constructor_define_method(array_constructor_value, "fromAsync", 9, 1.0, array_static_from_async);
        array_constructor_define_method(array_constructor_value, "of", 2, 0.0, array_static_of);
        array_constructor_initialized = true;
    }
    if (array_prototype_initializing) {
        tsc_runtime_unlock();
        return array_constructor_value;
    }
    if (!array_prototype_initialized && !array_prototype_initializing) {
        (void)tsc_array_prototype();
    }
    tsc_runtime_unlock();
    return array_constructor_value;
}

static tsc_value_t array_proto_arg(tsc_array_t* args, size_t index) {
    return args && index < args->len
        ? TSC_ARR(tsc_value_t, args, index)
        : tsc_value_undefined();
}

static tsc_array_t* array_proto_items(tsc_array_t* args, size_t start) {
    size_t count = args && args->len > start ? args->len - start : 0;
    tsc_array_t* items = tsc_array_new(sizeof(tsc_value_t), count ? count : 1);
    for (size_t i = 0; i < count; i++) {
        tsc_value_t value = TSC_ARR(tsc_value_t, args, start + i);
        tsc_array_push_raw(items, &value);
    }
    return items;
}

static tsc_value_t array_proto_callback_arg(tsc_array_t* args, const char* method) {
    if (!args || args->len == 0) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr(method));
    }
    tsc_value_t callback = TSC_ARR(tsc_value_t, args, 0);
    if (!tsc_value_is_callable(callback)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr(method));
    }
    return callback;
}

static tsc_value_t array_proto_callback_this(tsc_array_t* args) {
    return args && args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
}

static tsc_array_t* array_proto_callback_args(tsc_value_t value, size_t index, tsc_value_t receiver) {
    tsc_array_t* cb_args = tsc_array_new(sizeof(tsc_value_t), 3);
    tsc_array_push_value(cb_args, value);
    tsc_array_push_value(cb_args, tsc_value_num((double)index));
    tsc_array_push_value(cb_args, receiver);
    return cb_args;
}

static tsc_value_t array_proto_apply_callback(tsc_value_t callback, tsc_value_t this_arg, tsc_value_t value, size_t index, tsc_value_t receiver) {
    return tsc_value_apply_function(
        callback,
        this_arg,
        tsc_value_array(array_proto_callback_args(value, index, receiver))
    );
}


static bool array_proto_has_index(tsc_value_t receiver, size_t index) {
    char key_buf[32];
    snprintf(key_buf, sizeof key_buf, "%zu", index);
    return tsc_value_has_prop(receiver, tsc_str_from_cstr(key_buf));
}

static tsc_value_t array_proto_get_index(tsc_value_t receiver, size_t index) {
    return tsc_value_get_index(receiver, (double)index);
}

static tsc_array_t* array_proto_reduce_callback_args(tsc_value_t acc, tsc_value_t value, size_t index, tsc_value_t receiver) {
    tsc_array_t* cb_args = tsc_array_new(sizeof(tsc_value_t), 4);
    tsc_array_push_value(cb_args, acc);
    tsc_array_push_value(cb_args, value);
    tsc_array_push_value(cb_args, tsc_value_num((double)index));
    tsc_array_push_value(cb_args, receiver);
    return cb_args;
}

static tsc_value_t array_proto_empty_args(void) {
    return tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 1));
}

static tsc_value_t array_prototype_to_string(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    tsc_value_t join = tsc_value_get_prop(this_arg, tsc_str_from_lit("join", 4));
    if (tsc_value_is_callable(join)) {
        return tsc_value_apply_function(join, this_arg, array_proto_empty_args());
    }
    return tsc_value_string(tsc_value_object_to_string_tag(this_arg));
}

static tsc_value_t array_prototype_to_locale_string(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    const tsc_value_t array = tsc_value_to_object(this_arg);
    void* volatile array_gc_root = tsc_value_gc_root(array);
    (void)array_gc_root;
    const size_t len = (size_t)tsc_value_to_length(tsc_value_get_prop(array, tsc_str_from_lit("length", 6)));
    tsc_str_t* volatile out = tsc_str_from_lit("", 0);
    tsc_str_t* volatile sep = tsc_str_from_lit(",", 1);
    tsc_str_t* volatile method_name = tsc_str_from_lit("toLocaleString", 14);
    tsc_array_t* volatile empty_args = tsc_array_new(sizeof(tsc_value_t), 0);
    for (size_t i = 0; i < len; i++) {
        if (i > 0) out = tsc_str_concat(out, sep);
        const tsc_value_t value = tsc_value_get_index(array, (double)i);
        if (!tsc_value_is_nullish(value)) {
            tsc_value_t result = tsc_value_invoke(value, method_name, empty_args);
            void* volatile result_gc_root = tsc_value_gc_root(result);
            (void)result_gc_root;
            out = tsc_str_concat(out, tsc_value_to_string(result));
        }
    }
    return tsc_value_string(out);
}

static tsc_value_t array_prototype_at(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_at(this_arg, array_proto_arg(args, 0));
}

static tsc_value_t array_prototype_includes(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_includes(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1));
}

static tsc_value_t array_prototype_index_of(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_index_of(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1));
}

static tsc_value_t array_prototype_last_index_of(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_last_index_of(this_arg, array_proto_arg(args, 0), args && args->len > 1 ? array_proto_arg(args, 1) : tsc_value_num(INFINITY));
}

static tsc_value_t array_prototype_join(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_join(this_arg, array_proto_arg(args, 0));
}

typedef enum { ARRAY_ITERATOR_KEY, ARRAY_ITERATOR_VALUE, ARRAY_ITERATOR_ENTRY } array_iterator_kind_t;
static void array_prototype_define_method(tsc_object_t* prototype, const char* name, size_t len, double arity, tsc_generic_function_t fn);

typedef struct {
    tsc_value_t source;
    void* source_gc_root;
    uint64_t index;
    array_iterator_kind_t kind;
} array_iterator_state_t;

static const char array_iterator_prototype_realm_state_key = 0;

static tsc_value_t array_iterator_next(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    (void)args;
    if (!value_is_box(receiver) || value_tag(receiver) != TSC_VALUE_TAG_OBJECT ||
        !((tsc_object_t*)value_ptr(receiver))->is_array_iterator) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array iterator next called on incompatible receiver"));
    }
    tsc_object_t* object = (tsc_object_t*)value_ptr(receiver);
    array_iterator_state_t* state = object->class_ptr;
    tsc_value_t value = tsc_value_undefined();
    bool done = tsc_value_is_undefined(state->source);
    if (!done) {
        tsc_value_t source = state->source;
        void* volatile source_gc_root = tsc_value_gc_root(source);
        (void)source_gc_root;
        uint64_t index = state->index;
        /* Array Iterator objects also serve integer-indexed receivers. Their
         * private byte record supplies the length; an ordinary length shadow
         * must not change the traversal. Other receivers use LengthOfArrayLike. */
        double length = value_is_box(source) && value_tag(source) == TSC_VALUE_TAG_OBJECT &&
            ((tsc_object_t*)value_ptr(source))->is_buffer
            ? (double)tsc_value_as_buffer(source)->len
            : tsc_value_to_length(tsc_value_get_prop(source, tsc_str_from_lit("length", 6)));
        done = (double)index >= length;
        if (done) {
            state->source = tsc_value_undefined();
            state->source_gc_root = NULL;
        } else {
            state->index = index + 1;
            value = tsc_value_num((double)index);
            if (state->kind != ARRAY_ITERATOR_KEY) {
                tsc_value_t element = tsc_value_get_prop(source, tsc_str_from_num((double)index));
                void* volatile element_gc_root = tsc_value_gc_root(element);
                (void)element_gc_root;
                if (state->kind == ARRAY_ITERATOR_VALUE) value = element;
                else {
                    tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
                    tsc_array_push_value(pair, value);
                    tsc_array_push_value(pair, element);
                    value = tsc_value_array(pair);
                }
            }
        }
    }
    return tsc_iterator_result(value, done);
}

static tsc_value_t array_iterator_prototype(void) {
    tsc_object_t* prototype = tsc_realm_state_get(&array_iterator_prototype_realm_state_key);
    if (!prototype) {
        prototype = tsc_object_new_with_prototype(tsc_iterator_prototype_value());
        tsc_realm_state_set(&array_iterator_prototype_realm_state_key, prototype);
        array_prototype_define_method(prototype, "next", 4, 0.0, array_iterator_next);
        tsc_object_define(prototype, tsc_symbol_property_key(tsc_symbol_to_string_tag()),
            tsc_value_string(tsc_str_from_lit("Array Iterator", 14)), false, false, true);
    }
    return tsc_value_object(prototype);
}

static tsc_value_t array_iterator_create(tsc_value_t receiver, array_iterator_kind_t kind) {
    tsc_value_t source = tsc_value_to_object(receiver);
    void* volatile source_gc_root = tsc_value_gc_root(source);
    (void)source_gc_root;
    array_iterator_state_t* state = TSC_GC_MALLOC(sizeof(*state));
    state->source = source;
    state->source_gc_root = tsc_value_gc_root(source);
    state->index = 0;
    state->kind = kind;
    tsc_object_t* iterator = tsc_object_new_with_prototype(array_iterator_prototype());
    iterator->is_array_iterator = true;
    iterator->class_ptr = state;
    return tsc_value_object(iterator);
}

tsc_value_t tsc_value_method_keys(tsc_value_t receiver) {
    return array_iterator_create(receiver, ARRAY_ITERATOR_KEY);
}

tsc_value_t tsc_value_method_values(tsc_value_t receiver) {
    return array_iterator_create(receiver, ARRAY_ITERATOR_VALUE);
}

tsc_value_t tsc_value_method_entries(tsc_value_t receiver) {
    return array_iterator_create(receiver, ARRAY_ITERATOR_ENTRY);
}

static tsc_value_t array_prototype_keys(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    return tsc_value_method_keys(this_arg);
}

static tsc_value_t array_prototype_values(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    return tsc_value_method_values(this_arg);
}

static tsc_value_t array_prototype_entries(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    return tsc_value_method_entries(this_arg);
}

static tsc_value_t array_prototype_pop(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_pop(this_arg);
}

static tsc_value_t array_prototype_push(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_push_items(this_arg, args);
}

static tsc_value_t array_prototype_shift(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_shift(this_arg);
}

static tsc_value_t array_prototype_unshift(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_unshift_items(this_arg, args);
}

static tsc_value_t array_prototype_concat(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_concat_items(this_arg, args);
}

static tsc_value_t array_prototype_slice(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_slice(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1));
}

static tsc_value_t array_prototype_fill(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_fill(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1), array_proto_arg(args, 2));
}

static tsc_value_t array_prototype_copy_within(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_copy_within(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1), array_proto_arg(args, 2));
}

static tsc_value_t array_prototype_splice(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t argc = args ? args->len : 0;
    return tsc_value_method_splice(
        this_arg,
        array_proto_arg(args, 0),
        array_proto_arg(args, 1),
        argc,
        array_proto_items(args, 2)
    );
}

static tsc_value_t array_prototype_sort(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    return tsc_value_method_sort(this_arg, array_proto_arg(args, 0));
}

static tsc_value_t array_prototype_to_sorted(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    return tsc_value_method_to_sorted(this_arg, array_proto_arg(args, 0));
}

static tsc_value_t array_prototype_with(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_with(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1));
}

static tsc_value_t array_prototype_to_spliced(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t argc = args ? args->len : 0;
    tsc_value_t zero = tsc_value_num(0.0);
    return tsc_value_method_to_spliced(
        this_arg,
        args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : zero,
        args && args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : zero,
        argc,
        array_proto_items(args, 2)
    );
}

static tsc_value_t array_prototype_flat(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_flat(this_arg, array_proto_arg(args, 0));
}

static tsc_value_t array_prototype_reverse(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_reverse(this_arg);
}

static tsc_value_t array_prototype_to_reversed(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)args;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    return tsc_value_method_to_reversed(this_arg);
}

static tsc_value_t array_prototype_for_each(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t len = tsc_value_length_of_array_like(this_arg);
    tsc_value_t callback = array_proto_callback_arg(args, "Array.forEach callback must be callable");
    void* volatile callback_gc_root = tsc_value_gc_root(callback); (void)callback_gc_root;
    tsc_value_t callback_this = array_proto_callback_this(args);
    void* volatile callback_this_gc_root = tsc_value_gc_root(callback_this); (void)callback_this_gc_root;
    for (size_t i = 0; i < len; i++) {
        if (!array_proto_has_index(this_arg, i)) continue;
        (void)array_proto_apply_callback(callback, callback_this, array_proto_get_index(this_arg, i), i, this_arg);
    }
    return tsc_value_undefined();
}

static tsc_value_t array_prototype_map(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t len = tsc_value_length_of_array_like(this_arg);
    tsc_value_t callback = array_proto_callback_arg(args, "Array.map callback must be callable");
    void* volatile callback_gc_root = tsc_value_gc_root(callback); (void)callback_gc_root;
    tsc_value_t callback_this = array_proto_callback_this(args);
    void* volatile callback_this_gc_root = tsc_value_gc_root(callback_this); (void)callback_this_gc_root;
    tsc_array_output_t out = tsc_array_output_species(this_arg, len);
    for (size_t i = 0; i < len; i++) {
        if (array_proto_has_index(this_arg, i)) {
            tsc_value_t mapped = array_proto_apply_callback(
                callback,
                callback_this,
                array_proto_get_index(this_arg, i),
                i,
                this_arg
            );
            tsc_array_output_create(&out, i, mapped);
        }
    }
    return out.object;
}

static tsc_value_t array_prototype_flat_map(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t len = tsc_value_length_of_array_like(this_arg);
    tsc_value_t callback = array_proto_callback_arg(args, "Array.flatMap callback must be callable");
    void* volatile callback_gc_root = tsc_value_gc_root(callback); (void)callback_gc_root;
    tsc_value_t callback_this = array_proto_callback_this(args);
    void* volatile callback_this_gc_root = tsc_value_gc_root(callback_this); (void)callback_this_gc_root;
    tsc_array_output_t out = tsc_array_output_species(this_arg, 0);
    for (size_t i = 0; i < len; i++) {
        if (!array_proto_has_index(this_arg, i)) continue;
        tsc_value_t mapped = array_proto_apply_callback(callback, callback_this, array_proto_get_index(this_arg, i), i, this_arg);
        tsc_value_array_flatten_value(&out, mapped);
    }
    return out.object;
}

static tsc_value_t array_prototype_filter(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t len = tsc_value_length_of_array_like(this_arg);
    tsc_value_t callback = array_proto_callback_arg(args, "Array.filter callback must be callable");
    void* volatile callback_gc_root = tsc_value_gc_root(callback); (void)callback_gc_root;
    tsc_value_t callback_this = array_proto_callback_this(args);
    void* volatile callback_this_gc_root = tsc_value_gc_root(callback_this); (void)callback_this_gc_root;
    tsc_array_output_t out = tsc_array_output_species(this_arg, 0);
    for (size_t i = 0; i < len; i++) {
        if (!array_proto_has_index(this_arg, i)) continue;
        tsc_value_t value = array_proto_get_index(this_arg, i);
        void* volatile value_gc_root = tsc_value_gc_root(value); (void)value_gc_root;
        if (tsc_value_is_truthy(array_proto_apply_callback(callback, callback_this, value, i, this_arg))) {
            tsc_array_output_append(&out, value);
        }
    }
    return out.object;
}

static tsc_value_t array_prototype_some(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t len = tsc_value_length_of_array_like(this_arg);
    tsc_value_t callback = array_proto_callback_arg(args, "Array.some callback must be callable");
    void* volatile callback_gc_root = tsc_value_gc_root(callback); (void)callback_gc_root;
    tsc_value_t callback_this = array_proto_callback_this(args);
    void* volatile callback_this_gc_root = tsc_value_gc_root(callback_this); (void)callback_this_gc_root;
    for (size_t i = 0; i < len; i++) {
        if (!array_proto_has_index(this_arg, i)) continue;
        if (tsc_value_is_truthy(array_proto_apply_callback(callback, callback_this, array_proto_get_index(this_arg, i), i, this_arg))) {
            return tsc_value_bool(true);
        }
    }
    return tsc_value_bool(false);
}

static tsc_value_t array_prototype_every(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t len = tsc_value_length_of_array_like(this_arg);
    tsc_value_t callback = array_proto_callback_arg(args, "Array.every callback must be callable");
    void* volatile callback_gc_root = tsc_value_gc_root(callback); (void)callback_gc_root;
    tsc_value_t callback_this = array_proto_callback_this(args);
    void* volatile callback_this_gc_root = tsc_value_gc_root(callback_this); (void)callback_this_gc_root;
    for (size_t i = 0; i < len; i++) {
        if (!array_proto_has_index(this_arg, i)) continue;
        if (!tsc_value_is_truthy(array_proto_apply_callback(callback, callback_this, array_proto_get_index(this_arg, i), i, this_arg))) {
            return tsc_value_bool(false);
        }
    }
    return tsc_value_bool(true);
}

static tsc_value_t array_prototype_find(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t len = tsc_value_length_of_array_like(this_arg);
    tsc_value_t callback = array_proto_callback_arg(args, "Array.find callback must be callable");
    void* volatile callback_gc_root = tsc_value_gc_root(callback); (void)callback_gc_root;
    tsc_value_t callback_this = array_proto_callback_this(args);
    void* volatile callback_this_gc_root = tsc_value_gc_root(callback_this); (void)callback_this_gc_root;
    for (size_t i = 0; i < len; i++) {
        tsc_value_t value = array_proto_get_index(this_arg, i);
        void* volatile value_gc_root = tsc_value_gc_root(value); (void)value_gc_root;
        if (tsc_value_is_truthy(array_proto_apply_callback(callback, callback_this, value, i, this_arg))) {
            return value;
        }
    }
    return tsc_value_undefined();
}

static tsc_value_t array_prototype_find_index(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t len = tsc_value_length_of_array_like(this_arg);
    tsc_value_t callback = array_proto_callback_arg(args, "Array.findIndex callback must be callable");
    void* volatile callback_gc_root = tsc_value_gc_root(callback); (void)callback_gc_root;
    tsc_value_t callback_this = array_proto_callback_this(args);
    void* volatile callback_this_gc_root = tsc_value_gc_root(callback_this); (void)callback_this_gc_root;
    for (size_t i = 0; i < len; i++) {
        if (tsc_value_is_truthy(array_proto_apply_callback(callback, callback_this, array_proto_get_index(this_arg, i), i, this_arg))) {
            return tsc_value_num((double)i);
        }
    }
    return tsc_value_num(-1.0);
}

static tsc_value_t array_prototype_find_last(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t len = tsc_value_length_of_array_like(this_arg);
    tsc_value_t callback = array_proto_callback_arg(args, "Array.findLast callback must be callable");
    void* volatile callback_gc_root = tsc_value_gc_root(callback); (void)callback_gc_root;
    tsc_value_t callback_this = array_proto_callback_this(args);
    void* volatile callback_this_gc_root = tsc_value_gc_root(callback_this); (void)callback_this_gc_root;
    for (size_t i = len; i-- > 0;) {
        tsc_value_t value = array_proto_get_index(this_arg, i);
        void* volatile value_gc_root = tsc_value_gc_root(value); (void)value_gc_root;
        if (tsc_value_is_truthy(array_proto_apply_callback(callback, callback_this, value, i, this_arg))) {
            return value;
        }
    }
    return tsc_value_undefined();
}

static tsc_value_t array_prototype_find_last_index(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t len = tsc_value_length_of_array_like(this_arg);
    tsc_value_t callback = array_proto_callback_arg(args, "Array.findLastIndex callback must be callable");
    void* volatile callback_gc_root = tsc_value_gc_root(callback); (void)callback_gc_root;
    tsc_value_t callback_this = array_proto_callback_this(args);
    void* volatile callback_this_gc_root = tsc_value_gc_root(callback_this); (void)callback_this_gc_root;
    for (size_t i = len; i-- > 0;) {
        if (tsc_value_is_truthy(array_proto_apply_callback(callback, callback_this, array_proto_get_index(this_arg, i), i, this_arg))) {
            return tsc_value_num((double)i);
        }
    }
    return tsc_value_num(-1.0);
}

static tsc_value_t array_prototype_reduce(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t len = tsc_value_length_of_array_like(this_arg);
    tsc_value_t callback = array_proto_callback_arg(args, "Array.reduce callback must be callable");
    void* volatile callback_gc_root = tsc_value_gc_root(callback); (void)callback_gc_root;
    tsc_value_t acc = tsc_value_undefined();
    void* volatile acc_gc_root = NULL; (void)acc_gc_root;
    size_t start = 0;
    if (args && args->len > 1) {
        acc = TSC_ARR(tsc_value_t, args, 1);
        acc_gc_root = tsc_value_gc_root(acc);
    } else {
        bool found = false;
        for (; start < len; start++) {
            if (!array_proto_has_index(this_arg, start)) continue;
            acc = array_proto_get_index(this_arg, start);
            acc_gc_root = tsc_value_gc_root(acc);
            start++;
            found = true;
            break;
        }
        if (!found) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.reduce: empty array with no initial value"));
    }
    for (size_t i = start; i < len; i++) {
        if (!array_proto_has_index(this_arg, i)) continue;
        tsc_value_t value = array_proto_get_index(this_arg, i);
        void* volatile value_gc_root = tsc_value_gc_root(value); (void)value_gc_root;
        acc = tsc_value_apply_function(
            callback,
            tsc_value_undefined(),
            tsc_value_array(array_proto_reduce_callback_args(acc, value, i, this_arg))
        );
        acc_gc_root = tsc_value_gc_root(acc);
    }
    return acc;
}

static tsc_value_t array_prototype_reduce_right(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    this_arg = tsc_value_to_object(this_arg);
    void* volatile this_gc_root = tsc_value_gc_root(this_arg); (void)this_gc_root;
    size_t len = tsc_value_length_of_array_like(this_arg);
    tsc_value_t callback = array_proto_callback_arg(args, "Array.reduceRight callback must be callable");
    void* volatile callback_gc_root = tsc_value_gc_root(callback); (void)callback_gc_root;
    tsc_value_t acc = tsc_value_undefined();
    void* volatile acc_gc_root = NULL; (void)acc_gc_root;
    size_t i = len;
    if (args && args->len > 1) {
        acc = TSC_ARR(tsc_value_t, args, 1);
        acc_gc_root = tsc_value_gc_root(acc);
    } else {
        bool found = false;
        while (i-- > 0) {
            if (!array_proto_has_index(this_arg, i)) continue;
            acc = array_proto_get_index(this_arg, i);
            acc_gc_root = tsc_value_gc_root(acc);
            found = true;
            break;
        }
        if (!found) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.reduceRight: empty array with no initial value"));
    }
    while (i-- > 0) {
        if (!array_proto_has_index(this_arg, i)) continue;
        tsc_value_t value = array_proto_get_index(this_arg, i);
        void* volatile value_gc_root = tsc_value_gc_root(value); (void)value_gc_root;
        acc = tsc_value_apply_function(
            callback,
            tsc_value_undefined(),
            tsc_value_array(array_proto_reduce_callback_args(acc, value, i, this_arg))
        );
        acc_gc_root = tsc_value_gc_root(acc);
    }
    return acc;
}

static void array_prototype_define_method(tsc_object_t* prototype, const char* name, size_t len, double arity, tsc_generic_function_t fn) {
    tsc_object_define(
        prototype,
        tsc_str_from_lit(name, len),
        tsc_value_function_builtin_named(fn, NULL, arity, tsc_str_from_lit(name, len)),
        true,
        false,
        true
    );
}

static void array_unscopables_define(tsc_object_t* object, const char* name, size_t len) {
    tsc_object_define(
        object,
        tsc_str_from_lit(name, len),
        tsc_value_bool(true),
        true,
        true,
        true
    );
}

tsc_value_t tsc_array_unscopables_value(void) {
    tsc_runtime_lock();
    if (!array_unscopables_initialized) {
        tsc_object_t* object = tsc_object_new();
        object->prototype = tsc_value_null();
        array_unscopables_define(object, "at", 2);
        array_unscopables_define(object, "copyWithin", 10);
        array_unscopables_define(object, "entries", 7);
        array_unscopables_define(object, "fill", 4);
        array_unscopables_define(object, "find", 4);
        array_unscopables_define(object, "findIndex", 9);
        array_unscopables_define(object, "findLast", 8);
        array_unscopables_define(object, "findLastIndex", 13);
        array_unscopables_define(object, "flat", 4);
        array_unscopables_define(object, "flatMap", 7);
        array_unscopables_define(object, "includes", 8);
        array_unscopables_define(object, "keys", 4);
        array_unscopables_define(object, "toReversed", 10);
        array_unscopables_define(object, "toSorted", 8);
        array_unscopables_define(object, "toSpliced", 9);
        array_unscopables_define(object, "values", 6);
        array_unscopables_value = tsc_value_object(object);
        array_unscopables_initialized = true;
    }
    tsc_runtime_unlock();
    return array_unscopables_value;
}

tsc_array_t* tsc_array_prototype_symbols(void) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_symbol_t*), 2);
    tsc_array_t* keys = tsc_object_own_keys_dyn(tsc_array_prototype()->props);
    for (size_t index = 0; index < keys->len; index++) {
        tsc_symbol_t* symbol = tsc_property_key_symbol(TSC_ARR(tsc_str_t*, keys, index));
        if (symbol) tsc_array_push_raw(out, &symbol);
    }
    return out;
}

bool tsc_array_prototype_has_symbol(tsc_symbol_t* key) {
    return tsc_object_has_own(tsc_array_prototype()->props, tsc_symbol_property_key(key));
}

bool tsc_array_prototype_delete_symbol(tsc_symbol_t* key) {
    return tsc_object_delete(tsc_array_prototype()->props, tsc_symbol_property_key(key));
}

bool tsc_array_prototype_symbol_is_enumerable(tsc_symbol_t* key) {
    return tsc_object_property_is_enumerable(
        tsc_array_prototype()->props,
        tsc_symbol_property_key(key)
    );
}

tsc_value_t tsc_array_prototype_symbol_value(tsc_symbol_t* key) {
    return tsc_object_get(tsc_array_prototype()->props, tsc_symbol_property_key(key));
}

bool tsc_array_prototype_define_symbol_desc(tsc_symbol_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    return tsc_object_define_desc(
        tsc_array_prototype()->props,
        tsc_symbol_property_key(key),
        value,
        has_value,
        writable,
        has_writable,
        enumerable,
        has_enumerable,
        configurable,
        has_configurable
    );
}

tsc_array_t* tsc_array_prototype_own_property_names(void) {
    return value_array_keys(tsc_array_prototype(), true);
}

tsc_value_t tsc_array_prototype_own_property_descriptor(tsc_str_t* key) {
    tsc_value_t prototype = tsc_value_array(tsc_array_prototype());
    tsc_array_t* names = tsc_array_prototype_own_property_names();
    for (size_t i = 0; i < names->len; i++) {
        tsc_str_t* current = TSC_ARR(tsc_str_t*, names, i);
        if (tsc_str_eq(current, key)) {
            return tsc_value_get_own_property_descriptor(prototype, key);
        }
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_array_prototype_own_property_descriptors(void) {
    tsc_array_t* names = tsc_array_prototype_own_property_names();
    tsc_object_t* out = tsc_object_new();
    for (size_t i = 0; i < names->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, names, i);
        tsc_object_set(out, key, tsc_array_prototype_own_property_descriptor(key));
    }
    tsc_value_t iterator_desc = tsc_array_symbol_iterator_descriptor();
    if (!tsc_value_is_undefined(iterator_desc)) {
        tsc_object_set(out, tsc_symbol_property_key(tsc_symbol_iterator()), iterator_desc);
    }
    tsc_value_t unscopables_desc = tsc_array_symbol_unscopables_descriptor();
    if (!tsc_value_is_undefined(unscopables_desc)) {
        tsc_object_set(out, tsc_symbol_property_key(tsc_symbol_unscopables()), unscopables_desc);
    }
    return tsc_value_object(out);
}

tsc_value_t tsc_array_symbol_iterator_descriptor(void) {
    return tsc_value_get_own_property_descriptor(
        tsc_value_array(tsc_array_prototype()),
        tsc_symbol_property_key(tsc_symbol_iterator())
    );
}

tsc_value_t tsc_array_symbol_unscopables_descriptor(void) {
    return tsc_value_get_own_property_descriptor(
        tsc_value_array(tsc_array_prototype()),
        tsc_symbol_property_key(tsc_symbol_unscopables())
    );
}

static tsc_value_t tsc_array_default_prototype(void) {
    tsc_array_intrinsics_t* intrinsics = array_intrinsics_for_current_realm();
    tsc_value_t unscopables = intrinsics->default_prototype_initialized
        ? tsc_value_undefined()
        : tsc_array_unscopables_value();
    tsc_runtime_lock();
    if (!intrinsics->default_prototype_initialized) {
        array_prototype_initializing = true;
        tsc_array_t* proto = (tsc_array_t*)TSC_GC_MALLOC(sizeof(tsc_array_t));
        proto->len = 0;
        proto->dense_len = 0;
        proto->cap = 0;
        proto->es = sizeof(tsc_value_t);
        proto->extensible = true;
        /* Array.prototype is itself an Array exotic object with writable length. */
        proto->length_writable = true;
        proto->value_storage = true;
        proto->prototype = tsc_value_object_prototype();
        proto->props = tsc_object_new();
        proto->holes = NULL;
        proto->box_element = NULL;
        proto->unbox_element = NULL;
        proto->data = NULL;
        proto->value_roots = NULL;
        array_prototype_define_method(proto->props, "toString", 8, 0.0, array_prototype_to_string);
        array_prototype_define_method(proto->props, "toLocaleString", 14, 0.0, array_prototype_to_locale_string);
        array_prototype_define_method(proto->props, "at", 2, 1.0, array_prototype_at);
        array_prototype_define_method(proto->props, "includes", 8, 1.0, array_prototype_includes);
        array_prototype_define_method(proto->props, "indexOf", 7, 1.0, array_prototype_index_of);
        array_prototype_define_method(proto->props, "lastIndexOf", 11, 1.0, array_prototype_last_index_of);
        array_prototype_define_method(proto->props, "join", 4, 1.0, array_prototype_join);
        array_prototype_define_method(proto->props, "keys", 4, 0.0, array_prototype_keys);
        array_prototype_define_method(proto->props, "values", 6, 0.0, array_prototype_values);
        array_prototype_define_method(proto->props, "entries", 7, 0.0, array_prototype_entries);
        array_prototype_define_method(proto->props, "pop", 3, 0.0, array_prototype_pop);
        array_prototype_define_method(proto->props, "push", 4, 1.0, array_prototype_push);
        array_prototype_define_method(proto->props, "shift", 5, 0.0, array_prototype_shift);
        array_prototype_define_method(proto->props, "unshift", 7, 1.0, array_prototype_unshift);
        array_prototype_define_method(proto->props, "concat", 6, 1.0, array_prototype_concat);
        array_prototype_define_method(proto->props, "slice", 5, 2.0, array_prototype_slice);
        array_prototype_define_method(proto->props, "fill", 4, 1.0, array_prototype_fill);
        array_prototype_define_method(proto->props, "copyWithin", 10, 2.0, array_prototype_copy_within);
        array_prototype_define_method(proto->props, "splice", 6, 2.0, array_prototype_splice);
        array_prototype_define_method(proto->props, "sort", 4, 1.0, array_prototype_sort);
        array_prototype_define_method(proto->props, "toSorted", 8, 1.0, array_prototype_to_sorted);
        array_prototype_define_method(proto->props, "with", 4, 2.0, array_prototype_with);
        array_prototype_define_method(proto->props, "toSpliced", 9, 2.0, array_prototype_to_spliced);
        array_prototype_define_method(proto->props, "flat", 4, 0.0, array_prototype_flat);
        array_prototype_define_method(proto->props, "reverse", 7, 0.0, array_prototype_reverse);
        array_prototype_define_method(proto->props, "toReversed", 10, 0.0, array_prototype_to_reversed);
        array_prototype_define_method(proto->props, "forEach", 7, 1.0, array_prototype_for_each);
        array_prototype_define_method(proto->props, "map", 3, 1.0, array_prototype_map);
        array_prototype_define_method(proto->props, "flatMap", 7, 1.0, array_prototype_flat_map);
        array_prototype_define_method(proto->props, "filter", 6, 1.0, array_prototype_filter);
        array_prototype_define_method(proto->props, "some", 4, 1.0, array_prototype_some);
        array_prototype_define_method(proto->props, "every", 5, 1.0, array_prototype_every);
        array_prototype_define_method(proto->props, "find", 4, 1.0, array_prototype_find);
        array_prototype_define_method(proto->props, "findIndex", 9, 1.0, array_prototype_find_index);
        array_prototype_define_method(proto->props, "findLast", 8, 1.0, array_prototype_find_last);
        array_prototype_define_method(proto->props, "findLastIndex", 13, 1.0, array_prototype_find_last_index);
        array_prototype_define_method(proto->props, "reduce", 6, 1.0, array_prototype_reduce);
        array_prototype_define_method(proto->props, "reduceRight", 11, 1.0, array_prototype_reduce_right);
        tsc_object_define(
            proto->props,
            tsc_symbol_property_key(tsc_symbol_iterator()),
            tsc_object_get(proto->props, tsc_str_from_lit("values", 6)),
            true,
            false,
            true
        );
        tsc_object_define(
            proto->props,
            tsc_symbol_property_key(tsc_symbol_unscopables()),
            unscopables,
            false,
            false,
            true
        );
        array_prototype_gc_root = proto;
        intrinsics->default_prototype = tsc_value_array(proto);
        array_prototype_initialized = true;
        tsc_value_t constructor = tsc_array_constructor_value();
        tsc_function_identity_t* identity = (tsc_function_identity_t*)value_ptr(constructor);
        tsc_function_identity_set_own_prototype(identity, intrinsics->default_prototype);
        identity->func_prototype_writable = false;
        tsc_object_define(
            proto->props,
            tsc_str_from_lit("constructor", 11),
            constructor,
            true,
            false,
            true
        );
        array_prototype_initializing = false;
        intrinsics->default_prototype_initialized = true;
    }
    tsc_runtime_unlock();
    return intrinsics->default_prototype;
}

tsc_array_t* tsc_array_prototype(void) {
    return (tsc_array_t*)value_ptr(tsc_array_default_prototype());
}

tsc_array_t* tsc_array_new(size_t elem_size, size_t initial_cap) {
    tsc_array_t* a = (tsc_array_t*)TSC_GC_MALLOC(sizeof(tsc_array_t));
    a->len = 0;
    a->dense_len = 0;
    a->cap = initial_cap;
    a->es = elem_size;
    a->extensible = true;
    a->length_writable = true;
    a->value_storage = false;
    a->prototype = tsc_array_default_prototype();
    a->props = tsc_object_new();
    a->holes = NULL;
    a->box_element = NULL;
    a->unbox_element = NULL;
    a->data = initial_cap ? TSC_GC_MALLOC(initial_cap * elem_size) : NULL;
    a->value_roots = elem_size == sizeof(tsc_value_t) && initial_cap
        ? (void**)TSC_GC_MALLOC(initial_cap * sizeof(void*))
        : NULL;
    if (a->value_roots) memset(a->value_roots, 0, initial_cap * sizeof(void*));
    return a;
}

tsc_array_t* tsc_array_new_atomic(size_t elem_size, size_t initial_cap) {
    tsc_array_t* a = (tsc_array_t*)TSC_GC_MALLOC(sizeof(tsc_array_t));
    a->len = 0;
    a->dense_len = 0;
    a->cap = initial_cap;
    a->es = elem_size;
    a->extensible = true;
    a->length_writable = true;
    a->value_storage = false;
    a->prototype = tsc_array_default_prototype();
    a->props = tsc_object_new();
    a->holes = NULL;
    a->box_element = NULL;
    a->unbox_element = NULL;
    a->data = initial_cap ? TSC_GC_MALLOC_ATOMIC(initial_cap * elem_size) : NULL;
    a->value_roots = elem_size == sizeof(tsc_value_t) && initial_cap
        ? (void**)TSC_GC_MALLOC(initial_cap * sizeof(void*))
        : NULL;
    if (a->value_roots) memset(a->value_roots, 0, initial_cap * sizeof(void*));
    return a;
}

static void array_refresh_value_root(tsc_array_t* a, size_t index) {
    if (!a || a->es != sizeof(tsc_value_t) || !a->value_roots || index >= a->cap) return;
    if (index >= a->dense_len || index >= a->len || !tsc_array_index_present(a, index)) {
        a->value_roots[index] = NULL;
        return;
    }
    tsc_value_t value;
    memcpy(&value, (const char*)a->data + index * a->es, sizeof(value));
    a->value_roots[index] = tsc_value_gc_root(value);
}

static void array_refresh_value_roots(tsc_array_t* a, size_t start, size_t count) {
    if (!a || a->es != sizeof(tsc_value_t) || !a->value_roots || start >= a->cap) return;
    size_t end = start + count;
    if (end < start || end > a->cap) end = a->cap;
    for (size_t index = start; index < end; index++) array_refresh_value_root(a, index);
}

tsc_array_t* tsc_array_set_value_codec(
    tsc_array_t* array,
    tsc_array_box_element_fn box_element,
    tsc_array_unbox_element_fn unbox_element
) {
    if (!array || !box_element || !unbox_element) {
        tsc_panic("array value codec must be complete");
    }
    if (array->value_storage) return array;
    if (
        (array->box_element && array->box_element != box_element) ||
        (array->unbox_element && array->unbox_element != unbox_element)
    ) {
        tsc_panic("array element representation conflict");
    }
    array->box_element = box_element;
    array->unbox_element = unbox_element;
    return array;
}

/* An ordinary write stores its actual value without invoking a native unbox
 * adapter. One retained owner changes its storage through a codec worklist;
 * identity, properties, holes, descriptors, prototypes and iterators survive. */
void tsc_array_use_value_storage(tsc_array_t* array) {
    if (array->value_storage) return;
    if (!array->box_element) {
        if (array->es != sizeof(tsc_value_t))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array requires an ordinary value codec"));
        array->value_storage = true;
        return;
    }
    if (array->cap > SIZE_MAX / sizeof(tsc_value_t))
        tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Array value storage is too large"));
    tsc_value_t* values = array->cap ? TSC_GC_MALLOC(array->cap * sizeof(tsc_value_t)) : NULL;
    void** roots = array->cap ? TSC_GC_MALLOC(array->cap * sizeof(void*)) : NULL;
    if (roots) memset(roots, 0, array->cap * sizeof(void*));
    for (size_t index = 0; index < array->dense_len; ++index) {
        values[index] = tsc_array_index_present(array, index)
            ? array->box_element((const char*)array->data + index * array->es) : tsc_value_undefined();
        roots[index] = tsc_value_gc_root(values[index]);
    }
    array->data = values;
    array->value_roots = roots;
    array->es = sizeof(tsc_value_t);
    array->box_element = NULL;
    array->unbox_element = NULL;
    array->value_storage = true;
}

static bool array_native_has_tag(tsc_value_t value, uint64_t tag) {
    return value_is_box(value) && value_tag(value) == tag;
}

static bool array_native_element_kind_matches(tsc_value_t value, tsc_native_element_kind_t kind) {
    switch (kind) {
        case TSC_NATIVE_ELEMENT_NUMBER: return !value_is_box(value);
        case TSC_NATIVE_ELEMENT_BOOLEAN:
            return array_native_has_tag(value, TSC_VALUE_TAG_TRUE) || array_native_has_tag(value, TSC_VALUE_TAG_FALSE);
        case TSC_NATIVE_ELEMENT_STRING: return array_native_has_tag(value, TSC_VALUE_TAG_STRING);
        case TSC_NATIVE_ELEMENT_BIGINT: return array_native_has_tag(value, TSC_VALUE_TAG_BIGINT);
        case TSC_NATIVE_ELEMENT_SYMBOL: return array_native_has_tag(value, TSC_VALUE_TAG_SYMBOL);
        case TSC_NATIVE_ELEMENT_ARRAY: return array_native_has_tag(value, TSC_VALUE_TAG_ARRAY);
        case TSC_NATIVE_ELEMENT_OBJECT: return array_native_has_tag(value, TSC_VALUE_TAG_OBJECT);
        case TSC_NATIVE_ELEMENT_FUNCTION: return tsc_value_is_callable(value);
        case TSC_NATIVE_ELEMENT_UNDEFINED: return array_native_has_tag(value, TSC_VALUE_TAG_UNDEFINED);
        default: return false;
    }
}

static _Noreturn void array_native_representation_failure(void) {
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array cannot preserve identity through this native element representation"));
}

/* One owner retains all Array identity, properties, holes and iterator state.
 * A published native codec is its physical contract: subsequent matching
 * consumers borrow the allocation without touching any indexed property.
 * Boxed storage may adopt a native codec only after every stored value survives
 * an exact round trip. Raw cells deliberately skip getters and prototypes.
 * A source Array literal can also change its initial codec before exposure;
 * incompatible existing native views fail closed instead of making a copy. */
tsc_array_t* tsc_array_require_native_representation(
    tsc_value_t value, size_t element_size,
    tsc_array_box_element_fn box_element,
    tsc_array_unbox_element_fn unbox_element,
    tsc_native_element_kind_t kind, bool fresh_literal
) {
    if (!array_native_has_tag(value, TSC_VALUE_TAG_ARRAY) || !value_ptr(value)) {
        array_native_representation_failure();
    }
    tsc_array_t* array = (tsc_array_t*)value_ptr(value);
    if (!box_element && !unbox_element) return array;
    if (!box_element || !unbox_element || !element_size) array_native_representation_failure();
    bool same_codec = array->es == element_size && array->box_element == box_element && array->unbox_element == unbox_element;
    if (same_codec && array->cap >= array->len) return array;
    if ((!same_codec && !fresh_literal && (array->box_element || array->unbox_element)) ||
        (!array->box_element && array->es != sizeof(tsc_value_t))) {
        array_native_representation_failure();
    }
    size_t capacity = array->cap > array->len ? array->cap : array->len;
    if (capacity > SIZE_MAX / element_size) array_native_representation_failure();
    void* volatile converted = capacity ? TSC_GC_MALLOC(capacity * element_size) : NULL;
    if (converted) memset(converted, 0, capacity * element_size);
    tsc_array_t* volatile indices = tsc_array_own_indices(array);
    volatile bool supported = true;
    TSC_TRY_FRAME(conversion_frame);
    tsc_try_push(&conversion_frame);
    if (setjmp(conversion_frame.jb) == 0) {
        for (size_t cursor = 0; cursor < indices->len; ++cursor) {
            size_t index = TSC_ARR(size_t, indices, cursor);
            tsc_value_t current;
            ssize_t side = object_find(array->props, tsc_str_from_int((int64_t)index));
            if (side >= 0) {
                const tsc_object_prop_t* property = &array->props->props[(size_t)side];
                if (property->accessor) continue;
                current = object_prop_data_value(array->props, property);
            } else {
                const void* input = (const char*)array->data + index * array->es;
                if (array->box_element) current = array->box_element(input);
                else memcpy(&current, input, sizeof(current));
            }
            void* volatile current_gc_root = tsc_value_gc_root(current);
            void* output = (char*)converted + index * element_size;
            if (!array_native_element_kind_matches(current, kind) || !unbox_element(current, output) ||
                !tsc_value_object_is(current, box_element(output))) {
                supported = false;
                break;
            }
            (void)current_gc_root;
        }
        tsc_try_pop();
    } else {
        tsc_try_pop();
        supported = false;
    }
    if (!supported) array_native_representation_failure();
    array->data = converted;
    array->cap = capacity;
    array->es = element_size;
    array->box_element = box_element;
    array->unbox_element = unbox_element;
    array->value_storage = false;
    /* Native cells contain scanned pointers rather than hidden NaN payloads.
     * Old buffers can still be borrowed by a surrounding native operation;
     * the collector reclaims them once those borrowers have returned. */
    array->value_roots = NULL;
    return array;
}

tsc_array_t* tsc_array_from_buf(size_t elem_size, const void* src, size_t n) {
    tsc_array_t* a = tsc_array_new(elem_size, n > 0 ? n : 1);
    if (n > 0) memcpy(a->data, src, n * elem_size);
    a->len = n;
    a->dense_len = n;
    array_refresh_value_roots(a, 0, n);
    return a;
}

bool tsc_str_is_length_key(const tsc_str_t* key) {
    return key && key->len == 6 && memcmp(key->data, "length", 6) == 0;
}

bool tsc_str_array_index(const tsc_str_t* key, size_t* out) {
    if (!key || key->len == 0) return false;
    if (key->len > 1 && key->data[0] == '0') return false;
    size_t value = 0;
    for (size_t i = 0; i < key->len; i++) {
        unsigned char ch = (unsigned char)key->data[i];
        if (ch < '0' || ch > '9') return false;
        size_t digit = (size_t)(ch - '0');
        if (value > (SIZE_MAX - digit) / 10) return false;
        value = value * 10 + digit;
    }
    if (value >= 4294967295ULL) return false;
    *out = value;
    return true;
}

bool tsc_array_index_present(const tsc_array_t* a, size_t index) {
    if (!a || index >= a->len) return false;
    tsc_str_t* key = tsc_str_from_int((int64_t)index);
    if (a->props && tsc_object_has_own(a->props, key)) return true;
    if (index >= a->dense_len) return false;
    if (!a->holes) return true;
    return !tsc_object_has_own(a->holes, key);
}

static int array_compare_indices(const void* left, const void* right) {
    size_t a = *(const size_t*)left, b = *(const size_t*)right;
    return a < b ? -1 : a > b ? 1 : 0;
}

/* One collection enumerates actual own indices, never the logical hole range. */
tsc_array_t* tsc_array_own_indices(const tsc_array_t* a) {
    tsc_array_t* indices = tsc_array_new(sizeof(size_t), 0);
    if (!a) return indices;
    for (size_t index = 0; index < a->dense_len && index < a->len; ++index) {
        tsc_str_t* key = tsc_str_from_int((int64_t)index);
        if (a->props && tsc_object_has_own(a->props, key)) continue;
        if (!a->holes || !tsc_object_has_own(a->holes, key)) tsc_array_push_raw(indices, &index);
    }
    tsc_array_t* keys = tsc_object_own_keys_dyn(a->props);
    for (size_t cursor = 0; cursor < keys->len; ++cursor) {
        size_t index;
        if (tsc_str_array_index(TSC_ARR(tsc_str_t*, keys, cursor), &index) && index < a->len)
            tsc_array_push_raw(indices, &index);
    }
    if (indices->len > 1) qsort(indices->data, indices->len, sizeof(size_t), array_compare_indices);
    return indices;
}

void tsc_array_mark_hole(tsc_array_t* a, size_t index) {
    if (!a || index >= a->dense_len) return;
    if (!a->holes) a->holes = tsc_object_new();
    (void)tsc_object_set(a->holes, tsc_str_from_int((int64_t)index), tsc_value_bool(true));
    if (a->value_roots) a->value_roots[index] = NULL;
}

void tsc_array_clear_hole(tsc_array_t* a, size_t index) {
    if (!a || !a->holes) return;
    (void)tsc_object_delete(a->holes, tsc_str_from_int((int64_t)index));
    array_refresh_value_root(a, index);
}

bool tsc_array_has_own_key(const tsc_array_t* a, const tsc_str_t* key) {
    if (!a) return false;
    if (tsc_str_is_length_key(key)) return true;
    size_t idx = 0;
    if (tsc_str_array_index(key, &idx) && tsc_array_index_present(a, idx)) return true;
    return a->props && tsc_object_has_own(a->props, key);
}

bool tsc_array_property_is_enumerable_key(const tsc_array_t* a, const tsc_str_t* key) {
    if (!a || tsc_str_is_length_key(key)) return false;
    if (a->props && tsc_object_has_own(a->props, key)) {
        return tsc_object_property_is_enumerable(a->props, key);
    }
    size_t idx = 0;
    if (tsc_str_array_index(key, &idx) && tsc_array_index_present(a, idx)) return true;
    return a->props && tsc_object_property_is_enumerable(a->props, key);
}

void tsc_array_reserve(tsc_array_t* a, size_t new_cap) {
    if (new_cap <= a->cap) return;
    /* Start growth at 8 so a fresh `[]` followed by N pushes amortizes well. */
    size_t cap = a->cap ? a->cap : 8;
    while (cap < new_cap) cap *= 2;
    const size_t old_cap = a->cap;
    void* nd = a->data ? TSC_GC_REALLOC(a->data, cap * a->es) : TSC_GC_MALLOC(cap * a->es);
    a->data = nd;
    if (a->es == sizeof(tsc_value_t)) {
        a->value_roots = a->value_roots
            ? (void**)TSC_GC_REALLOC(a->value_roots, cap * sizeof(void*))
            : (void**)TSC_GC_MALLOC(cap * sizeof(void*));
        memset(a->value_roots + old_cap, 0, (cap - old_cap) * sizeof(void*));
    }
    a->cap = cap;
}

void tsc_array_store_raw(tsc_array_t* a, size_t index, const void* elem) {
    if (!a || !elem || index >= a->cap) tsc_panic("array store index exceeds capacity");
    memcpy((char*)a->data + index * a->es, elem, a->es);
    if (index >= a->dense_len) a->dense_len = index + 1;
    if (a->es == sizeof(tsc_value_t) && a->value_roots) {
        tsc_value_t value;
        memcpy(&value, elem, sizeof(value));
        a->value_roots[index] = tsc_value_gc_root(value);
    }
}

void tsc_array_push_raw(tsc_array_t* a, const void* elem) {
    if (a->len + 1 > a->cap) tsc_array_reserve(a, a->len + 1);
    tsc_array_clear_hole(a, a->len);
    tsc_array_store_raw(a, a->len, elem);
    a->len++;
}


void tsc_array_unshift_raw(tsc_array_t* a, const void* elem) {
    tsc_object_t* shifted_holes = NULL;
    if (a->holes && a->es == sizeof(tsc_value_t)) {
        shifted_holes = tsc_object_new();
        tsc_array_t* keys = tsc_object_own_keys_dyn(a->holes);
        for (size_t i = 0; i < keys->len; i++) {
            tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
            size_t index = 0;
            if (tsc_str_array_index(key, &index) && index < a->len) {
                (void)tsc_object_set(
                    shifted_holes,
                    tsc_str_from_int((int64_t)(index + 1)),
                    tsc_value_bool(true)
                );
            }
        }
    }
    if (a->len + 1 > a->cap) tsc_array_reserve(a, a->len + 1);
    memmove((char*)a->data + a->es, a->data, a->len * a->es);
    tsc_array_store_raw(a, 0, elem);
    a->len++;
    a->dense_len = a->len;
    a->holes = shifted_holes;
    array_refresh_value_roots(a, 0, a->len);
}


static void array_copy_holes_range(
    const tsc_array_t* src,
    size_t source_start,
    tsc_array_t* dst,
    size_t destination_start,
    size_t count
) {
    if (!src || !dst || src->es != sizeof(tsc_value_t) || dst->es != sizeof(tsc_value_t) || !src->holes) return;
    for (size_t i = 0; i < count; i++) {
        if (!tsc_array_index_present(src, source_start + i)) {
            tsc_array_mark_hole(dst, destination_start + i);
        }
    }
}


tsc_array_t* tsc_array_slice(const tsc_array_t* a, double start, double end) {
    int64_t slen = (int64_t)a->len;
    int64_t i0 = (int64_t)start;
    int64_t i1 = (int64_t)end;
    if (i0 < 0) i0 = slen + i0;
    if (i1 < 0) i1 = slen + i1;
    if (i0 < 0) i0 = 0;
    if (i1 > slen) i1 = slen;
    if (i0 > i1) i0 = i1;
    size_t n = (size_t)(i1 - i0);
    tsc_array_t* r = tsc_array_new(a->es, n > 0 ? n : 1);
    r->box_element = a->box_element;
    r->unbox_element = a->unbox_element;
    r->value_storage = a->value_storage;
    if (n > 0) memcpy(r->data, (char*)a->data + (size_t)i0 * a->es, n * a->es);
    r->len = n;
    r->dense_len = n;
    if (a->holes) {
        for (size_t i = 0; i < n; i++) {
            if (!tsc_array_index_present(a, (size_t)i0 + i)) tsc_array_mark_hole(r, i);
        }
    }
    array_refresh_value_roots(r, 0, n);
    return r;
}

tsc_array_t* tsc_array_append(tsc_array_t* dst, const tsc_array_t* src) {
    if (src->len == 0) return dst;
    tsc_array_reserve(dst, dst->len + src->len);
    memcpy((char*)dst->data + dst->len * dst->es, src->data, src->len * src->es);
    size_t source_offset = dst->len;
    dst->len += src->len;
    dst->dense_len = dst->len;
    array_copy_holes_range(src, 0, dst, source_offset, src->len);
    array_refresh_value_roots(dst, source_offset, src->len);
    return dst;
}

void tsc_array_append_actual_arguments(tsc_array_t* target, tsc_array_t* source) {
    if (!target || target->es != sizeof(tsc_value_t) || target->box_element || !source)
        tsc_panic("invalid native actual argument List");
    tsc_array_t* volatile target_root = target;
    tsc_array_t* volatile source_root = source;
    const size_t length = source->len;
    for (size_t index = 0; index < length; ++index) {
        tsc_value_t value = tsc_value_get_index(tsc_value_array(source), (double)index);
        void* volatile value_root = tsc_value_gc_root(value);
        tsc_array_push_value(target, value);
        (void)value_root;
    }
    (void)target_root; (void)source_root;
}


double tsc_array_length(const tsc_array_t* a) {
    return (double)a->len;
}

void tsc_array_oob(const tsc_array_t* a, double i) { (void)a; (void)i; }
