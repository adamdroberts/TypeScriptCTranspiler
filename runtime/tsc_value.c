#include "tsc_internal.h"

double g_event_emitter_default_max_listeners = 10.0;
tsc_value_t tsc_value_undefined(void) { return value_box(TSC_VALUE_TAG_UNDEFINED, 0); }
tsc_value_t tsc_value_null(void) { return value_box(TSC_VALUE_TAG_NULL, 0); }
tsc_value_t tsc_value_bool(bool b) { return value_box(b ? TSC_VALUE_TAG_TRUE : TSC_VALUE_TAG_FALSE, 0); }

tsc_value_t tsc_value_num(double n) {
    tsc_value_t v;
    memcpy(&v, &n, sizeof v);
    return v;
}

tsc_value_t tsc_value_string(tsc_str_t* s) { return value_box(TSC_VALUE_TAG_STRING, (uintptr_t)s); }
tsc_value_t tsc_value_bigint(tsc_bigint_t* value) { return value_box(TSC_VALUE_TAG_BIGINT, (uintptr_t)value); }
tsc_value_t tsc_value_symbol(tsc_symbol_t* value) { return value_box(TSC_VALUE_TAG_SYMBOL, (uintptr_t)value); }
tsc_object_t* tsc_object_new_class(void* ptr) {
    tsc_object_t* o = tsc_object_new();
    o->class_ptr = ptr;
    return o;
}

tsc_value_t tsc_value_class(void* ptr) {
    if (!ptr) return tsc_value_null();
    return tsc_value_object(tsc_object_new_class(ptr));
}

bool tsc_value_is_nullish(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    tsc_value_tag_t tag = value_tag(v);
    return tag == TSC_VALUE_TAG_UNDEFINED || tag == TSC_VALUE_TAG_NULL;
}

bool tsc_value_is_undefined(tsc_value_t v) {
    return value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_UNDEFINED;
}

static bool value_proxy_chain_is_array(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    if (value_tag(v) == TSC_VALUE_TAG_ARRAY) return true;
    if (value_tag(v) != TSC_VALUE_TAG_OBJECT) return false;
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    return o && o->is_proxy && value_proxy_chain_is_array(o->proxy_target);
}

static tsc_str_t* value_known_symbol_internal_key(tsc_symbol_t* key);

static tsc_str_t* value_object_to_string_tag_override(tsc_value_t v) {
    if (!value_is_box(v)) return NULL;
    tsc_value_tag_t tag = value_tag(v);
    if (
        tag != TSC_VALUE_TAG_OBJECT &&
        tag != TSC_VALUE_TAG_ARRAY &&
        tag != TSC_VALUE_TAG_FUNCTION
    ) {
        return NULL;
    }
    tsc_value_t custom_tag = tsc_value_get_prop(
        v,
        value_known_symbol_internal_key(tsc_symbol_to_string_tag())
    );
    if (value_is_box(custom_tag) && value_tag(custom_tag) == TSC_VALUE_TAG_STRING) {
        tsc_str_t* text = (tsc_str_t*)value_ptr(custom_tag);
        return tsc_str_concat(
            tsc_str_concat(tsc_str_from_lit("[object ", 8), text),
            tsc_str_from_lit("]", 1)
        );
    }
    return NULL;
}

tsc_str_t* tsc_value_object_to_string_tag(tsc_value_t v) {
    if (!value_is_box(v)) return tsc_str_from_lit("[object Number]", 15);
    tsc_str_t* custom_tag = value_object_to_string_tag_override(v);
    if (custom_tag) return custom_tag;
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_FUNCTION: return tsc_str_from_lit("[object Function]", 17);
        case TSC_VALUE_TAG_UNDEFINED: return tsc_str_from_lit("[object Undefined]", 18);
        case TSC_VALUE_TAG_NULL: return tsc_str_from_lit("[object Null]", 13);
        case TSC_VALUE_TAG_FALSE:
        case TSC_VALUE_TAG_TRUE: return tsc_str_from_lit("[object Boolean]", 16);
        case TSC_VALUE_TAG_STRING: return tsc_str_from_lit("[object String]", 15);
        case TSC_VALUE_TAG_BIGINT: return tsc_str_from_lit("[object BigInt]", 15);
        case TSC_VALUE_TAG_SYMBOL: return tsc_str_from_lit("[object Symbol]", 15);
        case TSC_VALUE_TAG_ARRAY: return tsc_str_from_lit("[object Array]", 14);
        case TSC_VALUE_TAG_OBJECT: {
            tsc_object_t* o = (tsc_object_t*)value_ptr(v);
            if (o && o->is_proxy && tsc_proxy_chain_has_revoked(v)) {
                tsc_throw_str(tsc_str_from_cstr("Cannot perform 'get' on a proxy that has been revoked"));
            }
            if (tsc_proxy_trap_is_callable(v)) return tsc_str_from_lit("[object Function]", 17);
            if (value_proxy_chain_is_array(v)) return tsc_str_from_lit("[object Array]", 14);
            if (o && o->has_primitive_value) {
                if (o->primitive_kind == TSC_PRIMITIVE_BOOLEAN) return tsc_str_from_lit("[object Boolean]", 16);
                if (o->primitive_kind == TSC_PRIMITIVE_NUMBER) return tsc_str_from_lit("[object Number]", 15);
                if (o->primitive_kind == TSC_PRIMITIVE_STRING) return tsc_str_from_lit("[object String]", 15);
                if (o->primitive_kind == TSC_PRIMITIVE_BIGINT) return tsc_str_from_lit("[object BigInt]", 15);
                if (o->primitive_kind == TSC_PRIMITIVE_SYMBOL) return tsc_str_from_lit("[object Symbol]", 15);
            }
            if (o && o->is_date) return tsc_str_from_lit("[object Date]", 13);
            if (o && o->is_error) return tsc_str_from_lit("[object Error]", 14);
            if (o && o->is_arguments) return tsc_str_from_lit("[object Arguments]", 18);
            return tsc_str_from_lit("[object Object]", 15);
        }
    }
    return tsc_str_from_lit("[object Object]", 15);
}

bool tsc_value_is_array(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    if (value_tag(v) == TSC_VALUE_TAG_ARRAY) return true;
    if (value_tag(v) != TSC_VALUE_TAG_OBJECT) return false;
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    if (!o || !o->is_proxy) return false;
    if (o->proxy_revoked) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Array.isArray cannot be called on a Proxy that has been revoked")
        );
    }
    return tsc_value_is_array(o->proxy_target);
}

bool tsc_value_is_object(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    tsc_value_tag_t tag = value_tag(v);
    return tag == TSC_VALUE_TAG_OBJECT ||
        tag == TSC_VALUE_TAG_ARRAY ||
        tag == TSC_VALUE_TAG_FUNCTION;
}

void* tsc_value_as_class(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_NULL) return NULL;
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        if (o->class_ptr) return o->class_ptr;
    }
    tsc_panic("value is not a class instance");
    return NULL;
}

static tsc_value_t tsc_value_function_named_kind(
    tsc_generic_function_t fn,
    tsc_generic_function_t construct,
    void* env,
    double length,
    tsc_str_t* name,
    tsc_function_identity_kind_t kind
) {
    if (!name) name = tsc_str_from_lit("", 0);
    tsc_realm_t* realm = tsc_realm_current();
    for (tsc_function_identity_t* cur = g_function_identities; cur; cur = cur->next) {
        if (
            cur->kind == kind &&
            cur->realm == realm &&
            cur->code.generic == fn &&
            cur->construct == construct &&
            cur->env == env
        ) {
            if (length > cur->length) {
                cur->length = length;
                (void)tsc_object_define_desc(cur->props, tsc_str_from_lit("length", 6), tsc_value_num(length), true, false, false, false, false, false, false);
            }
            if ((!cur->name || cur->name->len == 0) && name->len > 0) {
                cur->name = name;
                (void)tsc_object_define_desc(cur->props, tsc_str_from_lit("name", 4), tsc_value_string(name), true, false, false, false, false, false, false);
            }
            return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)cur);
        }
    }
    tsc_function_identity_t* id = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
    id->kind = kind;
    id->realm = realm;
    id->construct_default_prototype = TSC_INTRINSIC_DEFAULT_OBJECT_PROTOTYPE;
    id->extensible = true;
    id->sealed = false;
    id->frozen = false;
    id->func_prototype_writable = true;
    tsc_function_identity_set_prototype(id, tsc_function_default_prototype());
    tsc_function_identity_set_own_prototype(id, tsc_value_undefined());
    id->func_prototype_initialized = false;
    id->construct = construct;
    tsc_function_init_metadata(id, length, name);
    id->code.generic = fn;
    id->env = env;
    id->next = g_function_identities;
    g_function_identities = id;
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)id);
}

tsc_value_t tsc_value_function_generic(tsc_generic_function_t fn, void* env) {
    return tsc_value_function_generic_arity(fn, env, 0.0);
}

tsc_value_t tsc_value_function_generic_arity(tsc_generic_function_t fn, void* env, double length) {
    return tsc_value_function_generic_named(fn, env, length, tsc_str_from_lit("", 0));
}

tsc_value_t tsc_value_function_generic_named(tsc_generic_function_t fn, void* env, double length, tsc_str_t* name) {
    return tsc_value_function_named_kind(fn, NULL, env, length, name, TSC_FUNCTION_IDENTITY_GENERIC);
}

static tsc_value_t tsc_value_class_call_failure(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    (void)args;
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Class constructor cannot be invoked without 'new'"));
    return tsc_value_undefined();
}

tsc_value_t tsc_value_function_class_named(
    tsc_generic_function_t construct,
    void* env,
    double length,
    tsc_str_t* name
) {
    return tsc_value_function_named_kind(
        tsc_value_class_call_failure,
        construct,
        env,
        length,
        name,
        TSC_FUNCTION_IDENTITY_BUILTIN
    );
}

tsc_value_t tsc_value_function_closure_named(tsc_generic_function_t fn, void* env, double length, tsc_str_t* name) {
    return tsc_value_function_named_kind(fn, NULL, env, length, name, TSC_FUNCTION_IDENTITY_CLOSURE);
}

tsc_value_t tsc_value_function_builtin_named(tsc_generic_function_t fn, void* env, double length, tsc_str_t* name) {
    return tsc_value_function_named_kind(fn, NULL, env, length, name, TSC_FUNCTION_IDENTITY_BUILTIN);
}

static tsc_array_t* bound_function_arguments(
    const tsc_bound_function_env_t* bound,
    const tsc_array_t* call_args
) {
    const size_t bound_length = bound && bound->bound_args ? bound->bound_args->len : 0;
    const size_t call_length = call_args ? call_args->len : 0;
    tsc_array_t* arguments = tsc_array_new(
        sizeof(tsc_value_t),
        bound_length + call_length ? bound_length + call_length : 1
    );
    for (size_t i = 0; i < bound_length; i++) {
        tsc_array_push_value(arguments, TSC_ARR(tsc_value_t, bound->bound_args, i));
    }
    for (size_t i = 0; i < call_length; i++) {
        tsc_array_push_value(arguments, TSC_ARR(tsc_value_t, call_args, i));
    }
    return arguments;
}

static tsc_value_t bound_function_apply(void* raw_env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_bound_function_env_t* bound = (tsc_bound_function_env_t*)raw_env;
    return tsc_value_apply_function(
        bound->target,
        bound->bound_this,
        tsc_value_array(bound_function_arguments(bound, args))
    );
}

static tsc_realm_t* tsc_value_function_realm(tsc_value_t function) {
    /* Bound functions and callable proxies form a canonical target chain.
     * Neither can be retargeted after creation, so following that chain is
     * cardinality-independent and cannot manufacture a cycle. */
    for (;;) {
        if (value_is_box(function) && value_tag(function) == TSC_VALUE_TAG_FUNCTION) {
            tsc_function_identity_t* identity =
                (tsc_function_identity_t*)value_ptr(function);
            if (identity && identity->kind == TSC_FUNCTION_IDENTITY_BOUND) {
                tsc_bound_function_env_t* bound =
                    (tsc_bound_function_env_t*)identity->env;
                if (bound) {
                    function = bound->target;
                    continue;
                }
            }
            return identity && identity->realm
                ? identity->realm
                : tsc_realm_current();
        }
        if (value_is_box(function) && value_tag(function) == TSC_VALUE_TAG_OBJECT) {
            tsc_object_t* object = (tsc_object_t*)value_ptr(function);
            if (object && object->is_proxy) {
                if (object->proxy_revoked) {
                    tsc_throw_error(
                        TSC_ERROR_TYPE,
                        tsc_str_from_cstr("Cannot determine Realm of a revoked Proxy")
                    );
                }
                function = object->proxy_target;
                continue;
            }
        }
        return tsc_realm_current();
    }
}

tsc_value_t tsc_value_bind_function(
    tsc_value_t target,
    tsc_value_t bound_this,
    tsc_array_t* bound_args
) {
    if (!tsc_value_is_callable(target)) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Function.prototype.bind called on non-callable value")
        );
    }

    tsc_bound_function_env_t* bound =
        (tsc_bound_function_env_t*)TSC_GC_MALLOC(sizeof(tsc_bound_function_env_t));
    bound->target = target;
    bound->target_keepalive = value_is_box(target) ? value_ptr(target) : NULL;
    bound->bound_this = bound_this;
    bound->bound_this_keepalive = value_is_box(bound_this) ? value_ptr(bound_this) : NULL;
    const size_t bound_length = bound_args ? bound_args->len : 0;
    bound->bound_args = tsc_array_new(sizeof(tsc_value_t), bound_length ? bound_length : 1);
    bound->bound_arg_keepalives = bound_length > 0
        ? (void**)TSC_GC_MALLOC(sizeof(void*) * bound_length)
        : NULL;
    for (size_t i = 0; i < bound_length; i++) {
        tsc_value_t value = TSC_ARR(tsc_value_t, bound_args, i);
        tsc_array_push_value(bound->bound_args, value);
        bound->bound_arg_keepalives[i] = value_is_box(value) ? value_ptr(value) : NULL;
    }

    double length = 0.0;
    tsc_value_t target_length = tsc_value_get_prop(target, tsc_str_from_lit("length", 6));
    if (!value_is_box(target_length)) {
        double numeric_length = tsc_value_as_num(target_length);
        if (isinf(numeric_length) && numeric_length > 0.0) {
            length = INFINITY;
        } else if (isfinite(numeric_length) && numeric_length > 0.0) {
            length = fmax(trunc(numeric_length) - (double)bound_length, 0.0);
        }
    }

    tsc_value_t target_name = tsc_value_get_prop(target, tsc_str_from_lit("name", 4));
    tsc_str_t* name = value_is_box(target_name) && value_tag(target_name) == TSC_VALUE_TAG_STRING
        ? (tsc_str_t*)value_ptr(target_name)
        : tsc_str_from_lit("", 0);
    name = tsc_str_concat(tsc_str_from_lit("bound ", 6), name);

    tsc_value_t result = tsc_value_function_named_kind(
        bound_function_apply,
        NULL,
        bound,
        length,
        name,
        TSC_FUNCTION_IDENTITY_BOUND
    );
    tsc_function_identity_t* identity = (tsc_function_identity_t*)value_ptr(result);
    identity->realm = tsc_value_function_realm(target);
    tsc_function_identity_set_prototype(identity, tsc_value_get_prototype_of(target));
    return result;
}

typedef struct {
    tsc_error_kind_t kind;
    const char* name;
    size_t name_len;
    double length;
    tsc_object_t* prototype;
    tsc_value_t constructor;
} tsc_error_intrinsic_t;

static const tsc_error_intrinsic_t error_intrinsic_templates[TSC_ERROR_KIND_COUNT] = {
    { TSC_ERROR_ERROR, "Error", 5, 1.0, NULL, 0 },
    { TSC_ERROR_TYPE, "TypeError", 9, 1.0, NULL, 0 },
    { TSC_ERROR_RANGE, "RangeError", 10, 1.0, NULL, 0 },
    { TSC_ERROR_SYNTAX, "SyntaxError", 11, 1.0, NULL, 0 },
    { TSC_ERROR_REFERENCE, "ReferenceError", 14, 1.0, NULL, 0 },
    { TSC_ERROR_EVAL, "EvalError", 9, 1.0, NULL, 0 },
    { TSC_ERROR_URI, "URIError", 8, 1.0, NULL, 0 },
    { TSC_ERROR_AGGREGATE, "AggregateError", 14, 2.0, NULL, 0 },
    { TSC_ERROR_SUPPRESSED, "SuppressedError", 15, 3.0, NULL, 0 },
};

typedef struct {
    int initialization_state;
    tsc_error_intrinsic_t intrinsics[TSC_ERROR_KIND_COUNT];
} tsc_error_intrinsics_state_t;

static const char error_intrinsics_realm_state_key = 0;

static tsc_value_t error_constructor_apply(void* env, tsc_value_t this_arg, tsc_array_t* args);
static tsc_value_t error_constructor_construct(void* env, tsc_value_t receiver, tsc_array_t* args);

static tsc_error_intrinsics_state_t* error_intrinsics_for_current_realm(void) {
    tsc_error_intrinsics_state_t* state =
        (tsc_error_intrinsics_state_t*)tsc_realm_state_get(
            &error_intrinsics_realm_state_key
        );
    if (state) return state;
    tsc_runtime_lock();
    state = (tsc_error_intrinsics_state_t*)tsc_realm_state_get(
        &error_intrinsics_realm_state_key
    );
    if (!state) {
        state = (tsc_error_intrinsics_state_t*)TSC_GC_MALLOC(sizeof(*state));
        memset(state, 0, sizeof(*state));
        memcpy(
            state->intrinsics,
            error_intrinsic_templates,
            sizeof(error_intrinsic_templates)
        );
        tsc_realm_state_set(&error_intrinsics_realm_state_key, state);
    }
    tsc_runtime_unlock();
    return state;
}

static tsc_error_intrinsic_t* error_intrinsic(tsc_error_kind_t kind) {
    if (kind < TSC_ERROR_ERROR || kind >= TSC_ERROR_KIND_COUNT) {
        kind = TSC_ERROR_ERROR;
    }
    return &error_intrinsics_for_current_realm()->intrinsics[(size_t)kind];
}

static bool error_name_matches(const tsc_str_t* name, const tsc_error_intrinsic_t* intrinsic) {
    return name && name->len == intrinsic->name_len &&
        memcmp(name->data, intrinsic->name, intrinsic->name_len) == 0;
}

static tsc_error_kind_t error_kind_from_name(const tsc_str_t* name) {
    for (size_t i = 0; i < TSC_ERROR_KIND_COUNT; i++) {
        if (error_name_matches(name, &error_intrinsic_templates[i])) {
            return error_intrinsic_templates[i].kind;
        }
    }
    return TSC_ERROR_ERROR;
}

static tsc_value_t error_prototype_to_string(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    if (!tsc_value_is_object(this_arg)) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_lit("Error.prototype.toString called on non-object", 45)
        );
    }
    tsc_value_t name_value = tsc_value_get_prop(this_arg, tsc_str_from_lit("name", 4));
    tsc_value_t message_value = tsc_value_get_prop(this_arg, tsc_str_from_lit("message", 7));
    tsc_str_t* name = tsc_value_is_undefined(name_value)
        ? tsc_str_from_lit("Error", 5)
        : tsc_value_to_string(name_value);
    tsc_str_t* message = tsc_value_is_undefined(message_value)
        ? tsc_str_from_lit("", 0)
        : tsc_value_to_string(message_value);
    if (name->len == 0) return tsc_value_string(message);
    if (message->len == 0) return tsc_value_string(name);
    return tsc_value_string(tsc_str_concat_n(
        3,
        name,
        tsc_str_from_lit(": ", 2),
        message
    ));
}

static void error_intrinsics_initialize(void) {
    tsc_error_intrinsics_state_t* state = error_intrinsics_for_current_realm();
    if (state->initialization_state == 2) return;
    tsc_runtime_lock();
    if (state->initialization_state == 0) {
        state->initialization_state = 1;
        tsc_error_intrinsic_t* error_intrinsics = state->intrinsics;
        for (size_t i = 0; i < TSC_ERROR_KIND_COUNT; i++) {
            error_intrinsics[i].prototype = tsc_object_new();
        }
        for (size_t i = 1; i < TSC_ERROR_KIND_COUNT; i++) {
            error_intrinsics[i].prototype->prototype =
                tsc_value_object(error_intrinsics[TSC_ERROR_ERROR].prototype);
        }
        for (size_t i = 0; i < TSC_ERROR_KIND_COUNT; i++) {
            tsc_error_intrinsic_t* intrinsic = &error_intrinsics[i];
            tsc_object_define(
                intrinsic->prototype,
                tsc_str_from_lit("name", 4),
                tsc_value_string(tsc_str_from_lit(intrinsic->name, intrinsic->name_len)),
                true,
                false,
                true
            );
        }
        tsc_object_define(
            error_intrinsics[TSC_ERROR_ERROR].prototype,
            tsc_str_from_lit("message", 7),
            tsc_value_string(tsc_str_from_lit("", 0)),
            true,
            false,
            true
        );
        tsc_object_define(
            error_intrinsics[TSC_ERROR_ERROR].prototype,
            tsc_str_from_lit("toString", 8),
            tsc_value_function_builtin_named(
                error_prototype_to_string,
                NULL,
                0.0,
                tsc_str_from_lit("toString", 8)
            ),
            true,
            false,
            true
        );
        for (size_t i = 0; i < TSC_ERROR_KIND_COUNT; i++) {
            tsc_error_intrinsic_t* intrinsic = &error_intrinsics[i];
            intrinsic->constructor = tsc_value_function_named_kind(
                error_constructor_apply,
                error_constructor_construct,
                intrinsic,
                intrinsic->length,
                tsc_str_from_lit(intrinsic->name, intrinsic->name_len),
                TSC_FUNCTION_IDENTITY_BUILTIN
            );
            tsc_function_identity_t* identity =
                (tsc_function_identity_t*)value_ptr(intrinsic->constructor);
            identity->construct_default_prototype =
                (tsc_intrinsic_default_prototype_kind_t)(
                    TSC_INTRINSIC_DEFAULT_ERROR_PROTOTYPE + intrinsic->kind
                );
            tsc_function_identity_set_own_prototype(
                identity,
                tsc_value_object(intrinsic->prototype)
            );
            tsc_object_define(
                intrinsic->prototype,
                tsc_str_from_lit("constructor", 11),
                intrinsic->constructor,
                true,
                false,
                true
            );
        }
        state->initialization_state = 2;
    }
    tsc_runtime_unlock();
}

static bool error_cause_from_options(tsc_array_t* args, size_t index, tsc_value_t* cause) {
    if (!args || index >= args->len) return false;
    tsc_value_t options = TSC_ARR(tsc_value_t, args, index);
    if (!tsc_value_is_object(options)) return false;
    tsc_str_t* key = tsc_str_from_lit("cause", 5);
    if (!tsc_value_has_prop(options, key)) return false;
    *cause = tsc_value_get_prop(options, key);
    return true;
}

static tsc_str_t* error_message_argument(tsc_array_t* args, size_t index) {
    if (!args || index >= args->len) return tsc_str_from_lit("", 0);
    tsc_value_t value = TSC_ARR(tsc_value_t, args, index);
    return tsc_value_is_undefined(value)
        ? tsc_str_from_lit("", 0)
        : tsc_value_to_string(value);
}

static tsc_value_t error_constructor_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_error_intrinsic_t* intrinsic = (tsc_error_intrinsic_t*)env;
    tsc_error_t* error;
    if (intrinsic->kind == TSC_ERROR_AGGREGATE) {
        if (!args || args->len == 0) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_lit("AggregateError errors is not iterable", 37));
        }
        tsc_array_t* errors = tsc_value_collection_constructor_values(
            TSC_ARR(tsc_value_t, args, 0)
        );
        error = tsc_aggregate_error_new(errors, error_message_argument(args, 1));
        tsc_value_t cause;
        if (error_cause_from_options(args, 2, &cause)) error->cause = cause;
    } else if (intrinsic->kind == TSC_ERROR_SUPPRESSED) {
        tsc_value_t primary = args && args->len > 0
            ? TSC_ARR(tsc_value_t, args, 0)
            : tsc_value_undefined();
        tsc_value_t suppressed = args && args->len > 1
            ? TSC_ARR(tsc_value_t, args, 1)
            : tsc_value_undefined();
        error = tsc_suppressed_error_new(
            primary,
            suppressed,
            error_message_argument(args, 2)
        );
    } else {
        error = tsc_error_new_named(
            tsc_str_from_lit(intrinsic->name, intrinsic->name_len),
            error_message_argument(args, 0)
        );
        tsc_value_t cause;
        if (error_cause_from_options(args, 1, &cause)) error->cause = cause;
    }
    return tsc_value_error(error);
}

static tsc_value_t error_constructor_construct(void* env, tsc_value_t receiver, tsc_array_t* args) {
    tsc_value_t result = error_constructor_apply(env, tsc_value_undefined(), args);
    tsc_value_t prototype = tsc_value_get_prototype_of(receiver);
    if (!tsc_value_set_prototype_of(result, prototype)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_lit("Error constructor could not set prototype", 41));
    }
    return result;
}

tsc_value_t tsc_error_constructor_value(tsc_error_kind_t kind) {
    error_intrinsics_initialize();
    return error_intrinsic(kind)->constructor;
}

_Noreturn void tsc_throw_error(tsc_error_kind_t kind, tsc_str_t* message) {
    tsc_error_intrinsic_t* intrinsic = error_intrinsic(kind);
    tsc_throw_value(tsc_value_error(tsc_error_new_named(
        tsc_str_from_lit(intrinsic->name, intrinsic->name_len),
        message
    )));
}

typedef struct {
    tsc_primitive_kind_t kind;
    const char* name;
    size_t name_len;
    tsc_object_t* prototype;
    tsc_value_t constructor;
    bool constructor_initialized;
} tsc_primitive_descriptor_t;

static const tsc_primitive_descriptor_t primitive_descriptor_templates[] = {
    { TSC_PRIMITIVE_BOOLEAN, "Boolean", 7, NULL, 0, false },
    { TSC_PRIMITIVE_NUMBER, "Number", 6, NULL, 0, false },
    { TSC_PRIMITIVE_STRING, "String", 6, NULL, 0, false },
    { TSC_PRIMITIVE_BIGINT, "BigInt", 6, NULL, 0, false },
    { TSC_PRIMITIVE_SYMBOL, "Symbol", 6, NULL, 0, false },
};

typedef struct {
    tsc_primitive_descriptor_t descriptors[
        sizeof(primitive_descriptor_templates) / sizeof(primitive_descriptor_templates[0])
    ];
} tsc_primitive_intrinsics_state_t;

static const char primitive_intrinsics_realm_state_key = 0;

static tsc_primitive_intrinsics_state_t* primitive_intrinsics_for_current_realm(void) {
    tsc_primitive_intrinsics_state_t* state =
        (tsc_primitive_intrinsics_state_t*)tsc_realm_state_get(
            &primitive_intrinsics_realm_state_key
        );
    if (state) return state;
    tsc_runtime_lock();
    state = (tsc_primitive_intrinsics_state_t*)tsc_realm_state_get(
        &primitive_intrinsics_realm_state_key
    );
    if (!state) {
        state = (tsc_primitive_intrinsics_state_t*)TSC_GC_MALLOC(sizeof(*state));
        memcpy(
            state->descriptors,
            primitive_descriptor_templates,
            sizeof(primitive_descriptor_templates)
        );
        tsc_realm_state_set(&primitive_intrinsics_realm_state_key, state);
    }
    tsc_runtime_unlock();
    return state;
}

#define primitive_boolean (primitive_intrinsics_for_current_realm()->descriptors[0])
#define primitive_number (primitive_intrinsics_for_current_realm()->descriptors[1])
#define primitive_string (primitive_intrinsics_for_current_realm()->descriptors[2])
#define primitive_bigint (primitive_intrinsics_for_current_realm()->descriptors[3])
#define primitive_symbol (primitive_intrinsics_for_current_realm()->descriptors[4])

static bool primitive_matches(tsc_primitive_kind_t kind, tsc_value_t value) {
    if (kind == TSC_PRIMITIVE_NUMBER) return !value_is_box(value);
    if (!value_is_box(value)) return false;
    if (kind == TSC_PRIMITIVE_BOOLEAN) {
        return value_tag(value) == TSC_VALUE_TAG_FALSE || value_tag(value) == TSC_VALUE_TAG_TRUE;
    }
    if (kind == TSC_PRIMITIVE_STRING) return value_tag(value) == TSC_VALUE_TAG_STRING;
    if (kind == TSC_PRIMITIVE_BIGINT) return value_tag(value) == TSC_VALUE_TAG_BIGINT;
    return kind == TSC_PRIMITIVE_SYMBOL && value_tag(value) == TSC_VALUE_TAG_SYMBOL;
}

static bool primitive_receiver_value(
    const tsc_primitive_descriptor_t* descriptor,
    tsc_value_t receiver,
    tsc_value_t* out
) {
    if (primitive_matches(descriptor->kind, receiver)) {
        *out = receiver;
        return true;
    }
    if (value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_OBJECT) {
        const tsc_object_t* object = (const tsc_object_t*)value_ptr(receiver);
        if (
            object && object->has_primitive_value &&
            object->primitive_kind == (uint8_t)descriptor->kind
        ) {
            *out = object->primitive_value;
            return true;
        }
    }
    return false;
}

static tsc_value_t primitive_default(const tsc_primitive_descriptor_t* descriptor) {
    if (descriptor->kind == TSC_PRIMITIVE_BOOLEAN) return tsc_value_bool(false);
    if (descriptor->kind == TSC_PRIMITIVE_NUMBER) return tsc_value_num(0.0);
    if (descriptor->kind == TSC_PRIMITIVE_STRING) return tsc_value_string(tsc_str_from_lit("", 0));
    if (descriptor->kind == TSC_PRIMITIVE_BIGINT) return tsc_value_bigint(tsc_bigint_from_lit("0"));
    return tsc_value_symbol(tsc_symbol_new(NULL));
}

static tsc_value_t primitive_convert(
    const tsc_primitive_descriptor_t* descriptor,
    tsc_array_t* args
) {
    if (!args || args->len == 0) return primitive_default(descriptor);
    tsc_value_t input = TSC_ARR(tsc_value_t, args, 0);
    if (descriptor->kind == TSC_PRIMITIVE_BOOLEAN) {
        return tsc_value_bool(tsc_value_is_truthy(input));
    }
    if (descriptor->kind == TSC_PRIMITIVE_NUMBER) {
        return tsc_value_num(tsc_value_number_constructor(input));
    }
    if (descriptor->kind == TSC_PRIMITIVE_STRING) {
        if (value_is_box(input) && value_tag(input) == TSC_VALUE_TAG_SYMBOL) {
            return tsc_value_string(tsc_symbol_to_string((const tsc_symbol_t*)value_ptr(input)));
        }
        return tsc_value_string(tsc_value_to_string(input));
    }
    if (descriptor->kind == TSC_PRIMITIVE_BIGINT) {
        return tsc_value_bigint(tsc_value_as_bigint(input));
    }
    return tsc_value_symbol(tsc_value_as_symbol(input));
}

static tsc_value_t primitive_constructor_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    return primitive_convert((const tsc_primitive_descriptor_t*)env, args);
}

static tsc_value_t primitive_constructor_construct(void* env, tsc_value_t receiver, tsc_array_t* args) {
    const tsc_primitive_descriptor_t* descriptor = (const tsc_primitive_descriptor_t*)env;
    if (!value_is_box(receiver) || value_tag(receiver) != TSC_VALUE_TAG_OBJECT) {
        tsc_throw_str(tsc_str_from_cstr("primitive constructor receiver is not an object"));
    }
    tsc_object_t* object = (tsc_object_t*)value_ptr(receiver);
    object->has_primitive_value = true;
    object->primitive_kind = (uint8_t)descriptor->kind;
    object->primitive_value = primitive_convert(descriptor, args);
    object->primitive_value_root = tsc_value_gc_root(object->primitive_value);
    if (descriptor->kind == TSC_PRIMITIVE_STRING) {
        const tsc_str_t* string = (const tsc_str_t*)value_ptr(object->primitive_value);
        tsc_object_define(object, tsc_str_from_lit("length", 6), tsc_value_num((double)string->len), false, false, false);
        for (size_t index = 0; index < string->len; index++) {
            tsc_object_define(
                object,
                tsc_str_from_num((double)index),
                tsc_value_string(tsc_str_char_at(string, (double)index)),
                false,
                true,
                false
            );
        }
    }
    return receiver;
}

static tsc_value_t primitive_prototype_value_of(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)args;
    const tsc_primitive_descriptor_t* descriptor = (const tsc_primitive_descriptor_t*)env;
    tsc_value_t primitive;
    if (!primitive_receiver_value(descriptor, this_arg, &primitive)) {
        tsc_throw_str(tsc_str_from_cstr("primitive valueOf called on incompatible receiver"));
    }
    return primitive;
}

static tsc_value_t primitive_prototype_to_string(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    const tsc_primitive_descriptor_t* descriptor = (const tsc_primitive_descriptor_t*)env;
    tsc_value_t primitive;
    if (!primitive_receiver_value(descriptor, this_arg, &primitive)) {
        tsc_throw_str(tsc_str_from_cstr("primitive toString called on incompatible receiver"));
    }
    if (descriptor->kind == TSC_PRIMITIVE_NUMBER) {
        tsc_value_t radix = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
        return tsc_value_string(
            tsc_value_is_undefined(radix)
                ? tsc_str_from_num(value_as_num(primitive))
                : tsc_str_from_num_radix(value_as_num(primitive), tsc_value_as_num(radix))
        );
    }
    if (descriptor->kind == TSC_PRIMITIVE_BIGINT) {
        tsc_value_t radix = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
        return tsc_value_string(tsc_bigint_to_string(
            (const tsc_bigint_t*)value_ptr(primitive),
            tsc_value_is_undefined(radix) ? 10.0 : tsc_value_as_num(radix)
        ));
    }
    if (descriptor->kind == TSC_PRIMITIVE_SYMBOL) {
        return tsc_value_string(tsc_symbol_to_string((const tsc_symbol_t*)value_ptr(primitive)));
    }
    return tsc_value_string(tsc_value_to_string(primitive));
}

static tsc_value_t primitive_prototype(tsc_primitive_descriptor_t* descriptor);

static tsc_value_t symbol_prototype_to_primitive_apply(
    void* env,
    tsc_value_t this_arg,
    tsc_array_t* args
) {
    (void)env;
    (void)args;
    tsc_value_t primitive;
    if (!primitive_receiver_value(&primitive_symbol, this_arg, &primitive)) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Symbol.prototype[Symbol.toPrimitive] called on incompatible receiver")
        );
    }
    return primitive;
}

static tsc_value_t symbol_prototype_description_apply(
    void* env,
    tsc_value_t this_arg,
    tsc_array_t* args
) {
    (void)env;
    (void)args;
    tsc_value_t primitive;
    if (!primitive_receiver_value(&primitive_symbol, this_arg, &primitive)) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Symbol.prototype.description called on incompatible receiver")
        );
    }
    tsc_str_t* description = tsc_symbol_description(
        (const tsc_symbol_t*)value_ptr(primitive)
    );
    return description ? tsc_value_string(description) : tsc_value_undefined();
}

static void symbol_prototype_install_intrinsics(tsc_value_t prototype) {
    tsc_value_t to_primitive = tsc_value_function_builtin_named(
        symbol_prototype_to_primitive_apply,
        NULL,
        1.0,
        tsc_str_from_lit("[Symbol.toPrimitive]", 20)
    );
    (void)tsc_value_define_symbol_property_desc(
        prototype,
        tsc_symbol_to_primitive(),
        to_primitive,
        true,
        false,
        true,
        false,
        true,
        true,
        true
    );
    (void)tsc_value_define_symbol_property_desc(
        prototype,
        tsc_symbol_to_string_tag(),
        tsc_value_string(tsc_str_from_lit("Symbol", 6)),
        true,
        false,
        true,
        false,
        true,
        true,
        true
    );

    tsc_value_t getter = tsc_value_function_builtin_named(
        symbol_prototype_description_apply,
        NULL,
        0.0,
        tsc_str_from_lit("get description", 15)
    );
    tsc_value_t* getter_env = (tsc_value_t*)TSC_GC_MALLOC(sizeof(tsc_value_t));
    *getter_env = getter;
    (void)tsc_value_define_accessor_desc(
        prototype,
        tsc_str_from_lit("description", 11),
        tsc_value_dynamic_accessor_getter,
        getter_env,
        true,
        NULL,
        NULL,
        true,
        false,
        true,
        true,
        true
    );
}

static tsc_value_t primitive_prototype(tsc_primitive_descriptor_t* descriptor) {
    if (!descriptor->prototype) {
        tsc_runtime_lock();
        if (!descriptor->prototype) {
            tsc_object_t* prototype = tsc_object_new();
            prototype->has_primitive_value = true;
            prototype->primitive_kind = (uint8_t)descriptor->kind;
            prototype->primitive_value = primitive_default(descriptor);
            prototype->primitive_value_root = tsc_value_gc_root(prototype->primitive_value);
            tsc_object_define(
                prototype,
                tsc_str_from_lit("valueOf", 7),
                tsc_value_function_builtin_named(primitive_prototype_value_of, descriptor, 0.0, tsc_str_from_lit("valueOf", 7)),
                true,
                false,
                true
            );
            tsc_object_define(
                prototype,
                tsc_str_from_lit("toString", 8),
                tsc_value_function_builtin_named(
                    primitive_prototype_to_string,
                    descriptor,
                    descriptor->kind == TSC_PRIMITIVE_NUMBER ? 1.0 : 0.0,
                    tsc_str_from_lit("toString", 8)
                ),
                true,
                false,
                true
            );
            descriptor->prototype = prototype;
        }
        tsc_runtime_unlock();
    }
    return tsc_value_object(descriptor->prototype);
}

static tsc_value_t string_static_from_char_code_apply(
    void* env,
    tsc_value_t this_arg,
    tsc_array_t* args
) {
    (void)env;
    (void)this_arg;
    return tsc_value_string(tsc_str_from_char_code_values(args));
}

static tsc_value_t string_static_from_code_point_apply(
    void* env,
    tsc_value_t this_arg,
    tsc_array_t* args
) {
    (void)env;
    (void)this_arg;
    return tsc_value_string(tsc_str_from_code_point_values(args));
}

static tsc_value_t string_static_raw_apply(
    void* env,
    tsc_value_t this_arg,
    tsc_array_t* args
) {
    (void)env;
    (void)this_arg;
    tsc_value_t template_value = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_undefined();
    size_t substitution_count = args && args->len > 1 ? args->len - 1 : 0;
    tsc_array_t* substitutions = tsc_array_new(
        sizeof(tsc_value_t),
        substitution_count ? substitution_count : 1
    );
    for (size_t index = 0; index < substitution_count; index++) {
        tsc_array_push_value(substitutions, TSC_ARR(tsc_value_t, args, index + 1));
    }
    return tsc_value_string(tsc_str_raw(template_value, substitutions));
}

typedef struct {
    const char* name;
    size_t name_len;
    double arity;
    tsc_generic_function_t apply;
} tsc_string_static_method_t;

static const tsc_string_static_method_t string_static_methods[] = {
    { "fromCharCode", 12, 1.0, string_static_from_char_code_apply },
    { "fromCodePoint", 13, 1.0, string_static_from_code_point_apply },
    { "raw", 3, 1.0, string_static_raw_apply },
};

