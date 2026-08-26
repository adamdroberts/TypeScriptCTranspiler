#include "tsc_internal.h"

/* ---------------- arrays ---------------- */

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
    tsc_array_t* array = tsc_array_new(sizeof(tsc_value_t), count);
    const tsc_value_t undefined = tsc_value_undefined();
    for (size_t index = 0; index < count; index++) {
        tsc_array_push_raw(array, &undefined);
        tsc_array_mark_hole(array, index);
    }
    return tsc_value_array(array);
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

static void array_create_data_property_or_throw(
    tsc_value_t target,
    double index,
    tsc_value_t value
) {
    if (!tsc_value_define_property_desc(
        target,
        tsc_str_from_num(index),
        value,
        true,
        true,
        true,
        true,
        true,
        true,
        true
    )) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Array factory could not create an indexed property")
        );
    }
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
        array_constructor_define_method(array_constructor_value, "of", 2, 0.0, array_static_of);
        array_constructor_initialized = true;
    }
    if (array_prototype_initializing) {
        tsc_runtime_unlock();
        return array_constructor_value;
    }
    if (array_prototype_initialized) {
        (void)tsc_value_set_prop(
            array_constructor_value,
            tsc_str_from_lit("prototype", 9),
            tsc_value_array(tsc_array_prototype())
        );
    } else if (!array_prototype_initializing) {
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

static tsc_array_t* array_proto_locale_args(tsc_array_t* args) {
    size_t count = args ? (args->len < 2 ? args->len : 2) : 0;
    tsc_array_t* locale_args = tsc_array_new(sizeof(tsc_value_t), count ? count : 1);
    for (size_t i = 0; i < count; i++) {
        tsc_value_t value = TSC_ARR(tsc_value_t, args, i);
        tsc_array_push_raw(locale_args, &value);
    }
    return locale_args;
}

static tsc_value_t array_proto_callback_arg(tsc_array_t* args, const char* method) {
    if (!args || args->len == 0) {
        tsc_throw_str(tsc_str_from_cstr(method));
    }
    tsc_value_t callback = TSC_ARR(tsc_value_t, args, 0);
    if (!tsc_value_is_callable(callback)) {
        tsc_throw_str(tsc_str_from_cstr(method));
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

static size_t array_proto_length(tsc_value_t receiver) {
    double len = tsc_value_length(receiver);
    if (isnan(len) || len <= 0.0) return 0;
    if (len >= (double)SIZE_MAX) return SIZE_MAX;
    return (size_t)floor(len);
}

static bool array_proto_has_index(tsc_value_t receiver, size_t index) {
    char key_buf[32];
    snprintf(key_buf, sizeof key_buf, "%zu", index);
    return tsc_value_has_prop(receiver, tsc_str_from_cstr(key_buf));
}

static tsc_value_t array_proto_get_index(tsc_value_t receiver, size_t index) {
    if (value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* array = (tsc_array_t*)value_ptr(receiver);
        if (index >= array->len) return tsc_value_undefined();
        char key_buf[32];
        snprintf(key_buf, sizeof key_buf, "%zu", index);
        return tsc_value_get_prop_receiver(receiver, tsc_str_from_cstr(key_buf), receiver);
    }
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

static void array_prototype_require_receiver(tsc_value_t receiver, const char* method) {
    if (tsc_value_is_nullish(receiver)) {
        char buf[128];
        snprintf(buf, sizeof buf, "Array.prototype.%s receiver is null or undefined", method);
        tsc_throw_str(tsc_str_from_cstr(buf));
    }
}

static tsc_value_t array_proto_empty_args(void) {
    return tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 1));
}

static bool array_proto_is_string_receiver(tsc_value_t receiver) {
    return value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_STRING;
}

static void array_proto_reject_string_mutation(tsc_value_t receiver, const char* method) {
    if (array_proto_is_string_receiver(receiver)) {
        char message[128];
        snprintf(message, sizeof message, "Array.prototype.%s cannot mutate a string receiver", method);
        tsc_throw_str(tsc_str_from_cstr(message));
    }
}

static bool array_proto_is_empty_primitive_receiver(tsc_value_t receiver) {
    if (!value_is_box(receiver)) return true;
    tsc_value_tag_t tag = value_tag(receiver);
    return tag == TSC_VALUE_TAG_FALSE || tag == TSC_VALUE_TAG_TRUE;
}

static tsc_value_t array_proto_empty_array(void) {
    return tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 1));
}

static tsc_str_t* array_proto_join_part(tsc_value_t value) {
    return tsc_value_is_nullish(value) ? tsc_str_from_lit("", 0) : tsc_value_to_string(value);
}

static tsc_value_t array_proto_generic_join(tsc_value_t receiver, tsc_value_t separator) {
    size_t len = array_proto_length(receiver);
    tsc_str_t* sep = tsc_value_is_undefined(separator) ? tsc_str_from_lit(",", 1) : tsc_value_to_string(separator);
    tsc_str_t* out = tsc_str_from_lit("", 0);
    for (size_t i = 0; i < len; i++) {
        if (i > 0) out = tsc_str_concat(out, sep);
        out = tsc_str_concat(out, array_proto_join_part(array_proto_get_index(receiver, i)));
    }
    return tsc_value_string(out);
}

