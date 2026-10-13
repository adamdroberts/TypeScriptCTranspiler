#include "tsc_internal.h"

typedef struct {
    tsc_object_t *ordinary, *namespace_object, *types;
    tsc_value_t format;
    void* format_root;
} util_realm_t;
static const char util_realm_key;
static util_realm_t* util_realm(void) {
    util_realm_t* state = tsc_realm_state_get(&util_realm_key);
    if (!state) {
        state = TSC_GC_MALLOC(sizeof(*state));
        memset(state, 0, sizeof(*state));
        tsc_realm_state_set(&util_realm_key, state);
    }
    return state;
}
static tsc_str_t* util_key(const char* name) { return tsc_str_from_cstr(name); }
static tsc_value_t util_format_apply(void* environment, tsc_value_t receiver, tsc_array_t* args) {
    (void)environment; (void)receiver;
    return tsc_value_string(tsc_util_format_values(args));
}
static tsc_value_t util_format_value(void) {
    util_realm_t* state = util_realm();
    if (!state->format_root) {
        state->format = tsc_value_function_builtin_named(util_format_apply, NULL, 1, util_key("format"));
        state->format_root = tsc_value_gc_root(state->format);
    }
    return state->format;
}
static const struct { const char* name; bool (*test)(tsc_value_t); } util_type_tests[] = {
#define TSC_UTIL_EXPORT(name, value)
#define TSC_UTIL_TYPE_TEST(name, test) { #name, test },
#include "tsc_util_exports.def"
#undef TSC_UTIL_TYPE_TEST
#undef TSC_UTIL_EXPORT
};
static tsc_value_t util_type_apply(void* environment, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;
    size_t index = (size_t)(uintptr_t)environment;
    tsc_value_t value = args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    return tsc_value_bool(util_type_tests[index].test(value));
}
static tsc_value_t util_types_value(void) {
    util_realm_t* state = util_realm();
    if (!state->types) {
        state->types = tsc_object_new();
        for (size_t index = 0; index < sizeof(util_type_tests) / sizeof(*util_type_tests); ++index) {
            tsc_str_t* name = util_key(util_type_tests[index].name);
            tsc_value_t value = tsc_value_function_builtin_named(util_type_apply, (void*)(uintptr_t)index, 1, name);
            void* volatile root = tsc_value_gc_root(value);
            tsc_object_define(state->types, name, value, true, true, true);
            (void)root;
        }
    }
    return tsc_value_object(state->types);
}
static tsc_value_t util_default(void* environment, tsc_value_t receiver) {
    (void)environment; (void)receiver; return tsc_util_module_value(false);
}
#define TSC_UTIL_TYPE_TEST(name, test)
#define TSC_UTIL_EXPORT(name, value) \
    static tsc_value_t util_export_##name(void* environment, tsc_value_t receiver) { \
        (void)environment; (void)receiver; return value(); \
    }
#include "tsc_util_exports.def"
#undef TSC_UTIL_EXPORT
#undef TSC_UTIL_TYPE_TEST
static const struct { const char* name; tsc_accessor_getter_t getter; } util_exports[] = {
#define TSC_UTIL_TYPE_TEST(name, test)
#define TSC_UTIL_EXPORT(name, value) { #name, util_export_##name },
#include "tsc_util_exports.def"
#undef TSC_UTIL_EXPORT
#undef TSC_UTIL_TYPE_TEST
};
tsc_value_t tsc_util_module_value(bool namespace_object) {
    util_realm_t* state = util_realm();
    if (!state->ordinary) {
        state->ordinary = tsc_object_new();
        state->namespace_object = tsc_module_namespace_new();
        for (size_t index = 0; index < sizeof(util_exports) / sizeof(*util_exports); ++index) {
            tsc_str_t* name = util_key(util_exports[index].name);
            tsc_value_t value = util_exports[index].getter(NULL, tsc_value_undefined());
            void* volatile root = tsc_value_gc_root(value);
            tsc_object_define(state->ordinary, name, value, true, true, true);
            (void)tsc_module_namespace_define(state->namespace_object, name, util_exports[index].getter);
            (void)root;
        }
        (void)tsc_module_namespace_define(state->namespace_object, util_key("default"), util_default);
        tsc_module_namespace_finalize(state->namespace_object);
    }
    return tsc_value_object(namespace_object ? state->namespace_object : state->ordinary);
}
tsc_value_t tsc_util_export_value(tsc_str_t* name) {
    return tsc_value_get_prop(tsc_util_module_value(true), name);
}