static void string_constructor_install_static_methods(tsc_value_t constructor) {
    for (
        size_t index = 0;
        index < sizeof(string_static_methods) / sizeof(string_static_methods[0]);
        index++
    ) {
        const tsc_string_static_method_t* method = &string_static_methods[index];
        (void)tsc_value_define_property_desc(
            constructor,
            tsc_str_from_lit(method->name, method->name_len),
            tsc_value_function_builtin_named(
                method->apply,
                NULL,
                method->arity,
                tsc_str_from_lit(method->name, method->name_len)
            ),
            true,
            true,
            true,
            false,
            true,
            true,
            true
        );
    }
}

static tsc_value_t primitive_constructor_value(tsc_primitive_descriptor_t* descriptor) {
    if (descriptor->constructor_initialized) return descriptor->constructor;
    tsc_value_t constructor = tsc_value_function_named_kind(
        primitive_constructor_apply,
        primitive_constructor_construct,
        descriptor,
        1.0,
        tsc_str_from_lit(descriptor->name, descriptor->name_len),
        TSC_FUNCTION_IDENTITY_BUILTIN
    );
    tsc_function_identity_t* identity = (tsc_function_identity_t*)value_ptr(constructor);
    switch (descriptor->kind) {
        case TSC_PRIMITIVE_BOOLEAN:
            identity->construct_default_prototype = TSC_INTRINSIC_DEFAULT_BOOLEAN_PROTOTYPE;
            break;
        case TSC_PRIMITIVE_NUMBER:
            identity->construct_default_prototype = TSC_INTRINSIC_DEFAULT_NUMBER_PROTOTYPE;
            break;
        case TSC_PRIMITIVE_STRING:
            identity->construct_default_prototype = TSC_INTRINSIC_DEFAULT_STRING_PROTOTYPE;
            break;
        case TSC_PRIMITIVE_BIGINT:
            identity->construct_default_prototype = TSC_INTRINSIC_DEFAULT_BIGINT_PROTOTYPE;
            break;
        case TSC_PRIMITIVE_SYMBOL:
            identity->construct_default_prototype = TSC_INTRINSIC_DEFAULT_SYMBOL_PROTOTYPE;
            break;
    }
    if (!identity->func_prototype_initialized) {
        tsc_function_identity_set_own_prototype(identity, primitive_prototype(descriptor));
        tsc_object_define(
            descriptor->prototype,
            tsc_str_from_lit("constructor", 11),
            constructor,
            true,
            false,
            true
        );
    }
    if (descriptor->kind == TSC_PRIMITIVE_STRING) {
        string_constructor_install_static_methods(constructor);
    }
    descriptor->constructor = constructor;
    descriptor->constructor_initialized = true;
    return descriptor->constructor;
}

tsc_value_t tsc_string_constructor_value(void) { return primitive_constructor_value(&primitive_string); }
tsc_value_t tsc_number_constructor_value(void) { return primitive_constructor_value(&primitive_number); }
tsc_value_t tsc_boolean_constructor_value(void) { return primitive_constructor_value(&primitive_boolean); }

static tsc_value_t bigint_constructor_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    if (!args || args->len == 0) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot convert undefined to a BigInt"));
    }
    tsc_value_t input = TSC_ARR(tsc_value_t, args, 0);
    if (value_is_box(input)) {
        switch (value_tag(input)) {
            case TSC_VALUE_TAG_BIGINT:
                return input;
            case TSC_VALUE_TAG_FALSE:
                return tsc_value_bigint(tsc_bigint_from_bool(false));
            case TSC_VALUE_TAG_TRUE:
                return tsc_value_bigint(tsc_bigint_from_bool(true));
            case TSC_VALUE_TAG_STRING:
                return tsc_value_bigint(tsc_bigint_from_str((const tsc_str_t*)value_ptr(input)));
            default:
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot convert value to a BigInt"));
        }
    }
    return tsc_value_bigint(tsc_bigint_from_num(value_as_num(input)));
}

static tsc_value_t symbol_constructor_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    if (!args || args->len == 0 || tsc_value_is_undefined(TSC_ARR(tsc_value_t, args, 0))) {
        return tsc_value_symbol(tsc_symbol_new(NULL));
    }
    return tsc_value_symbol(tsc_symbol_new(tsc_value_to_string(TSC_ARR(tsc_value_t, args, 0))));
}

static tsc_value_t symbol_for_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t key = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_undefined();
    return tsc_value_symbol(tsc_symbol_for(tsc_value_to_string(key)));
}

static tsc_value_t symbol_key_for_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t value = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_undefined();
    tsc_symbol_t* symbol = tsc_value_as_symbol(value);
    tsc_str_t* key = tsc_symbol_key_for(symbol);
    return key ? tsc_value_string(key) : tsc_value_undefined();
}

static void primitive_link_nonconstructable_constructor(
    tsc_primitive_descriptor_t* descriptor,
    tsc_value_t constructor
) {
    tsc_value_t prototype = primitive_prototype(descriptor);
    (void)tsc_value_define_property_desc(
        constructor,
        tsc_str_from_lit("prototype", 9),
        prototype,
        true,
        false,
        true,
        false,
        true,
        false,
        true
    );
    (void)tsc_value_define_property_desc(
        prototype,
        tsc_str_from_lit("constructor", 11),
        constructor,
        true,
        true,
        true,
        false,
        true,
        true,
        true
    );
}

tsc_value_t tsc_bigint_constructor_value(void) {
    if (primitive_bigint.constructor_initialized) return primitive_bigint.constructor;
    tsc_value_t constructor = tsc_value_function_builtin_named(
        bigint_constructor_apply,
        NULL,
        1.0,
        tsc_str_from_lit("BigInt", 6)
    );
    primitive_link_nonconstructable_constructor(&primitive_bigint, constructor);
    primitive_bigint.constructor = constructor;
    primitive_bigint.constructor_initialized = true;
    return constructor;
}

static void symbol_constructor_define_value(
    tsc_value_t constructor,
    const char* name,
    size_t name_len,
    tsc_value_t value
) {
    (void)tsc_value_define_property_desc(
        constructor,
        tsc_str_from_lit(name, name_len),
        value,
        true,
        false,
        true,
        false,
        true,
        false,
        true
    );
}

tsc_value_t tsc_symbol_constructor_value(void) {
    if (primitive_symbol.constructor_initialized) return primitive_symbol.constructor;
    tsc_value_t constructor = tsc_value_function_builtin_named(
        symbol_constructor_apply,
        NULL,
        0.0,
        tsc_str_from_lit("Symbol", 6)
    );
    primitive_link_nonconstructable_constructor(&primitive_symbol, constructor);
    symbol_prototype_install_intrinsics(primitive_prototype(&primitive_symbol));
    symbol_constructor_define_value(
        constructor,
        "for",
        3,
        tsc_value_function_builtin_named(symbol_for_apply, NULL, 1.0, tsc_str_from_lit("for", 3))
    );
    symbol_constructor_define_value(
        constructor,
        "keyFor",
        6,
        tsc_value_function_builtin_named(symbol_key_for_apply, NULL, 1.0, tsc_str_from_lit("keyFor", 6))
    );
    for (size_t index = 0; index < TSC_WELL_KNOWN_SYMBOL_COUNT; index++) {
        tsc_well_known_symbol_kind_t kind = (tsc_well_known_symbol_kind_t)index;
        const tsc_well_known_symbol_descriptor_t* descriptor =
            tsc_symbol_well_known_descriptor(kind);
        symbol_constructor_define_value(
            constructor,
            descriptor->property_name,
            descriptor->property_name_len,
            tsc_value_symbol(tsc_symbol_well_known(kind))
        );
    }
    primitive_symbol.constructor = constructor;
    primitive_symbol.constructor_initialized = true;
    return constructor;
}

static tsc_value_t object_constructor_arg(tsc_array_t* args, size_t index) {
    return args && index < args->len
        ? TSC_ARR(tsc_value_t, args, index)
        : tsc_value_undefined();
}

static const tsc_primitive_descriptor_t* object_constructor_primitive_descriptor(tsc_value_t value) {
    if (!value_is_box(value)) return &primitive_number;
    if (value_tag(value) == TSC_VALUE_TAG_FALSE || value_tag(value) == TSC_VALUE_TAG_TRUE) {
        return &primitive_boolean;
    }
    if (value_tag(value) == TSC_VALUE_TAG_STRING) return &primitive_string;
    if (value_tag(value) == TSC_VALUE_TAG_BIGINT) return &primitive_bigint;
    if (value_tag(value) == TSC_VALUE_TAG_SYMBOL) return &primitive_symbol;
    return NULL;
}

static tsc_value_t object_constructor_box_primitive(
    const tsc_primitive_descriptor_t* descriptor,
    tsc_value_t value
) {
    tsc_value_t receiver = tsc_value_object(tsc_object_new());
    (void)tsc_value_set_prototype_of(
        receiver,
        primitive_prototype((tsc_primitive_descriptor_t*)descriptor)
    );
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_array_push_value(args, value);
    return primitive_constructor_construct((void*)descriptor, receiver, args);
}

static tsc_value_t object_constructor_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t value = object_constructor_arg(args, 0);
    if (tsc_value_is_nullish(value)) return tsc_value_object(tsc_object_new());
    if (tsc_value_is_object(value)) return value;
    const tsc_primitive_descriptor_t* descriptor = object_constructor_primitive_descriptor(value);
    if (!descriptor) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object cannot box this primitive value"));
    }
    return object_constructor_box_primitive(descriptor, value);
}

static tsc_value_t object_constructor_construct(
    void* env,
    tsc_value_t receiver,
    tsc_array_t* args
) {
    /* Object's derived-newTarget branch returns the object already created by
     * OrdinaryCreateFromConstructor.  The active-function branch retains the
     * ordinary Object(value) conversion behavior. */
    if (tsc_value_current_new_target() != tsc_value_current_callee()) {
        return receiver;
    }
    return object_constructor_apply(env, receiver, args);
}

static void object_static_require_target(tsc_value_t target, const char* method) {
    if (tsc_value_is_nullish(target)) {
        char message[128];
        snprintf(message, sizeof message, "Object.%s target must not be null or undefined", method);
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr(message));
    }
}

static tsc_value_t object_static_define_property(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = object_constructor_arg(args, 0);
    if (!tsc_value_is_object(target)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.defineProperty target must be an object"));
    }
    tsc_value_t key = object_constructor_arg(args, 1);
    tsc_value_t descriptor = object_constructor_arg(args, 2);
    if (!tsc_value_define_computed_property_descriptor(target, key, descriptor)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.defineProperty failed"));
    }
    return target;
}

static tsc_value_t object_static_get_own_property_descriptor(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = object_constructor_arg(args, 0);
    object_static_require_target(target, "getOwnPropertyDescriptor");
    return tsc_value_get_own_property_computed_descriptor(
        target,
        object_constructor_arg(args, 1)
    );
}

static tsc_value_t object_static_get_own_property_names(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = object_constructor_arg(args, 0);
    object_static_require_target(target, "getOwnPropertyNames");
    tsc_array_t* keys = tsc_value_own_keys(target);
    tsc_array_t* values = tsc_array_new(sizeof(tsc_value_t), keys->len ? keys->len : 1);
    for (size_t index = 0; index < keys->len; index++) {
        tsc_array_push_value(values, tsc_value_string(TSC_ARR(tsc_str_t*, keys, index)));
    }
    return tsc_value_array(values);
}

static tsc_value_t object_static_set_prototype_of(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = object_constructor_arg(args, 0);
    tsc_value_t prototype = object_constructor_arg(args, 1);
    (void)tsc_value_object_set_prototype_of(target, prototype);
    return target;
}

typedef struct {
    const char* name;
    size_t name_len;
    double arity;
    tsc_generic_function_t apply;
} tsc_object_static_method_t;

static const tsc_object_static_method_t object_static_methods[] = {
    { "defineProperty", 14, 3.0, object_static_define_property },
    { "getOwnPropertyDescriptor", 24, 2.0, object_static_get_own_property_descriptor },
    { "getOwnPropertyNames", 19, 1.0, object_static_get_own_property_names },
    { "setPrototypeOf", 14, 2.0, object_static_set_prototype_of },
};

static void object_constructor_define_static_method(
    tsc_value_t constructor,
    const tsc_object_static_method_t* method
) {
    (void)tsc_value_define_property_desc(
        constructor,
        tsc_str_from_lit(method->name, method->name_len),
        tsc_value_function_builtin_named(
            method->apply,
            NULL,
            method->arity,
            tsc_str_from_lit(method->name, method->name_len)
        ),
        true,
        true,
        true,
        false,
        true,
        true,
        true
    );
}

typedef struct {
    int initialization_state;
    tsc_value_t constructor;
} tsc_object_constructor_intrinsic_t;

static const char object_constructor_realm_state_key = 0;

tsc_value_t tsc_object_constructor_value(void) {
    tsc_object_constructor_intrinsic_t* intrinsic =
        (tsc_object_constructor_intrinsic_t*)tsc_realm_state_get(
            &object_constructor_realm_state_key
        );
    if (!intrinsic) {
        tsc_runtime_lock();
        intrinsic = (tsc_object_constructor_intrinsic_t*)tsc_realm_state_get(
            &object_constructor_realm_state_key
        );
        if (!intrinsic) {
            intrinsic = (tsc_object_constructor_intrinsic_t*)TSC_GC_MALLOC(
                sizeof(tsc_object_constructor_intrinsic_t)
            );
            memset(intrinsic, 0, sizeof(*intrinsic));
            tsc_realm_state_set(&object_constructor_realm_state_key, intrinsic);
        }
        tsc_runtime_unlock();
    }
    if (intrinsic->initialization_state == 0) {
        tsc_runtime_lock();
        if (intrinsic->initialization_state == 0) {
            intrinsic->initialization_state = 1;
            intrinsic->constructor = tsc_value_function_named_kind(
                object_constructor_apply,
                object_constructor_construct,
                NULL,
                1.0,
                tsc_str_from_lit("Object", 6),
                TSC_FUNCTION_IDENTITY_BUILTIN
            );
            tsc_function_identity_t* identity =
                (tsc_function_identity_t*)value_ptr(intrinsic->constructor);
            tsc_value_t prototype = tsc_value_object_prototype();
            tsc_function_identity_set_own_prototype(identity, prototype);
            (void)tsc_value_define_property_desc(
                prototype,
                tsc_str_from_lit("constructor", 11),
                intrinsic->constructor,
                true,
                true,
                true,
                false,
                true,
                true,
                true
            );
            for (
                size_t index = 0;
                index < sizeof(object_static_methods) / sizeof(object_static_methods[0]);
                index++
            ) {
                object_constructor_define_static_method(
                    intrinsic->constructor,
                    &object_static_methods[index]
                );
            }
            intrinsic->initialization_state = 2;
        }
        tsc_runtime_unlock();
    }
    return intrinsic->constructor;
}

typedef struct {
    const char* name;
    size_t length;
    tsc_value_t value;
} tsc_global_intrinsic_t;

typedef enum {
    TSC_GLOBAL_FUNCTION_PARSE_FLOAT,
    TSC_GLOBAL_FUNCTION_PARSE_INT,
    TSC_GLOBAL_FUNCTION_IS_FINITE,
    TSC_GLOBAL_FUNCTION_IS_NAN,
    TSC_GLOBAL_FUNCTION_ENCODE_URI,
    TSC_GLOBAL_FUNCTION_ENCODE_URI_COMPONENT,
    TSC_GLOBAL_FUNCTION_DECODE_URI,
    TSC_GLOBAL_FUNCTION_DECODE_URI_COMPONENT,
} tsc_global_function_kind_t;

typedef struct {
    const char* name;
    size_t name_length;
    double function_length;
    tsc_global_function_kind_t kind;
} tsc_global_function_descriptor_t;

static const tsc_global_function_descriptor_t global_function_descriptors[] = {
    { "parseFloat", 10, 1.0, TSC_GLOBAL_FUNCTION_PARSE_FLOAT },
    { "parseInt", 8, 2.0, TSC_GLOBAL_FUNCTION_PARSE_INT },
    { "isFinite", 8, 1.0, TSC_GLOBAL_FUNCTION_IS_FINITE },
    { "isNaN", 5, 1.0, TSC_GLOBAL_FUNCTION_IS_NAN },
    { "encodeURI", 9, 1.0, TSC_GLOBAL_FUNCTION_ENCODE_URI },
    { "encodeURIComponent", 18, 1.0, TSC_GLOBAL_FUNCTION_ENCODE_URI_COMPONENT },
    { "decodeURI", 9, 1.0, TSC_GLOBAL_FUNCTION_DECODE_URI },
    { "decodeURIComponent", 18, 1.0, TSC_GLOBAL_FUNCTION_DECODE_URI_COMPONENT },
};

static tsc_value_t global_function_argument(const tsc_array_t* args, size_t index) {
    return args && index < args->len
        ? TSC_ARR(tsc_value_t, args, index)
        : tsc_value_undefined();
}

static tsc_value_t global_function_apply(void* raw_descriptor, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    const tsc_global_function_descriptor_t* descriptor =
        (const tsc_global_function_descriptor_t*)raw_descriptor;
    tsc_value_t input = global_function_argument(args, 0);
    switch (descriptor->kind) {
        case TSC_GLOBAL_FUNCTION_PARSE_FLOAT:
            return tsc_value_num(tsc_parse_float(tsc_value_to_string(input)));
        case TSC_GLOBAL_FUNCTION_PARSE_INT: {
            tsc_str_t* parsed_input = tsc_value_to_string(input);
            tsc_value_t radix = global_function_argument(args, 1);
            double parsed_radix = tsc_value_is_undefined(radix)
                ? 0.0
                : tsc_value_to_number(radix);
            return tsc_value_num(tsc_parse_int(parsed_input, parsed_radix));
        }
        case TSC_GLOBAL_FUNCTION_IS_FINITE:
            return tsc_value_bool(isfinite(tsc_value_to_number(input)));
        case TSC_GLOBAL_FUNCTION_IS_NAN:
            return tsc_value_bool(isnan(tsc_value_to_number(input)));
        case TSC_GLOBAL_FUNCTION_ENCODE_URI:
            return tsc_value_string(tsc_str_encode_uri(tsc_value_to_string(input)));
        case TSC_GLOBAL_FUNCTION_ENCODE_URI_COMPONENT:
            return tsc_value_string(tsc_str_encode_uri_component(tsc_value_to_string(input)));
        case TSC_GLOBAL_FUNCTION_DECODE_URI:
            return tsc_value_string(tsc_str_decode_uri(tsc_value_to_string(input)));
        case TSC_GLOBAL_FUNCTION_DECODE_URI_COMPONENT:
            return tsc_value_string(tsc_str_decode_uri_component(tsc_value_to_string(input)));
    }
    tsc_panic("unknown global function descriptor");
    return tsc_value_undefined();
}

static void global_define_intrinsic(tsc_object_t* global, const tsc_global_intrinsic_t* intrinsic) {
    (void)tsc_object_define(
        global,
        tsc_str_from_lit(intrinsic->name, intrinsic->length),
        intrinsic->value,
        true,
        false,
        true
    );
}

tsc_value_t tsc_global_object(void) {
    tsc_realm_t* realm = tsc_realm_current();
    if (realm->global_object) return tsc_value_object(realm->global_object);

    /* Build every dependency before publishing the object.  Several intrinsic
     * constructors have their own singleton locks, so this ordering also keeps
     * the global initializer free of nested runtime-lock acquisition. */
    tsc_global_intrinsic_t intrinsics[] = {
        { "Object", 6, tsc_object_constructor_value() },
        { "Function", 8, tsc_function_constructor_value() },
        { "Array", 5, tsc_array_constructor_value() },
        { "String", 6, tsc_string_constructor_value() },
        { "Number", 6, tsc_number_constructor_value() },
        { "Boolean", 7, tsc_boolean_constructor_value() },
        { "BigInt", 6, tsc_bigint_constructor_value() },
        { "Symbol", 6, tsc_symbol_constructor_value() },
        { "Date", 4, tsc_date_constructor_value() },
        { "Error", 5, tsc_error_constructor_value(TSC_ERROR_ERROR) },
        { "TypeError", 9, tsc_error_constructor_value(TSC_ERROR_TYPE) },
        { "RangeError", 10, tsc_error_constructor_value(TSC_ERROR_RANGE) },
        { "SyntaxError", 11, tsc_error_constructor_value(TSC_ERROR_SYNTAX) },
        { "ReferenceError", 14, tsc_error_constructor_value(TSC_ERROR_REFERENCE) },
        { "EvalError", 9, tsc_error_constructor_value(TSC_ERROR_EVAL) },
        { "URIError", 8, tsc_error_constructor_value(TSC_ERROR_URI) },
        { "AggregateError", 14, tsc_error_constructor_value(TSC_ERROR_AGGREGATE) },
        { "SuppressedError", 15, tsc_error_constructor_value(TSC_ERROR_SUPPRESSED) },
        { "Math", 4, tsc_builtin_math() },
        { "JSON", 4, tsc_builtin_json() },
        { "Reflect", 7, tsc_builtin_reflect() },
    };
    tsc_object_t* built = tsc_object_new();
    tsc_value_t built_value = tsc_value_object(built);
    (void)tsc_object_define(
        built,
        tsc_str_from_lit("globalThis", 10),
        built_value,
        true,
        false,
        true
    );
    for (size_t index = 0; index < sizeof(intrinsics) / sizeof(intrinsics[0]); index++) {
        global_define_intrinsic(built, &intrinsics[index]);
    }
    for (
        size_t index = 0;
        index < sizeof(global_function_descriptors) / sizeof(global_function_descriptors[0]);
        index++
    ) {
        const tsc_global_function_descriptor_t* descriptor =
            &global_function_descriptors[index];
        (void)tsc_object_define(
            built,
            tsc_str_from_lit(descriptor->name, descriptor->name_length),
            tsc_value_function_builtin_named(
                global_function_apply,
                (void*)descriptor,
                descriptor->function_length,
                tsc_str_from_lit(descriptor->name, descriptor->name_length)
            ),
            true,
            false,
            true
        );
    }
    (void)tsc_object_define(
        built,
        tsc_str_from_lit("undefined", 9),
        tsc_value_undefined(),
        false,
        false,
        false
    );
    (void)tsc_object_define(
        built,
        tsc_str_from_lit("NaN", 3),
        tsc_value_num(NAN),
        false,
        false,
        false
    );
    (void)tsc_object_define(
        built,
        tsc_str_from_lit("Infinity", 8),
        tsc_value_num(INFINITY),
        false,
        false,
        false
    );

    tsc_runtime_lock();
    if (!realm->global_object) realm->global_object = built;
    tsc_runtime_unlock();
    return tsc_value_object(realm->global_object);
}

typedef struct tsc_global_lexical_binding {
    tsc_str_t* name;
    tsc_value_t value;
    void* value_gc_root;
    bool initialized;
    bool mutable;
    struct tsc_global_lexical_binding* next;
} tsc_global_lexical_binding_t;

static tsc_global_lexical_binding_t* global_lexical_find(const tsc_str_t* key) {
    for (tsc_global_lexical_binding_t* binding = tsc_realm_current()->global_lexical_bindings;
         binding;
         binding = binding->next) {
        if (binding->name == key || tsc_str_eq(binding->name, key)) return binding;
    }
    return NULL;
}

static tsc_object_t* global_object_record(void) {
    return (tsc_object_t*)value_ptr(tsc_global_object());
}

static const tsc_object_prop_t* global_own_property(const tsc_str_t* key) {
    tsc_object_t* global = global_object_record();
    ssize_t index = object_find(global, key);
    return index >= 0 ? &global->props[(size_t)index] : NULL;
}

static bool global_can_declare_var(const tsc_str_t* key) {
    return global_own_property(key) != NULL || global_object_record()->extensible;
}

static bool global_can_declare_function(const tsc_str_t* key) {
    const tsc_object_prop_t* existing = global_own_property(key);
    if (!existing) return global_object_record()->extensible;
    if (existing->configurable) return true;
    return !existing->accessor && existing->writable && existing->enumerable;
}

static void global_create_lexical(const tsc_global_declaration_t* declaration) {
    if (global_lexical_find(declaration->name)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("global lexical binding already exists"));
    }
    tsc_global_lexical_binding_t* binding =
        (tsc_global_lexical_binding_t*)TSC_GC_MALLOC(sizeof(tsc_global_lexical_binding_t));
    binding->name = declaration->name;
    binding->value = tsc_value_undefined();
    binding->value_gc_root = NULL;
    binding->initialized = false;
    binding->mutable = declaration->kind == TSC_GLOBAL_DECL_LEXICAL_MUTABLE;
    tsc_realm_t* realm = tsc_realm_current();
    binding->next = realm->global_lexical_bindings;
    realm->global_lexical_bindings = binding;
}

static void global_create_var(tsc_str_t* key, bool deletable) {
    tsc_value_t global = tsc_global_object();
    if (tsc_value_has_own_prop(global, key) || !tsc_value_is_extensible(global)) return;
    if (!tsc_value_define_property_desc(
        global,
        key,
        tsc_value_undefined(),
        true,
        true,
        true,
        true,
        true,
        deletable,
        true
    )) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("cannot create global var binding"));
    }
}

static void global_create_function(tsc_str_t* key, tsc_value_t value, bool deletable) {
    tsc_value_t global = tsc_global_object();
    const tsc_object_prop_t* existing = global_own_property(key);
    bool replace_descriptor = !existing || existing->configurable;
    if (!tsc_value_define_property_desc(
        global,
        key,
        value,
        true,
        true,
        replace_descriptor,
        true,
        replace_descriptor,
        deletable,
        replace_descriptor
    )) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("cannot create global function binding"));
    }
    (void)tsc_value_set_prop(global, key, value);
}

static bool global_declaration_is_lexical(tsc_global_declaration_kind_t kind) {
    return kind == TSC_GLOBAL_DECL_LEXICAL_MUTABLE ||
        kind == TSC_GLOBAL_DECL_LEXICAL_IMMUTABLE;
}

static bool global_declaration_is_function(tsc_global_declaration_kind_t kind) {
    return kind == TSC_GLOBAL_DECL_FUNCTION || kind == TSC_GLOBAL_DECL_EVAL_FUNCTION;
}

static bool global_declaration_is_var(tsc_global_declaration_kind_t kind) {
    return kind == TSC_GLOBAL_DECL_VAR || kind == TSC_GLOBAL_DECL_EVAL_VAR;
}

static void global_throw_declaration_error(tsc_error_kind_t kind, const char* message) {
    tsc_throw_error(kind, tsc_str_from_cstr(message));
}

void tsc_global_declaration_instantiation(
    tsc_global_declaration_t* declarations,
    size_t length
) {
    /* Keep every function object visible to the conservative collector for
     * the entire preflight/create transaction. */
    for (size_t index = 0; index < length; index++) {
        declarations[index].value_gc_root = tsc_value_gc_root(declarations[index].value);
    }

    /* GlobalDeclarationInstantiation performs every collision/definability
     * check before it creates the first binding.  The generated collection is
     * therefore atomic for the runtime's ordinary global object. */
    for (size_t index = 0; index < length; index++) {
        const tsc_global_declaration_t* declaration = &declarations[index];
        if (!global_declaration_is_lexical(declaration->kind)) continue;
        for (size_t other = 0; other < length; other++) {
            if (other == index || !tsc_str_eq(declaration->name, declarations[other].name)) continue;
            global_throw_declaration_error(
                TSC_ERROR_SYNTAX,
                "global lexical declaration conflicts with another declaration"
            );
        }
        const tsc_object_prop_t* existing = global_own_property(declaration->name);
        if (global_lexical_find(declaration->name) || (existing && !existing->configurable)) {
            global_throw_declaration_error(
                TSC_ERROR_SYNTAX,
                "global lexical declaration conflicts with an existing binding"
            );
        }
    }
    for (size_t index = 0; index < length; index++) {
        const tsc_global_declaration_t* declaration = &declarations[index];
        if (global_declaration_is_lexical(declaration->kind)) continue;
        if (global_lexical_find(declaration->name)) {
            global_throw_declaration_error(
                TSC_ERROR_SYNTAX,
                "global var declaration conflicts with an existing lexical binding"
            );
        }
    }
    for (size_t index = 0; index < length; index++) {
        const tsc_global_declaration_t* declaration = &declarations[index];
        if (global_declaration_is_function(declaration->kind) &&
            !global_can_declare_function(declaration->name)) {
            global_throw_declaration_error(
                TSC_ERROR_TYPE,
                "global function declaration is not definable"
            );
        }
    }
    for (size_t index = 0; index < length; index++) {
        const tsc_global_declaration_t* declaration = &declarations[index];
        if (global_declaration_is_var(declaration->kind) &&
            !global_can_declare_var(declaration->name)) {
            global_throw_declaration_error(TSC_ERROR_TYPE, "global var declaration is not definable");
        }
    }

    for (size_t index = 0; index < length; index++) {
        if (global_declaration_is_lexical(declarations[index].kind)) {
            global_create_lexical(&declarations[index]);
        }
    }
    for (size_t index = 0; index < length; index++) {
        if (global_declaration_is_function(declarations[index].kind)) {
            global_create_function(
                declarations[index].name,
                declarations[index].value,
                declarations[index].kind == TSC_GLOBAL_DECL_EVAL_FUNCTION
            );
        }
    }
    for (size_t index = 0; index < length; index++) {
        if (global_declaration_is_var(declarations[index].kind)) {
            global_create_var(
                declarations[index].name,
                declarations[index].kind == TSC_GLOBAL_DECL_EVAL_VAR
            );
        }
    }
}

bool tsc_global_annex_b_function_instantiation(tsc_str_t* key) {
    /* The web-compat insertion suppresses this binding rather than throwing
     * when an existing declarative binding wins or the ordinary global object
     * cannot accept the candidate var binding. */
    if (global_lexical_find(key) || !global_can_declare_var(key)) return false;
    global_create_var(key, false);
    return true;
}

tsc_value_t tsc_global_lexical_initialize(tsc_str_t* key, tsc_value_t value) {
    tsc_global_lexical_binding_t* binding = global_lexical_find(key);
    if (!binding || binding->initialized) {
        tsc_throw_error(TSC_ERROR_REFERENCE, tsc_str_from_cstr("global lexical binding is not uninitialized"));
    }
    binding->value = value;
    binding->value_gc_root = tsc_value_gc_root(value);
    binding->initialized = true;
    return value;
}

static tsc_value_t global_lexical_get(tsc_global_lexical_binding_t* binding) {
    if (!binding->initialized) {
        tsc_throw_error(
            TSC_ERROR_REFERENCE,
            tsc_str_from_cstr("Cannot access global lexical binding before initialization")
        );
    }
    return binding->value;
}

static tsc_value_t global_lexical_set(
    tsc_global_lexical_binding_t* binding,
    tsc_value_t value
) {
    if (!binding->initialized) {
        tsc_throw_error(
            TSC_ERROR_REFERENCE,
            tsc_str_from_cstr("Cannot access global lexical binding before initialization")
        );
    }
    if (!binding->mutable) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Assignment to constant global binding"));
    }
    binding->value = value;
    binding->value_gc_root = tsc_value_gc_root(value);
    return value;
}

tsc_value_t tsc_global_binding_get(tsc_str_t* key) {
    tsc_global_lexical_binding_t* lexical = global_lexical_find(key);
    if (lexical) return global_lexical_get(lexical);
    return tsc_value_get_prop(tsc_global_object(), key);
}

tsc_value_t tsc_global_binding_set(tsc_str_t* key, tsc_value_t value) {
    tsc_global_lexical_binding_t* lexical = global_lexical_find(key);
    if (lexical) return global_lexical_set(lexical, value);
    if (!tsc_value_set_prop(tsc_global_object(), key, value)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("cannot assign global binding"));
    }
    return value;
}

tsc_value_t tsc_global_reference_get(tsc_str_t* key) {
    tsc_global_lexical_binding_t* lexical = global_lexical_find(key);
    if (lexical) return global_lexical_get(lexical);
    tsc_value_t global = tsc_global_object();
    if (!tsc_value_has_prop(global, key)) {
        tsc_throw_error(
            TSC_ERROR_REFERENCE,
            tsc_str_concat(key, tsc_str_from_lit(" is not defined", 15))
        );
    }
    return tsc_value_get_prop(global, key);
}

tsc_value_t tsc_global_reference_set(tsc_str_t* key, tsc_value_t value, bool strict) {
    tsc_global_lexical_binding_t* lexical = global_lexical_find(key);
    if (lexical) return global_lexical_set(lexical, value);
    tsc_value_t global = tsc_global_object();
    if (!tsc_value_has_prop(global, key) && strict) {
        tsc_throw_error(
            TSC_ERROR_REFERENCE,
            tsc_str_concat(key, tsc_str_from_lit(" is not defined", 15))
        );
    }
    if (!tsc_value_set_prop(global, key, value) && strict) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("cannot assign global reference"));
    }
    return value;
}

bool tsc_global_reference_delete(tsc_str_t* key) {
    if (global_lexical_find(key)) return false;
    tsc_value_t global = tsc_global_object();
    return !tsc_value_has_prop(global, key) || tsc_value_delete_prop(global, key);
}

tsc_str_t* tsc_global_reference_typeof(tsc_str_t* key) {
    tsc_global_lexical_binding_t* lexical = global_lexical_find(key);
    if (lexical) return tsc_value_typeof(global_lexical_get(lexical));
    tsc_value_t global = tsc_global_object();
    return tsc_value_has_prop(global, key)
        ? tsc_value_typeof(tsc_value_get_prop(global, key))
        : tsc_str_from_lit("undefined", 9);
}

tsc_value_t tsc_value_sloppy_this(tsc_value_t value) {
    if (tsc_value_is_nullish(value)) return tsc_global_object();
    if (tsc_value_is_object(value)) return value;
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_array_push_value(args, value);
    return tsc_value_apply_function(
        tsc_object_constructor_value(),
        tsc_value_undefined(),
        tsc_value_array(args)
    );
}

static bool value_is_callable_function(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    if (value_tag(v) == TSC_VALUE_TAG_FUNCTION) return true;
    if (value_tag(v) != TSC_VALUE_TAG_OBJECT) return false;
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    return o && o->is_proxy && value_is_callable_function(o->proxy_target);
}

bool tsc_value_is_callable(tsc_value_t v) {
    return value_is_callable_function(v);
}

bool tsc_value_is_constructable(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    if (value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* ident = (tsc_function_identity_t*)value_ptr(v);
        if (ident && ident->kind == TSC_FUNCTION_IDENTITY_BOUND) {
            tsc_bound_function_env_t* bound = (tsc_bound_function_env_t*)ident->env;
            return bound && tsc_value_is_constructable(bound->target);
        }
        return ident && (ident->kind == TSC_FUNCTION_IDENTITY_GENERIC || ident->construct != NULL);
    }
    if (value_tag(v) != TSC_VALUE_TAG_OBJECT) return false;
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    return o && o->is_proxy && tsc_value_is_constructable(o->proxy_target);
}

bool tsc_value_instanceof(tsc_value_t object, tsc_value_t constructor) {
    if (!tsc_value_is_callable(constructor)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("instanceof right operand is not callable"));
    }
    if (value_is_box(constructor) && value_tag(constructor) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* identity = (tsc_function_identity_t*)value_ptr(constructor);
        if (identity && identity->kind == TSC_FUNCTION_IDENTITY_BOUND) {
            tsc_bound_function_env_t* bound = (tsc_bound_function_env_t*)identity->env;
            return bound && tsc_value_instanceof(object, bound->target);
        }
    }
    tsc_value_t prototype = tsc_value_get_prop(
        constructor,
        tsc_str_from_lit("prototype", 9)
    );
    if (!value_is_valid_prototype(prototype) || value_is_null_value(prototype)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("instanceof constructor has non-object prototype"));
    }
    return tsc_value_is_prototype_of(prototype, object);
}

static tsc_array_t* value_to_argument_list(tsc_value_t args, const char* message) {
    if (value_is_box(args) && value_tag(args) == TSC_VALUE_TAG_ARRAY) {
        return (tsc_array_t*)value_ptr(args);
    }
    if (
        !value_is_box(args) ||
        (
            value_tag(args) != TSC_VALUE_TAG_OBJECT &&
            value_tag(args) != TSC_VALUE_TAG_FUNCTION
        )
    ) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr(message));
    }
    tsc_value_t length_value = tsc_value_get_prop(args, tsc_str_from_lit("length", 6));
    double length_num = tsc_value_as_num(length_value);
    size_t length = 0;
    if (isfinite(length_num) && length_num > 0.0) {
        length = (size_t)floor(length_num);
    }
    tsc_array_t* list = tsc_array_new(sizeof(tsc_value_t), length ? length : 1);
    for (size_t i = 0; i < length; i++) {
        tsc_value_t item = tsc_value_get_index(args, (double)i);
        tsc_array_push_value(list, item);
    }
    return list;
}

typedef struct tsc_callee_frame {
    struct tsc_callee_frame* prev;
    tsc_value_t value;
    tsc_value_t new_target;
} tsc_callee_frame_t;

static TSC_TLS tsc_callee_frame_t* value_current_callee = NULL;

tsc_value_t tsc_value_current_callee(void) {
    return value_current_callee
        ? value_current_callee->value
        : tsc_value_undefined();
}

tsc_value_t tsc_value_current_new_target(void) {
    return value_current_callee
        ? value_current_callee->new_target
        : tsc_value_undefined();
}

void* tsc_value_callee_checkpoint(void) {
    return value_current_callee;
}

void tsc_value_callee_restore(void* checkpoint) {
    value_current_callee = (tsc_callee_frame_t*)checkpoint;
}

static tsc_value_t date_prototype_value(void);

static tsc_value_t value_intrinsic_default_prototype(
    tsc_intrinsic_default_prototype_kind_t kind
) {
    switch (kind) {
        case TSC_INTRINSIC_DEFAULT_OBJECT_PROTOTYPE:
            return tsc_value_object_prototype();
        case TSC_INTRINSIC_DEFAULT_FUNCTION_PROTOTYPE:
            return tsc_function_default_prototype();
        case TSC_INTRINSIC_DEFAULT_ARRAY_PROTOTYPE:
            return tsc_value_array(tsc_array_prototype());
        case TSC_INTRINSIC_DEFAULT_BOOLEAN_PROTOTYPE:
            return primitive_prototype(&primitive_boolean);
        case TSC_INTRINSIC_DEFAULT_NUMBER_PROTOTYPE:
            return primitive_prototype(&primitive_number);
        case TSC_INTRINSIC_DEFAULT_STRING_PROTOTYPE:
            return primitive_prototype(&primitive_string);
        case TSC_INTRINSIC_DEFAULT_BIGINT_PROTOTYPE:
            return primitive_prototype(&primitive_bigint);
        case TSC_INTRINSIC_DEFAULT_SYMBOL_PROTOTYPE:
            return primitive_prototype(&primitive_symbol);
        case TSC_INTRINSIC_DEFAULT_DATE_PROTOTYPE:
            return date_prototype_value();
        case TSC_INTRINSIC_DEFAULT_ERROR_PROTOTYPE:
        case TSC_INTRINSIC_DEFAULT_TYPE_ERROR_PROTOTYPE:
        case TSC_INTRINSIC_DEFAULT_RANGE_ERROR_PROTOTYPE:
        case TSC_INTRINSIC_DEFAULT_SYNTAX_ERROR_PROTOTYPE:
        case TSC_INTRINSIC_DEFAULT_REFERENCE_ERROR_PROTOTYPE:
        case TSC_INTRINSIC_DEFAULT_EVAL_ERROR_PROTOTYPE:
        case TSC_INTRINSIC_DEFAULT_URI_ERROR_PROTOTYPE:
        case TSC_INTRINSIC_DEFAULT_AGGREGATE_ERROR_PROTOTYPE:
        case TSC_INTRINSIC_DEFAULT_SUPPRESSED_ERROR_PROTOTYPE: {
            tsc_error_kind_t error_kind = (tsc_error_kind_t)(
                kind - TSC_INTRINSIC_DEFAULT_ERROR_PROTOTYPE
            );
            error_intrinsics_initialize();
            return tsc_value_object(error_intrinsic(error_kind)->prototype);
        }
    }
    tsc_panic("unknown intrinsic default prototype");
}