static tsc_value_t array_proto_generic_includes(tsc_value_t receiver, tsc_value_t needle, tsc_value_t position) {
    size_t len = array_proto_length(receiver);
    size_t start = value_array_forward_start(len, value_slice_arg(position, 0.0));
    for (size_t i = start; i < len; i++) {
        if (tsc_value_same_value_zero(array_proto_get_index(receiver, i), needle)) return tsc_value_bool(true);
    }
    return tsc_value_bool(false);
}

static tsc_value_t array_proto_generic_index_of(tsc_value_t receiver, tsc_value_t needle, tsc_value_t position) {
    size_t len = array_proto_length(receiver);
    size_t start = value_array_forward_start(len, value_slice_arg(position, 0.0));
    for (size_t i = start; i < len; i++) {
        if (tsc_value_eq(array_proto_get_index(receiver, i), needle)) return tsc_value_num((double)i);
    }
    return tsc_value_num(-1.0);
}

static tsc_value_t array_proto_generic_last_index_of(tsc_value_t receiver, tsc_value_t needle, tsc_value_t position) {
    size_t len = array_proto_length(receiver);
    if (len == 0) return tsc_value_num(-1.0);
    size_t i = 0;
    double raw = value_slice_arg(position, INFINITY);
    if (raw == -INFINITY) return tsc_value_num(-1.0);
    if (raw == INFINITY) {
        i = len - 1;
    } else {
        if (isnan(raw)) raw = 0.0;
        int64_t idx = (int64_t)(raw < 0 ? ceil(raw) : floor(raw));
        if (idx < 0) idx = (int64_t)len + idx;
        else if (idx >= (int64_t)len) idx = (int64_t)len - 1;
        if (idx < 0) return tsc_value_num(-1.0);
        i = (size_t)idx;
    }
    while (true) {
        if (tsc_value_eq(array_proto_get_index(receiver, i), needle)) return tsc_value_num((double)i);
        if (i == 0) break;
        i--;
    }
    return tsc_value_num(-1.0);
}

static tsc_array_t* array_proto_generic_slice_array(tsc_value_t receiver, tsc_value_t start, tsc_value_t end) {
    size_t len = array_proto_length(receiver);
    size_t from = value_array_forward_start(len, value_slice_arg(start, 0.0));
    size_t to = value_array_forward_start(len, value_slice_arg(end, (double)len));
    if (to < from) to = from;
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), to > from ? to - from : 1);
    for (size_t i = from; i < to; i++) {
        tsc_value_t value = array_proto_get_index(receiver, i);
        tsc_array_push_raw(out, &value);
    }
    return out;
}

static tsc_value_t array_proto_generic_keys(tsc_value_t receiver) {
    size_t len = array_proto_length(receiver);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), len ? len : 1);
    for (size_t i = 0; i < len; i++) {
        tsc_value_t key = tsc_value_num((double)i);
        tsc_array_push_raw(out, &key);
    }
    return tsc_value_array(out);
}

static tsc_value_t array_proto_generic_values(tsc_value_t receiver) {
    size_t len = array_proto_length(receiver);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), len ? len : 1);
    for (size_t i = 0; i < len; i++) {
        tsc_value_t value = array_proto_get_index(receiver, i);
        tsc_array_push_raw(out, &value);
    }
    return tsc_value_array(out);
}

static tsc_value_t array_proto_generic_entries(tsc_value_t receiver) {
    size_t len = array_proto_length(receiver);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), len ? len : 1);
    for (size_t i = 0; i < len; i++) {
        tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_value_t key = tsc_value_num((double)i);
        tsc_value_t value = array_proto_get_index(receiver, i);
        tsc_array_push_raw(pair, &key);
        tsc_array_push_raw(pair, &value);
        tsc_value_t boxed = tsc_value_array(pair);
        tsc_array_push_raw(out, &boxed);
    }
    return tsc_value_array(out);
}

static tsc_value_t array_prototype_to_string(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    array_prototype_require_receiver(this_arg, "toString");
    tsc_value_t join = tsc_value_get_prop(this_arg, tsc_str_from_lit("join", 4));
    if (tsc_value_is_callable(join)) {
        return tsc_value_apply_function(join, this_arg, array_proto_empty_args());
    }
    return tsc_value_string(tsc_value_object_to_string_tag(this_arg));
}

static tsc_value_t array_prototype_to_locale_string(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "toLocaleString");
    tsc_array_t* locale_args = array_proto_locale_args(args);
    double len_num = tsc_value_length(this_arg);
    if (isnan(len_num) || len_num <= 0.0) {
        return tsc_value_string(tsc_str_from_lit("", 0));
    }
    size_t len = (size_t)floor(len_num);
    tsc_str_t* out = tsc_str_from_lit("", 0);
    tsc_str_t* sep = tsc_str_from_lit(",", 1);
    for (size_t i = 0; i < len; i++) {
        if (i > 0) out = tsc_str_concat(out, sep);
        tsc_value_t value = tsc_value_get_index(this_arg, (double)i);
        if (!tsc_value_is_nullish(value)) {
            out = tsc_str_concat(out, tsc_value_method_to_locale_string_args(value, locale_args));
        }
    }
    return tsc_value_string(out);
}

static tsc_value_t array_prototype_at(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "at");
    return tsc_value_method_at(this_arg, array_proto_arg(args, 0));
}

static tsc_value_t array_prototype_includes(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "includes");
    if (array_proto_is_string_receiver(this_arg)) {
        return array_proto_generic_includes(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1));
    }
    return tsc_value_method_includes(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1));
}