tsc_value_t tsc_value_apply_function(tsc_value_t fn, tsc_value_t this_arg, tsc_value_t args) {
    if (value_is_box(fn) && value_tag(fn) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(fn);
        if (o->is_proxy) {
            if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'apply' on a proxy that has been revoked"));
            if (!value_is_callable_function(o->proxy_target)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy apply target must be callable"));
            }
            tsc_array_t* list = value_to_argument_list(args, "Reflect.apply argumentsList must be an array or array-like object");
            tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("apply", 5));
            if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
                return tsc_value_apply_function(o->proxy_target, this_arg, tsc_value_array(list));
            }
            if (!value_is_callable_function(trap)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy apply trap must be callable"));
            }
            tsc_array_t* trap_args = tsc_array_new(sizeof(tsc_value_t), 4);
            tsc_array_push_value(trap_args, o->proxy_target);
            tsc_array_push_value(trap_args, this_arg);
            tsc_array_push_value(trap_args, tsc_value_array(list));
            return tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(trap_args));
        }
    }
    if (!value_is_box(fn) || value_tag(fn) != TSC_VALUE_TAG_FUNCTION) {
        tsc_throw_str(tsc_str_from_cstr("Reflect.apply target is not a function"));
    }
    tsc_array_t* list = value_to_argument_list(args, "Reflect.apply argumentsList must be an array or array-like object");
    tsc_function_identity_t* ident = (tsc_function_identity_t*)value_ptr(fn);
    tsc_realm_t* previous_realm = tsc_realm_swap(
        ident->realm ? ident->realm : tsc_realm_current()
    );
    if (ident->kind == TSC_FUNCTION_IDENTITY_GETTER) {
        tsc_value_t result = ident->code.getter(ident->env, this_arg);
        (void)tsc_realm_swap(previous_realm);
        return result;
    }
    if (
        ident->kind == TSC_FUNCTION_IDENTITY_GENERIC ||
        ident->kind == TSC_FUNCTION_IDENTITY_CLOSURE ||
        ident->kind == TSC_FUNCTION_IDENTITY_BUILTIN ||
        ident->kind == TSC_FUNCTION_IDENTITY_BOUND
    ) {
        tsc_callee_frame_t frame = {
            .prev = value_current_callee,
            .value = fn,
            .new_target = tsc_value_undefined(),
        };
        value_current_callee = &frame;
        tsc_value_t result = ident->code.generic(ident->env, this_arg, list);
        value_current_callee = frame.prev;
        (void)tsc_realm_swap(previous_realm);
        return result;
    }
    if (ident->kind == TSC_FUNCTION_IDENTITY_EVENT_LISTENER) {
        ident->code.event_listener.fn(ident->env, NULL, list);
        (void)tsc_realm_swap(previous_realm);
        return tsc_value_undefined();
    }
    if (ident->kind == TSC_FUNCTION_IDENTITY_EVENT_RAW_LISTENER) {
        ident->code.event_raw_identity.fn(ident->env, NULL, list);
        (void)tsc_realm_swap(previous_realm);
        return tsc_value_undefined();
    }
    if (ident->kind != TSC_FUNCTION_IDENTITY_SETTER) {
        (void)tsc_realm_swap(previous_realm);
        tsc_panic("Reflect.apply target is not a callable function identity");
    }
    tsc_value_t value = list->len > 0 ? TSC_ARR(tsc_value_t, list, 0) : tsc_value_undefined();
    ident->code.setter(ident->env, this_arg, value);
    (void)tsc_realm_swap(previous_realm);
    return tsc_value_undefined();
}

tsc_value_t tsc_value_construct(tsc_value_t target, tsc_value_t args) {
    return tsc_value_construct_with_new_target(target, args, target);
}

tsc_value_t tsc_value_construct_with_new_target(tsc_value_t target, tsc_value_t args, tsc_value_t new_target) {
    if (value_is_box(target) && value_tag(target) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* ident = (tsc_function_identity_t*)value_ptr(target);
        if (ident->kind == TSC_FUNCTION_IDENTITY_BOUND) {
            tsc_bound_function_env_t* bound = (tsc_bound_function_env_t*)ident->env;
            if (!bound || !tsc_value_is_constructable(bound->target)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("bound function target is not a constructor"));
            }
            if (!tsc_value_is_constructable(new_target)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Reflect.construct newTarget is not a constructor"));
            }
            tsc_array_t* list = value_to_argument_list(
                args,
                "Reflect.construct argumentsList must be an array or array-like object"
            );
            const tsc_value_t effective_new_target = new_target == target
                ? bound->target
                : new_target;
            return tsc_value_construct_with_new_target(
                bound->target,
                tsc_value_array(bound_function_arguments(bound, list)),
                effective_new_target
            );
        }
        if (ident->kind == TSC_FUNCTION_IDENTITY_GENERIC || ident->construct != NULL) {
            if (!tsc_value_is_constructable(new_target)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Reflect.construct newTarget is not a constructor"));
            }
            tsc_array_t* list = value_to_argument_list(args, "Reflect.construct argumentsList must be an array or array-like object");
            tsc_value_t new_target_proto = tsc_value_get_prop(new_target, tsc_str_from_lit("prototype", 9));
            if (!value_is_valid_prototype(new_target_proto) || value_is_null_value(new_target_proto)) {
                tsc_realm_t* new_target_realm = tsc_value_function_realm(new_target);
                tsc_realm_t* previous_realm = tsc_realm_swap(new_target_realm);
                new_target_proto = value_intrinsic_default_prototype(
                    ident->construct_default_prototype
                );
                (void)tsc_realm_swap(previous_realm);
            }
            tsc_value_t receiver = tsc_value_object(
                tsc_object_new_with_prototype(new_target_proto)
            );
            tsc_generic_function_t construct = ident->construct ? ident->construct : ident->code.generic;
            tsc_realm_t* previous_realm = tsc_realm_swap(
                ident->realm ? ident->realm : tsc_realm_current()
            );
            tsc_callee_frame_t frame = {
                .prev = value_current_callee,
                .value = target,
                .new_target = new_target,
            };
            value_current_callee = &frame;
            tsc_value_t result = construct(ident->env, receiver, list);
            value_current_callee = frame.prev;
            (void)tsc_realm_swap(previous_realm);
            if (
                value_is_box(result) &&
                (
                    value_tag(result) == TSC_VALUE_TAG_OBJECT ||
                    value_tag(result) == TSC_VALUE_TAG_ARRAY ||
                    value_tag(result) == TSC_VALUE_TAG_FUNCTION
                )
            ) {
                return result;
            }
            return receiver;
        }
    }
    if (value_is_box(target) && value_tag(target) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(target);
        if (o->is_proxy) {
            if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'construct' on a proxy that has been revoked"));
            if (!tsc_value_is_constructable(o->proxy_target)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy construct target must be constructor"));
            }
            if (!tsc_value_is_constructable(new_target)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Reflect.construct newTarget is not a constructor"));
            }
            tsc_array_t* list = value_to_argument_list(args, "Reflect.construct argumentsList must be an array or array-like object");
            tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("construct", 9));
            if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
                return tsc_value_construct_with_new_target(o->proxy_target, tsc_value_array(list), new_target);
            }
            if (!value_is_callable_function(trap)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy construct trap must be callable"));
            }
            tsc_array_t* trap_args = tsc_array_new(sizeof(tsc_value_t), 4);
            tsc_array_push_value(trap_args, o->proxy_target);
            tsc_array_push_value(trap_args, tsc_value_array(list));
            tsc_array_push_value(trap_args, new_target);
            tsc_value_t result = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(trap_args));
            if (
                !value_is_box(result) ||
                (
                    value_tag(result) != TSC_VALUE_TAG_OBJECT &&
                    value_tag(result) != TSC_VALUE_TAG_ARRAY &&
                    value_tag(result) != TSC_VALUE_TAG_FUNCTION
                )
            ) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy construct trap must return an object"));
            }
            return result;
        }
    }
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Reflect.construct target is not a supported constructor"));
    return tsc_value_undefined();
}


static tsc_value_t tsc_value_generator_next(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    tsc_array_t* av = (tsc_array_t*)env;
    if (av->is_lazy_generator && av->iter_pos >= av->len && av->lazy_next) {
        bool done = false;
        tsc_value_t next_arg = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
        av->lazy_next(av, &av->state, av->env, next_arg, &done);
        if (done) {
            av->is_lazy_generator = false;
        }
    }
    tsc_object_t* out = tsc_object_new();
    if (av->iter_pos < av->len) {
        tsc_value_t current = TSC_ARR(tsc_value_t, av, av->iter_pos++);
        tsc_object_set(out, tsc_str_from_lit("done", 4), tsc_value_bool(false));
        tsc_object_set(out, tsc_str_from_lit("value", 5), current);
    } else {
        tsc_object_set(out, tsc_str_from_lit("done", 4), tsc_value_bool(true));
        if (av->iter_has_return && !av->iter_return_consumed) {
            tsc_object_set(out, tsc_str_from_lit("value", 5), av->iter_return);
            av->iter_return_consumed = true;
        } else {
            tsc_object_set(out, tsc_str_from_lit("value", 5), tsc_value_undefined());
        }
    }
    return tsc_value_object(out);
}

static tsc_value_t tsc_value_generator_return(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    tsc_array_t* av = (tsc_array_t*)env;
    tsc_value_t valueArg = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    if (av->is_lazy_generator && av->lazy_close) {
        (void)av->lazy_close(av, av->env, valueArg, false);
    }
    av->iter_pos = av->len;
    av->is_lazy_generator = false;
    av->state = -1;
    av->iter_return_consumed = true;
    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("done", 4), tsc_value_bool(true));
    tsc_object_set(out, tsc_str_from_lit("value", 5), valueArg);
    return tsc_value_object(out);
}

static tsc_value_t tsc_value_generator_throw(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    tsc_array_t* av = (tsc_array_t*)env;
    tsc_value_t err = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    if (av->is_lazy_generator && av->lazy_close) {
        (void)av->lazy_close(av, av->env, err, true);
    }
    av->iter_pos = av->len;
    av->is_lazy_generator = false;
    av->state = -1;
    av->iter_return_consumed = true;
    tsc_str_t* errStr = tsc_value_to_string(err);
    tsc_throw_str(errStr);
    return tsc_value_undefined();
}

static tsc_value_t tsc_function_own_prototype(tsc_function_identity_t* ident, tsc_value_t fn) {
    if (!ident) return tsc_value_undefined();
    if (!ident->func_prototype_initialized) {
        tsc_object_t* proto = tsc_object_new();
        tsc_object_set(proto, tsc_str_from_lit("constructor", 11), fn);
        tsc_function_identity_set_own_prototype(ident, tsc_value_object(proto));
    }
    return ident->func_prototype;
}

static bool tsc_function_has_prototype_metadata(const tsc_function_identity_t* fn) {
    return fn && (fn->kind == TSC_FUNCTION_IDENTITY_GENERIC || fn->construct != NULL);
}

static bool tsc_function_metadata_key(const tsc_function_identity_t* fn, const tsc_str_t* key) {
    return str_lit_eq(key, "prototype") && tsc_function_has_prototype_metadata(fn);
}

tsc_value_t tsc_value_get_prop(tsc_value_t v, const tsc_str_t* key) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_GET_PROP);
    if (!value_is_box(v)) return tsc_value_undefined();
    if (value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* ident = (tsc_function_identity_t*)value_ptr(v);
        if (ident->kind == TSC_FUNCTION_IDENTITY_EVENT_RAW_LISTENER && str_lit_eq(key, "listener")) {
            return value_event_listener_identity(ident->code.event_raw_identity.fn, ident->env, ident->code.event_raw_identity.identity);
        }
        if (str_lit_eq(key, "prototype") && tsc_function_has_prototype_metadata(ident)) return tsc_function_own_prototype(ident, v);
        if (str_lit_eq(key, "__proto__")) return ident->prototype;
        if (ident->props && tsc_object_has_own(ident->props, key)) {
            return tsc_object_get_receiver(ident->props, key, v);
        }
        return tsc_value_get_prop_receiver(ident->prototype, key, v);
    }
    if (value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_get((tsc_object_t*)value_ptr(v), key);
    }
    if (value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        if (tsc_str_is_length_key(key)) return tsc_value_num((double)a->len);
        if (str_lit_eq(key, "next")) {
            return tsc_value_function_builtin_named(tsc_value_generator_next, a, 1.0, tsc_str_from_lit("next", 4));
        }
        if (str_lit_eq(key, "return")) {
            return tsc_value_function_builtin_named(tsc_value_generator_return, a, 1.0, tsc_str_from_lit("return", 6));
        }
        if (str_lit_eq(key, "throw")) {
            return tsc_value_function_builtin_named(tsc_value_generator_throw, a, 1.0, tsc_str_from_lit("throw", 5));
        }
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx)) {
            if (a->props && tsc_object_has_own(a->props, key)) {
                return tsc_object_get_receiver(a->props, key, v);
            }
            if (tsc_array_index_present(a, idx)) {
                if (a->box_element) return a->box_element((const char*)a->data + idx * a->es);
                if (a->es == sizeof(tsc_value_t)) return TSC_ARR(tsc_value_t, a, idx);
            }
        }
        if (str_lit_eq(key, "__proto__")) return a->prototype;
        if (a->props && tsc_object_has_own(a->props, key)) {
            return tsc_object_get_receiver(a->props, key, v);
        }
        return tsc_value_get_prop_receiver(a->prototype, key, v);
    }
    if (value_tag(v) == TSC_VALUE_TAG_STRING) {
        const tsc_str_t* s = (const tsc_str_t*)value_ptr(v);
        if (tsc_str_is_length_key(key)) return tsc_value_num((double)s->len);
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx) && idx < s->len) {
            return tsc_value_string(tsc_str_char_at(s, (double)idx));
        }
    }
    if (value_tag(v) == TSC_VALUE_TAG_BIGINT) {
        return tsc_value_get_prop_receiver(tsc_value_bigint_prototype(), key, v);
    }
    if (value_tag(v) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_value_get_prop_receiver(tsc_value_symbol_prototype(), key, v);
    }
    return tsc_value_undefined();
}

static tsc_object_prop_t* prop_cache_lookup(tsc_prop_cache_t* cache, tsc_object_t* object, const tsc_str_t* key) {
    if (!cache) return NULL;
    for (size_t i = 0; i < TSC_POLYMORPHIC_CACHE_SIZE; i++) {
        tsc_cache_entry_t* entry = &cache->entries[i];
        if (
            entry->shape &&
            entry->shape == object->shape &&
            entry->index < object->len &&
            (object->props[entry->index].key == key || tsc_str_eq(object->props[entry->index].key, key))
        ) {
            if (i > 0) {
                tsc_cache_entry_t hit = *entry;
                for (size_t j = i; j > 0; j--) {
                    cache->entries[j] = cache->entries[j - 1];
                }
                cache->entries[0] = hit;
            }
            return &object->props[cache->entries[0].index];
        }
    }
    return NULL;
}

static void prop_cache_store(tsc_prop_cache_t* cache, const tsc_object_t* object, size_t index) {
    if (!cache || !object->shape) return;
    for (size_t j = TSC_POLYMORPHIC_CACHE_SIZE - 1; j > 0; j--) {
        cache->entries[j] = cache->entries[j - 1];
    }
    cache->entries[0].shape = object->shape;
    cache->entries[0].index = index;
}

tsc_value_t tsc_value_get_prop_cached(tsc_value_t v, const tsc_str_t* key, tsc_prop_cache_t* cache) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) {
        return tsc_value_get_prop(v, key);
    }
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_GET_PROP);
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    if (!o || o->is_proxy || !cache) {
        tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_MISS);
        return tsc_object_get(o, key);
    }
    tsc_object_prop_t* cached = prop_cache_lookup(cache, o, key);
    if (cached) {
        tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_HIT);
        const tsc_object_prop_t* prop = cached;
        if (prop->accessor) return prop->getter ? prop->getter(prop->getter_env, v) : tsc_value_undefined();
        return prop->value;
    }
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_MISS);
    ssize_t idx = object_find(o, key);
    if (idx >= 0) {
        prop_cache_store(cache, o, (size_t)idx);
        const tsc_object_prop_t* prop = &o->props[(size_t)idx];
        if (prop->accessor) return prop->getter ? prop->getter(prop->getter_env, v) : tsc_value_undefined();
        return prop->value;
    }
    return tsc_object_get(o, key);
}

tsc_value_t tsc_value_get_prop_receiver(tsc_value_t v, const tsc_str_t* key, tsc_value_t receiver) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_GET_PROP_RECEIVER);
    if (!value_is_box(v)) return tsc_value_undefined();
    if (value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_get_receiver((tsc_object_t*)value_ptr(v), key, receiver);
    }
    if (value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        if (tsc_str_is_length_key(key)) return tsc_value_num((double)a->len);
        if (str_lit_eq(key, "next")) {
            return tsc_value_function_builtin_named(tsc_value_generator_next, a, 1.0, tsc_str_from_lit("next", 4));
        }
        if (str_lit_eq(key, "return")) {
            return tsc_value_function_builtin_named(tsc_value_generator_return, a, 1.0, tsc_str_from_lit("return", 6));
        }
        if (str_lit_eq(key, "throw")) {
            return tsc_value_function_builtin_named(tsc_value_generator_throw, a, 1.0, tsc_str_from_lit("throw", 5));
        }
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx)) {
            if (a->props && tsc_object_has_own(a->props, key)) {
                return tsc_object_get_receiver(a->props, key, receiver);
            }
            if (tsc_array_index_present(a, idx)) {
                if (a->box_element) return a->box_element((const char*)a->data + idx * a->es);
                if (a->es == sizeof(tsc_value_t)) return TSC_ARR(tsc_value_t, a, idx);
            }
        }
        if (str_lit_eq(key, "__proto__")) return a->prototype;
        if (a->props && tsc_object_has_own(a->props, key)) {
            return tsc_object_get_receiver(a->props, key, receiver);
        }
        return tsc_value_get_prop_receiver(a->prototype, key, receiver);
    }
    if (value_tag(v) == TSC_VALUE_TAG_STRING) {
        return tsc_value_get_prop(v, key);
    }
    if (value_tag(v) == TSC_VALUE_TAG_BIGINT) {
        return tsc_value_get_prop_receiver(tsc_value_bigint_prototype(), key, receiver);
    }
    if (value_tag(v) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_value_get_prop_receiver(tsc_value_symbol_prototype(), key, receiver);
    }
    if (value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* ident = (tsc_function_identity_t*)value_ptr(v);
        if (tsc_str_is_length_key(key)) return tsc_value_num(ident->length);
        if (str_lit_eq(key, "name")) return tsc_value_string(ident->name ? ident->name : tsc_str_from_lit("", 0));
        if (ident->kind == TSC_FUNCTION_IDENTITY_EVENT_RAW_LISTENER && str_lit_eq(key, "listener")) {
            return value_event_listener_identity(ident->code.event_raw_identity.fn, ident->env, ident->code.event_raw_identity.identity);
        }
        if (str_lit_eq(key, "prototype") && tsc_function_has_prototype_metadata(ident)) return tsc_function_own_prototype(ident, v);
        if (str_lit_eq(key, "__proto__")) return ident->prototype;
        if (ident->props && tsc_object_has_own(ident->props, key)) {
            return tsc_object_get_receiver(ident->props, key, receiver);
        }
        return tsc_value_get_prop_receiver(ident->prototype, key, receiver);
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_get_prop_receiver_cached(tsc_value_t v, const tsc_str_t* key, tsc_value_t receiver, tsc_prop_cache_t* cache) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) {
        return tsc_value_get_prop_receiver(v, key, receiver);
    }
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_GET_PROP_RECEIVER);
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    if (!o || o->is_proxy || !cache) {
        tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_MISS);
        return tsc_object_get_receiver(o, key, receiver);
    }
    tsc_object_prop_t* cached = prop_cache_lookup(cache, o, key);
    if (cached) {
        tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_HIT);
        const tsc_object_prop_t* prop = cached;
        if (prop->accessor) return prop->getter ? prop->getter(prop->getter_env, receiver) : tsc_value_undefined();
        return prop->value;
    }
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_MISS);
    ssize_t idx = object_find(o, key);
    if (idx >= 0) {
        prop_cache_store(cache, o, (size_t)idx);
        const tsc_object_prop_t* prop = &o->props[(size_t)idx];
        if (prop->accessor) return prop->getter ? prop->getter(prop->getter_env, receiver) : tsc_value_undefined();
        return prop->value;
    }
    return tsc_object_get_receiver(o, key, receiver);
}

tsc_value_t tsc_value_get_index(tsc_value_t v, double index) {
    if (!value_is_box(v)) return tsc_value_undefined();
    if (value_tag(v) == TSC_VALUE_TAG_STRING) {
        const tsc_str_t* s = (const tsc_str_t*)value_ptr(v);
        if (isnan(index) || isinf(index) || index < 0 || floor(index) != index || (size_t)index >= s->len) {
            return tsc_value_undefined();
        }
        return tsc_value_string(tsc_str_char_at(s, index));
    }
    if (value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_value_get_prop(v, tsc_str_from_num(index));
    }
    if (value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        return tsc_value_get_prop(v, tsc_str_from_num(index));
    }
    if (value_tag(v) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(v);
    if (a->es != sizeof(tsc_value_t) && !a->box_element) return tsc_value_undefined();
    if (isnan(index) || isinf(index) || index < 0 || floor(index) != index || index >= 4294967295.0) {
        return tsc_value_get_prop(v, tsc_str_from_num(index));
    }
    tsc_str_t* key = tsc_str_from_int((int64_t)index);
    if (a->props && tsc_object_has_own(a->props, key)) {
        return tsc_object_get_receiver(a->props, key, v);
    }
    if ((size_t)index >= a->len) {
        return tsc_value_get_prop_receiver(a->prototype, key, v);
    }
    if (!tsc_array_index_present(a, (size_t)index)) {
        return tsc_value_get_prop_receiver(a->prototype, key, v);
    }
    if (a->box_element) {
        return a->box_element((const char*)a->data + (size_t)index * a->es);
    }
    return TSC_ARR(tsc_value_t, a, (size_t)index);
}

bool tsc_value_set_array_own_index(tsc_value_t v, size_t idx, tsc_value_t value) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_ARRAY) return false;
    tsc_array_t* a = (tsc_array_t*)value_ptr(v);
    if (a->es != sizeof(tsc_value_t) && !a->unbox_element) return false;
    if (a->frozen) return false;
    tsc_str_t* key = tsc_str_from_int((int64_t)idx);
    bool exists = idx < a->len && tsc_array_index_present(a, idx);
    if (!exists && a->props && tsc_object_has_own(a->props, key)) exists = true;
    if (!exists && !a->extensible) return false;
    if (idx >= a->len && !a->length_writable) return false;
    while (a->len < idx) {
        tsc_array_reserve(a, a->len + 1);
        memset((char*)a->data + a->len * a->es, 0, a->es);
        a->len++;
        tsc_array_mark_hole(a, a->len - 1);
    }
    const void* stored = &value;
    void* converted = NULL;
    if (a->unbox_element) {
        converted = TSC_GC_MALLOC_ATOMIC(a->es);
        if (!a->unbox_element(value, converted)) return false;
        stored = converted;
    }
    if (idx == a->len) {
        tsc_array_push_raw(a, stored);
    } else {
        if (a->props && tsc_object_has_own(a->props, key)) {
            bool ok = tsc_object_set_receiver(a->props, key, value, v);
            if (ok) tsc_array_clear_hole(a, idx);
            return ok;
        }
        tsc_array_clear_hole(a, idx);
        memcpy((char*)a->data + idx * a->es, stored, a->es);
    }
    return true;
}

bool tsc_value_set_index(tsc_value_t v, double index, tsc_value_t value) {
    if (isnan(index) || isinf(index) || index < 0 || floor(index) != index || index >= 4294967295.0) {
        if (
            value_is_box(v) &&
            (
                value_tag(v) == TSC_VALUE_TAG_OBJECT ||
                value_tag(v) == TSC_VALUE_TAG_ARRAY ||
                value_tag(v) == TSC_VALUE_TAG_FUNCTION
            )
        ) {
            return tsc_value_set_prop(v, tsc_str_from_num(index), value);
        }
        return false;
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_value_set_prop(v, tsc_str_from_num(index), value);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        return tsc_value_set_prop(v, tsc_str_from_num(index), value);
    }
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_ARRAY) return false;
    tsc_array_t* a = (tsc_array_t*)value_ptr(v);
    if (a->es != sizeof(tsc_value_t) && !a->unbox_element) return false;
    size_t idx = (size_t)index;
    tsc_str_t* key = tsc_str_from_int((int64_t)idx);
    bool has_own = idx < a->len && tsc_array_index_present(a, idx);
    if (!has_own && a->props && tsc_object_has_own(a->props, key)) has_own = true;
    if (!has_own && tsc_value_has_prop(a->prototype, key)) {
        return tsc_value_set_prop_receiver(a->prototype, key, value, v);
    }
    return tsc_value_set_array_own_index(v, idx, value);
}

static bool array_length_to_size(tsc_value_t value, size_t* out) {
    double raw = tsc_value_as_num(value);
    if (isnan(raw) || isinf(raw) || raw < 0.0 || floor(raw) != raw || raw > 4294967295.0) {
        tsc_throw_str(tsc_str_from_cstr("RangeError: Invalid array length"));
    }
    *out = (size_t)raw;
    return true;
}

bool tsc_value_array_set_length(tsc_array_t* a, tsc_value_t value) {
    if (!a || (a->es != sizeof(tsc_value_t) && !a->unbox_element)) return false;
    size_t len = 0;
    array_length_to_size(value, &len);
    if (a->frozen || !a->length_writable) return false;
    if (a->sealed && len != a->len) return false;
    if (len > a->len && !a->extensible) return false;
    if (len < a->len && a->props) {
        for (size_t i = a->len; i > len; i--) {
            size_t idx = i - 1;
            tsc_str_t* key = tsc_str_from_int((int64_t)idx);
            if (tsc_object_has_own(a->props, key) && !tsc_object_delete(a->props, key)) {
                a->len = idx + 1;
                return false;
            }
        }
    }
    while (a->len < len) {
        tsc_array_reserve(a, a->len + 1);
        memset((char*)a->data + a->len * a->es, 0, a->es);
        a->len++;
        tsc_array_mark_hole(a, a->len - 1);
    }
    a->len = len;
    return true;
}

tsc_value_t tsc_value_define_property(tsc_value_t v, tsc_str_t* key, tsc_value_t value) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_define((tsc_object_t*)value_ptr(v), key, value, false, false, false);
    } else if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(v);
        if (!tsc_function_metadata_key(fn, key)) {
            tsc_object_define(fn->props, key, value, false, false, false);
        }
    }
    return v;
}

static void require_reflect_object_target(tsc_value_t v, const char* message);

static bool tsc_value_define_function_metadata_desc(const tsc_function_identity_t* fn, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    if (!fn) return false;
    tsc_value_t current = tsc_value_undefined();
    bool current_writable = false;
    if (tsc_str_is_length_key(key)) {
        current = tsc_value_num(fn->length);
    } else if (str_lit_eq(key, "name")) {
        current = tsc_value_string(fn->name ? fn->name : tsc_str_from_lit("", 0));
    } else if (str_lit_eq(key, "prototype")) {
        tsc_function_identity_t* mutable_fn = (tsc_function_identity_t*)fn;
        current = tsc_function_own_prototype(mutable_fn, value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)mutable_fn));
        current_writable = !fn->frozen && fn->func_prototype_writable;
    } else {
        return false;
    }
    if (has_configurable && configurable) return false;
    if (has_enumerable && enumerable) return false;
    if (has_writable && writable && !current_writable) return false;
    if (!current_writable && has_value && !tsc_value_object_is(value, current)) return false;
    if (current_writable && has_value) {
        tsc_function_identity_set_own_prototype((tsc_function_identity_t*)fn, value);
    }
    if (str_lit_eq(key, "prototype") && has_writable && !writable) {
        ((tsc_function_identity_t*)fn)->func_prototype_writable = false;
    }
    return true;
}

bool tsc_value_define_property_desc(tsc_value_t v, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_define_desc((tsc_object_t*)value_ptr(v), key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(v);
        if (tsc_function_metadata_key(fn, key)) {
            return tsc_value_define_function_metadata_desc(fn, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
        }
        return tsc_object_define_desc(fn->props, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        if (tsc_str_is_length_key(key)) {
            bool current_writable = !a->frozen && a->length_writable;
            bool next_writable = has_writable ? writable : current_writable;
            bool next_enumerable = has_enumerable ? enumerable : false;
            bool next_configurable = has_configurable ? configurable : false;
            if (next_enumerable || next_configurable) return false;
            if (!current_writable) {
                if (next_writable) return false;
                if (!has_value) return true;
                size_t len = 0;
                array_length_to_size(value, &len);
                return len == a->len;
            }
            if (has_value && !tsc_value_array_set_length(a, value)) {
                if (!next_writable) a->length_writable = false;
                return false;
            }
            if (!next_writable) a->length_writable = false;
            return true;
        }
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx)) {
            bool side_exists = a->props && tsc_object_has_own(a->props, key);
            if (side_exists) {
                return tsc_object_define_desc(a->props, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
            }
            bool exists = tsc_array_index_present(a, idx);
            bool current_writable = !a->frozen;
            bool current_enumerable = true;
            bool current_configurable = !a->sealed && !a->frozen;
            bool next_writable = has_writable ? writable : (exists ? current_writable : false);
            bool next_enumerable = has_enumerable ? enumerable : (exists ? current_enumerable : false);
            bool next_configurable = has_configurable ? configurable : (exists ? current_configurable : false);
            if (exists) {
                if (a->frozen) {
                    if (next_writable != current_writable || next_enumerable != current_enumerable || next_configurable != current_configurable) return false;
                    if (has_value && !tsc_value_object_is(value, TSC_ARR(tsc_value_t, a, idx))) return false;
                    return true;
                }
                tsc_value_t current = TSC_ARR(tsc_value_t, a, idx);
                bool props_extensible = a->props->extensible;
                a->props->extensible = true;
                bool migrated = tsc_object_define(a->props, key, current, current_writable, current_enumerable, current_configurable);
                a->props->extensible = props_extensible;
                if (!migrated) return false;
                if (tsc_object_define_desc(a->props, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable)) {
                    return true;
                }
                (void)tsc_object_delete(a->props, key);
                return false;
            }
            if (!a->extensible || (idx >= a->len && !a->length_writable)) {
                return false;
            }
            size_t old_len = a->len;
            while (a->len <= idx) {
                tsc_value_t undef = tsc_value_undefined();
                tsc_array_push_raw(a, &undef);
                tsc_array_mark_hole(a, a->len - 1);
            }
            bool ok = tsc_object_define_desc(a->props, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
            if (ok) {
                tsc_array_clear_hole(a, idx);
                return true;
            }
            a->len = old_len;
            return false;
        }
        return tsc_object_define_desc(a->props, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
    }
    return false;
}

static tsc_str_t* value_known_symbol_internal_key(tsc_symbol_t* key) {
    return tsc_symbol_property_key(key);
}

static bool value_is_known_symbol_internal_key(const tsc_str_t* key) {
    return tsc_property_key_symbol(key) != NULL;
}

static tsc_symbol_t* value_known_symbol_from_internal_key(const tsc_str_t* key) {
    return tsc_property_key_symbol(key);
}

static tsc_array_t* value_object_string_keys(const tsc_object_t* o, bool enumerable_only) {
    tsc_array_t* keys = enumerable_only ? tsc_object_keys_dyn(o) : tsc_object_own_keys_dyn(o);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_str_t*), keys ? keys->len : 1);
    if (!keys) return out;
    for (size_t i = 0; i < keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
        if (value_is_known_symbol_internal_key(key)) continue;
        tsc_array_push_raw(out, &key);
    }
    return out;
}

static tsc_array_t* value_object_string_values(const tsc_object_t* o) {
    tsc_array_t* keys = value_object_string_keys(o, true);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), keys ? keys->len : 1);
    if (!o || !keys) return out;
    for (size_t i = 0; i < keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
        tsc_value_t value = tsc_object_get((tsc_object_t*)o, key);
        tsc_array_push_raw(out, &value);
    }
    return out;
}

static tsc_array_t* value_object_string_entries(const tsc_object_t* o) {
    tsc_array_t* keys = value_object_string_keys(o, true);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), keys ? keys->len : 1);
    if (!o || !keys) return out;
    for (size_t i = 0; i < keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
        tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_value_t key_value = tsc_value_string(key);
        tsc_value_t value = tsc_object_get((tsc_object_t*)o, key);
        tsc_array_push_raw(pair, &key_value);
        tsc_array_push_raw(pair, &value);
        tsc_value_t boxed = tsc_value_array(pair);
        tsc_array_push_raw(out, &boxed);
    }
    return out;
}

bool tsc_value_define_symbol_property_desc(tsc_value_t v, tsc_symbol_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    tsc_str_t* internal_key = value_known_symbol_internal_key(key);
    if (internal_key) {
        return tsc_value_define_property_desc(v, internal_key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
    }
    return false;
}

tsc_value_t tsc_value_get_symbol_prop(tsc_value_t v, tsc_symbol_t* key) {
    tsc_str_t* internal_key = value_known_symbol_internal_key(key);
    if (internal_key) return tsc_value_get_prop(v, internal_key);
    return tsc_value_undefined();
}

void tsc_value_dispose_sync(tsc_value_t value) {
    if (tsc_value_is_nullish(value)) return;
    tsc_value_t method = tsc_value_get_symbol_prop(value, tsc_symbol_dispose());
    if (tsc_value_is_undefined(method) || tsc_value_is_nullish(method)) {
        tsc_throw_str(tsc_str_from_cstr("Object is not disposable"));
    }
    if (!tsc_value_is_callable(method)) {
        tsc_throw_str(tsc_str_from_cstr("Symbol.dispose is not callable"));
    }
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 0);
    (void)tsc_value_apply_function(method, value, tsc_value_array(args));
}

tsc_promise_t* tsc_value_dispose_async(tsc_value_t value) {
    if (tsc_value_is_nullish(value)) return tsc_promise_resolve(tsc_value_undefined());
    tsc_value_t method = tsc_value_get_symbol_prop(value, tsc_symbol_async_dispose());
    if (tsc_value_is_undefined(method) || tsc_value_is_nullish(method)) {
        return tsc_promise_reject(tsc_value_string(tsc_str_from_cstr("Object is not asynchronously disposable")));
    }
    if (!tsc_value_is_callable(method)) {
        return tsc_promise_reject(tsc_value_string(tsc_str_from_cstr("Symbol.asyncDispose is not callable")));
    }
    TSC_TRY_FRAME(eh);
    tsc_try_push(&eh);
    if (setjmp(eh.jb) == 0) {
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 0);
        tsc_value_t result = tsc_value_apply_function(method, value, tsc_value_array(args));
        tsc_try_pop();
        return tsc_promise_resolve_thenable(result);
    }
    tsc_try_pop();
    return tsc_promise_reject(tsc_value_string(tsc_current_error()));
}

static bool descriptor_field(tsc_value_t desc, const char* name, size_t len, tsc_value_t* out) {
    const tsc_str_t* key = tsc_str_from_lit(name, len);
    if (!tsc_value_has_prop(desc, key)) return false;
    if (out) *out = tsc_value_get_prop(desc, key);
    return true;
}

static void* dynamic_accessor_env(tsc_value_t fn) {
    tsc_value_t* env = (tsc_value_t*)TSC_GC_MALLOC(sizeof(tsc_value_t));
    *env = fn;
    return env;
}

tsc_value_t tsc_value_dynamic_accessor_getter(void* env, tsc_value_t receiver) {
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    return tsc_value_apply_function(*(tsc_value_t*)env, receiver, tsc_value_array(args));
}

bool tsc_value_dynamic_accessor_setter(void* env, tsc_value_t receiver, tsc_value_t value) {
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_array_push_value(args, value);
    tsc_value_apply_function(*(tsc_value_t*)env, receiver, tsc_value_array(args));
    return true;
}

typedef struct tsc_parsed_property_descriptor {
    tsc_str_t* key;
    bool accessor;
    tsc_value_t value;
    bool has_value;
    bool writable;
    bool has_writable;
    tsc_accessor_getter_t getter;
    void* getter_env;
    bool has_getter;
    tsc_accessor_setter_t setter;
    void* setter_env;
    bool has_setter;
    bool enumerable;
    bool has_enumerable;
    bool configurable;
    bool has_configurable;
} tsc_parsed_property_descriptor_t;

static bool value_is_property_descriptor_object(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    tsc_value_tag_t tag = value_tag(v);
    return tag == TSC_VALUE_TAG_OBJECT || tag == TSC_VALUE_TAG_ARRAY || tag == TSC_VALUE_TAG_FUNCTION;
}

static tsc_parsed_property_descriptor_t parse_property_descriptor(tsc_value_t desc) {
    if (!value_is_property_descriptor_object(desc)) {
        tsc_throw_str(tsc_str_from_cstr("Object.defineProperty descriptor must be an object"));
    }
    tsc_value_t value = tsc_value_undefined();
    tsc_value_t writable_value = tsc_value_undefined();
    tsc_value_t enumerable_value = tsc_value_undefined();
    tsc_value_t configurable_value = tsc_value_undefined();
    tsc_value_t getter_value = tsc_value_undefined();
    tsc_value_t setter_value = tsc_value_undefined();
    bool has_value = descriptor_field(desc, "value", 5, &value);
    bool has_writable = descriptor_field(desc, "writable", 8, &writable_value);
    bool has_enumerable = descriptor_field(desc, "enumerable", 10, &enumerable_value);
    bool has_configurable = descriptor_field(desc, "configurable", 12, &configurable_value);
    bool has_getter = descriptor_field(desc, "get", 3, &getter_value);
    bool has_setter = descriptor_field(desc, "set", 3, &setter_value);
    tsc_parsed_property_descriptor_t out;
    out.key = NULL;
    out.accessor = has_getter || has_setter;
    out.value = value;
    out.has_value = has_value;
    out.writable = has_writable ? tsc_value_is_truthy(writable_value) : false;
    out.has_writable = has_writable;
    out.getter = NULL;
    out.getter_env = NULL;
    out.has_getter = has_getter;
    out.setter = NULL;
    out.setter_env = NULL;
    out.has_setter = has_setter;
    out.enumerable = has_enumerable ? tsc_value_is_truthy(enumerable_value) : false;
    out.has_enumerable = has_enumerable;
    out.configurable = has_configurable ? tsc_value_is_truthy(configurable_value) : false;
    out.has_configurable = has_configurable;
    if (has_getter || has_setter) {
        if (has_value || has_writable) {
            tsc_throw_str(tsc_str_from_cstr("Object.defineProperty descriptor cannot mix value with get/set"));
        }
        if (has_getter && !tsc_value_is_undefined(getter_value)) {
            if (!value_is_callable_function(getter_value)) {
                tsc_throw_str(tsc_str_from_cstr("Object.defineProperty getter must be callable"));
            }
            out.getter = tsc_value_dynamic_accessor_getter;
            out.getter_env = dynamic_accessor_env(getter_value);
        }
        if (has_setter && !tsc_value_is_undefined(setter_value)) {
            if (!value_is_callable_function(setter_value)) {
                tsc_throw_str(tsc_str_from_cstr("Object.defineProperty setter must be callable"));
            }
            out.setter = tsc_value_dynamic_accessor_setter;
            out.setter_env = dynamic_accessor_env(setter_value);
        }
    }
    return out;
}

static bool apply_property_descriptor(tsc_value_t v, tsc_str_t* key, const tsc_parsed_property_descriptor_t* desc) {
    if (desc->accessor) {
        return tsc_value_define_accessor_desc(
            v,
            key,
            desc->getter,
            desc->getter_env,
            desc->has_getter,
            desc->setter,
            desc->setter_env,
            desc->has_setter,
            desc->enumerable,
            desc->has_enumerable,
            desc->configurable,
            desc->has_configurable
        );
    }
    return tsc_value_define_property_desc(
        v,
        key,
        desc->value,
        desc->has_value,
        desc->writable,
        desc->has_writable,
        desc->enumerable,
        desc->has_enumerable,
        desc->configurable,
        desc->has_configurable
    );
}

bool tsc_value_define_property_descriptor(tsc_value_t v, tsc_str_t* key, tsc_value_t desc) {
    tsc_parsed_property_descriptor_t parsed = parse_property_descriptor(desc);
    return apply_property_descriptor(v, key, &parsed);
}

bool tsc_value_define_computed_property_descriptor(
    tsc_value_t v,
    tsc_value_t key,
    tsc_value_t desc
) {
    key = tsc_value_to_property_key(key);
    if (value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL) {
        tsc_symbol_t* symbol = (tsc_symbol_t*)value_ptr(key);
        tsc_parsed_property_descriptor_t parsed = parse_property_descriptor(desc);
        if (parsed.accessor) {
            tsc_str_t* internal_key = value_known_symbol_internal_key(symbol);
            if (!internal_key) return false;
            return apply_property_descriptor(v, internal_key, &parsed);
        }
        return tsc_value_define_symbol_property_desc(
            v,
            symbol,
            parsed.value,
            parsed.has_value,
            parsed.writable,
            parsed.has_writable,
            parsed.enumerable,
            parsed.has_enumerable,
            parsed.configurable,
            parsed.has_configurable
        );
    }
    return tsc_value_define_property_descriptor(v, (tsc_str_t*)value_ptr(key), desc);
}

bool tsc_value_define_properties_descriptor_map(tsc_value_t v, tsc_value_t descriptors) {
    if (!value_is_property_descriptor_object(descriptors)) {
        tsc_throw_str(tsc_str_from_cstr("Object.defineProperties descriptor map must be an object"));
    }
    tsc_array_t* keys = tsc_value_raw_own_keys(descriptors);
    tsc_array_t* parsed = tsc_array_new(sizeof(tsc_parsed_property_descriptor_t), keys->len ? keys->len : 1);
    for (size_t i = 0; i < keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
        if (!tsc_value_property_is_enumerable(descriptors, key)) continue;
        tsc_value_t desc = tsc_value_get_prop(descriptors, key);
        tsc_parsed_property_descriptor_t prop = parse_property_descriptor(desc);
        prop.key = key;
        tsc_array_push_raw(parsed, &prop);
    }
    for (size_t i = 0; i < parsed->len; i++) {
        tsc_parsed_property_descriptor_t prop = TSC_ARR(tsc_parsed_property_descriptor_t, parsed, i);
        if (!apply_property_descriptor(v, prop.key, &prop)) return false;
    }
    return true;
}

static bool value_is_object_coercible_primitive(tsc_value_t v) {
    if (!value_is_box(v)) return true;
    tsc_value_tag_t tag = value_tag(v);
    return tag == TSC_VALUE_TAG_FALSE ||
        tag == TSC_VALUE_TAG_TRUE ||
        tag == TSC_VALUE_TAG_STRING ||
        tag == TSC_VALUE_TAG_BIGINT ||
        tag == TSC_VALUE_TAG_SYMBOL;
}

bool tsc_value_define_accessor_desc(tsc_value_t v, tsc_str_t* key, tsc_accessor_getter_t getter, void* getter_env, bool has_getter, tsc_accessor_setter_t setter, void* setter_env, bool has_setter, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_define_accessor((tsc_object_t*)value_ptr(v), key, getter, getter_env, has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(v);
        if (tsc_function_metadata_key(fn, key)) return false;
        return tsc_object_define_accessor(fn->props, key, getter, getter_env, has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        if (tsc_str_is_length_key(key)) return false;
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx)) {
            bool side_exists = a->props && tsc_object_has_own(a->props, key);
            bool exists = tsc_array_index_present(a, idx) || side_exists;
            if (exists) {
                bool current_configurable = !a->sealed && !a->frozen;
                bool next_configurable = has_configurable ? configurable : current_configurable;
                bool next_enumerable = has_enumerable ? enumerable : true;
                if (!current_configurable) return false;
                if (a->frozen) return false;
                bool props_extensible = a->props->extensible;
                if (!side_exists) a->props->extensible = true;
                bool ok = tsc_object_define_accessor(a->props, key, getter, getter_env, has_getter, setter, setter_env, has_setter, next_enumerable, true, next_configurable, true);
                a->props->extensible = props_extensible;
                if (ok) tsc_array_clear_hole(a, idx);
                return ok;
            }
            if (!a->extensible || (idx >= a->len && !a->length_writable)) return false;
            size_t old_len = a->len;
            while (a->len < idx) {
                tsc_value_t undef = tsc_value_undefined();
                tsc_array_push_raw(a, &undef);
                tsc_array_mark_hole(a, a->len - 1);
            }
            if (idx == a->len) {
                tsc_value_t undef = tsc_value_undefined();
                tsc_array_push_raw(a, &undef);
                tsc_array_mark_hole(a, a->len - 1);
            }
            bool ok = tsc_object_define_accessor(a->props, key, getter, getter_env, has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable);
            if (ok) tsc_array_clear_hole(a, idx);
            else a->len = old_len;
            return ok;
        }
        return tsc_object_define_accessor(a->props, key, getter, getter_env, has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable);
    }
    return false;
}

bool tsc_value_object_define_getter(tsc_value_t v, tsc_str_t* key, tsc_value_t getter) {
    if (tsc_value_is_nullish(v)) {
        tsc_throw_str(tsc_str_from_cstr("Object.prototype.__defineGetter__ receiver is null or undefined"));
    }
    if (!value_is_callable_function(getter)) {
        tsc_throw_str(tsc_str_from_cstr("Object.prototype.__defineGetter__ getter must be callable"));
    }
    if (value_is_object_coercible_primitive(v)) return true;
    return tsc_value_define_accessor_desc(
        v,
        key,
        tsc_value_dynamic_accessor_getter,
        dynamic_accessor_env(getter),
        true,
        NULL,
        NULL,
        false,
        true,
        true,
        true,
        true
    );
}

bool tsc_value_object_define_setter(tsc_value_t v, tsc_str_t* key, tsc_value_t setter) {
    if (tsc_value_is_nullish(v)) {
        tsc_throw_str(tsc_str_from_cstr("Object.prototype.__defineSetter__ receiver is null or undefined"));
    }
    if (!value_is_callable_function(setter)) {
        tsc_throw_str(tsc_str_from_cstr("Object.prototype.__defineSetter__ setter must be callable"));
    }
    if (value_is_object_coercible_primitive(v)) return true;
    return tsc_value_define_accessor_desc(
        v,
        key,
        NULL,
        NULL,
        false,
        tsc_value_dynamic_accessor_setter,
        dynamic_accessor_env(setter),
        true,
        true,
        true,
        true,
        true
    );
}

static tsc_value_t lookup_accessor(tsc_value_t v, tsc_str_t* key, const char* field, size_t field_len, const char* nullish_message) {
    if (tsc_value_is_nullish(v)) {
        tsc_throw_str(tsc_str_from_cstr(nullish_message));
    }
    tsc_value_t cur = v;
    while (!tsc_value_is_nullish(cur) && !tsc_value_is_undefined(cur)) {
        tsc_value_t desc = tsc_value_get_own_property_descriptor(cur, key);
        if (!tsc_value_is_undefined(desc)) {
            return tsc_value_get_prop(desc, tsc_str_from_lit(field, field_len));
        }
        cur = tsc_value_get_prototype_of(cur);
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_object_lookup_getter(tsc_value_t v, tsc_str_t* key) {
    return lookup_accessor(
        v,
        key,
        "get",
        3,
        "Object.prototype.__lookupGetter__ receiver is null or undefined"
    );
}

tsc_value_t tsc_value_object_lookup_setter(tsc_value_t v, tsc_str_t* key) {
    return lookup_accessor(
        v,
        key,
        "set",
        3,
        "Object.prototype.__lookupSetter__ receiver is null or undefined"
    );
}

bool tsc_reflect_define_property_desc(tsc_value_t v, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    require_reflect_object_target(v, "Reflect.defineProperty target must be an object");
    return tsc_value_define_property_desc(v, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
}

bool tsc_reflect_define_symbol_property_desc(tsc_value_t v, tsc_symbol_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    require_reflect_object_target(v, "Reflect.defineProperty target must be an object");
    return tsc_value_define_symbol_property_desc(v, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
}

bool tsc_reflect_define_property_descriptor(tsc_value_t v, tsc_str_t* key, tsc_value_t desc) {
    require_reflect_object_target(v, "Reflect.defineProperty target must be an object");
    return tsc_value_define_property_descriptor(v, key, desc);
}

bool tsc_reflect_define_computed_property_descriptor(
    tsc_value_t v,
    tsc_value_t key,
    tsc_value_t desc
) {
    require_reflect_object_target(v, "Reflect.defineProperty target must be an object");
    return tsc_value_define_computed_property_descriptor(v, key, desc);
}

bool tsc_reflect_define_accessor_desc(tsc_value_t v, tsc_str_t* key, tsc_accessor_getter_t getter, void* getter_env, bool has_getter, tsc_accessor_setter_t setter, void* setter_env, bool has_setter, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    require_reflect_object_target(v, "Reflect.defineProperty target must be an object");
    return tsc_value_define_accessor_desc(v, key, getter, getter_env, has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable);
}

tsc_value_t tsc_value_object_create(tsc_value_t prototype) {
    if (!value_is_valid_prototype(prototype)) {
        tsc_throw_str(tsc_str_from_cstr("Object.create prototype must be an object or null"));
    }
    tsc_object_t* o = tsc_object_new();
    o->prototype = prototype;
    return tsc_value_object(o);
}

bool tsc_value_is_prototype_of(tsc_value_t prototype, tsc_value_t object) {
    if (!value_is_box(prototype) || !value_is_box(object)) return false;
    tsc_value_tag_t proto_tag = value_tag(prototype);
    tsc_value_tag_t obj_tag = value_tag(object);
    if (proto_tag != TSC_VALUE_TAG_OBJECT && proto_tag != TSC_VALUE_TAG_ARRAY && proto_tag != TSC_VALUE_TAG_FUNCTION) {
        return false;
    }
    if (obj_tag != TSC_VALUE_TAG_OBJECT && obj_tag != TSC_VALUE_TAG_ARRAY && obj_tag != TSC_VALUE_TAG_FUNCTION) {
        return false;
    }
    const void* needle = (const void*)value_ptr(prototype);
    tsc_value_t cur = tsc_value_get_prototype_of(object);
    while (value_is_box(cur)) {
        tsc_value_tag_t cur_tag = value_tag(cur);
        if (cur_tag != TSC_VALUE_TAG_OBJECT && cur_tag != TSC_VALUE_TAG_ARRAY && cur_tag != TSC_VALUE_TAG_FUNCTION) break;
        if (value_ptr(cur) == needle) return true;
        cur = tsc_value_get_prototype_of(cur);
    }
    return false;
}

bool tsc_value_chain_contains(tsc_value_t prototype, tsc_value_t needle) {
    if (!value_is_box(needle)) return false;
    tsc_value_tag_t needle_tag = value_tag(needle);
    if (
        needle_tag != TSC_VALUE_TAG_OBJECT &&
        needle_tag != TSC_VALUE_TAG_ARRAY &&
        needle_tag != TSC_VALUE_TAG_FUNCTION
    ) {
        return false;
    }
    const void* needle_ptr = value_ptr(needle);
    while (value_is_box(prototype)) {
        tsc_value_tag_t tag = value_tag(prototype);
        if (tag == needle_tag && value_ptr(prototype) == needle_ptr) return true;
        if (
            tag == TSC_VALUE_TAG_OBJECT ||
            tag == TSC_VALUE_TAG_ARRAY ||
            tag == TSC_VALUE_TAG_FUNCTION
        ) {
            prototype = tsc_value_get_prototype_of(prototype);
            continue;
        }
        break;
    }
    return false;
}

tsc_value_t tsc_value_get_prototype_of(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_get_prototype_of((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return ((tsc_array_t*)value_ptr(v))->prototype;
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        return ((tsc_function_identity_t*)value_ptr(v))->prototype;
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_number_prototype(void) {
    return primitive_prototype(&primitive_number);
}

tsc_value_t tsc_value_boolean_prototype(void) {
    return primitive_prototype(&primitive_boolean);
}

tsc_value_t tsc_value_string_prototype(void) {
    return primitive_prototype(&primitive_string);
}

tsc_value_t tsc_value_bigint_prototype(void) {
    return primitive_prototype(&primitive_bigint);
}

tsc_value_t tsc_value_symbol_prototype(void) {
    return primitive_prototype(&primitive_symbol);
}

tsc_value_t tsc_value_object_get_prototype_of(tsc_value_t v) {
    if (tsc_value_is_nullish(v)) {
        tsc_throw_str(tsc_str_from_cstr("Object.getPrototypeOf target must not be null or undefined"));
    }
    if (value_is_box(v)) {
        switch (value_tag(v)) {
            case TSC_VALUE_TAG_OBJECT:
            case TSC_VALUE_TAG_ARRAY:
            case TSC_VALUE_TAG_FUNCTION:
                return tsc_value_get_prototype_of(v);
            case TSC_VALUE_TAG_FALSE:
            case TSC_VALUE_TAG_TRUE:
                return tsc_value_boolean_prototype();
            case TSC_VALUE_TAG_STRING:
                return tsc_value_string_prototype();
            case TSC_VALUE_TAG_BIGINT:
                return tsc_value_bigint_prototype();
            case TSC_VALUE_TAG_SYMBOL:
                return tsc_value_symbol_prototype();
            case TSC_VALUE_TAG_UNDEFINED:
            case TSC_VALUE_TAG_NULL:
                break;
        }
    } else {
        return tsc_value_number_prototype();
    }
    return tsc_value_undefined();
}

bool tsc_value_set_prototype_of(tsc_value_t v, tsc_value_t prototype) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_set_prototype_of((tsc_object_t*)value_ptr(v), prototype);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        if (!value_is_valid_prototype(prototype)) return false;
        if (a->prototype == prototype) return true;
        if (!a->extensible) return false;
        if (tsc_value_chain_contains(prototype, v)) return false;
        a->prototype = prototype;
        return true;
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(v);
        if (!value_is_valid_prototype(prototype)) return false;
        if (fn->prototype == prototype) return true;
        if (!fn->extensible) return false;
        if (tsc_value_chain_contains(prototype, v)) return false;
        tsc_function_identity_set_prototype(fn, prototype);
        return true;
    }
    return false;
}

void tsc_value_object_require_valid_prototype(tsc_value_t prototype) {
    if (!value_is_valid_prototype(prototype)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.setPrototypeOf prototype must be an object or null"));
    }
}

bool tsc_value_object_set_prototype_of(tsc_value_t v, tsc_value_t prototype) {
    if (tsc_value_is_nullish(v)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.setPrototypeOf target must not be null or undefined"));
    }
    tsc_value_object_require_valid_prototype(prototype);
    if (
        !value_is_box(v) ||
        (value_tag(v) != TSC_VALUE_TAG_OBJECT && value_tag(v) != TSC_VALUE_TAG_ARRAY && value_tag(v) != TSC_VALUE_TAG_FUNCTION)
    ) {
        return true;
    }
    if (!tsc_value_set_prototype_of(v, prototype)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.setPrototypeOf failed"));
    }
    return true;
}

static bool value_is_reflect_object_target(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    tsc_value_tag_t tag = value_tag(v);
    return tag == TSC_VALUE_TAG_OBJECT || tag == TSC_VALUE_TAG_ARRAY || tag == TSC_VALUE_TAG_FUNCTION;
}

static void require_reflect_object_target(tsc_value_t v, const char* message) {
    if (!value_is_reflect_object_target(v)) {
        tsc_throw_str(tsc_str_from_cstr(message));
    }
}

tsc_value_t tsc_reflect_get_prototype_of(tsc_value_t v) {
    require_reflect_object_target(v, "Reflect.getPrototypeOf target must be an object");
    return tsc_value_get_prototype_of(v);
}

bool tsc_reflect_set_prototype_of(tsc_value_t v, tsc_value_t prototype) {
    require_reflect_object_target(v, "Reflect.setPrototypeOf target must be an object");
    if (!value_is_valid_prototype(prototype)) {
        tsc_throw_str(tsc_str_from_cstr("Reflect.setPrototypeOf prototype must be an object or null"));
    }
    return tsc_value_set_prototype_of(v, prototype);
}

tsc_value_t tsc_reflect_get_prop(tsc_value_t v, const tsc_str_t* key) {
    require_reflect_object_target(v, "Reflect.get target must be an object");
    return tsc_value_get_prop(v, key);
}

tsc_value_t tsc_reflect_get_prop_cached(tsc_value_t v, const tsc_str_t* key, tsc_prop_cache_t* cache) {
    require_reflect_object_target(v, "Reflect.get target must be an object");
    return tsc_value_get_prop_cached(v, key, cache);
}

tsc_value_t tsc_reflect_get_prop_receiver(tsc_value_t v, const tsc_str_t* key, tsc_value_t receiver) {
    require_reflect_object_target(v, "Reflect.get target must be an object");
    return tsc_value_get_prop_receiver(v, key, receiver);
}

tsc_value_t tsc_reflect_get_computed_prop_receiver(
    tsc_value_t v,
    tsc_value_t key,
    tsc_value_t receiver
) {
    require_reflect_object_target(v, "Reflect.get target must be an object");
    return tsc_value_get_computed_prop_receiver(v, key, receiver);
}

tsc_value_t tsc_reflect_get_prop_receiver_cached(tsc_value_t v, const tsc_str_t* key, tsc_value_t receiver, tsc_prop_cache_t* cache) {
    require_reflect_object_target(v, "Reflect.get target must be an object");
    return tsc_value_get_prop_receiver_cached(v, key, receiver, cache);
}

bool tsc_value_set_prop(tsc_value_t v, tsc_str_t* key, tsc_value_t value) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_SET_PROP);
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_set((tsc_object_t*)value_ptr(v), key, value);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        if (str_lit_eq(key, "__proto__")) {
            if (!value_is_valid_prototype(value)) return true;
            return tsc_value_set_prototype_of(v, value);
        }
        if (tsc_str_is_length_key(key)) return tsc_value_array_set_length(a, value);
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx)) return tsc_value_set_index(v, (double)idx, value);
        ssize_t side_idx = a->props ? object_find(a->props, key) : -1;
        if (side_idx >= 0) {
            const tsc_object_prop_t* prop = &a->props->props[(size_t)side_idx];
            if (prop->accessor) {
                return tsc_object_set_receiver(a->props, key, value, v);
            }
            return tsc_object_set(a->props, key, value);
        }
        return tsc_object_set(a->props, key, value);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(v);
        if (str_lit_eq(key, "__proto__")) {
            if (!value_is_valid_prototype(value)) return true;
            return tsc_value_set_prototype_of(v, value);
        }
        if (str_lit_eq(key, "prototype") && tsc_function_has_prototype_metadata(fn)) {
            if (fn->frozen || !fn->func_prototype_writable) return false;
            tsc_function_identity_set_own_prototype(fn, value);
            return true;
        }
        if (tsc_function_metadata_key(fn, key)) return false;
        return tsc_object_set_receiver(fn->props, key, value, v);
    }
    return false;
}

bool tsc_value_set_symbol_prop(tsc_value_t v, tsc_symbol_t* key, tsc_value_t value) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_SET_PROP);
    tsc_str_t* internal_key = value_known_symbol_internal_key(key);
    if (internal_key) return tsc_value_set_prop(v, internal_key, value);
    return false;
}

bool tsc_value_set_prop_cached(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_prop_cache_t* cache) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) {
        return tsc_value_set_prop(v, key, value);
    }
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_SET_PROP);
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    if (!o || o->is_proxy || !cache) {
        tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_MISS);
        return tsc_object_set(o, key, value);
    }
    tsc_object_prop_t* cached = prop_cache_lookup(cache, o, key);
    if (cached) {
        tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_HIT);
        tsc_object_prop_t* prop = cached;
        if (prop->accessor) return prop->setter ? prop->setter(prop->setter_env, v, value) : false;
        if (!prop->writable) return false;
        prop->value = value;
        return true;
    }
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_MISS);
    bool ok = tsc_object_set(o, key, value);
    ssize_t idx = object_find(o, key);
    if (idx >= 0) {
        prop_cache_store(cache, o, (size_t)idx);
    }
    return ok;
}

static bool tsc_value_define_receiver_data(tsc_value_t receiver, tsc_str_t* key, tsc_value_t value) {
    if (!value_is_box(receiver)) return false;
    tsc_value_tag_t tag = value_tag(receiver);
    if (tag != TSC_VALUE_TAG_OBJECT && tag != TSC_VALUE_TAG_ARRAY && tag != TSC_VALUE_TAG_FUNCTION) {
        return false;
    }
    return tsc_value_define_property_desc(receiver, key, value, true, true, true, true, true, true, true);
}

bool tsc_value_set_prop_receiver(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_SET_PROP_RECEIVER);
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_set_receiver((tsc_object_t*)value_ptr(v), key, value, receiver);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        ssize_t side_idx = a->props ? object_find(a->props, key) : -1;
        if (side_idx >= 0) {
            const tsc_object_prop_t* prop = &a->props->props[(size_t)side_idx];
            if (!prop->accessor && receiver == v) {
                return tsc_object_set(a->props, key, value);
            }
            return tsc_object_set_receiver(a->props, key, value, receiver);
        }
        return tsc_value_define_receiver_data(receiver, key, value);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(v);
        if (fn->props && tsc_object_has_own(fn->props, key)) {
            return tsc_object_set_receiver(fn->props, key, value, receiver);
        }
        return tsc_value_define_receiver_data(receiver, key, value);
    }
    return false;
}

bool tsc_value_set_prop_receiver_cached(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver, tsc_prop_cache_t* cache) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) {
        return tsc_value_set_prop_receiver(v, key, value, receiver);
    }
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_SET_PROP_RECEIVER);
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    if (!o || o->is_proxy || !cache) {
        tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_MISS);
        return tsc_object_set_receiver(o, key, value, receiver);
    }
    tsc_object_prop_t* cached = prop_cache_lookup(cache, o, key);
    if (cached) {
        tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_HIT);
        tsc_object_prop_t* prop = cached;
        if (prop->accessor) return prop->setter ? prop->setter(prop->setter_env, receiver, value) : false;
        if (!prop->writable) return false;
        return value_set_receiver_own_data(receiver, key, value);
    }
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_MISS);
    bool ok = tsc_object_set_receiver(o, key, value, receiver);
    ssize_t idx = object_find(o, key);
    if (idx >= 0) {
        prop_cache_store(cache, o, (size_t)idx);
    }
    return ok;
}

bool tsc_reflect_set_prop(tsc_value_t v, tsc_str_t* key, tsc_value_t value) {
    require_reflect_object_target(v, "Reflect.set target must be an object");
    return tsc_value_set_prop(v, key, value);
}

bool tsc_reflect_set_symbol_prop(tsc_value_t v, tsc_symbol_t* key, tsc_value_t value) {
    require_reflect_object_target(v, "Reflect.set target must be an object");
    return tsc_value_set_symbol_prop(v, key, value);
}

bool tsc_reflect_set_computed_prop(tsc_value_t v, tsc_value_t key, tsc_value_t value) {
    require_reflect_object_target(v, "Reflect.set target must be an object");
    return tsc_value_set_computed_prop(v, key, value);
}

bool tsc_reflect_set_computed_prop_receiver(
    tsc_value_t v,
    tsc_value_t key,
    tsc_value_t value,
    tsc_value_t receiver
) {
    require_reflect_object_target(v, "Reflect.set target must be an object");
    return tsc_value_set_computed_prop_receiver(v, key, value, receiver);
}

bool tsc_reflect_set_prop_cached(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_prop_cache_t* cache) {
    require_reflect_object_target(v, "Reflect.set target must be an object");
    return tsc_value_set_prop_cached(v, key, value, cache);
}

bool tsc_reflect_set_prop_receiver(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver) {
    require_reflect_object_target(v, "Reflect.set target must be an object");
    return tsc_value_set_prop_receiver(v, key, value, receiver);
}

bool tsc_reflect_set_prop_receiver_cached(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver, tsc_prop_cache_t* cache) {
    require_reflect_object_target(v, "Reflect.set target must be an object");
    return tsc_value_set_prop_receiver_cached(v, key, value, receiver, cache);
}

bool tsc_value_has_own_prop(tsc_value_t v, const tsc_str_t* key) {
    if (value_is_known_symbol_internal_key(key)) return false;
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_has_own((tsc_object_t*)value_ptr(v), key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return tsc_array_has_own_key((const tsc_array_t*)value_ptr(v), key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        const tsc_str_t* s = (const tsc_str_t*)value_ptr(v);
        if (tsc_str_is_length_key(key)) return true;
        size_t idx = 0;
        return tsc_str_array_index(key, &idx) && idx < s->len;
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* fn = (const tsc_function_identity_t*)value_ptr(v);
        return tsc_function_metadata_key(fn, key) || (fn->props && tsc_object_has_own(fn->props, key));
    }
    return false;
}

bool tsc_value_has_own_symbol_prop(tsc_value_t v, tsc_symbol_t* key) {
    if (tsc_value_is_nullish(v)) {
        tsc_throw_str(tsc_str_from_cstr("Object.hasOwn target must not be null or undefined"));
    }
    tsc_str_t* internal_key = value_known_symbol_internal_key(key);
    if (internal_key) {
        if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
            return tsc_object_has_own((tsc_object_t*)value_ptr(v), internal_key);
        }
        if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
            return tsc_array_has_own_key((const tsc_array_t*)value_ptr(v), internal_key);
        }
        if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
            const tsc_function_identity_t* fn = (const tsc_function_identity_t*)value_ptr(v);
            return fn && fn->props && tsc_object_has_own(fn->props, internal_key);
        }
        return false;
    }
    return false;
}

bool tsc_value_has_own_computed_prop(tsc_value_t v, tsc_value_t key) {
    key = tsc_value_to_property_key(key);
    if (value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_value_has_own_symbol_prop(v, (tsc_symbol_t*)value_ptr(key));
    }
    return tsc_value_has_own_prop(v, (tsc_str_t*)value_ptr(key));
}

bool tsc_value_property_is_enumerable(tsc_value_t v, const tsc_str_t* key) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_property_is_enumerable((tsc_object_t*)value_ptr(v), key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return tsc_array_property_is_enumerable_key((const tsc_array_t*)value_ptr(v), key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        const tsc_str_t* s = (const tsc_str_t*)value_ptr(v);
        size_t idx = 0;
        return tsc_str_array_index(key, &idx) && idx < s->len;
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* fn = (const tsc_function_identity_t*)value_ptr(v);
        if (tsc_function_metadata_key(fn, key)) return false;
        return fn->props && tsc_object_property_is_enumerable(fn->props, key);
    }
    return false;
}

bool tsc_value_symbol_property_is_enumerable(tsc_value_t v, tsc_symbol_t* key) {
    tsc_str_t* internal_key = value_known_symbol_internal_key(key);
    if (internal_key) return tsc_value_property_is_enumerable(v, internal_key);
    return false;
}

bool tsc_value_computed_property_is_enumerable(tsc_value_t v, tsc_value_t key) {
    key = tsc_value_to_property_key(key);
    if (value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_value_symbol_property_is_enumerable(v, (tsc_symbol_t*)value_ptr(key));
    }
    return tsc_value_property_is_enumerable(v, (tsc_str_t*)value_ptr(key));
}

bool tsc_value_has_prop(tsc_value_t v, const tsc_str_t* key) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_HAS_PROP);
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_has((tsc_object_t*)value_ptr(v), key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* a = (const tsc_array_t*)value_ptr(v);
        return tsc_array_has_own_key(a, key) || tsc_value_has_prop(a->prototype, key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return tsc_value_has_own_prop(v, key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* fn = (const tsc_function_identity_t*)value_ptr(v);
        return tsc_value_has_own_prop(v, key) || tsc_value_has_prop(fn->prototype, key);
    }
    return false;
}

bool tsc_value_has_symbol_prop(tsc_value_t v, tsc_symbol_t* key) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_HAS_PROP);
    tsc_str_t* internal_key = value_known_symbol_internal_key(key);
    if (internal_key) return tsc_value_has_prop(v, internal_key);
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* a = (const tsc_array_t*)value_ptr(v);
        return tsc_value_has_own_symbol_prop(v, key) || tsc_value_has_symbol_prop(a->prototype, key);
    }
    return false;
}

bool tsc_value_has_prop_cached(tsc_value_t v, const tsc_str_t* key, tsc_prop_cache_t* cache) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) {
        return tsc_value_has_prop(v, key);
    }
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_HAS_PROP);
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    if (!o || o->is_proxy || !cache) {
        tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_MISS);
        return tsc_object_has(o, key);
    }
    tsc_object_prop_t* cached = prop_cache_lookup(cache, o, key);
    if (cached) {
        tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_HIT);
        return true;
    }
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_MISS);
    ssize_t idx = object_find(o, key);
    if (idx >= 0) {
        prop_cache_store(cache, o, (size_t)idx);
        return true;
    }
    return tsc_object_has(o, key);
}

bool tsc_reflect_has_prop(tsc_value_t v, const tsc_str_t* key) {
    require_reflect_object_target(v, "Reflect.has target must be an object");
    return tsc_value_has_prop(v, key);
}

bool tsc_reflect_has_symbol_prop(tsc_value_t v, tsc_symbol_t* key) {
    require_reflect_object_target(v, "Reflect.has target must be an object");
    return tsc_value_has_symbol_prop(v, key);
}

bool tsc_reflect_has_computed_prop(tsc_value_t v, tsc_value_t key) {
    require_reflect_object_target(v, "Reflect.has target must be an object");
    return tsc_value_has_computed_prop(v, key);
}

bool tsc_reflect_has_prop_cached(tsc_value_t v, const tsc_str_t* key, tsc_prop_cache_t* cache) {
    require_reflect_object_target(v, "Reflect.has target must be an object");
    return tsc_value_has_prop_cached(v, key, cache);
}

bool tsc_value_delete_prop(tsc_value_t v, tsc_str_t* key) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_DELETE_PROP);
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_delete((tsc_object_t*)value_ptr(v), key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        if (tsc_str_is_length_key(key)) return false;
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        size_t idx = 0;
        bool is_index =
            (a->es == sizeof(tsc_value_t) || a->box_element) &&
            tsc_str_array_index(key, &idx) &&
            idx < a->len;
        if (a->props && tsc_object_has_own(a->props, key)) {
            if (!tsc_object_delete(a->props, key)) return false;
            if (is_index) {
                tsc_array_mark_hole(a, idx);
                memset((char*)a->data + idx * a->es, 0, a->es);
            }
            return true;
        }
        if (is_index) {
            if (a->sealed || a->frozen) return false;
            tsc_array_mark_hole(a, idx);
            memset((char*)a->data + idx * a->es, 0, a->es);
            return true;
        }
        return true;
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return !tsc_value_has_own_prop(v, key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(v);
        if (tsc_function_metadata_key(fn, key)) return false;
        if (fn->props && tsc_object_has_own(fn->props, key)) return tsc_object_delete(fn->props, key);
        return true;
    }
    return true;
}

bool tsc_value_delete_symbol_prop(tsc_value_t v, tsc_symbol_t* key) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_DELETE_PROP);
    tsc_str_t* internal_key = value_known_symbol_internal_key(key);
    if (internal_key) return tsc_value_delete_prop(v, internal_key);
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return true;
    }
    return true;
}

/* A dynamically typed ECMAScript property key is normalized by one runtime
 * path before the ordinary object operation. */
tsc_value_t tsc_value_get_computed_prop(tsc_value_t v, tsc_value_t key) {
    key = tsc_value_to_property_key(key);
    if (value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_value_get_symbol_prop(v, (tsc_symbol_t*)value_ptr(key));
    }
    return tsc_value_get_prop(v, (tsc_str_t*)value_ptr(key));
}

tsc_value_t tsc_value_get_computed_prop_receiver(
    tsc_value_t v,
    tsc_value_t key,
    tsc_value_t receiver
) {
    key = tsc_value_to_property_key(key);
    if (value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_value_get_prop_receiver(
            v,
            value_known_symbol_internal_key((tsc_symbol_t*)value_ptr(key)),
            receiver
        );
    }
    return tsc_value_get_prop_receiver(v, (tsc_str_t*)value_ptr(key), receiver);
}

bool tsc_value_set_computed_prop(tsc_value_t v, tsc_value_t key, tsc_value_t value) {
    key = tsc_value_to_property_key(key);
    if (value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_value_set_symbol_prop(v, (tsc_symbol_t*)value_ptr(key), value);
    }
    return tsc_value_set_prop(v, (tsc_str_t*)value_ptr(key), value);
}

bool tsc_value_set_computed_prop_receiver(
    tsc_value_t v,
    tsc_value_t key,
    tsc_value_t value,
    tsc_value_t receiver
) {
    key = tsc_value_to_property_key(key);
    if (value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL) {
        tsc_str_t* internal_key = value_known_symbol_internal_key((tsc_symbol_t*)value_ptr(key));
        return internal_key ? tsc_value_set_prop_receiver(v, internal_key, value, receiver) : false;
    }
    return tsc_value_set_prop_receiver(v, (tsc_str_t*)value_ptr(key), value, receiver);
}

bool tsc_value_has_computed_prop(tsc_value_t v, tsc_value_t key) {
    key = tsc_value_to_property_key(key);
    if (value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_value_has_symbol_prop(v, (tsc_symbol_t*)value_ptr(key));
    }
    return tsc_value_has_prop(v, (tsc_str_t*)value_ptr(key));
}

bool tsc_value_delete_computed_prop(tsc_value_t v, tsc_value_t key) {
    key = tsc_value_to_property_key(key);
    if (value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_value_delete_symbol_prop(v, (tsc_symbol_t*)value_ptr(key));
    }
    return tsc_value_delete_prop(v, (tsc_str_t*)value_ptr(key));
}

bool tsc_reflect_delete_prop(tsc_value_t v, tsc_str_t* key) {
    require_reflect_object_target(v, "Reflect.deleteProperty target must be an object");
    return tsc_value_delete_prop(v, key);
}

bool tsc_reflect_delete_symbol_prop(tsc_value_t v, tsc_symbol_t* key) {
    require_reflect_object_target(v, "Reflect.deleteProperty target must be an object");
    return tsc_value_delete_symbol_prop(v, key);
}

bool tsc_reflect_delete_computed_prop(tsc_value_t v, tsc_value_t key) {
    require_reflect_object_target(v, "Reflect.deleteProperty target must be an object");
    return tsc_value_delete_computed_prop(v, key);
}

bool tsc_value_is_extensible(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_is_extensible((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return ((tsc_array_t*)value_ptr(v))->extensible;
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        return ((tsc_function_identity_t*)value_ptr(v))->extensible;
    }
    return false;
}

bool tsc_value_prevent_extensions(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_prevent_extensions((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        a->extensible = false;
        return tsc_object_prevent_extensions(a->props);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(v);
        fn->extensible = false;
        return tsc_object_prevent_extensions(fn->props);
    }
    return true;
}

bool tsc_reflect_is_extensible(tsc_value_t v) {
    require_reflect_object_target(v, "Reflect.isExtensible target must be an object");
    return tsc_value_is_extensible(v);
}

bool tsc_reflect_prevent_extensions(tsc_value_t v) {
    require_reflect_object_target(v, "Reflect.preventExtensions target must be an object");
    return tsc_value_prevent_extensions(v);
}

bool tsc_value_seal(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_seal((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        a->extensible = false;
        a->sealed = true;
        return tsc_object_seal(a->props);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(v);
        fn->extensible = false;
        fn->sealed = true;
        return tsc_object_seal(fn->props);
    }
    return true;
}

bool tsc_value_freeze(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_freeze((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        a->extensible = false;
        a->sealed = true;
        a->frozen = true;
        return tsc_object_freeze(a->props);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(v);
        fn->extensible = false;
        fn->sealed = true;
        fn->frozen = true;
        return tsc_object_freeze(fn->props);
    }
    return true;
}

bool tsc_value_is_sealed(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_is_sealed((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* a = (const tsc_array_t*)value_ptr(v);
        return a->sealed && tsc_object_is_sealed(a->props);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* fn = (const tsc_function_identity_t*)value_ptr(v);
        return fn->sealed && tsc_object_is_sealed(fn->props);
    }
    return true;
}

bool tsc_value_is_frozen(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_is_frozen((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* a = (const tsc_array_t*)value_ptr(v);
        return a->frozen && tsc_object_is_frozen(a->props);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* fn = (const tsc_function_identity_t*)value_ptr(v);
        return fn->frozen && tsc_object_is_frozen(fn->props);
    }
    return true;
}

tsc_array_t* value_array_keys(const tsc_array_t* src, bool include_length) {
    tsc_array_materialize_all((tsc_array_t*)src);
    size_t side_len = src && src->props ? src->props->len : 0;
    size_t cap = (src ? src->len : 0) + (include_length ? 1 : 0) + side_len;
    tsc_array_t* out = tsc_array_new(sizeof(tsc_str_t*), cap ? cap : 1);
    if (!src) return out;
    for (size_t i = 0; i < src->len; i++) {
        tsc_str_t* key = tsc_str_from_int((int64_t)i);
        if (tsc_array_index_present(src, i) && (include_length || tsc_array_property_is_enumerable_key(src, key))) {
            tsc_array_push_raw(out, &key);
        }
    }
    if (include_length) {
        tsc_str_t* length = tsc_str_from_lit("length", 6);
        tsc_array_push_raw(out, &length);
    }
    tsc_array_t* side_keys = include_length ? tsc_object_own_keys_dyn(src->props) : tsc_object_keys_dyn(src->props);
    for (size_t i = 0; i < side_keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, side_keys, i);
        if (value_is_known_symbol_internal_key(key)) continue;
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx) && idx < src->len) continue;
        tsc_array_push_raw(out, &key);
    }
    return out;
}

tsc_array_t* value_array_values(const tsc_array_t* src) {
    tsc_array_materialize_all((tsc_array_t*)src);
    size_t side_len = src && src->props ? src->props->len : 0;
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), src ? src->len + side_len : 1);
    if (!src || src->es != sizeof(tsc_value_t)) return out;
    for (size_t i = 0; i < src->len; i++) {
        tsc_str_t* key = tsc_str_from_int((int64_t)i);
        if (!tsc_array_property_is_enumerable_key(src, key)) continue;
        tsc_value_t value = src->props && tsc_object_has_own(src->props, key)
            ? tsc_object_get_receiver(src->props, key, tsc_value_array((tsc_array_t*)src))
            : TSC_ARR(tsc_value_t, src, i);
        tsc_array_push_raw(out, &value);
    }
    tsc_array_t* side_keys = tsc_object_keys_dyn(src->props);
    for (size_t i = 0; i < side_keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, side_keys, i);
        if (value_is_known_symbol_internal_key(key)) continue;
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx) && idx < src->len) continue;
        tsc_value_t value = tsc_object_get_receiver(src->props, key, tsc_value_array((tsc_array_t*)src));
        tsc_array_push_raw(out, &value);
    }
    return out;
}