static tsc_value_t array_prototype_index_of(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "indexOf");
    if (array_proto_is_string_receiver(this_arg)) {
        return array_proto_generic_index_of(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1));
    }
    return tsc_value_method_index_of(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1));
}

static tsc_value_t array_prototype_last_index_of(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "lastIndexOf");
    if (array_proto_is_string_receiver(this_arg)) {
        return array_proto_generic_last_index_of(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1));
    }
    return tsc_value_method_last_index_of(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1));
}

static tsc_value_t array_prototype_join(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "join");
    if (array_proto_is_string_receiver(this_arg)) {
        return array_proto_generic_join(this_arg, array_proto_arg(args, 0));
    }
    return tsc_value_method_join(this_arg, array_proto_arg(args, 0));
}

static tsc_value_t array_prototype_keys(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    array_prototype_require_receiver(this_arg, "keys");
    if (array_proto_is_string_receiver(this_arg)) return array_proto_generic_keys(this_arg);
    if (array_proto_is_empty_primitive_receiver(this_arg)) return array_proto_empty_array();
    return tsc_value_method_keys(this_arg);
}

static tsc_value_t array_prototype_values(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    array_prototype_require_receiver(this_arg, "values");
    if (array_proto_is_string_receiver(this_arg)) return array_proto_generic_values(this_arg);
    if (array_proto_is_empty_primitive_receiver(this_arg)) return array_proto_empty_array();
    return tsc_value_method_values(this_arg);
}

static tsc_value_t array_prototype_entries(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    array_prototype_require_receiver(this_arg, "entries");
    if (array_proto_is_string_receiver(this_arg)) return array_proto_generic_entries(this_arg);
    if (array_proto_is_empty_primitive_receiver(this_arg)) return array_proto_empty_array();
    return tsc_value_method_entries(this_arg);
}

static tsc_value_t array_prototype_pop(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    array_prototype_require_receiver(this_arg, "pop");
    array_proto_reject_string_mutation(this_arg, "pop");
    return tsc_value_method_pop(this_arg);
}

static tsc_value_t array_prototype_push(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "push");
    array_proto_reject_string_mutation(this_arg, "push");
    size_t count = args ? args->len : 0;
    if (array_proto_is_empty_primitive_receiver(this_arg)) return tsc_value_num((double)count);
    if (count == 0) return tsc_value_method_push_empty(this_arg);
    for (size_t i = 0; i < count; i++) {
        tsc_value_method_push(this_arg, TSC_ARR(tsc_value_t, args, i));
    }
    return tsc_value_num(tsc_value_length(this_arg));
}

static tsc_value_t array_prototype_shift(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    array_prototype_require_receiver(this_arg, "shift");
    array_proto_reject_string_mutation(this_arg, "shift");
    return tsc_value_method_shift(this_arg);
}

static tsc_value_t array_prototype_unshift(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "unshift");
    array_proto_reject_string_mutation(this_arg, "unshift");
    size_t count = args ? args->len : 0;
    if (array_proto_is_empty_primitive_receiver(this_arg)) return tsc_value_num((double)count);
    if (count == 0) return tsc_value_method_unshift_empty(this_arg);
    for (size_t i = count; i > 0; i--) {
        tsc_value_method_unshift(this_arg, TSC_ARR(tsc_value_t, args, i - 1));
    }
    return tsc_value_num(tsc_value_length(this_arg));
}

static tsc_value_t array_prototype_concat(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "concat");
    size_t count = args ? args->len : 0;
    tsc_value_t out = tsc_value_array(tsc_array_new(sizeof(tsc_value_t), count + 1));
    out = tsc_value_method_concat(out, this_arg);
    for (size_t i = 0; i < count; i++) {
        out = tsc_value_method_concat(out, TSC_ARR(tsc_value_t, args, i));
    }
    return out;
}

static tsc_value_t array_prototype_slice(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "slice");
    if (array_proto_is_string_receiver(this_arg)) {
        return tsc_value_array(array_proto_generic_slice_array(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1)));
    }
    if (array_proto_is_empty_primitive_receiver(this_arg)) return array_proto_empty_array();
    return tsc_value_method_slice(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1));
}

static tsc_value_t array_prototype_fill(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "fill");
    array_proto_reject_string_mutation(this_arg, "fill");
    if (array_proto_is_empty_primitive_receiver(this_arg)) return this_arg;
    return tsc_value_method_fill(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1), array_proto_arg(args, 2));
}

static tsc_value_t array_prototype_copy_within(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "copyWithin");
    array_proto_reject_string_mutation(this_arg, "copyWithin");
    if (array_proto_is_empty_primitive_receiver(this_arg)) return this_arg;
    return tsc_value_method_copy_within(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1), array_proto_arg(args, 2));
}

static tsc_value_t array_prototype_splice(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "splice");
    array_proto_reject_string_mutation(this_arg, "splice");
    if (array_proto_is_empty_primitive_receiver(this_arg)) return array_proto_empty_array();
    int argc = args && args->len <= (size_t)INT_MAX ? (int)args->len : INT_MAX;
    return tsc_value_method_splice(
        this_arg,
        array_proto_arg(args, 0),
        array_proto_arg(args, 1),
        argc,
        array_proto_items(args, 2)
    );
}