static tsc_array_t* value_array_iter_values(const tsc_array_t* src) {
    tsc_array_materialize_all((tsc_array_t*)src);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), src ? src->len : 1);
    if (!src || src->es != sizeof(tsc_value_t)) return out;
    tsc_value_t recv = tsc_value_array((tsc_array_t*)src);
    for (size_t i = 0; i < src->len; i++) {
        tsc_value_t value = tsc_value_get_index(recv, (double)i);
        tsc_array_push_raw(out, &value);
    }
    return out;
}

tsc_array_t* value_array_entries(const tsc_array_t* src) {
    tsc_array_materialize_all((tsc_array_t*)src);
    size_t side_len = src && src->props ? src->props->len : 0;
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), src ? src->len + side_len : 1);
    if (!src || src->es != sizeof(tsc_value_t)) return out;
    for (size_t i = 0; i < src->len; i++) {
        tsc_str_t* key_str = tsc_str_from_int((int64_t)i);
        if (!tsc_array_property_is_enumerable_key(src, key_str)) continue;
        tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_value_t key = tsc_value_string(key_str);
        tsc_value_t value = src->props && tsc_object_has_own(src->props, key_str)
            ? tsc_object_get_receiver(src->props, key_str, tsc_value_array((tsc_array_t*)src))
            : TSC_ARR(tsc_value_t, src, i);
        tsc_array_push_raw(pair, &key);
        tsc_array_push_raw(pair, &value);
        tsc_value_t boxed = tsc_value_array(pair);
        tsc_array_push_raw(out, &boxed);
    }
    tsc_array_t* side_keys = tsc_object_keys_dyn(src->props);
    for (size_t i = 0; i < side_keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, side_keys, i);
        if (value_is_known_symbol_internal_key(key)) continue;
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx) && idx < src->len) continue;
        tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_value_t key_value = tsc_value_string(key);
        tsc_value_t value = tsc_object_get_receiver(src->props, key, tsc_value_array((tsc_array_t*)src));
        tsc_array_push_raw(pair, &key_value);
        tsc_array_push_raw(pair, &value);
        tsc_value_t boxed = tsc_value_array(pair);
        tsc_array_push_raw(out, &boxed);
    }
    return out;
}

static tsc_array_t* value_array_entries_numeric(const tsc_array_t* src) {
    tsc_array_materialize_all((tsc_array_t*)src);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), src ? src->len : 1);
    if (!src || src->es != sizeof(tsc_value_t)) return out;
    tsc_value_t recv = tsc_value_array((tsc_array_t*)src);
    for (size_t i = 0; i < src->len; i++) {
        tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_value_t key = tsc_value_num((double)i);
        tsc_value_t value = tsc_value_get_index(recv, (double)i);
        tsc_array_push_raw(pair, &key);
        tsc_array_push_raw(pair, &value);
        tsc_value_t boxed = tsc_value_array(pair);
        tsc_array_push_raw(out, &boxed);
    }
    return out;
}

tsc_array_t* value_string_keys(const tsc_str_t* src, bool include_length) {
    size_t cap = (src ? src->len : 0) + (include_length ? 1 : 0);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_str_t*), cap ? cap : 1);
    if (!src) return out;
    for (size_t i = 0; i < src->len; i++) {
        tsc_str_t* key = tsc_str_from_int((int64_t)i);
        tsc_array_push_raw(out, &key);
    }
    if (include_length) {
        tsc_str_t* length = tsc_str_from_lit("length", 6);
        tsc_array_push_raw(out, &length);
    }
    return out;
}

tsc_array_t* value_string_values(const tsc_str_t* src) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), src ? src->len : 1);
    if (!src) return out;
    for (size_t i = 0; i < src->len; i++) {
        tsc_value_t value = tsc_value_string(tsc_str_char_at(src, (double)i));
        tsc_array_push_raw(out, &value);
    }
    return out;
}

tsc_array_t* value_string_entries(const tsc_str_t* src) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), src ? src->len : 1);
    if (!src) return out;
    for (size_t i = 0; i < src->len; i++) {
        tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_value_t key = tsc_value_string(tsc_str_from_int((int64_t)i));
        tsc_value_t value = tsc_value_string(tsc_str_char_at(src, (double)i));
        tsc_array_push_raw(pair, &key);
        tsc_array_push_raw(pair, &value);
        tsc_value_t boxed = tsc_value_array(pair);
        tsc_array_push_raw(out, &boxed);
    }
    return out;
}

tsc_value_t value_descriptor_from_array_index(const tsc_array_t* src, size_t idx) {
    tsc_object_t* desc = tsc_object_new();
    tsc_value_t value = TSC_ARR(tsc_value_t, src, idx);
    tsc_object_set(desc, tsc_str_from_lit("value", 5), value);
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(!src->frozen));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(true));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(!src->sealed && !src->frozen));
    return tsc_value_object(desc);
}

tsc_value_t value_descriptor_from_array_length(const tsc_array_t* src) {
    tsc_object_t* desc = tsc_object_new();
    tsc_object_set(desc, tsc_str_from_lit("value", 5), tsc_value_num((double)(src ? src->len : 0)));
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(src ? (!src->frozen && src->length_writable) : true));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(false));
    return tsc_value_object(desc);
}

tsc_value_t value_descriptor_from_array_key(const tsc_array_t* src, const tsc_str_t* key) {
    if (!src) return tsc_value_undefined();
    if (tsc_str_is_length_key(key)) return value_descriptor_from_array_length(src);
    if (src->props && tsc_object_has_own(src->props, key)) {
        return tsc_value_get_own_property_descriptor(tsc_value_object(src->props), (tsc_str_t*)key);
    }
    size_t idx = 0;
    if (src->es == sizeof(tsc_value_t) && tsc_str_array_index(key, &idx) && tsc_array_index_present(src, idx)) {
        return value_descriptor_from_array_index(src, idx);
    }
    return tsc_value_undefined();
}

tsc_value_t value_descriptor_from_string_index(const tsc_str_t* src, size_t idx) {
    tsc_object_t* desc = tsc_object_new();
    tsc_object_set(desc, tsc_str_from_lit("value", 5), tsc_value_string(tsc_str_char_at(src, (double)idx)));
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(true));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(false));
    return tsc_value_object(desc);
}

tsc_value_t value_descriptor_from_string_length(const tsc_str_t* src) {
    tsc_object_t* desc = tsc_object_new();
    tsc_object_set(desc, tsc_str_from_lit("value", 5), tsc_value_num((double)(src ? src->len : 0)));
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(false));
    return tsc_value_object(desc);
}

tsc_value_t value_descriptor_from_string_key(const tsc_str_t* src, const tsc_str_t* key) {
    if (!src) return tsc_value_undefined();
    if (tsc_str_is_length_key(key)) return value_descriptor_from_string_length(src);
    size_t idx = 0;
    if (tsc_str_array_index(key, &idx) && idx < src->len) {
        return value_descriptor_from_string_index(src, idx);
    }
    return tsc_value_undefined();
}

tsc_value_t value_descriptor_from_function_length(const tsc_function_identity_t* fn) {
    tsc_object_t* desc = tsc_object_new();
    tsc_object_set(desc, tsc_str_from_lit("value", 5), tsc_value_num(fn ? fn->length : 0.0));
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(false));
    return tsc_value_object(desc);
}

tsc_value_t value_descriptor_from_function_name(const tsc_function_identity_t* fn) {
    tsc_object_t* desc = tsc_object_new();
    tsc_object_set(desc, tsc_str_from_lit("value", 5), tsc_value_string((fn && fn->name) ? fn->name : tsc_str_from_lit("", 0)));
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(false));
    return tsc_value_object(desc);
}

tsc_value_t value_descriptor_from_function_prototype(const tsc_function_identity_t* fn) {
    tsc_object_t* desc = tsc_object_new();
    tsc_function_identity_t* mutable_fn = (tsc_function_identity_t*)fn;
    tsc_value_t fn_value = mutable_fn
        ? value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)mutable_fn)
        : tsc_value_undefined();
    tsc_object_set(desc, tsc_str_from_lit("value", 5), tsc_function_own_prototype(mutable_fn, fn_value));
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(fn ? (!fn->frozen && fn->func_prototype_writable) : false));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(false));
    return tsc_value_object(desc);
}

tsc_value_t value_descriptor_from_function_key(const tsc_function_identity_t* fn, const tsc_str_t* key) {
    if (str_lit_eq(key, "prototype") && tsc_function_has_prototype_metadata(fn)) return value_descriptor_from_function_prototype(fn);
    if (fn && fn->props && tsc_object_has_own(fn->props, key)) {
        return tsc_value_get_own_property_descriptor(tsc_value_object(fn->props), (tsc_str_t*)key);
    }
    return tsc_value_undefined();
}

tsc_value_t value_descriptors_from_array(const tsc_array_t* src) {
    tsc_object_t* out = tsc_object_new();
    if (!src) return tsc_value_object(out);
    if (src->es == sizeof(tsc_value_t)) {
        for (size_t i = 0; i < src->len; i++) {
            if (!tsc_array_index_present(src, i)) continue;
            tsc_object_set(out, tsc_str_from_int((int64_t)i), value_descriptor_from_array_index(src, i));
        }
    }
    tsc_object_set(out, tsc_str_from_lit("length", 6), value_descriptor_from_array_length(src));
    if (src->props) {
        tsc_array_t* keys = tsc_object_own_keys_dyn(src->props);
        for (size_t i = 0; i < keys->len; i++) {
            tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
            tsc_object_set(out, key, tsc_value_get_own_property_descriptor(tsc_value_object(src->props), key));
        }
    }
    return tsc_value_object(out);
}

tsc_value_t value_descriptors_from_string(const tsc_str_t* src) {
    tsc_object_t* out = tsc_object_new();
    if (!src) return tsc_value_object(out);
    for (size_t i = 0; i < src->len; i++) {
        tsc_object_set(out, tsc_str_from_int((int64_t)i), value_descriptor_from_string_index(src, i));
    }
    tsc_object_set(out, tsc_str_from_lit("length", 6), value_descriptor_from_string_length(src));
    return tsc_value_object(out);
}

tsc_value_t value_descriptors_from_function(const tsc_function_identity_t* fn) {
    tsc_object_t* out = tsc_object_new();
    if (fn && fn->props) {
        tsc_str_t* length = tsc_str_from_lit("length", 6);
        tsc_str_t* name = tsc_str_from_lit("name", 4);
        if (tsc_object_has_own(fn->props, length)) {
            tsc_object_set(out, length, tsc_value_get_own_property_descriptor(tsc_value_object(fn->props), length));
        }
        if (tsc_object_has_own(fn->props, name)) {
            tsc_object_set(out, name, tsc_value_get_own_property_descriptor(tsc_value_object(fn->props), name));
        }
    }
    if (tsc_function_has_prototype_metadata(fn)) {
        tsc_object_set(out, tsc_str_from_lit("prototype", 9), value_descriptor_from_function_prototype(fn));
    }
    if (fn && fn->props) {
        tsc_array_t* keys = tsc_object_own_keys_dyn(fn->props);
        for (size_t i = 0; i < keys->len; i++) {
            tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
            if (tsc_str_is_length_key(key) || str_lit_eq(key, "name")) continue;
            tsc_object_set(out, key, tsc_value_get_own_property_descriptor(tsc_value_object(fn->props), key));
        }
    }
    return tsc_value_object(out);
}

/* Produce the implementation's canonical internal PropertyKey list. Symbols
 * use opaque identity-bearing carriers in object storage; public Object and
 * Reflect APIs project this one list into string-only or string-or-Symbol
 * arrays without maintaining a second property inventory. */
tsc_array_t* tsc_value_raw_own_keys(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_own_keys_dyn((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* array = (const tsc_array_t*)value_ptr(v);
        tsc_array_t* out = value_array_keys(array, true);
        if (array && array->props) {
            tsc_array_t* side_keys = tsc_object_own_keys_dyn(array->props);
            for (size_t index = 0; index < side_keys->len; index++) {
                tsc_str_t* key = TSC_ARR(tsc_str_t*, side_keys, index);
                if (value_is_known_symbol_internal_key(key)) {
                    tsc_array_push_raw(out, &key);
                }
            }
        }
        return out;
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_string_keys((const tsc_str_t*)value_ptr(v), true);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* fn = (const tsc_function_identity_t*)value_ptr(v);
        size_t side_len = fn && fn->props ? fn->props->len : 0;
        tsc_array_t* out = tsc_array_new(sizeof(tsc_str_t*), 1 + side_len);
        if (fn && fn->props) {
            tsc_str_t* length = tsc_str_from_lit("length", 6);
            tsc_str_t* name = tsc_str_from_lit("name", 4);
            if (tsc_object_has_own(fn->props, length)) tsc_array_push_raw(out, &length);
            if (tsc_object_has_own(fn->props, name)) tsc_array_push_raw(out, &name);
        }
        if (tsc_function_has_prototype_metadata(fn)) {
            tsc_str_t* prototype = tsc_str_from_lit("prototype", 9);
            tsc_array_push_raw(out, &prototype);
        }
        if (fn && fn->props) {
            tsc_array_t* side_keys = tsc_object_own_keys_dyn(fn->props);
            for (size_t i = 0; i < side_keys->len; i++) {
                tsc_str_t* key = TSC_ARR(tsc_str_t*, side_keys, i);
                if (tsc_str_is_length_key(key) || str_lit_eq(key, "name")) continue;
                tsc_array_push_raw(out, &key);
            }
        }
        return out;
    }
    return tsc_array_new(sizeof(tsc_str_t*), 1);
}

tsc_array_t* tsc_value_own_keys(tsc_value_t v) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_OWN_KEYS);
    tsc_array_t* raw = tsc_value_raw_own_keys(v);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_str_t*), raw->len ? raw->len : 1);
    for (size_t i = 0; i < raw->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, raw, i);
        if (value_is_known_symbol_internal_key(key)) continue;
        tsc_array_push_raw(out, &key);
    }
    return out;
}

tsc_array_t* tsc_value_get_own_property_symbols(tsc_value_t v) {
    if (tsc_value_is_nullish(v)) {
        tsc_throw_str(tsc_str_from_cstr("Object.getOwnPropertySymbols target must not be null or undefined"));
    }
    tsc_array_t* out = tsc_array_new(sizeof(tsc_symbol_t*), 2);
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        if ((const tsc_array_t*)value_ptr(v) == tsc_array_prototype()) {
            return tsc_array_prototype_symbols();
        }
        const tsc_array_t* a = (const tsc_array_t*)value_ptr(v);
        if (a && a->props) {
            tsc_array_t* keys = tsc_object_own_keys_dyn(a->props);
            for (size_t i = 0; i < keys->len; i++) {
                tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
                tsc_symbol_t* symbol = value_known_symbol_from_internal_key(key);
                if (symbol) tsc_array_push_raw(out, &symbol);
            }
        }
        return out;
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* fn = (const tsc_function_identity_t*)value_ptr(v);
        if (fn && fn->props) {
            tsc_array_t* keys = tsc_object_own_keys_dyn(fn->props);
            for (size_t i = 0; i < keys->len; i++) {
                tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
                tsc_symbol_t* symbol = value_known_symbol_from_internal_key(key);
                if (symbol) tsc_array_push_raw(out, &symbol);
            }
        }
        return out;
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        if (o && !o->is_proxy) {
            tsc_array_t* keys = tsc_object_own_keys_dyn(o);
            for (size_t i = 0; i < keys->len; i++) {
                tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
                tsc_symbol_t* symbol = value_known_symbol_from_internal_key(key);
                if (symbol) tsc_array_push_raw(out, &symbol);
            }
            return out;
        }
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        if (o && o->is_proxy) {
            tsc_array_t* keys = tsc_value_raw_own_keys(v);
            for (size_t i = 0; i < keys->len; i++) {
                tsc_symbol_t* symbol = value_known_symbol_from_internal_key(
                    TSC_ARR(tsc_str_t*, keys, i)
                );
                if (symbol) tsc_array_push_raw(out, &symbol);
            }
        }
    }
    return out;
}

tsc_array_t* tsc_reflect_own_keys(tsc_value_t v) {
    require_reflect_object_target(v, "Reflect.ownKeys target must be an object");
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_OWN_KEYS);
    tsc_array_t* raw = tsc_value_raw_own_keys(v);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), raw->len ? raw->len : 1);
    for (size_t i = 0; i < raw->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, raw, i);
        tsc_symbol_t* symbol = value_known_symbol_from_internal_key(key);
        tsc_value_t public_key = symbol ? tsc_value_symbol(symbol) : tsc_value_string(key);
        tsc_array_push_raw(out, &public_key);
    }
    return out;
}

tsc_value_t value_descriptor_from_prop(const tsc_object_prop_t* prop) {
    tsc_object_t* desc = tsc_object_new();
    if (prop->accessor) {
        tsc_object_set(desc, tsc_str_from_lit("get", 3), prop->getter ? prop->getter_value : tsc_value_undefined());
        tsc_object_set(desc, tsc_str_from_lit("set", 3), prop->setter ? prop->setter_value : tsc_value_undefined());
    } else {
        tsc_object_set(desc, tsc_str_from_lit("value", 5), prop->value);
        tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(prop->writable));
    }
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(prop->enumerable));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(prop->configurable));
    return tsc_value_object(desc);
}

static tsc_value_t value_descriptor_from_module_namespace_prop(
    const tsc_object_t* object,
    const tsc_object_prop_t* prop
) {
    tsc_object_t* desc = tsc_object_new();
    tsc_value_t value = prop->getter
        ? prop->getter(prop->getter_env, tsc_value_object((tsc_object_t*)object))
        : tsc_value_undefined();
    tsc_object_set(desc, tsc_str_from_lit("value", 5), value);
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(true));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(true));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(false));
    return tsc_value_object(desc);
}

tsc_value_t tsc_value_get_own_property_descriptor(tsc_value_t v, tsc_str_t* key) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_GET_OWN_PROPERTY_DESCRIPTOR);
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_descriptor_from_array_key((const tsc_array_t*)value_ptr(v), key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_descriptor_from_string_key((const tsc_str_t*)value_ptr(v), key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        return value_descriptor_from_function_key((const tsc_function_identity_t*)value_ptr(v), key);
    }
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) return tsc_value_undefined();
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'getOwnPropertyDescriptor' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("getOwnPropertyDescriptor", 24));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_get_own_property_descriptor(o->proxy_target, key);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy getOwnPropertyDescriptor trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_array_push_value(args, o->proxy_target);
        tsc_symbol_t* symbol = value_known_symbol_from_internal_key(key);
        tsc_array_push_value(args, symbol ? tsc_value_symbol(symbol) : tsc_value_string(key));
        tsc_value_t result = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        tsc_proxy_validate_get_own_property_descriptor_result(o, key, result);
        return result;
    }
    for (size_t i = 0; i < o->len; i++) {
        if (!tsc_str_eq(o->props[i].key, key)) continue;
        if (o->is_module_namespace && o->props[i].accessor) {
            return value_descriptor_from_module_namespace_prop(o, &o->props[i]);
        }
        volatile tsc_value_t* mapped = tsc_object_arguments_mapped_cell(o, key);
        if (mapped && !o->props[i].accessor) {
            tsc_object_prop_t effective = o->props[i];
            effective.value = *mapped;
            return value_descriptor_from_prop(&effective);
        }
        return value_descriptor_from_prop(&o->props[i]);
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_get_own_property_symbol_descriptor(tsc_value_t v, tsc_symbol_t* key) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_GET_OWN_PROPERTY_DESCRIPTOR);
    if (tsc_value_is_nullish(v)) {
        tsc_throw_str(tsc_str_from_cstr("Object.getOwnPropertyDescriptor target must not be null or undefined"));
    }
    tsc_str_t* internal_key = value_known_symbol_internal_key(key);
    if (internal_key) return tsc_value_get_own_property_descriptor(v, internal_key);
    return tsc_value_undefined();
}

tsc_value_t tsc_value_get_own_property_computed_descriptor(
    tsc_value_t v,
    tsc_value_t key
) {
    key = tsc_value_to_property_key(key);
    if (value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_value_get_own_property_symbol_descriptor(
            v,
            (tsc_symbol_t*)value_ptr(key)
        );
    }
    return tsc_value_get_own_property_descriptor(v, (tsc_str_t*)value_ptr(key));
}

tsc_value_t tsc_reflect_get_own_property_descriptor(tsc_value_t v, tsc_str_t* key) {
    require_reflect_object_target(v, "Reflect.getOwnPropertyDescriptor target must be an object");
    return tsc_value_get_own_property_descriptor(v, key);
}

tsc_value_t tsc_reflect_get_own_property_symbol_descriptor(tsc_value_t v, tsc_symbol_t* key) {
    require_reflect_object_target(v, "Reflect.getOwnPropertyDescriptor target must be an object");
    return tsc_value_get_own_property_symbol_descriptor(v, key);
}

tsc_value_t tsc_reflect_get_own_property_computed_descriptor(
    tsc_value_t v,
    tsc_value_t key
) {
    require_reflect_object_target(v, "Reflect.getOwnPropertyDescriptor target must be an object");
    return tsc_value_get_own_property_computed_descriptor(v, key);
}


tsc_value_t tsc_value_get_own_property_descriptors(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_descriptors_from_array((const tsc_array_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_descriptors_from_string((const tsc_str_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        return value_descriptors_from_function((const tsc_function_identity_t*)value_ptr(v));
    }
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) {
        if (tsc_value_is_nullish(v)) {
            tsc_throw_str(tsc_str_from_cstr("Object.getOwnPropertyDescriptors target must not be null or undefined"));
        }
        return tsc_value_object(tsc_object_new());
    }
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    tsc_object_t* out = tsc_object_new();
    if (o->is_proxy) {
        tsc_array_t* keys = tsc_value_raw_own_keys(v);
        for (size_t i = 0; i < keys->len; i++) {
            tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
            tsc_value_t desc = tsc_value_get_own_property_descriptor(v, key);
            if (tsc_value_is_undefined(desc)) continue;
            tsc_object_set(out, key, desc);
        }
        return tsc_value_object(out);
    }
    for (size_t i = 0; i < o->len; i++) {
        tsc_value_t desc = value_descriptor_from_prop(&o->props[i]);
        tsc_object_set(out, o->props[i].key, desc);
    }
    return tsc_value_object(out);
}

static void object_assign_set_or_throw(tsc_value_t target, tsc_str_t* key, tsc_value_t value) {
    bool ok = tsc_value_set_prop(target, key, value);
    if (!ok) tsc_throw_str(tsc_str_from_cstr("Object.assign target set failed"));
}

tsc_value_t tsc_value_object_assign(tsc_value_t target, tsc_value_t source) {
    if (tsc_value_is_nullish(target)) {
        tsc_throw_str(tsc_str_from_cstr("Object.assign target must not be null or undefined"));
    }
    if (!value_is_box(target)) return target;
    bool target_is_object = value_tag(target) == TSC_VALUE_TAG_OBJECT;
    bool target_is_array = value_tag(target) == TSC_VALUE_TAG_ARRAY;
    bool target_is_function = value_tag(target) == TSC_VALUE_TAG_FUNCTION;
    if (!target_is_object && !target_is_array && !target_is_function) return target;
    if (!value_is_box(source)) return target;
    tsc_value_tag_t source_tag = value_tag(source);
    if (
        source_tag != TSC_VALUE_TAG_OBJECT &&
        source_tag != TSC_VALUE_TAG_ARRAY &&
        source_tag != TSC_VALUE_TAG_STRING &&
        source_tag != TSC_VALUE_TAG_FUNCTION
    ) {
        return target;
    }
    tsc_array_t* keys = tsc_value_raw_own_keys(source);
    for (size_t i = 0; i < keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
        if (!tsc_value_property_is_enumerable(source, key)) continue;
        tsc_value_t value = tsc_value_get_prop(source, key);
        object_assign_set_or_throw(target, key, value);
    }
    return target;
}

static bool copy_data_property_is_excluded(
    const tsc_str_t* raw_key,
    const tsc_array_t* excluded_keys
) {
    if (!excluded_keys) return false;
    tsc_symbol_t* raw_symbol = value_known_symbol_from_internal_key(raw_key);
    for (size_t i = 0; i < excluded_keys->len; i++) {
        tsc_value_t excluded = TSC_ARR(tsc_value_t, excluded_keys, i);
        if (raw_symbol) {
            if (
                value_is_box(excluded) &&
                value_tag(excluded) == TSC_VALUE_TAG_SYMBOL &&
                (tsc_symbol_t*)value_ptr(excluded) == raw_symbol
            ) {
                return true;
            }
            continue;
        }
        if (
            value_is_box(excluded) &&
            value_tag(excluded) == TSC_VALUE_TAG_STRING &&
            tsc_str_eq(raw_key, (tsc_str_t*)value_ptr(excluded))
        ) {
            return true;
        }
    }
    return false;
}

/* CopyDataProperties consumes the runtime's one canonical [[OwnPropertyKeys]]
 * collection, preserving String/Symbol identity and Proxy/accessor effects. */
tsc_value_t tsc_value_copy_data_properties(tsc_value_t source, tsc_array_t* excluded_keys) {
    if (tsc_value_is_nullish(source)) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Cannot destructure null or undefined")
        );
    }
    tsc_object_t* target = tsc_object_new();
    tsc_array_t* keys = tsc_value_raw_own_keys(source);
    for (size_t i = 0; i < keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
        if (copy_data_property_is_excluded(key, excluded_keys)) continue;
        if (!tsc_value_property_is_enumerable(source, key)) continue;
        tsc_value_t value = tsc_value_get_prop(source, key);
        void* volatile value_gc_root = tsc_value_gc_root(value);
        (void)value_gc_root;
        tsc_object_set(target, key, value);
    }
    return tsc_value_object(target);
}

double tsc_value_length(tsc_value_t v) {
    if (!value_is_box(v)) return 0.0;
    if (value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return (double)((tsc_array_t*)value_ptr(v))->len;
    }
    if (value_tag(v) == TSC_VALUE_TAG_STRING) {
        return (double)((tsc_str_t*)value_ptr(v))->len;
    }
    if (value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(v);
        if (fn->props) {
            tsc_value_t own_length = tsc_object_get(fn->props, tsc_str_from_lit("length", 6));
            if (!tsc_value_is_undefined(own_length)) return tsc_value_as_num(own_length);
        }
        return fn->length;
    }
    if (value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_value_t length_value = tsc_value_get_prop(v, tsc_str_from_lit("length", 6));
        double length = tsc_value_as_num(length_value);
        if (isnan(length) || length <= 0.0) return 0.0;
        if (isinf(length)) return (double)SIZE_MAX;
        if (length > (double)SIZE_MAX) return (double)SIZE_MAX;
        return floor(length);
    }
    return 0.0;
}

tsc_array_t* tsc_value_iter_values(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_array_iter_values((const tsc_array_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_string_values((const tsc_str_t*)value_ptr(v));
    }
    tsc_throw_str(tsc_str_from_cstr("for-of value is not iterable"));
    return tsc_array_new(sizeof(tsc_value_t), 1);
}

enum {
    TSC_SYNC_ITERATOR_DYNAMIC = 0,
    TSC_SYNC_ITERATOR_ARRAY = 1,
    TSC_SYNC_ITERATOR_STRING = 2,
};

tsc_sync_iterator_t tsc_sync_iterator_open(tsc_value_t source) {
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
        .index = 0,
        .kind = TSC_SYNC_ITERATOR_DYNAMIC,
        .done = false,
    };
    tsc_value_t method = tsc_value_get_symbol_prop(source, tsc_symbol_iterator());
    void* volatile method_gc_root = tsc_value_gc_root(method);
    (void)method_gc_root;
    if (
        value_is_box(source) &&
        value_tag(source) == TSC_VALUE_TAG_ARRAY &&
        tsc_value_eq(method, tsc_value_symbol_iterator_method_value())
    ) {
        record.kind = TSC_SYNC_ITERATOR_ARRAY;
        return record;
    }
    if (
        value_is_box(source) &&
        value_tag(source) == TSC_VALUE_TAG_STRING &&
        tsc_value_is_undefined(method)
    ) {
        record.kind = TSC_SYNC_ITERATOR_STRING;
        record.iterator = tsc_value_array(value_string_values((tsc_str_t*)value_ptr(source)));
        record.iterator_gc_root = tsc_value_gc_root(record.iterator);
        return record;
    }
    if (!tsc_value_is_callable(method)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Value is not iterable"));
    }
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    record.iterator = tsc_value_apply_function(method, source, tsc_value_array(args));
    if (!tsc_value_is_object(record.iterator)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator method returned a non-object"));
    }
    record.iterator_gc_root = tsc_value_gc_root(record.iterator);
    record.next_method = tsc_value_get_prop(
        record.iterator,
        tsc_str_from_lit("next", 4)
    );
    record.next_method_gc_root = tsc_value_gc_root(record.next_method);
    if (!tsc_value_is_callable(record.next_method)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator next method is not callable"));
    }
    return record;
}

bool tsc_sync_iterator_step(tsc_sync_iterator_t* record, tsc_value_t* value) {
    if (!record || record->done) return false;
    if (record->kind == TSC_SYNC_ITERATOR_ARRAY) {
        size_t length = (size_t)tsc_value_length(record->source);
        if (record->index >= length) {
            record->done = true;
            return false;
        }
        if (value) *value = tsc_value_get_index(record->source, (double)record->index);
        record->index++;
        return true;
    }
    if (record->kind == TSC_SYNC_ITERATOR_STRING) {
        tsc_array_t* values = tsc_value_as_array(record->iterator);
        if (record->index >= values->len) {
            record->done = true;
            return false;
        }
        if (value) *value = TSC_ARR(tsc_value_t, values, record->index);
        record->index++;
        return true;
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
    if (record->kind != TSC_SYNC_ITERATOR_DYNAMIC) return;
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

tsc_value_t tsc_value_symbol_iterator(tsc_value_t v) {
    if (value_is_box(v)) {
        if (value_tag(v) == TSC_VALUE_TAG_ARRAY) {
            return v;
        }
        if (value_tag(v) == TSC_VALUE_TAG_STRING) {
            tsc_str_t* s = (tsc_str_t*)value_ptr(v);
            tsc_array_t* chars = value_string_values(s);
            return tsc_value_array(chars);
        }
    }
    tsc_throw_str(tsc_str_from_cstr("[Symbol.iterator] call target is not iterable"));
    return tsc_value_undefined();
}

tsc_value_t tsc_value_symbol_iterator_method_value(void) {
    return tsc_value_get_prop(
        tsc_value_array(tsc_array_prototype()),
        tsc_str_from_lit("values", 6)
    );
}

tsc_value_t tsc_value_symbol_iterator_method(tsc_value_t v) {
    return tsc_value_get_symbol_prop(v, tsc_symbol_iterator());
}

tsc_value_t tsc_value_symbol_unscopables(tsc_value_t v) {
    return tsc_value_get_symbol_prop(v, tsc_symbol_unscopables());
}

tsc_array_t* tsc_value_array_from_values(tsc_value_t v) {
    if (tsc_value_is_nullish(v)) {
        tsc_throw_str(tsc_str_from_cstr("Array.from source must not be null or undefined"));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_array_iter_values((const tsc_array_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_string_values((const tsc_str_t*)value_ptr(v));
    }
    return tsc_array_new(sizeof(tsc_value_t), 1);
}

tsc_array_t* tsc_value_collection_constructor_values(tsc_value_t v) {
    if (tsc_value_is_nullish(v)) {
        return tsc_array_new(sizeof(tsc_value_t), 1);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_array_iter_values((const tsc_array_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_string_values((const tsc_str_t*)value_ptr(v));
    }
    tsc_throw_str(tsc_str_from_cstr("collection constructor source is not iterable"));
    return tsc_array_new(sizeof(tsc_value_t), 1);
}

tsc_map_t* tsc_value_map_constructor_entries(tsc_value_t entries) {
    if (tsc_value_is_nullish(entries)) {
        return tsc_map_new(sizeof(tsc_value_t), sizeof(tsc_value_t), TSC_KEY_VALUE, 0);
    }
    if (
        !value_is_box(entries) ||
        (value_tag(entries) != TSC_VALUE_TAG_ARRAY && value_tag(entries) != TSC_VALUE_TAG_STRING)
    ) {
        tsc_throw_str(tsc_str_from_cstr("Map constructor source is not iterable"));
    }
    tsc_array_t* outer = value_tag(entries) == TSC_VALUE_TAG_ARRAY
        ? value_array_values((const tsc_array_t*)value_ptr(entries))
        : value_string_values((const tsc_str_t*)value_ptr(entries));
    tsc_map_t* out = tsc_map_new(sizeof(tsc_value_t), sizeof(tsc_value_t), TSC_KEY_VALUE, outer->len);
    for (size_t i = 0; i < outer->len; i++) {
        tsc_value_t pair_value = TSC_ARR(tsc_value_t, outer, i);
        if (!value_is_box(pair_value) || value_tag(pair_value) != TSC_VALUE_TAG_ARRAY) {
            tsc_throw_str(tsc_str_from_cstr("Map constructor entry must be an array pair"));
        }
        tsc_array_t* pair = (tsc_array_t*)value_ptr(pair_value);
        if (pair->len < 2) {
            tsc_throw_str(tsc_str_from_cstr("Map constructor entry must be an array pair"));
        }
        tsc_value_t key = TSC_ARR(tsc_value_t, pair, 0);
        tsc_value_t value = TSC_ARR(tsc_value_t, pair, 1);
        tsc_map_set_raw(out, &key, &value);
    }
    return out;
}

bool tsc_value_is_weak_key(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_FUNCTION:
        case TSC_VALUE_TAG_ARRAY:
        case TSC_VALUE_TAG_OBJECT:
            return true;
        default:
            return false;
    }
}

tsc_map_t* tsc_value_weak_map_constructor_entries(tsc_value_t entries) {
    if (tsc_value_is_nullish(entries)) {
        return tsc_map_new(sizeof(tsc_value_t), sizeof(tsc_value_t), TSC_KEY_VALUE, 0);
    }
    if (!value_is_box(entries) || value_tag(entries) != TSC_VALUE_TAG_ARRAY) {
        tsc_throw_str(tsc_str_from_cstr("WeakMap constructor source is not iterable"));
    }
    tsc_array_t* outer = value_array_values((const tsc_array_t*)value_ptr(entries));
    tsc_map_t* out = tsc_map_new(sizeof(tsc_value_t), sizeof(tsc_value_t), TSC_KEY_VALUE, outer->len);
    for (size_t i = 0; i < outer->len; i++) {
        tsc_value_t pair_value = TSC_ARR(tsc_value_t, outer, i);
        if (!value_is_box(pair_value) || value_tag(pair_value) != TSC_VALUE_TAG_ARRAY) {
            tsc_throw_str(tsc_str_from_cstr("WeakMap constructor entry must be an array pair"));
        }
        tsc_array_t* pair = (tsc_array_t*)value_ptr(pair_value);
        if (pair->len < 2) {
            tsc_throw_str(tsc_str_from_cstr("WeakMap constructor entry must be an array pair"));
        }
        tsc_value_t key = TSC_ARR(tsc_value_t, pair, 0);
        if (!tsc_value_is_weak_key(key)) {
            tsc_throw_str(tsc_str_from_cstr("WeakMap key must be an object"));
        }
        tsc_value_t value = TSC_ARR(tsc_value_t, pair, 1);
        tsc_map_set_raw(out, &key, &value);
    }
    return out;
}

tsc_set_t* tsc_value_weak_set_constructor_values(tsc_value_t values) {
    if (tsc_value_is_nullish(values)) {
        return tsc_set_new(sizeof(tsc_value_t), TSC_KEY_VALUE, 0);
    }
    tsc_array_t* src = tsc_value_collection_constructor_values(values);
    tsc_set_t* out = tsc_set_new(sizeof(tsc_value_t), TSC_KEY_VALUE, src->len);
    for (size_t i = 0; i < src->len; i++) {
        tsc_value_t value = TSC_ARR(tsc_value_t, src, i);
        if (!tsc_value_is_weak_key(value)) {
            tsc_throw_str(tsc_str_from_cstr("WeakSet value must be an object"));
        }
        tsc_set_add_raw(out, &value);
    }
    return out;
}

tsc_array_t* tsc_value_object_keys(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return value_object_string_keys((tsc_object_t*)value_ptr(v), true);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_array_keys((const tsc_array_t*)value_ptr(v), false);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_string_keys((const tsc_str_t*)value_ptr(v), false);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* fn = (const tsc_function_identity_t*)value_ptr(v);
        return fn && fn->props ? value_object_string_keys(fn->props, true) : tsc_array_new(sizeof(tsc_str_t*), 1);
    }
    return tsc_array_new(sizeof(tsc_str_t*), 1);
}

tsc_array_t* tsc_value_object_values(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return value_object_string_values((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_array_values((const tsc_array_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_string_values((const tsc_str_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* fn = (const tsc_function_identity_t*)value_ptr(v);
        return fn && fn->props ? value_object_string_values(fn->props) : tsc_array_new(sizeof(tsc_value_t), 1);
    }
    return tsc_array_new(sizeof(tsc_value_t), 1);
}

tsc_array_t* tsc_value_object_entries(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return value_object_string_entries((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_array_entries((const tsc_array_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_string_entries((const tsc_str_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* fn = (const tsc_function_identity_t*)value_ptr(v);
        return fn && fn->props ? value_object_string_entries(fn->props) : tsc_array_new(sizeof(tsc_value_t), 1);
    }
    return tsc_array_new(sizeof(tsc_value_t), 1);
}

/*
 * Collect dynamic-import attributes through the same ordinary object path as
 * Object.entries. That path performs OwnPropertyKeys, descriptor/enumerability
 * checks, and Get in one canonical worklist, including Proxy traps and abrupt
 * completions. The AOT host intentionally supports one attribute key, `type`.
 */
tsc_dynamic_import_attribute_type_t tsc_dynamic_import_collect_attributes(tsc_value_t options) {
    if (tsc_value_is_undefined(options)) return TSC_DYNAMIC_IMPORT_ATTRIBUTES_NONE;
    if (!tsc_value_is_object(options)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("dynamic import options must be an object"));
    }

    tsc_value_t attributes = tsc_value_get_prop(options, tsc_str_from_lit("with", 4));
    if (tsc_value_is_undefined(attributes)) return TSC_DYNAMIC_IMPORT_ATTRIBUTES_NONE;
    if (!tsc_value_is_object(attributes)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("dynamic import attributes must be an object"));
    }

    /* EnumerableOwnProperties finishes collecting before host support is
     * checked, so every getter/trap runs even when a later key is unsupported. */
    tsc_array_t* entries = tsc_value_object_entries(attributes);
    tsc_dynamic_import_attribute_type_t result = TSC_DYNAMIC_IMPORT_ATTRIBUTES_NONE;
    for (size_t index = 0; index < entries->len; index++) {
        tsc_value_t pair_value = TSC_ARR(tsc_value_t, entries, index);
        tsc_array_t* pair = tsc_value_as_array(pair_value);
        tsc_str_t* key = tsc_value_as_string(TSC_ARR(tsc_value_t, pair, 0));
        tsc_value_t raw_value = TSC_ARR(tsc_value_t, pair, 1);
        if (!value_is_box(raw_value) || value_tag(raw_value) != TSC_VALUE_TAG_STRING) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("dynamic import attribute values must be strings"));
        }
        tsc_str_t* value = (tsc_str_t*)value_ptr(raw_value);
        if (!str_lit_eq(key, "type")) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("unsupported dynamic import attribute"));
        }
        if (str_lit_eq(value, "javascript")) {
            result = TSC_DYNAMIC_IMPORT_ATTRIBUTES_JAVASCRIPT;
        } else if (str_lit_eq(value, "json")) {
            result = TSC_DYNAMIC_IMPORT_ATTRIBUTES_JSON;
        } else {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("unsupported dynamic import attribute type"));
        }
    }
    return result;
}

void tsc_dynamic_import_validate_resource(
    tsc_dynamic_import_attribute_type_t attributes,
    bool json_resource
) {
    if (json_resource) {
        if (attributes != TSC_DYNAMIC_IMPORT_ATTRIBUTES_JSON) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("JSON modules require import attribute type json"));
        }
        return;
    }
    if (attributes == TSC_DYNAMIC_IMPORT_ATTRIBUTES_JSON) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("import attribute type json does not match an ECMAScript Module"));
    }
}

tsc_value_t tsc_value_object_from_entries(tsc_value_t entries) {
    tsc_object_t* out = tsc_object_new();
    if (!value_is_box(entries) || value_tag(entries) != TSC_VALUE_TAG_ARRAY) {
        tsc_throw_str(tsc_str_from_cstr("Object.fromEntries entries must be an array"));
    }
    tsc_array_t* outer = (tsc_array_t*)value_ptr(entries);
    for (size_t i = 0; i < outer->len; i++) {
        tsc_value_t pair_value = TSC_ARR(tsc_value_t, outer, i);
        if (!value_is_box(pair_value) || value_tag(pair_value) != TSC_VALUE_TAG_ARRAY) {
            tsc_throw_str(tsc_str_from_cstr("Object.fromEntries entry must be an array pair"));
        }
        tsc_array_t* pair = (tsc_array_t*)value_ptr(pair_value);
        if (pair->len < 2) {
            tsc_throw_str(tsc_str_from_cstr("Object.fromEntries entry must be an array pair"));
        }
        tsc_str_t* key = tsc_value_to_string(TSC_ARR(tsc_value_t, pair, 0));
        tsc_value_t value = TSC_ARR(tsc_value_t, pair, 1);
        tsc_object_set(out, key, value);
    }
    return tsc_value_object(out);
}

typedef enum {
    TSC_TO_PRIMITIVE_DEFAULT,
    TSC_TO_PRIMITIVE_NUMBER,
    TSC_TO_PRIMITIVE_STRING,
} tsc_to_primitive_hint_t;

static tsc_value_t value_to_primitive(
    tsc_value_t object,
    tsc_to_primitive_hint_t hint
);

typedef enum {
    TSC_NUMERIC_ADD,
    TSC_NUMERIC_SUB,
    TSC_NUMERIC_MUL,
    TSC_NUMERIC_DIV,
    TSC_NUMERIC_MOD,
    TSC_NUMERIC_POW,
    TSC_NUMERIC_BIT_AND,
    TSC_NUMERIC_BIT_OR,
    TSC_NUMERIC_BIT_XOR,
    TSC_NUMERIC_SHL,
    TSC_NUMERIC_SHR,
    TSC_NUMERIC_USHR,
} tsc_numeric_binary_op_t;

static bool value_is_bigint(tsc_value_t value) {
    return value_is_box(value) && value_tag(value) == TSC_VALUE_TAG_BIGINT;
}

static tsc_value_t value_to_primitive_if_object(
    tsc_value_t value,
    tsc_to_primitive_hint_t hint
) {
    return tsc_value_is_object(value) ? value_to_primitive(value, hint) : value;
}

tsc_value_t tsc_value_to_numeric(tsc_value_t value) {
    tsc_value_t primitive = value_to_primitive_if_object(value, TSC_TO_PRIMITIVE_NUMBER);
    if (value_is_bigint(primitive)) return primitive;
    return tsc_value_num(tsc_value_as_num(primitive));
}

static void value_throw_mixed_bigint(void) {
    tsc_throw_error(
        TSC_ERROR_TYPE,
        tsc_str_from_cstr("Cannot mix BigInt and other types, use explicit conversions")
    );
}

static tsc_value_t value_numeric_binary(
    tsc_value_t left,
    tsc_value_t right,
    tsc_numeric_binary_op_t operation
) {
    left = tsc_value_to_numeric(left);
    right = tsc_value_to_numeric(right);
    bool left_bigint = value_is_bigint(left);
    bool right_bigint = value_is_bigint(right);
    if (left_bigint != right_bigint) value_throw_mixed_bigint();
    if (left_bigint) {
        const tsc_bigint_t* a = (const tsc_bigint_t*)value_ptr(left);
        const tsc_bigint_t* b = (const tsc_bigint_t*)value_ptr(right);
        tsc_bigint_t* result = NULL;
        switch (operation) {
            case TSC_NUMERIC_ADD: result = tsc_bigint_add(a, b); break;
            case TSC_NUMERIC_SUB: result = tsc_bigint_sub(a, b); break;
            case TSC_NUMERIC_MUL: result = tsc_bigint_mul(a, b); break;
            case TSC_NUMERIC_DIV: result = tsc_bigint_div(a, b); break;
            case TSC_NUMERIC_MOD: result = tsc_bigint_mod(a, b); break;
            case TSC_NUMERIC_POW: result = tsc_bigint_pow(a, b); break;
            case TSC_NUMERIC_BIT_AND: result = tsc_bigint_bit_and(a, b); break;
            case TSC_NUMERIC_BIT_OR: result = tsc_bigint_bit_or(a, b); break;
            case TSC_NUMERIC_BIT_XOR: result = tsc_bigint_bit_xor(a, b); break;
            case TSC_NUMERIC_SHL: result = tsc_bigint_shl(a, b); break;
            case TSC_NUMERIC_SHR: result = tsc_bigint_shr(a, b); break;
            case TSC_NUMERIC_USHR:
                tsc_throw_error(
                    TSC_ERROR_TYPE,
                    tsc_str_from_cstr("BigInts have no unsigned right shift, use >> instead")
                );
        }
        return tsc_value_bigint(result);
    }

    double a = value_as_num(left);
    double b = value_as_num(right);
    switch (operation) {
        case TSC_NUMERIC_ADD: return tsc_value_num(a + b);
        case TSC_NUMERIC_SUB: return tsc_value_num(a - b);
        case TSC_NUMERIC_MUL: return tsc_value_num(a * b);
        case TSC_NUMERIC_DIV: return tsc_value_num(a / b);
        case TSC_NUMERIC_MOD: return tsc_value_num(tsc_num_mod(a, b));
        case TSC_NUMERIC_POW: return tsc_value_num(pow(a, b));
        case TSC_NUMERIC_BIT_AND:
            return tsc_value_num((double)(tsc_to_int32(a) & tsc_to_int32(b)));
        case TSC_NUMERIC_BIT_OR:
            return tsc_value_num((double)(tsc_to_int32(a) | tsc_to_int32(b)));
        case TSC_NUMERIC_BIT_XOR:
            return tsc_value_num((double)(tsc_to_int32(a) ^ tsc_to_int32(b)));
        case TSC_NUMERIC_SHL: {
            uint32_t bits = (uint32_t)tsc_to_int32(a);
            uint32_t shift = tsc_to_uint32(b) & 31u;
            return tsc_value_num((double)tsc_int32_from_uint32(bits << shift));
        }
        case TSC_NUMERIC_SHR: {
            int32_t bits = tsc_to_int32(a);
            uint32_t shift = tsc_to_uint32(b) & 31u;
            return tsc_value_num((double)tsc_shift_right_int32(bits, shift));
        }
        case TSC_NUMERIC_USHR: {
            uint32_t bits = tsc_to_uint32(a);
            uint32_t shift = tsc_to_uint32(b) & 31u;
            return tsc_value_num((double)(bits >> shift));
        }
    }
    tsc_panic("unknown numeric binary operation");
    return tsc_value_undefined();
}

tsc_value_t tsc_value_add(tsc_value_t a, tsc_value_t b) {
    a = value_to_primitive_if_object(a, TSC_TO_PRIMITIVE_DEFAULT);
    b = value_to_primitive_if_object(b, TSC_TO_PRIMITIVE_DEFAULT);
    bool stringy =
        (value_is_box(a) && value_tag(a) == TSC_VALUE_TAG_STRING) ||
        (value_is_box(b) && value_tag(b) == TSC_VALUE_TAG_STRING);
    if (stringy) {
        return tsc_value_string(tsc_str_concat(tsc_value_to_string(a), tsc_value_to_string(b)));
    }
    return value_numeric_binary(a, b, TSC_NUMERIC_ADD);
}

tsc_value_t tsc_value_sub(tsc_value_t a, tsc_value_t b) { return value_numeric_binary(a, b, TSC_NUMERIC_SUB); }
tsc_value_t tsc_value_mul(tsc_value_t a, tsc_value_t b) { return value_numeric_binary(a, b, TSC_NUMERIC_MUL); }
tsc_value_t tsc_value_div(tsc_value_t a, tsc_value_t b) { return value_numeric_binary(a, b, TSC_NUMERIC_DIV); }
tsc_value_t tsc_value_mod(tsc_value_t a, tsc_value_t b) { return value_numeric_binary(a, b, TSC_NUMERIC_MOD); }
tsc_value_t tsc_value_pow(tsc_value_t a, tsc_value_t b) { return value_numeric_binary(a, b, TSC_NUMERIC_POW); }

tsc_value_t tsc_value_inc(tsc_value_t value) {
    value = tsc_value_to_numeric(value);
    return value_is_bigint(value)
        ? tsc_value_bigint(tsc_bigint_add((const tsc_bigint_t*)value_ptr(value), tsc_bigint_from_lit("1")))
        : tsc_value_num(value_as_num(value) + 1.0);
}

tsc_value_t tsc_value_dec(tsc_value_t value) {
    value = tsc_value_to_numeric(value);
    return value_is_bigint(value)
        ? tsc_value_bigint(tsc_bigint_sub((const tsc_bigint_t*)value_ptr(value), tsc_bigint_from_lit("1")))
        : tsc_value_num(value_as_num(value) - 1.0);
}

tsc_value_t tsc_value_neg(tsc_value_t value) {
    value = tsc_value_to_numeric(value);
    return value_is_bigint(value)
        ? tsc_value_bigint(tsc_bigint_neg((const tsc_bigint_t*)value_ptr(value)))
        : tsc_value_num(-value_as_num(value));
}

tsc_value_t tsc_value_bit_not(tsc_value_t value) {
    value = tsc_value_to_numeric(value);
    return value_is_bigint(value)
        ? tsc_value_bigint(tsc_bigint_bit_not((const tsc_bigint_t*)value_ptr(value)))
        : tsc_value_num((double)(~tsc_to_int32(value_as_num(value))));
}

tsc_value_t tsc_value_bit_and(tsc_value_t a, tsc_value_t b) { return value_numeric_binary(a, b, TSC_NUMERIC_BIT_AND); }
tsc_value_t tsc_value_bit_or(tsc_value_t a, tsc_value_t b) { return value_numeric_binary(a, b, TSC_NUMERIC_BIT_OR); }
tsc_value_t tsc_value_bit_xor(tsc_value_t a, tsc_value_t b) { return value_numeric_binary(a, b, TSC_NUMERIC_BIT_XOR); }
tsc_value_t tsc_value_shl(tsc_value_t a, tsc_value_t b) { return value_numeric_binary(a, b, TSC_NUMERIC_SHL); }
tsc_value_t tsc_value_shr(tsc_value_t a, tsc_value_t b) { return value_numeric_binary(a, b, TSC_NUMERIC_SHR); }
tsc_value_t tsc_value_ushr(tsc_value_t a, tsc_value_t b) { return value_numeric_binary(a, b, TSC_NUMERIC_USHR); }

bool tsc_value_eq(tsc_value_t a, tsc_value_t b) {
    if (!value_is_box(a) && !value_is_box(b)) return value_as_num(a) == value_as_num(b);
    if (value_is_box(a) != value_is_box(b)) return false;
    tsc_value_tag_t at = value_tag(a);
    tsc_value_tag_t bt = value_tag(b);
    if (at != bt) return false;
    switch (at) {
        case TSC_VALUE_TAG_UNDEFINED:
        case TSC_VALUE_TAG_NULL:
        case TSC_VALUE_TAG_FALSE:
        case TSC_VALUE_TAG_TRUE:
            return true;
        case TSC_VALUE_TAG_STRING:
            return tsc_str_eq((const tsc_str_t*)value_ptr(a), (const tsc_str_t*)value_ptr(b));
        case TSC_VALUE_TAG_BIGINT:
            return tsc_bigint_eq(
                (const tsc_bigint_t*)value_ptr(a),
                (const tsc_bigint_t*)value_ptr(b)
            );
        case TSC_VALUE_TAG_SYMBOL:
        case TSC_VALUE_TAG_FUNCTION:
        case TSC_VALUE_TAG_ARRAY:
        case TSC_VALUE_TAG_OBJECT:
            return value_ptr(a) == value_ptr(b);
    }
    return false;
}

bool tsc_value_is_html_dda(tsc_value_t value) {
    return value_is_box(value) &&
        value_tag(value) == TSC_VALUE_TAG_FUNCTION &&
        ((const tsc_function_identity_t*)value_ptr(value))->is_html_dda;
}

void tsc_value_mark_html_dda(tsc_value_t value) {
    if (!value_is_box(value) || value_tag(value) != TSC_VALUE_TAG_FUNCTION) {
        tsc_panic("[[IsHTMLDDA]] requires a callable object");
    }
    ((tsc_function_identity_t*)value_ptr(value))->is_html_dda = true;
}

typedef enum {
    TSC_ABSTRACT_UNDEFINED,
    TSC_ABSTRACT_NULL,
    TSC_ABSTRACT_BOOLEAN,
    TSC_ABSTRACT_NUMBER,
    TSC_ABSTRACT_STRING,
    TSC_ABSTRACT_BIGINT,
    TSC_ABSTRACT_SYMBOL,
    TSC_ABSTRACT_OBJECT,
} tsc_abstract_type_t;

static tsc_abstract_type_t abstract_equality_type(tsc_value_t value) {
    if (!value_is_box(value)) return TSC_ABSTRACT_NUMBER;
    switch (value_tag(value)) {
        case TSC_VALUE_TAG_UNDEFINED: return TSC_ABSTRACT_UNDEFINED;
        case TSC_VALUE_TAG_NULL: return TSC_ABSTRACT_NULL;
        case TSC_VALUE_TAG_FALSE:
        case TSC_VALUE_TAG_TRUE: return TSC_ABSTRACT_BOOLEAN;
        case TSC_VALUE_TAG_STRING: return TSC_ABSTRACT_STRING;
        case TSC_VALUE_TAG_BIGINT: return TSC_ABSTRACT_BIGINT;
        case TSC_VALUE_TAG_SYMBOL: return TSC_ABSTRACT_SYMBOL;
        case TSC_VALUE_TAG_FUNCTION:
        case TSC_VALUE_TAG_ARRAY:
        case TSC_VALUE_TAG_OBJECT: return TSC_ABSTRACT_OBJECT;
    }
    return TSC_ABSTRACT_UNDEFINED;
}

static tsc_value_t value_ordinary_to_primitive(
    tsc_value_t object,
    tsc_to_primitive_hint_t hint
) {
    static const struct {
        const char* name;
        size_t name_len;
    } ordinary_methods[][2] = {
        [TSC_TO_PRIMITIVE_DEFAULT] = { { "valueOf", 7 }, { "toString", 8 } },
        [TSC_TO_PRIMITIVE_NUMBER] = { { "valueOf", 7 }, { "toString", 8 } },
        [TSC_TO_PRIMITIVE_STRING] = { { "toString", 8 }, { "valueOf", 7 } },
    };
    for (size_t index = 0; index < 2; index++) {
        const char* method_name = ordinary_methods[(size_t)hint][index].name;
        size_t method_name_len = ordinary_methods[(size_t)hint][index].name_len;
        tsc_value_t method = tsc_value_get_prop(
            object,
            tsc_str_from_lit(method_name, method_name_len)
        );
        if (!tsc_value_is_callable(method)) continue;
        tsc_value_t result = tsc_value_apply_function(
            method,
            object,
            tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 1))
        );
        if (abstract_equality_type(result) != TSC_ABSTRACT_OBJECT) return result;
    }
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot convert object to primitive value"));
}

static tsc_value_t value_to_primitive(
    tsc_value_t object,
    tsc_to_primitive_hint_t hint
) {
    static const struct {
        const char* name;
        size_t name_len;
    } hints[] = {
        [TSC_TO_PRIMITIVE_DEFAULT] = { "default", 7 },
        [TSC_TO_PRIMITIVE_NUMBER] = { "number", 6 },
        [TSC_TO_PRIMITIVE_STRING] = { "string", 6 },
    };

    tsc_value_t exotic = tsc_value_get_symbol_prop(object, tsc_symbol_to_primitive());
    if (!tsc_value_is_nullish(exotic)) {
        if (!tsc_value_is_callable(exotic)) {
            tsc_throw_error(
                TSC_ERROR_TYPE,
                tsc_str_from_cstr("Symbol.toPrimitive property is not callable")
            );
        }
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
        tsc_value_t hint_value = tsc_value_string(tsc_str_from_lit(
            hints[(size_t)hint].name,
            hints[(size_t)hint].name_len
        ));
        tsc_array_push_raw(args, &hint_value);
        tsc_value_t result = tsc_value_apply_function(
            exotic,
            object,
            tsc_value_array(args)
        );
        if (abstract_equality_type(result) != TSC_ABSTRACT_OBJECT) return result;
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Symbol.toPrimitive must return a primitive value")
        );
    }

    return value_ordinary_to_primitive(object, hint);
}

double tsc_value_to_number(tsc_value_t input) {
    return tsc_value_as_num(value_to_primitive_if_object(
        input,
        TSC_TO_PRIMITIVE_NUMBER
    ));
}

double tsc_value_number_constructor(tsc_value_t input) {
    tsc_value_t primitive = value_to_primitive_if_object(
        input,
        TSC_TO_PRIMITIVE_NUMBER
    );
    if (value_is_bigint(primitive)) {
        return tsc_bigint_to_number((const tsc_bigint_t*)value_ptr(primitive));
    }
    return tsc_value_as_num(primitive);
}

tsc_date_t* tsc_date_from_value(tsc_value_t input) {
    if (value_is_box(input) && value_tag(input) == TSC_VALUE_TAG_OBJECT) {
        const tsc_object_t* object = (const tsc_object_t*)value_ptr(input);
        if (object && object->is_date && object->class_ptr) {
            return tsc_date_from_ms(
                tsc_date_get_time((const tsc_date_t*)object->class_ptr)
            );
        }
    }
    tsc_value_t primitive = value_to_primitive_if_object(
        input,
        TSC_TO_PRIMITIVE_DEFAULT
    );
    if (value_is_box(primitive) && value_tag(primitive) == TSC_VALUE_TAG_STRING) {
        return tsc_date_from_ms(tsc_date_parse((const tsc_str_t*)value_ptr(primitive)));
    }
    return tsc_date_from_ms(tsc_value_as_num(primitive));
}

typedef enum {
    TSC_DATE_METHOD_TIME,
    TSC_DATE_METHOD_UTC_PART,
    TSC_DATE_METHOD_LOCAL_PART,
    TSC_DATE_METHOD_LEGACY_YEAR_PART,
    TSC_DATE_METHOD_SET_TIME,
    TSC_DATE_METHOD_SET_UTC_PART,
    TSC_DATE_METHOD_SET_LOCAL_PART,
    TSC_DATE_METHOD_SET_LEGACY_YEAR,
    TSC_DATE_METHOD_STRING,
    TSC_DATE_METHOD_TO_JSON,
} tsc_date_method_operation_t;

typedef tsc_str_t* (*tsc_date_string_operation_t)(const tsc_date_t* date);

typedef struct {
    const char* name;
    size_t name_len;
    double arity;
    tsc_date_method_operation_t operation;
    int part;
    int max_args;
    tsc_date_string_operation_t string_operation;
    unsigned int identity_group;
} tsc_date_method_descriptor_t;

#define TSC_DATE_METHOD(NAME, ARITY, OPERATION, PART, MAX_ARGS, STRING_OPERATION) \
    { NAME, sizeof(NAME) - 1, ARITY, OPERATION, PART, MAX_ARGS, STRING_OPERATION, 0 }
#define TSC_DATE_ALIAS_METHOD(NAME, ARITY, OPERATION, PART, MAX_ARGS, STRING_OPERATION, GROUP) \
    { NAME, sizeof(NAME) - 1, ARITY, OPERATION, PART, MAX_ARGS, STRING_OPERATION, GROUP }

static const tsc_date_method_descriptor_t date_prototype_methods[] = {
    TSC_DATE_METHOD("getTime", 0.0, TSC_DATE_METHOD_TIME, 0, 0, NULL),
    TSC_DATE_METHOD("valueOf", 0.0, TSC_DATE_METHOD_TIME, 0, 0, NULL),
    TSC_DATE_METHOD("getUTCFullYear", 0.0, TSC_DATE_METHOD_UTC_PART, 0, 0, NULL),
    TSC_DATE_METHOD("getUTCMonth", 0.0, TSC_DATE_METHOD_UTC_PART, 1, 0, NULL),
    TSC_DATE_METHOD("getUTCDate", 0.0, TSC_DATE_METHOD_UTC_PART, 2, 0, NULL),
    TSC_DATE_METHOD("getUTCDay", 0.0, TSC_DATE_METHOD_UTC_PART, 3, 0, NULL),
    TSC_DATE_METHOD("getUTCHours", 0.0, TSC_DATE_METHOD_UTC_PART, 4, 0, NULL),
    TSC_DATE_METHOD("getUTCMinutes", 0.0, TSC_DATE_METHOD_UTC_PART, 5, 0, NULL),
    TSC_DATE_METHOD("getUTCSeconds", 0.0, TSC_DATE_METHOD_UTC_PART, 6, 0, NULL),
    TSC_DATE_METHOD("getUTCMilliseconds", 0.0, TSC_DATE_METHOD_UTC_PART, 7, 0, NULL),
    TSC_DATE_METHOD("getFullYear", 0.0, TSC_DATE_METHOD_LOCAL_PART, 0, 0, NULL),
    TSC_DATE_METHOD("getYear", 0.0, TSC_DATE_METHOD_LEGACY_YEAR_PART, 0, 0, NULL),
    TSC_DATE_METHOD("getMonth", 0.0, TSC_DATE_METHOD_LOCAL_PART, 1, 0, NULL),
    TSC_DATE_METHOD("getDate", 0.0, TSC_DATE_METHOD_LOCAL_PART, 2, 0, NULL),
    TSC_DATE_METHOD("getDay", 0.0, TSC_DATE_METHOD_LOCAL_PART, 3, 0, NULL),
    TSC_DATE_METHOD("getHours", 0.0, TSC_DATE_METHOD_LOCAL_PART, 4, 0, NULL),
    TSC_DATE_METHOD("getMinutes", 0.0, TSC_DATE_METHOD_LOCAL_PART, 5, 0, NULL),
    TSC_DATE_METHOD("getSeconds", 0.0, TSC_DATE_METHOD_LOCAL_PART, 6, 0, NULL),
    TSC_DATE_METHOD("getMilliseconds", 0.0, TSC_DATE_METHOD_LOCAL_PART, 7, 0, NULL),
    TSC_DATE_METHOD("getTimezoneOffset", 0.0, TSC_DATE_METHOD_LOCAL_PART, 8, 0, NULL),
    TSC_DATE_METHOD("setTime", 1.0, TSC_DATE_METHOD_SET_TIME, 0, 1, NULL),
    TSC_DATE_METHOD("setUTCFullYear", 3.0, TSC_DATE_METHOD_SET_UTC_PART, 0, 3, NULL),
    TSC_DATE_METHOD("setUTCMonth", 2.0, TSC_DATE_METHOD_SET_UTC_PART, 1, 2, NULL),
    TSC_DATE_METHOD("setUTCDate", 1.0, TSC_DATE_METHOD_SET_UTC_PART, 2, 1, NULL),
    TSC_DATE_METHOD("setUTCHours", 4.0, TSC_DATE_METHOD_SET_UTC_PART, 3, 4, NULL),
    TSC_DATE_METHOD("setUTCMinutes", 3.0, TSC_DATE_METHOD_SET_UTC_PART, 4, 3, NULL),
    TSC_DATE_METHOD("setUTCSeconds", 2.0, TSC_DATE_METHOD_SET_UTC_PART, 5, 2, NULL),
    TSC_DATE_METHOD("setUTCMilliseconds", 1.0, TSC_DATE_METHOD_SET_UTC_PART, 6, 1, NULL),
    TSC_DATE_METHOD("setFullYear", 3.0, TSC_DATE_METHOD_SET_LOCAL_PART, 0, 3, NULL),
    TSC_DATE_METHOD("setMonth", 2.0, TSC_DATE_METHOD_SET_LOCAL_PART, 1, 2, NULL),
    TSC_DATE_METHOD("setDate", 1.0, TSC_DATE_METHOD_SET_LOCAL_PART, 2, 1, NULL),
    TSC_DATE_METHOD("setHours", 4.0, TSC_DATE_METHOD_SET_LOCAL_PART, 3, 4, NULL),
    TSC_DATE_METHOD("setMinutes", 3.0, TSC_DATE_METHOD_SET_LOCAL_PART, 4, 3, NULL),
    TSC_DATE_METHOD("setSeconds", 2.0, TSC_DATE_METHOD_SET_LOCAL_PART, 5, 2, NULL),
    TSC_DATE_METHOD("setMilliseconds", 1.0, TSC_DATE_METHOD_SET_LOCAL_PART, 6, 1, NULL),
    TSC_DATE_METHOD("setYear", 1.0, TSC_DATE_METHOD_SET_LEGACY_YEAR, 0, 1, NULL),
    TSC_DATE_METHOD("toString", 0.0, TSC_DATE_METHOD_STRING, 0, 0, tsc_date_to_string),
    TSC_DATE_METHOD("toDateString", 0.0, TSC_DATE_METHOD_STRING, 0, 0, tsc_date_to_date_string),
    TSC_DATE_METHOD("toTimeString", 0.0, TSC_DATE_METHOD_STRING, 0, 0, tsc_date_to_time_string),
    TSC_DATE_ALIAS_METHOD("toUTCString", 0.0, TSC_DATE_METHOD_STRING, 0, 0, tsc_date_to_utc_string, 1),
    TSC_DATE_ALIAS_METHOD("toGMTString", 0.0, TSC_DATE_METHOD_STRING, 0, 0, tsc_date_to_utc_string, 1),
    TSC_DATE_METHOD("toISOString", 0.0, TSC_DATE_METHOD_STRING, 0, 0, tsc_date_to_iso_string),
    TSC_DATE_METHOD("toLocaleString", 0.0, TSC_DATE_METHOD_STRING, 0, 0, tsc_date_to_locale_string),
    TSC_DATE_METHOD("toLocaleDateString", 0.0, TSC_DATE_METHOD_STRING, 0, 0, tsc_date_to_locale_date_string),
    TSC_DATE_METHOD("toLocaleTimeString", 0.0, TSC_DATE_METHOD_STRING, 0, 0, tsc_date_to_locale_time_string),
    TSC_DATE_METHOD("toJSON", 1.0, TSC_DATE_METHOD_TO_JSON, 0, 0, NULL),
};

#undef TSC_DATE_METHOD
#undef TSC_DATE_ALIAS_METHOD

typedef struct {
    tsc_object_t* prototype_object;
    tsc_value_t constructor;
    bool initialized;
} tsc_date_intrinsics_state_t;

static const char date_intrinsics_realm_state_key = 0;

static tsc_date_intrinsics_state_t* date_intrinsics_for_current_realm(void) {
    tsc_date_intrinsics_state_t* state =
        (tsc_date_intrinsics_state_t*)tsc_realm_state_get(
            &date_intrinsics_realm_state_key
        );
    if (state) return state;
    tsc_runtime_lock();
    state = (tsc_date_intrinsics_state_t*)tsc_realm_state_get(
        &date_intrinsics_realm_state_key
    );
    if (!state) {
        state = (tsc_date_intrinsics_state_t*)TSC_GC_MALLOC(sizeof(*state));
        memset(state, 0, sizeof(*state));
        tsc_realm_state_set(&date_intrinsics_realm_state_key, state);
    }
    tsc_runtime_unlock();
    return state;
}

#define date_prototype_object (date_intrinsics_for_current_realm()->prototype_object)
#define date_constructor (date_intrinsics_for_current_realm()->constructor)
#define date_intrinsic_initialized (date_intrinsics_for_current_realm()->initialized)

static tsc_value_t date_argument(const tsc_array_t* args, size_t index) {
    return args && index < args->len
        ? TSC_ARR(tsc_value_t, args, index)
        : tsc_value_undefined();
}

static tsc_date_t* date_this_value(tsc_value_t receiver, const char* method) {
    if (value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = (tsc_object_t*)value_ptr(receiver);
        if (object && object->is_date && object->class_ptr) {
            return (tsc_date_t*)object->class_ptr;
        }
    }
    char message[128];
    snprintf(message, sizeof message, "Date.prototype.%s called on incompatible receiver", method);
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr(message));
}

static int date_numeric_arguments(
    const tsc_array_t* args,
    int maximum,
    double values[4]
) {
    int count = args ? (int)args->len : 0;
    if (count > maximum) count = maximum;
    if (count == 0) count = 1;
    for (int index = 0; index < count; index++) {
        values[index] = tsc_value_to_number(date_argument(args, (size_t)index));
    }
    return count;
}

static tsc_value_t date_prototype_to_json(tsc_value_t receiver) {
    tsc_value_t primitive = value_to_primitive_if_object(
        receiver,
        TSC_TO_PRIMITIVE_NUMBER
    );
    if (!value_is_box(primitive) && !isfinite(value_as_num(primitive))) {
        return tsc_value_null();
    }
    tsc_value_t method = tsc_value_get_prop(
        receiver,
        tsc_str_from_lit("toISOString", 11)
    );
    if (!tsc_value_is_callable(method)) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_lit("Date toISOString property is not callable", 41)
        );
    }
    return tsc_value_apply_function(
        method,
        receiver,
        tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 1))
    );
}

static tsc_value_t date_prototype_method_apply(
    void* env,
    tsc_value_t this_arg,
    tsc_array_t* args
) {
    const tsc_date_method_descriptor_t* descriptor =
        (const tsc_date_method_descriptor_t*)env;
    if (descriptor->operation == TSC_DATE_METHOD_TO_JSON) {
        return date_prototype_to_json(this_arg);
    }
    tsc_date_t* date = date_this_value(this_arg, descriptor->name);
    switch (descriptor->operation) {
        case TSC_DATE_METHOD_TIME:
            return tsc_value_num(tsc_date_get_time(date));
        case TSC_DATE_METHOD_UTC_PART:
            return tsc_value_num(tsc_date_get_utc_part(date, descriptor->part));
        case TSC_DATE_METHOD_LOCAL_PART:
            return tsc_value_num(
                descriptor->part == 8
                    ? tsc_date_get_timezone_offset(date)
                    : tsc_date_get_local_part(date, descriptor->part)
            );
        case TSC_DATE_METHOD_LEGACY_YEAR_PART:
            return tsc_value_num(tsc_date_get_local_part(date, 0) - 1900.0);
        case TSC_DATE_METHOD_SET_TIME:
            return tsc_value_num(tsc_date_set_time(
                date,
                tsc_value_to_number(date_argument(args, 0))
            ));
        case TSC_DATE_METHOD_SET_UTC_PART:
        case TSC_DATE_METHOD_SET_LOCAL_PART: {
            double values[4] = { 0.0, 0.0, 0.0, 0.0 };
            int count = date_numeric_arguments(args, descriptor->max_args, values);
            return tsc_value_num(
                descriptor->operation == TSC_DATE_METHOD_SET_UTC_PART
                    ? tsc_date_set_utc_part(
                        date,
                        descriptor->part,
                        values[0], values[1], values[2], values[3],
                        count
                    )
                    : tsc_date_set_local_part(
                        date,
                        descriptor->part,
                        values[0], values[1], values[2], values[3],
                        count
                    )
            );
        }
        case TSC_DATE_METHOD_SET_LEGACY_YEAR:
            return tsc_value_num(tsc_date_set_legacy_year(
                date,
                tsc_value_to_number(date_argument(args, 0))
            ));
        case TSC_DATE_METHOD_STRING:
            return tsc_value_string(descriptor->string_operation(date));
        case TSC_DATE_METHOD_TO_JSON:
            break;
    }
    tsc_panic("unknown Date prototype method operation");
}

static tsc_value_t date_prototype_to_primitive_apply(
    void* env,
    tsc_value_t this_arg,
    tsc_array_t* args
) {
    (void)env;
    if (!tsc_value_is_object(this_arg)) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_lit("Date.prototype[Symbol.toPrimitive] receiver is not an object", 60)
        );
    }
    tsc_value_t hint_value = date_argument(args, 0);
    if (!value_is_box(hint_value) || value_tag(hint_value) != TSC_VALUE_TAG_STRING) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_lit("invalid Date toPrimitive hint", 29));
    }
    const tsc_str_t* hint = (const tsc_str_t*)value_ptr(hint_value);
    if (str_lit_eq(hint, "number")) {
        return value_ordinary_to_primitive(this_arg, TSC_TO_PRIMITIVE_NUMBER);
    }
    if (str_lit_eq(hint, "string") || str_lit_eq(hint, "default")) {
        return value_ordinary_to_primitive(this_arg, TSC_TO_PRIMITIVE_STRING);
    }
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_lit("invalid Date toPrimitive hint", 29));
}

typedef enum {
    TSC_DATE_STATIC_NOW,
    TSC_DATE_STATIC_PARSE,
    TSC_DATE_STATIC_UTC,
} tsc_date_static_operation_t;

typedef struct {
    const char* name;
    size_t name_len;
    double arity;
    tsc_date_static_operation_t operation;
} tsc_date_static_descriptor_t;

static const tsc_date_static_descriptor_t date_static_methods[] = {
    { "now", 3, 0.0, TSC_DATE_STATIC_NOW },
    { "parse", 5, 1.0, TSC_DATE_STATIC_PARSE },
    { "UTC", 3, 7.0, TSC_DATE_STATIC_UTC },
};

static tsc_value_t date_static_method_apply(
    void* env,
    tsc_value_t this_arg,
    tsc_array_t* args
) {
    (void)this_arg;
    const tsc_date_static_descriptor_t* descriptor =
        (const tsc_date_static_descriptor_t*)env;
    if (descriptor->operation == TSC_DATE_STATIC_NOW) {
        return tsc_value_num(tsc_date_now());
    }
    if (descriptor->operation == TSC_DATE_STATIC_PARSE) {
        return tsc_value_num(tsc_date_parse(tsc_value_to_string_coercion(
            date_argument(args, 0)
        )));
    }
    double values[7] = { NAN, NAN, 1.0, 0.0, 0.0, 0.0, 0.0 };
    size_t count = args && args->len < 7 ? args->len : 7;
    for (size_t index = 0; index < count; index++) {
        values[index] = tsc_value_to_number(date_argument(args, index));
    }
    return tsc_value_num(tsc_date_utc(
        values[0], values[1], values[2], values[3],
        values[4], values[5], values[6]
    ));
}

static tsc_value_t date_constructor_apply(
    void* env,
    tsc_value_t this_arg,
    tsc_array_t* args
) {
    (void)env;
    (void)this_arg;
    (void)args;
    return tsc_value_string(tsc_date_to_string(tsc_date_new_now()));
}

static tsc_value_t date_constructor_construct(
    void* env,
    tsc_value_t receiver,
    tsc_array_t* args
) {
    (void)env;
    if (!value_is_box(receiver) || value_tag(receiver) != TSC_VALUE_TAG_OBJECT) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_lit("Date constructor receiver is not an object", 42));
    }
    tsc_date_t* date;
    if (!args || args->len == 0) {
        date = tsc_date_new_now();
    } else if (args->len == 1) {
        date = tsc_date_from_value(TSC_ARR(tsc_value_t, args, 0));
    } else {
        double values[7] = { NAN, NAN, 1.0, 0.0, 0.0, 0.0, 0.0 };
        size_t count = args->len < 7 ? args->len : 7;
        for (size_t index = 0; index < count; index++) {
            values[index] = tsc_value_to_number(TSC_ARR(tsc_value_t, args, index));
        }
        date = tsc_date_from_ms(tsc_date_local(
            values[0], values[1], values[2], values[3],
            values[4], values[5], values[6]
        ));
    }
    tsc_object_t* object = (tsc_object_t*)value_ptr(receiver);
    object->class_ptr = date;
    object->is_date = true;
    date->object = object;
    return receiver;
}