static tsc_value_t array_prototype_sort(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "sort");
    if (array_proto_is_string_receiver(this_arg)) {
        tsc_throw_str(tsc_str_from_cstr("Array.prototype.sort cannot sort a string receiver"));
    }
    if (array_proto_is_empty_primitive_receiver(this_arg)) {
        tsc_value_t cmp = array_proto_arg(args, 0);
        if (!tsc_value_is_undefined(cmp) && !tsc_value_is_callable(cmp)) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.sort comparator must be callable"));
        }
        return this_arg;
    }
    return tsc_value_method_sort(this_arg, array_proto_arg(args, 0));
}

static tsc_value_t array_prototype_to_sorted(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "toSorted");
    if (array_proto_is_empty_primitive_receiver(this_arg)) {
        tsc_value_t cmp = array_proto_arg(args, 0);
        if (!tsc_value_is_undefined(cmp) && !tsc_value_is_callable(cmp)) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.sort comparator must be callable"));
        }
        return array_proto_empty_array();
    }
    return tsc_value_method_to_sorted(this_arg, array_proto_arg(args, 0));
}

static tsc_value_t array_prototype_with(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "with");
    if (array_proto_is_empty_primitive_receiver(this_arg)) {
        tsc_throw_str(tsc_str_from_cstr("Array.with index out of range"));
    }
    return tsc_value_method_with(this_arg, array_proto_arg(args, 0), array_proto_arg(args, 1));
}

static tsc_value_t array_prototype_to_spliced(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "toSpliced");
    if (array_proto_is_empty_primitive_receiver(this_arg)) return tsc_value_array(array_proto_items(args, 2));
    int argc = args && args->len <= (size_t)INT_MAX ? (int)args->len : INT_MAX;
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
    (void)env;
    array_prototype_require_receiver(this_arg, "flat");
    if (array_proto_is_empty_primitive_receiver(this_arg)) return array_proto_empty_array();
    return tsc_value_method_flat(this_arg, array_proto_arg(args, 0));
}

static tsc_value_t array_prototype_reverse(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    array_prototype_require_receiver(this_arg, "reverse");
    array_proto_reject_string_mutation(this_arg, "reverse");
    if (array_proto_is_empty_primitive_receiver(this_arg)) return this_arg;
    return tsc_value_method_reverse(this_arg);
}

static tsc_value_t array_prototype_to_reversed(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    array_prototype_require_receiver(this_arg, "toReversed");
    if (array_proto_is_string_receiver(this_arg)) {
        size_t len = array_proto_length(this_arg);
        tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), len ? len : 1);
        for (size_t i = len; i > 0; i--) {
            tsc_value_t value = array_proto_get_index(this_arg, i - 1);
            tsc_array_push_raw(out, &value);
        }
        return tsc_value_array(out);
    }
    if (array_proto_is_empty_primitive_receiver(this_arg)) return array_proto_empty_array();
    return tsc_value_method_to_reversed(this_arg);
}

static tsc_value_t array_prototype_for_each(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "forEach");
    tsc_value_t callback = array_proto_callback_arg(args, "Array.forEach callback must be callable");
    tsc_value_t callback_this = array_proto_callback_this(args);
    size_t len = array_proto_length(this_arg);
    for (size_t i = 0; i < len; i++) {
        if (!array_proto_has_index(this_arg, i)) continue;
        (void)array_proto_apply_callback(callback, callback_this, array_proto_get_index(this_arg, i), i, this_arg);
    }
    return tsc_value_undefined();
}

static tsc_value_t array_prototype_map(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "map");
    tsc_value_t callback = array_proto_callback_arg(args, "Array.map callback must be callable");
    tsc_value_t callback_this = array_proto_callback_this(args);
    size_t len = array_proto_length(this_arg);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), len ? len : 1);
    for (size_t i = 0; i < len; i++) {
        if (array_proto_has_index(this_arg, i)) {
            tsc_value_t mapped = array_proto_apply_callback(
                callback,
                callback_this,
                array_proto_get_index(this_arg, i),
                i,
                this_arg
            );
            tsc_array_push_value(out, mapped);
        } else {
            tsc_value_t hole = tsc_value_undefined();
            tsc_array_push_value(out, hole);
            tsc_array_mark_hole(out, i);
        }
    }
    return tsc_value_array(out);
}

static tsc_value_t array_prototype_flat_map(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "flatMap");
    tsc_value_t callback = array_proto_callback_arg(args, "Array.flatMap callback must be callable");
    tsc_value_t callback_this = array_proto_callback_this(args);
    size_t len = array_proto_length(this_arg);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), len ? len : 1);
    for (size_t i = 0; i < len; i++) {
        if (!array_proto_has_index(this_arg, i)) continue;
        tsc_value_t mapped = array_proto_apply_callback(callback, callback_this, array_proto_get_index(this_arg, i), i, this_arg);
        tsc_value_array_push_flat(out, mapped);
    }
    return tsc_value_array(out);
}

static tsc_value_t array_prototype_filter(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "filter");
    tsc_value_t callback = array_proto_callback_arg(args, "Array.filter callback must be callable");
    tsc_value_t callback_this = array_proto_callback_this(args);
    size_t len = array_proto_length(this_arg);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), len ? len : 1);
    for (size_t i = 0; i < len; i++) {
        if (!array_proto_has_index(this_arg, i)) continue;
        tsc_value_t value = array_proto_get_index(this_arg, i);
        if (tsc_value_is_truthy(array_proto_apply_callback(callback, callback_this, value, i, this_arg))) {
            tsc_array_push_value(out, value);
        }
    }
    return tsc_value_array(out);
}

static tsc_value_t array_prototype_some(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "some");
    tsc_value_t callback = array_proto_callback_arg(args, "Array.some callback must be callable");
    tsc_value_t callback_this = array_proto_callback_this(args);
    size_t len = array_proto_length(this_arg);
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
    array_prototype_require_receiver(this_arg, "every");
    tsc_value_t callback = array_proto_callback_arg(args, "Array.every callback must be callable");
    tsc_value_t callback_this = array_proto_callback_this(args);
    size_t len = array_proto_length(this_arg);
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
    array_prototype_require_receiver(this_arg, "find");
    tsc_value_t callback = array_proto_callback_arg(args, "Array.find callback must be callable");
    tsc_value_t callback_this = array_proto_callback_this(args);
    size_t len = array_proto_length(this_arg);
    for (size_t i = 0; i < len; i++) {
        tsc_value_t value = array_proto_get_index(this_arg, i);
        if (tsc_value_is_truthy(array_proto_apply_callback(callback, callback_this, value, i, this_arg))) {
            return value;
        }
    }
    return tsc_value_undefined();
}

static tsc_value_t array_prototype_find_index(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "findIndex");
    tsc_value_t callback = array_proto_callback_arg(args, "Array.findIndex callback must be callable");
    tsc_value_t callback_this = array_proto_callback_this(args);
    size_t len = array_proto_length(this_arg);
    for (size_t i = 0; i < len; i++) {
        if (tsc_value_is_truthy(array_proto_apply_callback(callback, callback_this, array_proto_get_index(this_arg, i), i, this_arg))) {
            return tsc_value_num((double)i);
        }
    }
    return tsc_value_num(-1.0);
}

static tsc_value_t array_prototype_find_last(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "findLast");
    tsc_value_t callback = array_proto_callback_arg(args, "Array.findLast callback must be callable");
    tsc_value_t callback_this = array_proto_callback_this(args);
    size_t len = array_proto_length(this_arg);
    for (size_t i = len; i-- > 0;) {
        tsc_value_t value = array_proto_get_index(this_arg, i);
        if (tsc_value_is_truthy(array_proto_apply_callback(callback, callback_this, value, i, this_arg))) {
            return value;
        }
    }
    return tsc_value_undefined();
}

static tsc_value_t array_prototype_find_last_index(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "findLastIndex");
    tsc_value_t callback = array_proto_callback_arg(args, "Array.findLastIndex callback must be callable");
    tsc_value_t callback_this = array_proto_callback_this(args);
    size_t len = array_proto_length(this_arg);
    for (size_t i = len; i-- > 0;) {
        if (tsc_value_is_truthy(array_proto_apply_callback(callback, callback_this, array_proto_get_index(this_arg, i), i, this_arg))) {
            return tsc_value_num((double)i);
        }
    }
    return tsc_value_num(-1.0);
}

static tsc_value_t array_prototype_reduce(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "reduce");
    tsc_value_t callback = array_proto_callback_arg(args, "Array.reduce callback must be callable");
    size_t len = array_proto_length(this_arg);
    tsc_value_t acc;
    size_t start = 0;
    if (args && args->len > 1) {
        acc = TSC_ARR(tsc_value_t, args, 1);
    } else {
        bool found = false;
        for (; start < len; start++) {
            if (!array_proto_has_index(this_arg, start)) continue;
            acc = array_proto_get_index(this_arg, start);
            start++;
            found = true;
            break;
        }
        if (!found) tsc_throw_str(tsc_str_from_cstr("Array.reduce: empty array with no initial value"));
    }
    for (size_t i = start; i < len; i++) {
        if (!array_proto_has_index(this_arg, i)) continue;
        tsc_value_t value = array_proto_get_index(this_arg, i);
        acc = tsc_value_apply_function(
            callback,
            tsc_value_undefined(),
            tsc_value_array(array_proto_reduce_callback_args(acc, value, i, this_arg))
        );
    }
    return acc;
}