static void date_intrinsic_initialize(void) {
    if (date_intrinsic_initialized) return;
    tsc_runtime_lock();
    if (!date_intrinsic_initialized) {
        tsc_date_t* prototype_date = tsc_date_from_ms(NAN);
        date_prototype_object = tsc_object_new_class(prototype_date);
        date_prototype_object->is_date = true;
        prototype_date->object = date_prototype_object;
        tsc_value_t prototype = tsc_value_object(date_prototype_object);

        date_constructor = tsc_value_function_named_kind(
            date_constructor_apply,
            date_constructor_construct,
            NULL,
            7.0,
            tsc_str_from_lit("Date", 4),
            TSC_FUNCTION_IDENTITY_BUILTIN
        );
        tsc_function_identity_t* constructor_identity =
            (tsc_function_identity_t*)value_ptr(date_constructor);
        constructor_identity->construct_default_prototype =
            TSC_INTRINSIC_DEFAULT_DATE_PROTOTYPE;
        tsc_function_identity_set_own_prototype(constructor_identity, prototype);
        constructor_identity->func_prototype_writable = false;
        tsc_object_define(
            date_prototype_object,
            tsc_str_from_lit("constructor", 11),
            date_constructor,
            true,
            false,
            true
        );

        tsc_value_t shared_methods[2] = { 0, 0 };
        bool shared_method_initialized[2] = { false, false };
        for (
            size_t index = 0;
            index < sizeof(date_prototype_methods) / sizeof(date_prototype_methods[0]);
            index++
        ) {
            const tsc_date_method_descriptor_t* descriptor =
                &date_prototype_methods[index];
            tsc_value_t method;
            if (
                descriptor->identity_group > 0 &&
                shared_method_initialized[descriptor->identity_group]
            ) {
                method = shared_methods[descriptor->identity_group];
            } else {
                method = tsc_value_function_builtin_named(
                    date_prototype_method_apply,
                    (void*)descriptor,
                    descriptor->arity,
                    tsc_str_from_lit(descriptor->name, descriptor->name_len)
                );
                if (descriptor->identity_group > 0) {
                    shared_methods[descriptor->identity_group] = method;
                    shared_method_initialized[descriptor->identity_group] = true;
                }
            }
            tsc_object_define(
                date_prototype_object,
                tsc_str_from_lit(descriptor->name, descriptor->name_len),
                method,
                true,
                false,
                true
            );
        }

        tsc_value_t to_primitive = tsc_value_function_builtin_named(
            date_prototype_to_primitive_apply,
            NULL,
            1.0,
            tsc_str_from_lit("[Symbol.toPrimitive]", 20)
        );
        (void)tsc_value_define_symbol_property_desc(
            prototype,
            tsc_symbol_to_primitive(),
            to_primitive,
            true,
            false,
            true,
            false,
            true,
            true,
            true
        );

        for (
            size_t index = 0;
            index < sizeof(date_static_methods) / sizeof(date_static_methods[0]);
            index++
        ) {
            const tsc_date_static_descriptor_t* descriptor = &date_static_methods[index];
            tsc_value_t method = tsc_value_function_builtin_named(
                date_static_method_apply,
                (void*)descriptor,
                descriptor->arity,
                tsc_str_from_lit(descriptor->name, descriptor->name_len)
            );
            (void)tsc_value_define_property_desc(
                date_constructor,
                tsc_str_from_lit(descriptor->name, descriptor->name_len),
                method,
                true,
                true,
                true,
                false,
                true,
                true,
                true
            );
        }
        date_intrinsic_initialized = true;
    }
    tsc_runtime_unlock();
}

tsc_value_t tsc_date_constructor_value(void) {
    date_intrinsic_initialize();
    return date_constructor;
}

static tsc_value_t date_prototype_value(void) {
    date_intrinsic_initialize();
    return tsc_value_object(date_prototype_object);
}

tsc_str_t* tsc_value_to_string_coercion(tsc_value_t value) {
    return tsc_value_to_string(
        value_to_primitive_if_object(value, TSC_TO_PRIMITIVE_STRING)
    );
}

tsc_value_t tsc_value_to_property_key(tsc_value_t value) {
    tsc_value_t primitive = value_to_primitive_if_object(
        value,
        TSC_TO_PRIMITIVE_STRING
    );
    if (value_is_box(primitive) && value_tag(primitive) == TSC_VALUE_TAG_SYMBOL) {
        return primitive;
    }
    return tsc_value_string(tsc_value_to_string(primitive));
}

static bool abstract_bigint_number_equal(tsc_value_t bigint, tsc_value_t number) {
    const double numeric = value_as_num(number);
    return isfinite(numeric) && floor(numeric) == numeric &&
        mpz_cmp_d(((const tsc_bigint_t*)value_ptr(bigint))->value, numeric) == 0;
}

static bool abstract_bigint_string_equal(tsc_value_t bigint, tsc_value_t string) {
    const tsc_bigint_t* parsed = tsc_bigint_try_from_str((const tsc_str_t*)value_ptr(string));
    return parsed && tsc_bigint_eq((const tsc_bigint_t*)value_ptr(bigint), parsed);
}

bool tsc_value_abstract_eq(tsc_value_t a, tsc_value_t b) {
    tsc_abstract_type_t at = abstract_equality_type(a);
    tsc_abstract_type_t bt = abstract_equality_type(b);
    if (at == bt) return tsc_value_eq(a, b);
    if (
        (at == TSC_ABSTRACT_NULL && bt == TSC_ABSTRACT_UNDEFINED) ||
        (at == TSC_ABSTRACT_UNDEFINED && bt == TSC_ABSTRACT_NULL)
    ) {
        return true;
    }
    if (
        (tsc_value_is_html_dda(a) && (bt == TSC_ABSTRACT_NULL || bt == TSC_ABSTRACT_UNDEFINED)) ||
        (tsc_value_is_html_dda(b) && (at == TSC_ABSTRACT_NULL || at == TSC_ABSTRACT_UNDEFINED))
    ) {
        return true;
    }
    if (at == TSC_ABSTRACT_NUMBER && bt == TSC_ABSTRACT_STRING) {
        return tsc_value_eq(a, tsc_value_num(tsc_value_as_num(b)));
    }
    if (at == TSC_ABSTRACT_STRING && bt == TSC_ABSTRACT_NUMBER) {
        return tsc_value_eq(tsc_value_num(tsc_value_as_num(a)), b);
    }
    if (at == TSC_ABSTRACT_BIGINT && bt == TSC_ABSTRACT_NUMBER) {
        return abstract_bigint_number_equal(a, b);
    }
    if (at == TSC_ABSTRACT_NUMBER && bt == TSC_ABSTRACT_BIGINT) {
        return abstract_bigint_number_equal(b, a);
    }
    if (at == TSC_ABSTRACT_BIGINT && bt == TSC_ABSTRACT_STRING) {
        return abstract_bigint_string_equal(a, b);
    }
    if (at == TSC_ABSTRACT_STRING && bt == TSC_ABSTRACT_BIGINT) {
        return abstract_bigint_string_equal(b, a);
    }
    if (at == TSC_ABSTRACT_BOOLEAN) {
        return tsc_value_abstract_eq(tsc_value_num(tsc_value_as_num(a)), b);
    }
    if (bt == TSC_ABSTRACT_BOOLEAN) {
        return tsc_value_abstract_eq(a, tsc_value_num(tsc_value_as_num(b)));
    }
    if (at == TSC_ABSTRACT_OBJECT && bt != TSC_ABSTRACT_OBJECT) {
        return tsc_value_abstract_eq(value_to_primitive(a, TSC_TO_PRIMITIVE_DEFAULT), b);
    }
    if (at != TSC_ABSTRACT_OBJECT && bt == TSC_ABSTRACT_OBJECT) {
        return tsc_value_abstract_eq(a, value_to_primitive(b, TSC_TO_PRIMITIVE_DEFAULT));
    }
    return false;
}

bool tsc_value_object_is(tsc_value_t a, tsc_value_t b) {
    if (!value_is_box(a) && !value_is_box(b)) {
        double da = value_as_num(a);
        double db = value_as_num(b);
        if (isnan(da) && isnan(db)) return true;
        if (da == 0.0 && db == 0.0) return signbit(da) == signbit(db);
        return da == db;
    }
    return tsc_value_eq(a, b);
}

bool tsc_value_same_value_zero(tsc_value_t a, tsc_value_t b) {
    if (!value_is_box(a) && !value_is_box(b)) {
        double da = value_as_num(a);
        double db = value_as_num(b);
        return da == db || (isnan(da) && isnan(db));
    }
    return tsc_value_eq(a, b);
}

int tsc_value_cmp(tsc_value_t a, tsc_value_t b) {
    a = value_to_primitive_if_object(a, TSC_TO_PRIMITIVE_NUMBER);
    b = value_to_primitive_if_object(b, TSC_TO_PRIMITIVE_NUMBER);
    if (
        value_is_box(a) && value_is_box(b) &&
        value_tag(a) == TSC_VALUE_TAG_STRING &&
        value_tag(b) == TSC_VALUE_TAG_STRING
    ) {
        int c = tsc_str_cmp((const tsc_str_t*)value_ptr(a), (const tsc_str_t*)value_ptr(b));
        return c < 0 ? -1 : c > 0 ? 1 : 0;
    }
    if (value_is_bigint(a) && value_is_box(b) && value_tag(b) == TSC_VALUE_TAG_STRING) {
        const tsc_bigint_t* parsed = tsc_bigint_try_from_str((const tsc_str_t*)value_ptr(b));
        return parsed
            ? tsc_bigint_cmp((const tsc_bigint_t*)value_ptr(a), parsed)
            : 2;
    }
    if (value_is_box(a) && value_tag(a) == TSC_VALUE_TAG_STRING && value_is_bigint(b)) {
        const tsc_bigint_t* parsed = tsc_bigint_try_from_str((const tsc_str_t*)value_ptr(a));
        if (!parsed) return 2;
        int comparison = tsc_bigint_cmp(parsed, (const tsc_bigint_t*)value_ptr(b));
        return comparison < 0 ? -1 : comparison > 0 ? 1 : 0;
    }
    a = tsc_value_to_numeric(a);
    b = tsc_value_to_numeric(b);
    if (value_is_bigint(a) && value_is_bigint(b)) {
        int comparison = tsc_bigint_cmp(
            (const tsc_bigint_t*)value_ptr(a),
            (const tsc_bigint_t*)value_ptr(b)
        );
        return comparison < 0 ? -1 : comparison > 0 ? 1 : 0;
    }
    if (value_is_bigint(a)) {
        double numeric = value_as_num(b);
        if (isnan(numeric)) return 2;
        if (numeric == INFINITY) return -1;
        if (numeric == -INFINITY) return 1;
        int comparison = mpz_cmp_d(((const tsc_bigint_t*)value_ptr(a))->value, numeric);
        return comparison < 0 ? -1 : comparison > 0 ? 1 : 0;
    }
    if (value_is_bigint(b)) {
        double numeric = value_as_num(a);
        if (isnan(numeric)) return 2;
        if (numeric == INFINITY) return 1;
        if (numeric == -INFINITY) return -1;
        int comparison = mpz_cmp_d(((const tsc_bigint_t*)value_ptr(b))->value, numeric);
        return comparison < 0 ? 1 : comparison > 0 ? -1 : 0;
    }
    double an = value_as_num(a);
    double bn = value_as_num(b);
    if (isnan(an) || isnan(bn)) return 2;
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
}

double value_slice_arg(tsc_value_t v, double fallback) {
    if (tsc_value_is_undefined(v)) return fallback;
    double n = tsc_value_as_num(v);
    return isnan(n) ? 0.0 : n;
}

size_t value_array_forward_start(size_t len, double from_index) {
    if (isnan(from_index) || from_index == -INFINITY) return 0;
    if (from_index == INFINITY) return len;
    int64_t idx = (int64_t)(from_index < 0 ? ceil(from_index) : floor(from_index));
    if (idx < 0) idx = (int64_t)len + idx;
    if (idx < 0) return 0;
    if (idx > (int64_t)len) return len;
    return (size_t)idx;
}

bool value_array_last_start(size_t len, double from_index, size_t* out) {
    if (len == 0) return false;
    if (isnan(from_index)) from_index = 0.0;
    if (from_index == -INFINITY) return false;
    int64_t idx;
    if (from_index == INFINITY) {
        idx = (int64_t)len - 1;
    } else {
        idx = (int64_t)(from_index < 0 ? ceil(from_index) : floor(from_index));
        if (idx < 0) idx = (int64_t)len + idx;
        else if (idx >= (int64_t)len) idx = (int64_t)len - 1;
    }
    if (idx < 0) return false;
    *out = (size_t)idx;
    return true;
}

static bool value_array_like_has_index(tsc_value_t recv, size_t index);

tsc_array_t* value_array_like_slice(tsc_value_t recv, double start, double end) {
    size_t len = (size_t)tsc_value_length(recv);
    size_t from = value_array_forward_start(len, start);
    size_t to = value_array_forward_start(len, end);
    if (to < from) to = from;
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), to > from ? to - from : 1);
    for (size_t i = from; i < to; i++) {
        tsc_value_t value = tsc_value_get_index(recv, (double)i);
        tsc_array_push_raw(out, &value);
    }
    return out;
}

static tsc_array_t* value_array_like_sparse_slice(tsc_value_t recv, double start, double end) {
    size_t len = (size_t)tsc_value_length(recv);
    size_t from = value_array_forward_start(len, start);
    size_t to = value_array_forward_start(len, end);
    if (to < from) to = from;
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), to > from ? to - from : 1);
    for (size_t i = from; i < to; i++) {
        size_t target = out->len;
        if (value_array_like_has_index(recv, i)) {
            tsc_array_push_value(out, tsc_value_get_index(recv, (double)i));
        } else {
            tsc_array_push_value(out, tsc_value_undefined());
            tsc_array_mark_hole(out, target);
        }
    }
    return out;
}

tsc_array_t* value_array_like_to_reversed(tsc_value_t recv) {
    size_t len = (size_t)tsc_value_length(recv);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), len ? len : 1);
    for (size_t i = len; i > 0; i--) {
        tsc_value_t value = tsc_value_get_index(recv, (double)(i - 1));
        tsc_array_push_raw(out, &value);
    }
    return out;
}

static bool value_array_like_has_index(tsc_value_t recv, size_t index) {
    char key_buf[32];
    snprintf(key_buf, sizeof key_buf, "%zu", index);
    return tsc_value_has_prop(recv, tsc_str_from_cstr(key_buf));
}

int64_t value_array_strict_index(double value, size_t len) {
    if (isnan(value)) value = 0.0;
    if (isinf(value)) tsc_throw_str(tsc_str_from_cstr("Array.with index out of range"));
    if (value < 0) value = (double)len + value;
    if (value < 0 || value >= (double)len) {
        tsc_throw_str(tsc_str_from_cstr("Array.with index out of range"));
    }
    return (int64_t)value;
}

tsc_str_t* value_join_part(tsc_value_t v) {
    return tsc_value_is_nullish(v) ? tsc_str_from_lit("", 0) : tsc_value_to_string(v);
}

tsc_value_t tsc_value_method_char_at(tsc_value_t recv, tsc_value_t index) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_char_at((const tsc_str_t*)value_ptr(recv), tsc_value_as_num(index)));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_char_code_at(tsc_value_t recv, tsc_value_t index) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_num(tsc_str_char_code_at((const tsc_str_t*)value_ptr(recv), tsc_value_as_num(index)));
    }
    return tsc_value_num(NAN);
}

tsc_value_t tsc_value_method_code_point_at(tsc_value_t recv, tsc_value_t index) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_num(tsc_str_code_point_at((const tsc_str_t*)value_ptr(recv), tsc_value_as_num(index)));
    }
    return tsc_value_num(NAN);
}

tsc_value_t tsc_value_method_is_well_formed(tsc_value_t recv) {
    const tsc_str_t* string = tsc_value_to_string(recv);
    return tsc_value_bool(tsc_str_is_well_formed(string));
}

tsc_value_t tsc_value_method_to_well_formed(tsc_value_t recv) {
    const tsc_str_t* string = tsc_value_to_string(recv);
    return tsc_value_string(tsc_str_to_well_formed(string));
}

tsc_value_t tsc_value_method_includes(tsc_value_t recv, tsc_value_t needle, tsc_value_t position) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        double start = value_slice_arg(position, 0.0);
        return tsc_value_bool(tsc_str_includes((const tsc_str_t*)value_ptr(recv), tsc_value_to_string(needle), start));
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        size_t start = value_array_forward_start(a->len, value_slice_arg(position, 0.0));
        for (size_t i = start; i < a->len; i++) {
            if (tsc_value_same_value_zero(tsc_value_get_index(recv, (double)i), needle)) return tsc_value_bool(true);
        }
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_OBJECT) {
        size_t len = (size_t)tsc_value_length(recv);
        size_t start = value_array_forward_start(len, value_slice_arg(position, 0.0));
        for (size_t i = start; i < len; i++) {
            if (tsc_value_same_value_zero(tsc_value_get_index(recv, (double)i), needle)) return tsc_value_bool(true);
        }
    }
    return tsc_value_bool(false);
}

tsc_value_t tsc_value_method_index_of(tsc_value_t recv, tsc_value_t needle, tsc_value_t position) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        double start = value_slice_arg(position, 0.0);
        return tsc_value_num(tsc_str_index_of((const tsc_str_t*)value_ptr(recv), tsc_value_to_string(needle), start));
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        size_t start = value_array_forward_start(a->len, value_slice_arg(position, 0.0));
        for (size_t i = start; i < a->len; i++) {
            tsc_str_t* key = tsc_str_from_int((int64_t)i);
            if (tsc_value_has_prop(recv, key) && tsc_value_eq(tsc_value_get_index(recv, (double)i), needle)) {
                return tsc_value_num((double)i);
            }
        }
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_OBJECT) {
        size_t len = (size_t)tsc_value_length(recv);
        size_t start = value_array_forward_start(len, value_slice_arg(position, 0.0));
        for (size_t i = start; i < len; i++) {
            tsc_str_t* key = tsc_str_from_int((int64_t)i);
            if (tsc_value_has_prop(recv, key) && tsc_value_eq(tsc_value_get_index(recv, (double)i), needle)) {
                return tsc_value_num((double)i);
            }
        }
    }
    return tsc_value_num(-1.0);
}

tsc_value_t tsc_value_method_last_index_of(tsc_value_t recv, tsc_value_t needle, tsc_value_t position) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        double start = value_slice_arg(position, INFINITY);
        return tsc_value_num(tsc_str_last_index_of((const tsc_str_t*)value_ptr(recv), tsc_value_to_string(needle), start));
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        size_t i = 0;
        if (!value_array_last_start(a->len, value_slice_arg(position, INFINITY), &i)) return tsc_value_num(-1.0);
        while (true) {
            tsc_str_t* key = tsc_str_from_int((int64_t)i);
            if (tsc_value_has_prop(recv, key) && tsc_value_eq(tsc_value_get_index(recv, (double)i), needle)) {
                return tsc_value_num((double)i);
            }
            if (i == 0) break;
            i--;
        }
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_OBJECT) {
        size_t len = (size_t)tsc_value_length(recv);
        size_t i = 0;
        if (!value_array_last_start(len, value_slice_arg(position, INFINITY), &i)) return tsc_value_num(-1.0);
        while (true) {
            tsc_str_t* key = tsc_str_from_int((int64_t)i);
            if (tsc_value_has_prop(recv, key) && tsc_value_eq(tsc_value_get_index(recv, (double)i), needle)) {
                return tsc_value_num((double)i);
            }
            if (i == 0) break;
            i--;
        }
    }
    return tsc_value_num(-1.0);
}

tsc_value_t tsc_value_method_at(tsc_value_t recv, tsc_value_t index) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        const tsc_str_t* s = (const tsc_str_t*)value_ptr(recv);
        double n = tsc_value_as_num(index);
        if (isnan(n)) n = 0.0;
        if (n < 0) n = (double)s->len + n;
        if (isinf(n) || n < 0 || n >= (double)s->len) return tsc_value_undefined();
        return tsc_value_string(tsc_str_char_at(s, n));
    }
    if (!value_is_box(recv)) return tsc_value_undefined();
    double n = tsc_value_as_num(index);
    if (isnan(n)) n = 0.0;
    if (value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        if (n < 0) n = (double)a->len + n;
        if (isinf(n) || n < 0 || n >= (double)a->len) return tsc_value_undefined();
        return tsc_value_get_index(recv, floor(n));
    }
    if (value_tag(recv) == TSC_VALUE_TAG_OBJECT) {
        double len = tsc_value_length(recv);
        if (n < 0) n = len + n;
        if (isinf(n) || n < 0 || n >= len) return tsc_value_undefined();
        return tsc_value_get_index(recv, floor(n));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_locale_compare(tsc_value_t recv, tsc_value_t other) {
    return tsc_value_num(tsc_str_locale_compare(tsc_value_to_string(recv), tsc_value_to_string(other)));
}

tsc_value_t tsc_value_method_join(tsc_value_t recv, tsc_value_t separator) {
    tsc_str_t* sep = tsc_value_is_undefined(separator) ? tsc_str_from_lit(",", 1) : tsc_value_to_string(separator);
    tsc_str_t* out = tsc_str_from_lit("", 0);
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        for (size_t i = 0; i < a->len; i++) {
            if (i > 0) out = tsc_str_concat(out, sep);
            out = tsc_str_concat(out, value_join_part(tsc_value_get_index(recv, (double)i)));
        }
        return tsc_value_string(out);
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_OBJECT) {
        size_t len = (size_t)tsc_value_length(recv);
        for (size_t i = 0; i < len; i++) {
            if (i > 0) out = tsc_str_concat(out, sep);
            out = tsc_str_concat(out, value_join_part(tsc_value_get_index(recv, (double)i)));
        }
    }
    return tsc_value_string(out);
}

tsc_value_t tsc_value_method_pop(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        if (a->sealed || a->frozen) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.pop cannot mutate a sealed or frozen array"));
        }
    }
    if (value_is_box(recv) && (value_tag(recv) == TSC_VALUE_TAG_ARRAY || value_tag(recv) == TSC_VALUE_TAG_OBJECT)) {
        size_t len = (size_t)tsc_value_length(recv);
        if (len == 0) {
            if (!tsc_value_set_prop(recv, tsc_str_from_lit("length", 6), tsc_value_num(0.0))) {
                tsc_throw_str(tsc_str_from_cstr("Array.prototype.pop could not update array-like length"));
            }
            return tsc_value_undefined();
        }
        size_t last = len - 1;
        tsc_value_t value = tsc_value_get_index(recv, (double)last);
        if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)last))) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.pop could not delete array-like element"));
        }
        if (!tsc_value_set_prop(recv, tsc_str_from_lit("length", 6), tsc_value_num((double)last))) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.pop could not update array-like length"));
        }
        return value;
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_push_empty(tsc_value_t recv) {
    size_t len = (size_t)tsc_value_length(recv);
    if (!tsc_value_set_prop(recv, tsc_str_from_lit("length", 6), tsc_value_num((double)len))) {
        tsc_throw_str(tsc_str_from_cstr("Array.prototype.push could not update array-like length"));
    }
    return tsc_value_num((double)len);
}

tsc_value_t tsc_value_method_push(tsc_value_t recv, tsc_value_t value) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        if (a->sealed || a->frozen) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.push cannot mutate a sealed or frozen array"));
        }
    }
    if (value_is_box(recv) && (value_tag(recv) == TSC_VALUE_TAG_ARRAY || value_tag(recv) == TSC_VALUE_TAG_OBJECT)) {
        size_t len = (size_t)tsc_value_length(recv);
        if (!tsc_value_set_index(recv, (double)len, value)) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.push could not add array-like element"));
        }
        len++;
        if (!tsc_value_set_prop(recv, tsc_str_from_lit("length", 6), tsc_value_num((double)len))) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.push could not update array-like length"));
        }
        return tsc_value_num((double)len);
    }
    return tsc_value_num(0.0);
}

tsc_value_t tsc_value_method_shift(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        if (a->sealed || a->frozen) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.shift cannot mutate a sealed or frozen array"));
        }
    }
    if (value_is_box(recv) && (value_tag(recv) == TSC_VALUE_TAG_ARRAY || value_tag(recv) == TSC_VALUE_TAG_OBJECT)) {
        size_t len = (size_t)tsc_value_length(recv);
        if (len == 0) {
            if (!tsc_value_set_prop(recv, tsc_str_from_lit("length", 6), tsc_value_num(0.0))) {
                tsc_throw_str(tsc_str_from_cstr("Array.prototype.shift could not update array-like length"));
            }
            return tsc_value_undefined();
        }
        tsc_value_t first = tsc_value_get_index(recv, 0.0);
        for (size_t i = 1; i < len; i++) {
            if (value_array_like_has_index(recv, i)) {
                if (!tsc_value_set_index(recv, (double)(i - 1), tsc_value_get_index(recv, (double)i))) {
                    tsc_throw_str(tsc_str_from_cstr("Array.prototype.shift could not move array-like element"));
                }
            } else if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)(i - 1)))) {
                tsc_throw_str(tsc_str_from_cstr("Array.prototype.shift could not delete array-like element"));
            }
        }
        if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)(len - 1)))) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.shift could not delete array-like element"));
        }
        if (!tsc_value_set_prop(recv, tsc_str_from_lit("length", 6), tsc_value_num((double)(len - 1)))) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.shift could not update array-like length"));
        }
        return first;
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_unshift_empty(tsc_value_t recv) {
    size_t len = (size_t)tsc_value_length(recv);
    if (!tsc_value_set_prop(recv, tsc_str_from_lit("length", 6), tsc_value_num((double)len))) {
        tsc_throw_str(tsc_str_from_cstr("Array.prototype.unshift could not update array-like length"));
    }
    return tsc_value_num((double)len);
}

tsc_value_t tsc_value_method_unshift(tsc_value_t recv, tsc_value_t value) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        if (a->sealed || a->frozen) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.unshift cannot mutate a sealed or frozen array"));
        }
    }
    if (value_is_box(recv) && (value_tag(recv) == TSC_VALUE_TAG_ARRAY || value_tag(recv) == TSC_VALUE_TAG_OBJECT)) {
        size_t len = (size_t)tsc_value_length(recv);
        for (size_t i = len; i > 0; i--) {
            if (value_array_like_has_index(recv, i - 1)) {
                if (!tsc_value_set_index(recv, (double)i, tsc_value_get_index(recv, (double)(i - 1)))) {
                    tsc_throw_str(tsc_str_from_cstr("Array.prototype.unshift could not move array-like element"));
                }
            } else if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)i))) {
                tsc_throw_str(tsc_str_from_cstr("Array.prototype.unshift could not delete array-like element"));
            }
        }
        if (!tsc_value_set_index(recv, 0.0, value)) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.unshift could not add array-like element"));
        }
        len++;
        if (!tsc_value_set_prop(recv, tsc_str_from_lit("length", 6), tsc_value_num((double)len))) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.unshift could not update array-like length"));
        }
        return tsc_value_num((double)len);
    }
    return tsc_value_num(0.0);
}

static bool value_is_concat_spreadable(tsc_value_t value) {
    tsc_value_t spreadable = tsc_value_get_symbol_prop(value, tsc_symbol_is_concat_spreadable());
    if (!tsc_value_is_undefined(spreadable)) return tsc_value_is_truthy(spreadable);
    return tsc_value_is_array(value);
}

static void value_concat_push(tsc_array_t* out, tsc_value_t value) {
    if (value_is_concat_spreadable(value)) {
        size_t len = (size_t)tsc_value_length(value);
        for (size_t i = 0; i < len; i++) {
            tsc_str_t* key = tsc_str_from_int((int64_t)i);
            bool present = tsc_value_has_prop(value, key);
            tsc_value_t item = tsc_value_get_index(value, (double)i);
            tsc_array_push_raw(out, &item);
            if (!present) tsc_array_mark_hole(out, out->len - 1);
        }
        return;
    }
    tsc_array_push_raw(out, &value);
}

tsc_value_t tsc_value_method_concat(tsc_value_t recv, tsc_value_t value) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_concat(
            (const tsc_str_t*)value_ptr(recv),
            tsc_value_to_string(value)
        ));
    }
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), 4);
    value_concat_push(out, recv);
    value_concat_push(out, value);
    return tsc_value_array(out);
}

tsc_value_t tsc_value_method_concat_empty(tsc_value_t recv) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), 4);
    value_concat_push(out, recv);
    return tsc_value_array(out);
}

void value_flat_push(tsc_array_t* out, tsc_value_t value, int depth) {
    if (depth > 0 && tsc_value_is_array(value)) {
        size_t len = (size_t)tsc_value_length(value);
        for (size_t i = 0; i < len; i++) {
            if (!value_array_like_has_index(value, i)) continue;
            value_flat_push(out, tsc_value_get_index(value, (double)i), depth - 1);
        }
        return;
    }
    tsc_array_push_raw(out, &value);
}

tsc_value_t tsc_value_method_flat(tsc_value_t recv, tsc_value_t depth) {
    if (!value_is_box(recv) || (value_tag(recv) != TSC_VALUE_TAG_ARRAY && value_tag(recv) != TSC_VALUE_TAG_OBJECT && value_tag(recv) != TSC_VALUE_TAG_STRING)) return tsc_value_undefined();
    double depth_num = tsc_value_is_undefined(depth) ? 1.0 : tsc_value_as_num(depth);
    int depth_i = isnan(depth_num) || depth_num < 0 ? 0 : (isinf(depth_num) || depth_num > INT_MAX ? INT_MAX : (int)depth_num);
    size_t len = (size_t)tsc_value_length(recv);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), len ? len : 1);
    for (size_t i = 0; i < len; i++) {
        if (!value_array_like_has_index(recv, i)) continue;
        value_flat_push(out, tsc_value_get_index(recv, (double)i), depth_i);
    }
    return tsc_value_array(out);
}

tsc_value_t tsc_value_method_splice(tsc_value_t recv, tsc_value_t start, tsc_value_t delete_count, int argc, tsc_array_t* items) {
    if (!value_is_box(recv)) return tsc_value_undefined();
    if (value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        size_t len = a->len;
        size_t at = argc <= 0 ? 0 : value_array_forward_start(len, value_slice_arg(start, 0.0));
        size_t del = 0;
        if (argc >= 1) {
            double del_num = argc < 2
                ? (double)(len - at)
                : tsc_value_as_num(delete_count);
            if (isinf(del_num) && del_num > 0) {
                del = len - at;
            } else if (!isnan(del_num) && del_num > 0) {
                del = (size_t)del_num;
                if (del > len - at) del = len - at;
            }
        }

        size_t insert_len = items ? items->len : 0;
        if ((a->sealed || a->frozen) && (del > 0 || insert_len > 0)) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.splice cannot mutate a sealed or frozen array"));
        }
    }
    if (value_tag(recv) != TSC_VALUE_TAG_ARRAY && value_tag(recv) != TSC_VALUE_TAG_OBJECT) return tsc_value_undefined();

    size_t len = (size_t)tsc_value_length(recv);
    size_t at = argc <= 0 ? 0 : value_array_forward_start(len, value_slice_arg(start, 0.0));
    size_t del = 0;
    if (argc == 1) {
        del = len - at;
    } else if (argc >= 2) {
        double raw = tsc_value_as_num(delete_count);
        if (isinf(raw) && raw > 0) {
            del = len - at;
        } else if (!isnan(raw) && raw > 0) {
            del = (size_t)raw;
            if (del > len - at) del = len - at;
        }
    }

    size_t insert_len = items ? items->len : 0;
    size_t new_len = len - del + insert_len;
    tsc_array_t* removed = tsc_array_new(sizeof(tsc_value_t), del ? del : 1);
    for (size_t i = 0; i < del; i++) {
        bool present = value_array_like_has_index(recv, at + i);
        tsc_value_t value = tsc_value_get_index(recv, (double)(at + i));
        tsc_array_push_raw(removed, &value);
        if (!present) tsc_array_mark_hole(removed, removed->len - 1);
    }

    if (insert_len < del) {
        size_t shift = del - insert_len;
        for (size_t from = at + del; from < len; from++) {
            size_t to = from - shift;
            if (value_array_like_has_index(recv, from)) {
                if (!tsc_value_set_index(recv, (double)to, tsc_value_get_index(recv, (double)from))) {
                    tsc_throw_str(tsc_str_from_cstr("Array.prototype.splice could not move array-like element"));
                }
            } else if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)to))) {
                tsc_throw_str(tsc_str_from_cstr("Array.prototype.splice could not delete array-like element"));
            }
        }
        for (size_t i = new_len; i < len; i++) {
            if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)i))) {
                tsc_throw_str(tsc_str_from_cstr("Array.prototype.splice could not delete array-like element"));
            }
        }
    } else if (insert_len > del) {
        size_t shift = insert_len - del;
        for (size_t from = len; from > at + del; from--) {
            size_t source = from - 1;
            size_t to = source + shift;
            if (value_array_like_has_index(recv, source)) {
                if (!tsc_value_set_index(recv, (double)to, tsc_value_get_index(recv, (double)source))) {
                    tsc_throw_str(tsc_str_from_cstr("Array.prototype.splice could not move array-like element"));
                }
            } else if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)to))) {
                tsc_throw_str(tsc_str_from_cstr("Array.prototype.splice could not delete array-like element"));
            }
        }
    }

    for (size_t i = 0; i < insert_len; i++) {
        if (!tsc_value_set_index(recv, (double)(at + i), TSC_ARR(tsc_value_t, items, i))) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.splice could not add array-like element"));
        }
    }
    if (!tsc_value_set_prop(recv, tsc_str_from_lit("length", 6), tsc_value_num((double)new_len))) {
        tsc_throw_str(tsc_str_from_cstr("Array.prototype.splice could not update array-like length"));
    }
    return tsc_value_array(removed);
}

static void value_sort_validate_compare_fn(tsc_value_t compare_fn) {
    if (!tsc_value_is_undefined(compare_fn)) {
        if (!tsc_value_is_callable(compare_fn)) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.sort comparator must be callable"));
        }
    }
}

static double value_sort_compare(tsc_value_t compare_fn, tsc_value_t left, tsc_value_t right) {
    if (tsc_value_is_undefined(left)) return tsc_value_is_undefined(right) ? 0.0 : 1.0;
    if (tsc_value_is_undefined(right)) return -1.0;
    if (!tsc_value_is_undefined(compare_fn)) {
        value_sort_validate_compare_fn(compare_fn);
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_array_push_value(args, left);
        tsc_array_push_value(args, right);
        double cmp = tsc_value_as_num(tsc_value_apply_function(compare_fn, tsc_value_undefined(), tsc_value_array(args)));
        return isnan(cmp) ? 0.0 : cmp;
    }
    return (double)tsc_str_cmp(tsc_value_to_string(left), tsc_value_to_string(right));
}

static void value_sort_array_values(tsc_array_t* a, tsc_value_t compare_fn) {
    for (size_t i = 1; i < a->len; i++) {
        tsc_value_t key = TSC_ARR(tsc_value_t, a, i);
        size_t j = i;
        while (j > 0) {
            tsc_value_t prev = TSC_ARR(tsc_value_t, a, j - 1);
            if (value_sort_compare(compare_fn, prev, key) <= 0) break;
            tsc_array_store_raw(a, j, &prev);
            j--;
        }
        tsc_array_store_raw(a, j, &key);
    }
}

tsc_value_t tsc_value_method_sort(tsc_value_t recv, tsc_value_t compare_fn) {
    value_sort_validate_compare_fn(compare_fn);
    if (!value_is_box(recv)) return recv;
    tsc_array_t* a = NULL;
    size_t len = 0;
    if (value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* recv_array = (tsc_array_t*)value_ptr(recv);
        if (recv_array->frozen) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.sort cannot mutate a frozen array"));
        }
        if (recv_array->sealed && recv_array->holes) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.sort cannot reorder a sealed sparse array"));
        }
        len = recv_array->len;
    } else if (value_tag(recv) == TSC_VALUE_TAG_OBJECT) {
        len = (size_t)tsc_value_length(recv);
    } else {
        return recv;
    }
    a = tsc_array_new(sizeof(tsc_value_t), len ? len : 1);
    for (size_t i = 0; i < len; i++) {
        if (!value_array_like_has_index(recv, i)) continue;
        tsc_value_t value = tsc_value_get_index(recv, (double)i);
        tsc_array_push_raw(a, &value);
    }
    value_sort_array_values(a, compare_fn);
    for (size_t i = 0; i < a->len; i++) {
        if (!tsc_value_set_index(recv, (double)i, TSC_ARR(tsc_value_t, a, i))) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.sort could not write array-like element"));
        }
    }
    for (size_t i = a->len; i < len; i++) {
        if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)i))) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.sort could not delete array-like element"));
        }
    }
    return recv;
}

tsc_value_t tsc_value_method_to_sorted(tsc_value_t recv, tsc_value_t compare_fn) {
    if (!value_is_box(recv)) return recv;
    if (value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        tsc_value_t copy = tsc_value_array(value_array_like_slice(recv, 0.0, (double)a->len));
        return tsc_value_method_sort(copy, compare_fn);
    }
    if (value_tag(recv) == TSC_VALUE_TAG_OBJECT || value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_method_sort(
            tsc_value_array(value_array_like_slice(recv, 0.0, tsc_value_length(recv))),
            compare_fn
        );
    }
    return recv;
}

tsc_value_t tsc_value_method_with(tsc_value_t recv, tsc_value_t index, tsc_value_t value) {
    if (!value_is_box(recv)) return tsc_value_undefined();
    if (value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        int64_t at = value_array_strict_index(tsc_value_as_num(index), a->len);
        tsc_array_t* copy = value_array_like_slice(recv, 0.0, (double)a->len);
        tsc_array_store_raw(copy, (size_t)at, &value);
        return tsc_value_array(copy);
    }
    if (value_tag(recv) == TSC_VALUE_TAG_OBJECT || value_tag(recv) == TSC_VALUE_TAG_STRING) {
        size_t len = (size_t)tsc_value_length(recv);
        int64_t at = value_array_strict_index(tsc_value_as_num(index), len);
        tsc_array_t* copy = value_array_like_slice(recv, 0.0, (double)len);
        tsc_array_store_raw(copy, (size_t)at, &value);
        return tsc_value_array(copy);
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_to_spliced(tsc_value_t recv, tsc_value_t start, tsc_value_t delete_count, int argc, tsc_array_t* items) {
    if (!value_is_box(recv)) return tsc_value_undefined();
    if (value_tag(recv) == TSC_VALUE_TAG_ARRAY || value_tag(recv) == TSC_VALUE_TAG_OBJECT || value_tag(recv) == TSC_VALUE_TAG_STRING) {
        size_t len = (size_t)tsc_value_length(recv);
        size_t at = argc <= 0 ? 0 : value_array_forward_start(len, value_slice_arg(start, 0.0));
        size_t del = 0;
        if (argc == 1) {
            del = len - at;
        } else if (argc >= 2) {
            double raw = tsc_value_as_num(delete_count);
            if (isinf(raw) && raw > 0) {
                del = len - at;
            } else if (!isnan(raw) && raw > 0) {
                del = (size_t)raw;
                if (del > len - at) del = len - at;
            }
        }
        size_t insert_len = items ? items->len : 0;
        size_t out_len = len - del + insert_len;
        tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), out_len ? out_len : 1);
        for (size_t i = 0; i < at; i++) {
            tsc_value_t value = tsc_value_get_index(recv, (double)i);
            tsc_array_push_raw(out, &value);
        }
        for (size_t i = 0; i < insert_len; i++) {
            tsc_value_t value = TSC_ARR(tsc_value_t, items, i);
            tsc_array_push_raw(out, &value);
        }
        for (size_t i = at + del; i < len; i++) {
            tsc_value_t value = tsc_value_get_index(recv, (double)i);
            tsc_array_push_raw(out, &value);
        }
        return tsc_value_array(out);
    }
    return tsc_value_undefined();
}

void tsc_value_array_push_flat(tsc_array_t* out, tsc_value_t value) {
    if (tsc_value_is_array(value)) {
        size_t len = (size_t)tsc_value_length(value);
        for (size_t i = 0; i < len; i++) {
            if (!value_array_like_has_index(value, i)) continue;
            tsc_value_t item = tsc_value_get_index(value, (double)i);
            tsc_array_push_raw(out, &item);
        }
        return;
    }
    tsc_array_push_raw(out, &value);
}

tsc_value_t tsc_value_method_fill(tsc_value_t recv, tsc_value_t value, tsc_value_t start, tsc_value_t end) {
    if (!value_is_box(recv)) return recv;
    double len = tsc_value_length(recv);
    double s = value_slice_arg(start, 0.0);
    double e = value_slice_arg(end, len);
    if (value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        if (a->frozen) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.fill cannot mutate a frozen array"));
        }
    }
    if (value_tag(recv) == TSC_VALUE_TAG_ARRAY || value_tag(recv) == TSC_VALUE_TAG_OBJECT) {
        size_t from = value_array_forward_start((size_t)len, s);
        size_t to = value_array_forward_start((size_t)len, e);
        if (to < from) to = from;
        for (size_t i = from; i < to; i++) {
            if (!tsc_value_set_index(recv, (double)i, value)) {
                tsc_throw_str(tsc_str_from_cstr("Array.prototype.fill could not write array-like element"));
            }
        }
    }
    return recv;
}