static tsc_value_t array_prototype_reduce_right(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    array_prototype_require_receiver(this_arg, "reduceRight");
    tsc_value_t callback = array_proto_callback_arg(args, "Array.reduceRight callback must be callable");
    size_t len = array_proto_length(this_arg);
    tsc_value_t acc;
    size_t i = len;
    if (args && args->len > 1) {
        acc = TSC_ARR(tsc_value_t, args, 1);
    } else {
        bool found = false;
        while (i-- > 0) {
            if (!array_proto_has_index(this_arg, i)) continue;
            acc = array_proto_get_index(this_arg, i);
            found = true;
            break;
        }
        if (!found) tsc_throw_str(tsc_str_from_cstr("Array.reduceRight: empty array with no initial value"));
    }
    while (i-- > 0) {
        if (!array_proto_has_index(this_arg, i)) continue;
        tsc_value_t value = array_proto_get_index(this_arg, i);
        acc = tsc_value_apply_function(
            callback,
            tsc_value_undefined(),
            tsc_value_array(array_proto_reduce_callback_args(acc, value, i, this_arg))
        );
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
        proto->cap = 0;
        proto->es = sizeof(tsc_value_t);
        proto->extensible = true;
        proto->sealed = false;
        proto->frozen = false;
        /* Array.prototype is itself an Array exotic object with writable length. */
        proto->length_writable = true;
        proto->prototype = tsc_value_object_prototype();
        proto->iter_pos = 0;
        proto->iter_has_return = false;
        proto->iter_return_consumed = false;
        proto->iter_return = tsc_value_undefined();
        proto->is_lazy_generator = false;
        proto->state = 0;
        proto->env = NULL;
        proto->lazy_next = NULL;
        proto->lazy_close = NULL;
        proto->lazy_close_yielded = false;
        proto->lazy_close_value = tsc_value_undefined();
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
        (void)tsc_value_set_prop(
            tsc_array_constructor_value(),
            tsc_str_from_lit("prototype", 9),
            intrinsics->default_prototype
        );
        tsc_object_define(
            proto->props,
            tsc_str_from_lit("constructor", 11),
            tsc_array_constructor_value(),
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
    a->cap = initial_cap;
    a->es = elem_size;
    a->extensible = true;
    a->sealed = false;
    a->frozen = false;
    a->length_writable = true;
    a->prototype = tsc_array_default_prototype();
    a->iter_pos = 0;
    a->iter_has_return = false;
    a->iter_return_consumed = false;
    a->iter_return = tsc_value_undefined();
    a->is_lazy_generator = false;
    a->state = 0;
    a->env = NULL;
    a->lazy_next = NULL;
    a->lazy_close = NULL;
    a->lazy_close_yielded = false;
    a->lazy_close_value = tsc_value_undefined();
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
    a->cap = initial_cap;
    a->es = elem_size;
    a->extensible = true;
    a->sealed = false;
    a->frozen = false;
    a->length_writable = true;
    a->prototype = tsc_array_default_prototype();
    a->iter_pos = 0;
    a->iter_has_return = false;
    a->iter_return_consumed = false;
    a->iter_return = tsc_value_undefined();
    a->is_lazy_generator = false;
    a->state = 0;
    a->env = NULL;
    a->lazy_next = NULL;
    a->lazy_close = NULL;
    a->lazy_close_yielded = false;
    a->lazy_close_value = tsc_value_undefined();
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
    if (index >= a->len || !tsc_array_index_present(a, index)) {
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

tsc_array_t* tsc_array_from_buf(size_t elem_size, const void* src, size_t n) {
    tsc_array_t* a = tsc_array_new(elem_size, n > 0 ? n : 1);
    if (n > 0) memcpy(a->data, src, n * elem_size);
    a->len = n;
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
    if (!a->holes) return true;
    return !tsc_object_has_own(a->holes, tsc_str_from_int((int64_t)index));
}

void tsc_array_mark_hole(tsc_array_t* a, size_t index) {
    if (!a || index >= a->len) return;
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

void tsc_array_pop_raw(tsc_array_t* a) {
    if (a->len > 0) {
        tsc_array_clear_hole(a, a->len - 1);
        if (a->value_roots) a->value_roots[a->len - 1] = NULL;
        a->len--;
    }
}

void tsc_array_shift_raw(tsc_array_t* a) {
    if (a->len == 0) return;
    tsc_object_t* shifted_holes = NULL;
    if (a->holes && a->es == sizeof(tsc_value_t)) {
        shifted_holes = tsc_object_new();
        tsc_array_t* keys = tsc_object_own_keys_dyn(a->holes);
        for (size_t i = 0; i < keys->len; i++) {
            tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
            size_t index = 0;
            if (tsc_str_array_index(key, &index) && index > 0 && index < a->len) {
                (void)tsc_object_set(
                    shifted_holes,
                    tsc_str_from_int((int64_t)(index - 1)),
                    tsc_value_bool(true)
                );
            }
        }
    }
    memmove(a->data, (char*)a->data + a->es, (a->len - 1) * a->es);
    a->len--;
    a->holes = shifted_holes;
    array_refresh_value_roots(a, 0, a->len + 1);
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
    a->holes = shifted_holes;
    array_refresh_value_roots(a, 0, a->len);
}

tsc_array_t* tsc_array_reverse(tsc_array_t* a) {
    if (a->len < 2) return a;
    if (!a->extensible && a->holes) {
        for (size_t lower = 0; lower < a->len / 2; lower++) {
            size_t upper = a->len - lower - 1;
            bool lower_present = tsc_array_index_present(a, lower);
            bool upper_present = tsc_array_index_present(a, upper);
            if (!lower_present && upper_present) {
                tsc_throw_str(tsc_str_from_cstr("Array.prototype.reverse could not create lower array element"));
            }
            if (lower_present && !upper_present) {
                tsc_array_mark_hole(a, lower);
                tsc_throw_str(tsc_str_from_cstr("Array.prototype.reverse could not create upper array element"));
            }
        }
    }
    tsc_object_t* reversed_holes = NULL;
    if (a->holes) {
        reversed_holes = tsc_object_new();
        tsc_array_t* keys = tsc_object_own_keys_dyn(a->holes);
        for (size_t i = 0; i < keys->len; i++) {
            tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
            size_t index = 0;
            if (tsc_str_array_index(key, &index) && index < a->len) {
                tsc_str_t* reversed = tsc_str_from_int((int64_t)(a->len - index - 1));
                (void)tsc_object_set(reversed_holes, reversed, tsc_value_bool(true));
            }
        }
    }
    char* lo = (char*)a->data;
    char* hi = lo + (a->len - 1) * a->es;
    char tmp[256]; /* element size limit for stack swap; larger uses heap */
    char* swap = a->es <= sizeof(tmp) ? tmp : (char*)TSC_GC_MALLOC(a->es);
    while (lo < hi) {
        memcpy(swap, lo, a->es);
        memcpy(lo, hi, a->es);
        memcpy(hi, swap, a->es);
        lo += a->es;
        hi -= a->es;
    }
    if (a->holes) a->holes = reversed_holes;
    array_refresh_value_roots(a, 0, a->len);
    return a;
}

tsc_array_t* tsc_array_to_reversed(const tsc_array_t* a) {
    return tsc_array_reverse(tsc_array_slice(a, 0.0, (double)a->len));
}

int64_t array_strict_index(double value, int64_t len) {
    if (isnan(value)) value = 0.0;
    if (isinf(value)) tsc_throw_str(tsc_str_from_cstr("Array.with index out of range"));
    if (value < 0) value = (double)len + value;
    if (value < 0 || value >= (double)len) {
        tsc_throw_str(tsc_str_from_cstr("Array.with index out of range"));
    }
    return (int64_t)value;
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

static tsc_object_t* array_spliced_holes(
    const tsc_array_t* src,
    size_t start,
    size_t delete_count,
    const tsc_array_t* items
) {
    if (!src || src->es != sizeof(tsc_value_t) || (!src->holes && (!items || !items->holes))) return NULL;
    tsc_object_t* holes = tsc_object_new();
    size_t insert_len = items ? items->len : 0;
    size_t tail_start = start + delete_count;
    size_t tail_len = src->len - tail_start;
    if (src->holes) {
        for (size_t i = 0; i < start; i++) {
            if (!tsc_array_index_present(src, i)) {
                (void)tsc_object_set(holes, tsc_str_from_int((int64_t)i), tsc_value_bool(true));
            }
        }
        for (size_t i = 0; i < tail_len; i++) {
            if (!tsc_array_index_present(src, tail_start + i)) {
                (void)tsc_object_set(holes, tsc_str_from_int((int64_t)(start + insert_len + i)), tsc_value_bool(true));
            }
        }
    }
    if (items && items->holes) {
        for (size_t i = 0; i < insert_len; i++) {
            if (!tsc_array_index_present(items, i)) {
                (void)tsc_object_set(holes, tsc_str_from_int((int64_t)(start + i)), tsc_value_bool(true));
            }
        }
    }
    return holes;
}

tsc_array_t* tsc_array_with(const tsc_array_t* a, double index, const void* elem) {
    int64_t at = array_strict_index(index, (int64_t)a->len);
    tsc_array_t* copy = tsc_array_slice(a, 0.0, (double)a->len);
    tsc_array_store_raw(copy, (size_t)at, elem);
    tsc_array_clear_hole(copy, (size_t)at);
    return copy;
}

int64_t array_range_index(double value, int64_t len, double fallback) {
    double n = isnan(value) ? fallback : value;
    if (isnan(n)) n = 0.0;
    if (isinf(n)) return n < 0 ? 0 : len;
    if (n < 0) n = (double)len + n;
    if (n < 0) return 0;
    if (n >= (double)len) return len;
    return (int64_t)n;
}

tsc_array_t* tsc_array_splice(tsc_array_t* a, double start, double delete_count, int argc, const tsc_array_t* items) {
    int64_t len = (int64_t)a->len;
    int64_t at = argc <= 0 ? 0 : array_range_index(start, len, 0.0);
    int64_t del = 0;
    if (argc == 1) {
        del = len - at;
    } else if (argc >= 2) {
        double raw = isnan(delete_count) || delete_count < 0 ? 0.0 : delete_count;
        if (isinf(raw)) raw = raw < 0 ? 0.0 : (double)(len - at);
        del = (int64_t)raw;
        if (del > len - at) del = len - at;
    }

    size_t insert_len = items ? items->len : 0;
    if ((a->sealed || a->frozen) && (del > 0 || insert_len > 0)) {
        tsc_throw_str(tsc_str_from_cstr("Array.prototype.splice cannot mutate a sealed or frozen array"));
    }
    size_t old_len = a->len;
    size_t new_len = a->len - (size_t)del + insert_len;
    if (new_len > a->len && !a->length_writable) {
        tsc_throw_str(tsc_str_from_cstr("Array.prototype.splice could not move array-like element"));
    }
    if (new_len > a->len && !a->extensible) {
        tsc_throw_str(tsc_str_from_cstr("Array.prototype.splice could not move array-like element"));
    }

    tsc_object_t* next_holes = array_spliced_holes(a, (size_t)at, (size_t)del, items);
    tsc_array_t* removed = tsc_array_slice(a, (double)at, (double)(at + del));
    size_t tail_start = (size_t)(at + del);
    size_t tail_len = a->len - tail_start;
    tsc_array_reserve(a, new_len > 0 ? new_len : 1);
    if (insert_len != (size_t)del && tail_len > 0) {
        memmove(
            (char*)a->data + ((size_t)at + insert_len) * a->es,
            (char*)a->data + tail_start * a->es,
            tail_len * a->es
        );
    }
    if (insert_len > 0) {
        memcpy((char*)a->data + (size_t)at * a->es, items->data, insert_len * a->es);
    }
    a->holes = next_holes;
    if (!a->length_writable) {
        for (size_t i = new_len; i < old_len; i++) tsc_array_mark_hole(a, i);
        tsc_throw_str(tsc_str_from_cstr("Array.prototype.splice could not update array-like length"));
    }
    a->len = new_len;
    array_refresh_value_roots(a, 0, old_len > new_len ? old_len : new_len);
    return removed;
}

tsc_array_t* tsc_array_to_spliced(const tsc_array_t* a, double start, double delete_count, int argc, const tsc_array_t* items) {
    int64_t len = (int64_t)a->len;
    int64_t at = argc <= 0 ? 0 : array_range_index(start, len, 0.0);
    int64_t del = 0;
    if (argc == 1) {
        del = len - at;
    } else if (argc >= 2) {
        double raw = isnan(delete_count) || delete_count < 0 ? 0.0 : delete_count;
        if (isinf(raw)) raw = raw < 0 ? 0.0 : (double)(len - at);
        del = (int64_t)raw;
        if (del > len - at) del = len - at;
    }

    size_t insert_len = items ? items->len : 0;
    size_t new_len = a->len - (size_t)del + insert_len;
    tsc_array_t* out = tsc_array_new(a->es, new_len > 0 ? new_len : 1);
    out->box_element = a->box_element;
    out->unbox_element = a->unbox_element;
    if (at > 0) {
        memcpy(out->data, a->data, (size_t)at * a->es);
        out->len = (size_t)at;
    }
    if (insert_len > 0) {
        memcpy((char*)out->data + out->len * out->es, items->data, insert_len * out->es);
        out->len += insert_len;
    }
    size_t tail_start = (size_t)(at + del);
    size_t tail_len = a->len - tail_start;
    if (tail_len > 0) {
        memcpy((char*)out->data + out->len * out->es, (char*)a->data + tail_start * a->es, tail_len * a->es);
        out->len += tail_len;
    }
    out->holes = array_spliced_holes(a, (size_t)at, (size_t)del, items);
    array_refresh_value_roots(out, 0, out->len);
    return out;
}

tsc_array_t* tsc_array_fill(tsc_array_t* a, const void* elem, double start, double end) {
    int64_t len = (int64_t)a->len;
    int64_t i0 = array_range_index(start, len, 0.0);
    int64_t i1 = array_range_index(end, len, (double)len);
    if (i1 < i0) i1 = i0;
    for (int64_t i = i0; i < i1; i++) {
        if (!tsc_array_index_present(a, (size_t)i) && !a->extensible) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.fill could not create array element"));
        }
        tsc_array_store_raw(a, (size_t)i, elem);
        tsc_array_clear_hole(a, (size_t)i);
    }
    return a;
}

tsc_array_t* tsc_array_copy_within(tsc_array_t* a, double target, double start, double end) {
    int64_t len = (int64_t)a->len;
    int64_t to = array_range_index(target, len, 0.0);
    int64_t from = array_range_index(start, len, 0.0);
    int64_t final = array_range_index(end, len, (double)len);
    int64_t count = final - from;
    int64_t room = len - to;
    if (count > room) count = room;
    if (count > 0) {
        int64_t direction = 1;
        if (from < to && to < from + count) {
            direction = -1;
            from += count - 1;
            to += count - 1;
        }
        for (int64_t i = 0; i < count; i++, from += direction, to += direction) {
            size_t source = (size_t)from;
            size_t target = (size_t)to;
            if (tsc_array_index_present(a, source)) {
                if (!tsc_array_index_present(a, target) && !a->extensible) {
                    tsc_throw_str(tsc_str_from_cstr("Array.prototype.copyWithin could not create array element"));
                }
                memmove((char*)a->data + target * a->es, (char*)a->data + source * a->es, a->es);
                tsc_array_clear_hole(a, target);
                array_refresh_value_root(a, target);
            } else {
                if (tsc_array_index_present(a, target) && (a->sealed || a->frozen)) {
                    tsc_throw_str(tsc_str_from_cstr("Array.prototype.copyWithin could not delete array element"));
                }
                tsc_array_mark_hole(a, target);
            }
        }
    }
    return a;
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
    if (n > 0) memcpy(r->data, (char*)a->data + (size_t)i0 * a->es, n * a->es);
    r->len = n;
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
    array_copy_holes_range(src, 0, dst, source_offset, src->len);
    array_refresh_value_roots(dst, source_offset, src->len);
    return dst;
}

tsc_array_t* tsc_array_flat_once(const tsc_array_t* outer, size_t elem_size) {
    tsc_array_t* dst = tsc_array_new(elem_size, outer->len);
    for (size_t i = 0; i < outer->len; i++) {
        if (!tsc_array_index_present(outer, i)) continue;
        tsc_array_t* inner = TSC_ARR(tsc_array_t*, outer, i);
        if (!inner) continue;
        for (size_t j = 0; j < inner->len; j++) {
            if (!tsc_array_index_present(inner, j)) continue;
            tsc_array_push_raw(dst, (const char*)inner->data + j * inner->es);
        }
    }
    return dst;
}

double tsc_array_length(const tsc_array_t* a) {
    tsc_array_materialize_all((tsc_array_t*)a);
    return (double)a->len;
}

void tsc_array_oob(const tsc_array_t* a, double i) { (void)a; (void)i; }

void tsc_array_materialize_all(tsc_array_t* a) {
    if (a && a->is_lazy_generator && a->lazy_next) {
        while (true) {
            bool done = false;
            a->lazy_next(a, &a->state, a->env, tsc_value_undefined(), &done);
            if (done) break;
        }
        a->is_lazy_generator = false;
    }
}