tsc_value_t tsc_value_method_copy_within(tsc_value_t recv, tsc_value_t target, tsc_value_t start, tsc_value_t end) {
    if (!value_is_box(recv)) return recv;
    double len_num = tsc_value_length(recv);
    double t = value_slice_arg(target, 0.0);
    double s = value_slice_arg(start, 0.0);
    double e = value_slice_arg(end, len_num);
    if (value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        if (a->frozen) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.copyWithin cannot mutate a frozen array"));
        }
    }
    if (value_tag(recv) == TSC_VALUE_TAG_ARRAY || value_tag(recv) == TSC_VALUE_TAG_OBJECT) {
        size_t len = (size_t)len_num;
        size_t to = value_array_forward_start(len, t);
        size_t from = value_array_forward_start(len, s);
        size_t final = value_array_forward_start(len, e);
        size_t count = final > from ? final - from : 0;
        if (count > len - to) count = len - to;
        if (count > 0) {
            bool* present = (bool*)TSC_GC_MALLOC(count * sizeof(bool));
            tsc_value_t* values = (tsc_value_t*)TSC_GC_MALLOC(count * sizeof(tsc_value_t));
            for (size_t i = 0; i < count; i++) {
                size_t from_index = from + i;
                present[i] = value_array_like_has_index(recv, from_index);
                values[i] = present[i] ? tsc_value_get_index(recv, (double)from_index) : tsc_value_undefined();
            }
            for (size_t i = 0; i < count; i++) {
                size_t to_index = to + i;
                if (present[i]) {
                    if (!tsc_value_set_index(recv, (double)to_index, values[i])) {
                        tsc_throw_str(tsc_str_from_cstr("Array.prototype.copyWithin could not write array-like element"));
                    }
                } else if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)to_index))) {
                    tsc_throw_str(tsc_str_from_cstr("Array.prototype.copyWithin could not delete array-like element"));
                }
            }
        }
    }
    return recv;
}

tsc_value_t tsc_value_method_reverse(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        if (a->frozen) {
            tsc_throw_str(tsc_str_from_cstr("Array.prototype.reverse cannot mutate a frozen array"));
        }
    }
    if (
        value_is_box(recv) &&
        (value_tag(recv) == TSC_VALUE_TAG_ARRAY || value_tag(recv) == TSC_VALUE_TAG_OBJECT)
    ) {
        size_t len = (size_t)tsc_value_length(recv);
        for (size_t lower = 0; lower < len / 2; lower++) {
            size_t upper = len - lower - 1;
            bool lower_present = value_array_like_has_index(recv, lower);
            bool upper_present = value_array_like_has_index(recv, upper);
            tsc_value_t lower_value = lower_present ? tsc_value_get_index(recv, (double)lower) : tsc_value_undefined();
            tsc_value_t upper_value = upper_present ? tsc_value_get_index(recv, (double)upper) : tsc_value_undefined();
            if (upper_present) {
                if (!tsc_value_set_index(recv, (double)lower, upper_value)) {
                    tsc_throw_str(tsc_str_from_cstr("Array.prototype.reverse could not write array-like element"));
                }
            } else if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)lower))) {
                tsc_throw_str(tsc_str_from_cstr("Array.prototype.reverse could not delete array-like element"));
            }
            if (lower_present) {
                if (!tsc_value_set_index(recv, (double)upper, lower_value)) {
                    tsc_throw_str(tsc_str_from_cstr("Array.prototype.reverse could not write array-like element"));
                }
            } else if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)upper))) {
                tsc_throw_str(tsc_str_from_cstr("Array.prototype.reverse could not delete array-like element"));
            }
        }
    }
    return recv;
}

tsc_value_t tsc_value_method_to_reversed(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        return tsc_value_array(value_array_like_to_reversed(recv));
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_OBJECT) {
        return tsc_value_array(value_array_like_to_reversed(recv));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_slice(tsc_value_t recv, tsc_value_t start, tsc_value_t end) {
    double len = tsc_value_length(recv);
    double s = value_slice_arg(start, 0.0);
    double e = value_slice_arg(end, len);
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_slice((const tsc_str_t*)value_ptr(recv), s, e));
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        return tsc_value_array(value_array_like_sparse_slice(recv, s, e));
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_OBJECT) {
        return tsc_value_array(value_array_like_slice(recv, s, e));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_keys(tsc_value_t recv) {
    size_t len = (size_t)tsc_value_length(recv);
    if (!value_is_box(recv) || (value_tag(recv) != TSC_VALUE_TAG_ARRAY && value_tag(recv) != TSC_VALUE_TAG_OBJECT)) return tsc_value_undefined();
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), len ? len : 1);
    for (size_t i = 0; i < len; i++) {
        tsc_value_t v = tsc_value_num((double)i);
        tsc_array_push_raw(out, &v);
    }
    return tsc_value_array(out);
}

tsc_value_t tsc_value_method_values(tsc_value_t recv) {
    if (!value_is_box(recv)) return tsc_value_undefined();
    if (value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* a = (const tsc_array_t*)value_ptr(recv);
        if (a->props && a->props->len > 0) {
            tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), a->len ? a->len : 1);
            for (size_t i = 0; i < a->len; i++) {
                tsc_value_t value = tsc_value_get_index(recv, (double)i);
                tsc_array_push_raw(out, &value);
            }
            return tsc_value_array(out);
        }
        return tsc_value_array(value_array_iter_values(a));
    }
    if (value_tag(recv) != TSC_VALUE_TAG_OBJECT) return tsc_value_undefined();
    size_t len = (size_t)tsc_value_length(recv);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), len ? len : 1);
    for (size_t i = 0; i < len; i++) {
        tsc_value_t value = tsc_value_get_index(recv, (double)i);
        tsc_array_push_raw(out, &value);
    }
    return tsc_value_array(out);
}

tsc_value_t tsc_value_method_entries(tsc_value_t recv) {
    if (!value_is_box(recv)) return tsc_value_undefined();
    if (value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* a = (const tsc_array_t*)value_ptr(recv);
        return tsc_value_array(value_array_entries_numeric(a));
    }
    if (value_tag(recv) != TSC_VALUE_TAG_OBJECT) return tsc_value_undefined();
    size_t len = (size_t)tsc_value_length(recv);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), len ? len : 1);
    for (size_t i = 0; i < len; i++) {
        tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_value_t key = tsc_value_num((double)i);
        tsc_value_t value = tsc_value_get_index(recv, (double)i);
        tsc_array_push_raw(pair, &key);
        tsc_array_push_raw(pair, &value);
        tsc_value_t boxed = tsc_value_array(pair);
        tsc_array_push_raw(out, &boxed);
    }
    return tsc_value_array(out);
}

tsc_value_t tsc_value_method_substring(tsc_value_t recv, tsc_value_t start, tsc_value_t end) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        const tsc_str_t* str = (const tsc_str_t*)value_ptr(recv);
        double s = value_slice_arg(start, 0.0);
        double e = value_slice_arg(end, (double)str->len);
        return tsc_value_string(tsc_str_substring(str, s, e));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_substr(tsc_value_t recv, tsc_value_t start, tsc_value_t length) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        const tsc_str_t* str = (const tsc_str_t*)value_ptr(recv);
        double s = value_slice_arg(start, 0.0);
        double n = value_slice_arg(length, INFINITY);
        return tsc_value_string(tsc_str_substr(str, s, n));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_replace(tsc_value_t recv, tsc_value_t search, tsc_value_t replacement) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_STRING) return tsc_value_undefined();
    return tsc_value_string(tsc_str_replace(
        (const tsc_str_t*)value_ptr(recv),
        tsc_value_to_string(search),
        tsc_value_to_string(replacement)
    ));
}

tsc_value_t tsc_value_method_replace_all(tsc_value_t recv, tsc_value_t search, tsc_value_t replacement) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_STRING) return tsc_value_undefined();
    return tsc_value_string(tsc_str_replace_all(
        (const tsc_str_t*)value_ptr(recv),
        tsc_value_to_string(search),
        tsc_value_to_string(replacement)
    ));
}

uint32_t split_limit_from_value(tsc_value_t limit) {
    if (value_is_box(limit) && value_tag(limit) == TSC_VALUE_TAG_UNDEFINED) return UINT32_MAX;
    return split_limit_from_num(tsc_value_as_num(limit));
}

tsc_value_t tsc_value_method_split(tsc_value_t recv, tsc_value_t separator, tsc_value_t limit) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_STRING) return tsc_value_undefined();
    tsc_array_t* parts = tsc_str_split_limit(
        (const tsc_str_t*)value_ptr(recv),
        tsc_value_to_string(separator),
        split_limit_from_value(limit)
    );
    return tsc_value_array(value_array_from_string_array(parts));
}

tsc_array_t* value_array_from_string_array(const tsc_array_t* strings) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), strings && strings->len ? strings->len : 1);
    if (!strings) return out;
    for (size_t i = 0; i < strings->len; i++) {
        tsc_value_t value = tsc_value_string(TSC_ARR(tsc_str_t*, strings, i));
        tsc_array_push_raw(out, &value);
    }
    return out;
}

tsc_value_t tsc_value_method_split_regex(tsc_value_t recv, const tsc_regexp_t* re, tsc_value_t limit) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_STRING) return tsc_value_undefined();
    return tsc_value_array(value_array_from_string_array(
        tsc_str_split_regex_limit((const tsc_str_t*)value_ptr(recv), re, split_limit_from_value(limit))
    ));
}

tsc_value_t tsc_value_method_match_regex(tsc_value_t recv, const tsc_regexp_t* re) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_STRING) return tsc_value_null();
    tsc_array_t* matches = tsc_str_match_regex((const tsc_str_t*)value_ptr(recv), re);
    if (!matches) return tsc_value_null();
    return tsc_value_array(value_array_from_string_array(matches));
}

tsc_value_t tsc_value_method_match_all_regex(tsc_value_t recv, const tsc_regexp_t* re) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_STRING) {
        return tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 1));
    }
    tsc_array_t* groups = tsc_str_match_all_regex((const tsc_str_t*)value_ptr(recv), re);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), groups && groups->len ? groups->len : 1);
    if (!groups) return tsc_value_array(out);
    for (size_t i = 0; i < groups->len; i++) {
        tsc_value_t group = tsc_value_array(value_array_from_string_array(TSC_ARR(tsc_array_t*, groups, i)));
        tsc_array_push_raw(out, &group);
    }
    return tsc_value_array(out);
}

tsc_value_t tsc_value_method_starts_with(tsc_value_t recv, tsc_value_t needle, tsc_value_t position) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_bool(tsc_str_starts_with((const tsc_str_t*)value_ptr(recv), tsc_value_to_string(needle), value_slice_arg(position, 0.0)));
    }
    return tsc_value_bool(false);
}

tsc_value_t tsc_value_method_ends_with(tsc_value_t recv, tsc_value_t needle, tsc_value_t end_position) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_bool(tsc_str_ends_with((const tsc_str_t*)value_ptr(recv), tsc_value_to_string(needle), value_slice_arg(end_position, INFINITY)));
    }
    return tsc_value_bool(false);
}

tsc_str_t* tsc_value_method_to_string(tsc_value_t recv, tsc_value_t radix) {
    if (!value_is_box(recv)) {
        if (tsc_value_is_undefined(radix)) return tsc_str_from_num(value_as_num(recv));
        return tsc_str_from_num_radix(value_as_num(recv), tsc_value_as_num(radix));
    }
    /* Symbol.prototype.toString is an explicit conversion and therefore does
     * not use the throwing abstract ToString(Symbol) operation. */
    if (value_tag(recv) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_value_to_explicit_string(recv);
    }
    if (value_tag(recv) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(recv);
        if (o->is_typed_array && o->class_ptr) {
            const tsc_str_t* encoding = tsc_value_is_undefined(radix)
                ? tsc_str_from_lit("utf8", 4)
                : tsc_value_to_string(radix);
            return tsc_buffer_to_string((const tsc_buffer_t*)o->class_ptr, encoding);
        }
    }
    if (value_tag(recv) == TSC_VALUE_TAG_ARRAY || value_tag(recv) == TSC_VALUE_TAG_OBJECT || value_tag(recv) == TSC_VALUE_TAG_FUNCTION) {
        tsc_value_t fn = tsc_value_get_prop(recv, tsc_str_from_lit("toString", 8));
        if (tsc_value_is_callable(fn)) {
            tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
            if (!tsc_value_is_undefined(radix)) {
                tsc_array_push_value(args, radix);
            }
            return tsc_value_to_string(tsc_value_apply_function(fn, recv, tsc_value_array(args)));
        }
        tsc_throw_str(tsc_str_from_cstr("toString is not a function"));
    }
    return tsc_value_to_string(recv);
}

tsc_str_t* tsc_value_method_to_locale_string_args(tsc_value_t recv, tsc_array_t* args) {
    if (value_is_box(recv) && (value_tag(recv) == TSC_VALUE_TAG_ARRAY || value_tag(recv) == TSC_VALUE_TAG_OBJECT || value_tag(recv) == TSC_VALUE_TAG_FUNCTION)) {
        tsc_value_t fn = tsc_value_get_prop(recv, tsc_str_from_lit("toLocaleString", 14));
        if (tsc_value_is_callable(fn)) {
            return tsc_value_to_string(tsc_value_apply_function(fn, recv, tsc_value_array(args)));
        }
        tsc_throw_str(tsc_str_from_cstr("toLocaleString is not a function"));
    }
    return tsc_value_to_string(recv);
}

tsc_str_t* tsc_value_method_to_locale_string(tsc_value_t recv) {
    return tsc_value_method_to_locale_string_args(recv, tsc_array_new(sizeof(tsc_value_t), 0));
}

tsc_value_t tsc_value_method_value_of(tsc_value_t recv) {
    if (value_is_box(recv)) {
        uint8_t tag = value_tag(recv);
        if (tag == TSC_VALUE_TAG_ARRAY || tag == TSC_VALUE_TAG_OBJECT || tag == TSC_VALUE_TAG_FUNCTION) {
            tsc_value_t fn = tsc_value_get_prop(recv, tsc_str_from_lit("valueOf", 7));
            if (tsc_value_is_callable(fn)) {
                tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 0);
                return tsc_value_apply_function(fn, recv, tsc_value_array(args));
            }
            tsc_throw_str(tsc_str_from_cstr("valueOf is not a function"));
        }
    }
    return recv;
}

tsc_str_t* tsc_value_method_to_fixed(tsc_value_t recv, tsc_value_t fraction_digits) {
    if (value_is_box(recv)) tsc_throw_str(tsc_str_from_cstr("Number.toFixed: receiver must be a number"));
    double digits = tsc_value_is_nullish(fraction_digits) ? 0.0 : tsc_value_as_num(fraction_digits);
    return tsc_str_from_num_fixed(value_as_num(recv), digits);
}

tsc_str_t* tsc_value_method_to_exponential(tsc_value_t recv, tsc_value_t fraction_digits) {
    if (value_is_box(recv)) tsc_throw_str(tsc_str_from_cstr("Number.toExponential: receiver must be a number"));
    bool omitted = value_is_box(fraction_digits) && value_tag(fraction_digits) == TSC_VALUE_TAG_UNDEFINED;
    double digits = omitted ? 0.0 : tsc_value_as_num(fraction_digits);
    return tsc_str_from_num_exponential(value_as_num(recv), digits, !omitted);
}

tsc_str_t* tsc_value_method_to_precision(tsc_value_t recv, tsc_value_t precision) {
    if (value_is_box(recv)) tsc_throw_str(tsc_str_from_cstr("Number.toPrecision: receiver must be a number"));
    bool omitted = value_is_box(precision) && value_tag(precision) == TSC_VALUE_TAG_UNDEFINED;
    double digits = omitted ? 0.0 : tsc_value_as_num(precision);
    return tsc_str_from_num_precision(value_as_num(recv), digits, !omitted);
}

tsc_value_t tsc_value_method_to_lower(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_to_lower((const tsc_str_t*)value_ptr(recv)));
    }
    return tsc_value_to_string(recv) ? tsc_value_string(tsc_value_to_string(recv)) : tsc_value_undefined();
}

tsc_value_t tsc_value_method_to_upper(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_to_upper((const tsc_str_t*)value_ptr(recv)));
    }
    return tsc_value_to_string(recv) ? tsc_value_string(tsc_value_to_string(recv)) : tsc_value_undefined();
}

tsc_value_t tsc_value_method_normalize(tsc_value_t recv, tsc_value_t form) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        tsc_str_t* f = tsc_value_is_undefined(form) ? tsc_str_from_lit("NFC", 3) : tsc_value_to_string(form);
        return tsc_value_string(tsc_str_normalize((const tsc_str_t*)value_ptr(recv), f));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_trim(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_trim((const tsc_str_t*)value_ptr(recv)));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_trim_start(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_trim_start((const tsc_str_t*)value_ptr(recv)));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_trim_end(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_trim_end((const tsc_str_t*)value_ptr(recv)));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_repeat(tsc_value_t recv, tsc_value_t count) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_repeat((const tsc_str_t*)value_ptr(recv), tsc_value_as_num(count)));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_pad_start(tsc_value_t recv, tsc_value_t target, tsc_value_t pad) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        tsc_str_t* fill = tsc_value_is_undefined(pad) ? tsc_str_from_lit(" ", 1) : tsc_value_to_string(pad);
        return tsc_value_string(tsc_str_pad_start((const tsc_str_t*)value_ptr(recv), tsc_value_as_num(target), fill));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_pad_end(tsc_value_t recv, tsc_value_t target, tsc_value_t pad) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        tsc_str_t* fill = tsc_value_is_undefined(pad) ? tsc_str_from_lit(" ", 1) : tsc_value_to_string(pad);
        return tsc_value_string(tsc_str_pad_end((const tsc_str_t*)value_ptr(recv), tsc_value_as_num(target), fill));
    }
    return tsc_value_undefined();
}

static tsc_value_t tsc_structured_clone_internal(tsc_value_t v, tsc_map_t* seen) {
    if (!value_is_box(v)) {
        return v;
    }

    tsc_value_tag_t tag = value_tag(v);
    if (tag == TSC_VALUE_TAG_UNDEFINED || tag == TSC_VALUE_TAG_NULL ||
        tag == TSC_VALUE_TAG_FALSE || tag == TSC_VALUE_TAG_TRUE) {
        return v;
    }

    if (tag == TSC_VALUE_TAG_STRING) {
        return v;
    }

    if (tag == TSC_VALUE_TAG_BIGINT) {
        return v;
    }

    if (tag == TSC_VALUE_TAG_SYMBOL) {
        tsc_throw_str(tsc_str_from_cstr("DataCloneError: structuredClone: Symbols cannot be cloned"));
    }

    if (tag == TSC_VALUE_TAG_FUNCTION) {
        tsc_throw_str(tsc_str_from_cstr("TypeError: structuredClone: Functions cannot be cloned"));
        return tsc_value_undefined();
    }

    tsc_value_t already_cloned;
    if (tsc_map_get_raw(seen, &v, &already_cloned)) {
        return already_cloned;
    }

    if (tag == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* src_arr = (tsc_array_t*)value_ptr(v);
        tsc_array_t* dst_arr = tsc_array_new(sizeof(tsc_value_t), src_arr->len);
        tsc_value_t cloned_val = tsc_value_array(dst_arr);

        tsc_map_set_raw(seen, &v, &cloned_val);

        dst_arr->len = src_arr->len;
        for (size_t i = 0; i < src_arr->len; i++) {
            tsc_value_t elem = TSC_ARR(tsc_value_t, src_arr, i);
            tsc_value_t cloned = tsc_structured_clone_internal(elem, seen);
            tsc_array_store_raw(dst_arr, i, &cloned);
        }
        return cloned_val;
    }

    if (tag == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* src_obj = (tsc_object_t*)value_ptr(v);
        if (src_obj->is_proxy) {
            tsc_throw_str(tsc_str_from_cstr("TypeError: structuredClone: Proxies cannot be cloned"));
            return tsc_value_undefined();
        }
        if (src_obj->is_promise) {
            tsc_throw_str(tsc_str_from_cstr("TypeError: structuredClone: Promises cannot be cloned"));
            return tsc_value_undefined();
        }
        if (src_obj->class_ptr != NULL) {
            tsc_throw_str(tsc_str_from_cstr("TypeError: structuredClone: Custom classes, Dates, Maps, Sets, or Buffers cannot be cloned"));
            return tsc_value_undefined();
        }
        if (!tsc_value_is_nullish(src_obj->prototype)) {
            tsc_throw_str(tsc_str_from_cstr("TypeError: structuredClone: Objects with custom prototypes cannot be cloned"));
            return tsc_value_undefined();
        }

        tsc_object_t* dst_obj = tsc_object_new();
        tsc_value_t cloned_val = tsc_value_object(dst_obj);

        tsc_map_set_raw(seen, &v, &cloned_val);

        for (size_t i = 0; i < src_obj->len; i++) {
            tsc_object_prop_t* p = &src_obj->props[i];
            if (p->accessor) {
                tsc_throw_str(tsc_str_from_cstr("TypeError: structuredClone: Accessors cannot be cloned"));
                return tsc_value_undefined();
            }
            tsc_value_t cloned_prop_val = tsc_structured_clone_internal(p->value, seen);
            tsc_object_define(dst_obj, p->key, cloned_prop_val, p->writable, p->enumerable, p->configurable);
        }
        return cloned_val;
    }

    tsc_throw_str(tsc_str_from_cstr("TypeError: structuredClone: Unsupported type"));
    return tsc_value_undefined();
}

tsc_value_t tsc_structured_clone(tsc_value_t value) {
    tsc_map_t* seen = tsc_map_new(sizeof(tsc_value_t), sizeof(tsc_value_t), TSC_KEY_VALUE, 8);
    return tsc_structured_clone_internal(value, seen);
}

tsc_value_t tsc_value_date(tsc_date_t* d) {
    if (!d) return tsc_value_null();
    if (d->object) return tsc_value_object(d->object);
    tsc_object_t* o = tsc_object_new_class(d);
    o->is_date = true;
    o->prototype = date_prototype_value();
    d->object = o;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_regexp(tsc_regexp_t* r) {
    if (!r) return tsc_value_null();
    tsc_object_t* o = tsc_object_new_class(r);
    o->is_regexp = true;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_map(tsc_map_t* m) {
    if (!m) return tsc_value_null();
    tsc_object_t* o = tsc_object_new_class(m);
    o->is_map = true;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_set(tsc_set_t* s) {
    if (!s) return tsc_value_null();
    tsc_object_t* o = tsc_object_new_class(s);
    o->is_set = true;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_error(tsc_error_t* e) {
    if (!e) return tsc_value_null();
    if (e->object) return tsc_value_object(e->object);
    error_intrinsics_initialize();
    tsc_object_t* o = tsc_object_new_class(e);
    o->is_error = true;
    o->prototype = tsc_value_object(
        error_intrinsic(error_kind_from_name(e->name))->prototype
    );
    e->object = o;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_buffer(tsc_buffer_t* b) {
    if (!b) return tsc_value_null();
    tsc_object_t* o = tsc_object_new_class(b);
    o->is_typed_array = true;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_url(tsc_url_t* url) {
    if (!url) return tsc_value_null();
    tsc_object_t* o = tsc_object_new_class(url);
    o->is_url = true;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_url_search_params(tsc_url_search_params_t* params) {
    if (!params) return tsc_value_null();
    tsc_object_t* o = tsc_object_new_class(params);
    o->is_url_search_params = true;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_array_buffer(tsc_array_buffer_t* buffer) {
    if (!buffer) return tsc_value_null();
    if (buffer->object) return tsc_value_object(buffer->object);
    tsc_object_t* o = tsc_object_new_class(buffer);
    o->is_array_buffer = true;
    buffer->object = o;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_data_view(tsc_data_view_t* view) {
    if (!view) return tsc_value_null();
    if (view->object) return tsc_value_object(view->object);
    tsc_object_t* o = tsc_object_new_class(view);
    o->is_data_view = true;
    view->object = o;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_text_encoder(tsc_text_encoder_t* encoder) {
    if (!encoder) return tsc_value_null();
    tsc_object_t* o = tsc_object_new_class(encoder);
    o->is_text_encoder = true;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_text_decoder(tsc_text_decoder_t* decoder) {
    if (!decoder) return tsc_value_null();
    tsc_object_t* o = tsc_object_new_class(decoder);
    o->is_text_decoder = true;
    return tsc_value_object(o);
}

bool tsc_util_types_is_date(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        return o->is_date;
    }
    return false;
}

bool tsc_util_types_is_regexp(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        return o->is_regexp;
    }
    return false;
}

bool tsc_util_types_is_native_error(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        return o->is_error;
    }
    return false;
}

bool tsc_util_types_is_promise(tsc_value_t v) {
    return tsc_value_is_promise(v);
}

bool tsc_util_types_is_map(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        return o->is_map;
    }
    return false;
}

bool tsc_util_types_is_set(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        return o->is_set;
    }
    return false;
}

bool tsc_util_types_is_typed_array(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        return o->is_typed_array;
    }
    return false;
}

bool tsc_util_types_is_any_array_buffer(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        return o->is_array_buffer;
    }
    return false;
}

bool tsc_util_types_is_array_buffer_view(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        return o->is_typed_array || o->is_data_view;
    }
    return false;
}

static void intrinsic_define_method(
    tsc_object_t* object,
    const char* name,
    size_t name_len,
    double arity,
    tsc_generic_function_t function,
    void* env
) {
    tsc_object_define(
        object,
        tsc_str_from_lit(name, name_len),
        tsc_value_function_builtin_named(function, env, arity, tsc_str_from_lit(name, name_len)),
        true,
        false,
        true
    );
}

typedef double (*tsc_math_unary_fn_t)(double);
typedef double (*tsc_math_binary_fn_t)(double, double);

typedef enum {
    TSC_MATH_UNARY,
    TSC_MATH_BINARY,
    TSC_MATH_HYPOT,
    TSC_MATH_MIN,
    TSC_MATH_MAX,
    TSC_MATH_RANDOM,
} tsc_math_intrinsic_kind_t;

typedef struct {
    const char* name;
    size_t name_len;
    double arity;
    tsc_math_intrinsic_kind_t kind;
    union {
        tsc_math_unary_fn_t unary;
        tsc_math_binary_fn_t binary;
    } implementation;
} tsc_math_intrinsic_t;

#define TSC_MATH_UNARY_ENTRY(name_literal, function) \
    { name_literal, sizeof(name_literal) - 1, 1.0, TSC_MATH_UNARY, { .unary = function } }
#define TSC_MATH_BINARY_ENTRY(name_literal, function) \
    { name_literal, sizeof(name_literal) - 1, 2.0, TSC_MATH_BINARY, { .binary = function } }
#define TSC_MATH_VARIADIC_ENTRY(name_literal, length_value, kind_value) \
    { name_literal, sizeof(name_literal) - 1, length_value, kind_value, { .unary = NULL } }

static const tsc_math_intrinsic_t math_intrinsics[] = {
    TSC_MATH_UNARY_ENTRY("abs", fabs),
    TSC_MATH_UNARY_ENTRY("acos", acos),
    TSC_MATH_UNARY_ENTRY("acosh", acosh),
    TSC_MATH_UNARY_ENTRY("asin", asin),
    TSC_MATH_UNARY_ENTRY("asinh", asinh),
    TSC_MATH_UNARY_ENTRY("atan", atan),
    TSC_MATH_UNARY_ENTRY("atanh", atanh),
    TSC_MATH_BINARY_ENTRY("atan2", atan2),
    TSC_MATH_UNARY_ENTRY("cbrt", cbrt),
    TSC_MATH_UNARY_ENTRY("ceil", ceil),
    TSC_MATH_UNARY_ENTRY("clz32", tsc_math_clz32),
    TSC_MATH_UNARY_ENTRY("cos", cos),
    TSC_MATH_UNARY_ENTRY("cosh", cosh),
    TSC_MATH_UNARY_ENTRY("exp", exp),
    TSC_MATH_UNARY_ENTRY("expm1", expm1),
    TSC_MATH_UNARY_ENTRY("f16round", tsc_math_f16round),
    TSC_MATH_UNARY_ENTRY("floor", floor),
    TSC_MATH_UNARY_ENTRY("fround", tsc_math_fround),
    TSC_MATH_VARIADIC_ENTRY("hypot", 2.0, TSC_MATH_HYPOT),
    TSC_MATH_BINARY_ENTRY("imul", tsc_math_imul),
    TSC_MATH_UNARY_ENTRY("log", log),
    TSC_MATH_UNARY_ENTRY("log1p", log1p),
    TSC_MATH_UNARY_ENTRY("log10", log10),
    TSC_MATH_UNARY_ENTRY("log2", log2),
    TSC_MATH_VARIADIC_ENTRY("max", 2.0, TSC_MATH_MAX),
    TSC_MATH_VARIADIC_ENTRY("min", 2.0, TSC_MATH_MIN),
    TSC_MATH_BINARY_ENTRY("pow", pow),
    TSC_MATH_VARIADIC_ENTRY("random", 0.0, TSC_MATH_RANDOM),
    TSC_MATH_UNARY_ENTRY("round", tsc_math_round),
    TSC_MATH_UNARY_ENTRY("sign", tsc_math_sign),
    TSC_MATH_UNARY_ENTRY("sin", sin),
    TSC_MATH_UNARY_ENTRY("sinh", sinh),
    TSC_MATH_UNARY_ENTRY("sqrt", sqrt),
    TSC_MATH_UNARY_ENTRY("tan", tan),
    TSC_MATH_UNARY_ENTRY("tanh", tanh),
    TSC_MATH_UNARY_ENTRY("trunc", trunc),
};

#undef TSC_MATH_UNARY_ENTRY
#undef TSC_MATH_BINARY_ENTRY
#undef TSC_MATH_VARIADIC_ENTRY

typedef struct {
    const char* name;
    size_t name_len;
    double value;
} tsc_math_constant_t;

static const tsc_math_constant_t math_constants[] = {
    { "E", 1, M_E },
    { "LN10", 4, M_LN10 },
    { "LN2", 3, M_LN2 },
    { "LOG10E", 6, M_LOG10E },
    { "LOG2E", 5, M_LOG2E },
    { "PI", 2, M_PI },
    { "SQRT1_2", 7, M_SQRT1_2 },
    { "SQRT2", 5, M_SQRT2 },
};

static double math_argument(const tsc_array_t* args, size_t index) {
    return index < args->len
        ? tsc_value_as_num(TSC_ARR(tsc_value_t, args, index))
        : NAN;
}

static tsc_value_t math_intrinsic_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    const tsc_math_intrinsic_t* intrinsic = (const tsc_math_intrinsic_t*)env;
    if (intrinsic->kind == TSC_MATH_UNARY) {
        return tsc_value_num(intrinsic->implementation.unary(math_argument(args, 0)));
    }
    if (intrinsic->kind == TSC_MATH_BINARY) {
        return tsc_value_num(intrinsic->implementation.binary(math_argument(args, 0), math_argument(args, 1)));
    }
    if (intrinsic->kind == TSC_MATH_RANDOM) {
        return tsc_value_num(tsc_math_random());
    }
    if (intrinsic->kind == TSC_MATH_HYPOT) {
        double result = 0.0;
        for (size_t index = 0; index < args->len; index++) {
            result = hypot(result, math_argument(args, index));
        }
        return tsc_value_num(result);
    }
    double result = intrinsic->kind == TSC_MATH_MIN ? INFINITY : -INFINITY;
    for (size_t index = 0; index < args->len; index++) {
        double value = math_argument(args, index);
        if (isnan(value)) return tsc_value_num(NAN);
        result = intrinsic->kind == TSC_MATH_MIN ? fmin(result, value) : fmax(result, value);
    }
    return tsc_value_num(result);
}

typedef struct {
    tsc_object_t* math;
    tsc_object_t* json;
    tsc_object_t* reflect;
} tsc_namespace_intrinsics_state_t;

static const char namespace_intrinsics_realm_state_key = 0;

static tsc_namespace_intrinsics_state_t* namespace_intrinsics_for_current_realm(void) {
    tsc_namespace_intrinsics_state_t* state =
        (tsc_namespace_intrinsics_state_t*)tsc_realm_state_get(
            &namespace_intrinsics_realm_state_key
        );
    if (state) return state;
    tsc_runtime_lock();
    state = (tsc_namespace_intrinsics_state_t*)tsc_realm_state_get(
        &namespace_intrinsics_realm_state_key
    );
    if (!state) {
        state = (tsc_namespace_intrinsics_state_t*)TSC_GC_MALLOC(sizeof(*state));
        memset(state, 0, sizeof(*state));
        tsc_realm_state_set(&namespace_intrinsics_realm_state_key, state);
    }
    tsc_runtime_unlock();
    return state;
}

tsc_value_t tsc_builtin_math(void) {
    tsc_namespace_intrinsics_state_t* state = namespace_intrinsics_for_current_realm();
    tsc_object_t* math = state->math;
    if (!math) {
        tsc_runtime_lock();
        if (!math) {
            tsc_object_t* built = tsc_object_new();
            for (size_t index = 0; index < sizeof(math_intrinsics) / sizeof(math_intrinsics[0]); index++) {
                const tsc_math_intrinsic_t* intrinsic = &math_intrinsics[index];
                intrinsic_define_method(
                    built,
                    intrinsic->name,
                    intrinsic->name_len,
                    intrinsic->arity,
                    math_intrinsic_apply,
                    (void*)intrinsic
                );
            }
            for (size_t index = 0; index < sizeof(math_constants) / sizeof(math_constants[0]); index++) {
                const tsc_math_constant_t* constant = &math_constants[index];
                tsc_object_define(
                    built,
                    tsc_str_from_lit(constant->name, constant->name_len),
                    tsc_value_num(constant->value),
                    false,
                    false,
                    false
                );
            }
            state->math = built;
            math = built;
        }
        tsc_runtime_unlock();
    }
    return tsc_value_object(math);
}

static tsc_value_t json_parse_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t text = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    return tsc_json_parse(tsc_value_to_string(text));
}

static tsc_value_t json_stringify_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t value = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    return tsc_value_json_stringify_top(value);
}

tsc_value_t tsc_builtin_json(void) {
    tsc_namespace_intrinsics_state_t* state = namespace_intrinsics_for_current_realm();
    tsc_object_t* json = state->json;
    if (!json) {
        tsc_runtime_lock();
        if (!json) {
            tsc_object_t* built = tsc_object_new();
            intrinsic_define_method(built, "parse", 5, 2.0, json_parse_apply, NULL);
            intrinsic_define_method(built, "stringify", 9, 3.0, json_stringify_apply, NULL);
            state->json = built;
            json = built;
        }
        tsc_runtime_unlock();
    }
    return tsc_value_object(json);
}

static tsc_value_t reflect_apply_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t receiver = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    tsc_value_t arguments = args->len > 2 ? TSC_ARR(tsc_value_t, args, 2) : tsc_value_undefined();
    return tsc_value_apply_function(target, receiver, arguments);
}

static tsc_value_t reflect_construct_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t arguments = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    tsc_value_t new_target = args->len > 2 ? TSC_ARR(tsc_value_t, args, 2) : target;
    return tsc_value_construct_with_new_target(target, arguments, new_target);
}

static tsc_value_t reflect_define_property_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t key = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    tsc_value_t desc = args->len > 2 ? TSC_ARR(tsc_value_t, args, 2) : tsc_value_undefined();
    return tsc_value_bool(tsc_reflect_define_computed_property_descriptor(target, key, desc));
}

static tsc_value_t reflect_delete_property_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t key = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    return tsc_value_bool(tsc_reflect_delete_computed_prop(target, key));
}

static tsc_value_t reflect_get_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t key = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    tsc_value_t receiver = args->len > 2 ? TSC_ARR(tsc_value_t, args, 2) : target;
    return tsc_reflect_get_computed_prop_receiver(target, key, receiver);
}

static tsc_value_t reflect_get_own_property_descriptor_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t key = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    return tsc_reflect_get_own_property_computed_descriptor(target, key);
}

static tsc_value_t reflect_get_prototype_of_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    return tsc_reflect_get_prototype_of(target);
}

static tsc_value_t reflect_has_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t key = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    return tsc_value_bool(tsc_reflect_has_computed_prop(target, key));
}

static tsc_value_t reflect_is_extensible_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    return tsc_value_bool(tsc_reflect_is_extensible(target));
}

static tsc_value_t reflect_own_keys_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    return tsc_value_array(tsc_reflect_own_keys(target));
}

static tsc_value_t reflect_prevent_extensions_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    return tsc_value_bool(tsc_reflect_prevent_extensions(target));
}

static tsc_value_t reflect_set_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t key = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    tsc_value_t value = args->len > 2 ? TSC_ARR(tsc_value_t, args, 2) : tsc_value_undefined();
    tsc_value_t receiver = args->len > 3 ? TSC_ARR(tsc_value_t, args, 3) : target;
    return tsc_value_bool(tsc_reflect_set_computed_prop_receiver(target, key, value, receiver));
}

static tsc_value_t reflect_set_prototype_of_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t prototype = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    return tsc_value_bool(tsc_reflect_set_prototype_of(target, prototype));
}

static void reflect_define_method(tsc_object_t* reflect, const char* name, size_t len, double arity, tsc_generic_function_t fn) {
    intrinsic_define_method(reflect, name, len, arity, fn, NULL);
}

tsc_value_t tsc_builtin_reflect(void) {
    tsc_namespace_intrinsics_state_t* state = namespace_intrinsics_for_current_realm();
    tsc_object_t* reflect = state->reflect;
    if (!reflect) {
        tsc_runtime_lock();
        if (reflect) {
            tsc_runtime_unlock();
            return tsc_value_object(reflect);
        }
        tsc_object_t* built = tsc_object_new();
        reflect_define_method(built, "apply", 5, 3.0, reflect_apply_method);
        reflect_define_method(built, "construct", 9, 2.0, reflect_construct_method);
        reflect_define_method(built, "defineProperty", 14, 3.0, reflect_define_property_method);
        reflect_define_method(built, "deleteProperty", 14, 2.0, reflect_delete_property_method);
        reflect_define_method(built, "get", 3, 2.0, reflect_get_method);
        reflect_define_method(built, "getOwnPropertyDescriptor", 24, 2.0, reflect_get_own_property_descriptor_method);
        reflect_define_method(built, "getPrototypeOf", 14, 1.0, reflect_get_prototype_of_method);
        reflect_define_method(built, "has", 3, 2.0, reflect_has_method);
        reflect_define_method(built, "isExtensible", 12, 1.0, reflect_is_extensible_method);
        reflect_define_method(built, "ownKeys", 7, 1.0, reflect_own_keys_method);
        reflect_define_method(built, "preventExtensions", 17, 1.0, reflect_prevent_extensions_method);
        reflect_define_method(built, "set", 3, 3.0, reflect_set_method);
        reflect_define_method(built, "setPrototypeOf", 14, 2.0, reflect_set_prototype_of_method);
        state->reflect = built;
        reflect = built;
        tsc_runtime_unlock();
    }
    return tsc_value_object(reflect);
}
