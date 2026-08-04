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
        case TSC_VALUE_TAG_ARRAY: return tsc_str_from_lit("[object Array]", 14);
        case TSC_VALUE_TAG_OBJECT: {
            tsc_object_t* o = (tsc_object_t*)value_ptr(v);
            if (o && o->is_proxy && tsc_proxy_chain_has_revoked(v)) {
                tsc_throw_str(tsc_str_from_cstr("Cannot perform 'get' on a proxy that has been revoked"));
            }
            if (tsc_proxy_trap_is_callable(v)) return tsc_str_from_lit("[object Function]", 17);
            if (value_proxy_chain_is_array(v)) return tsc_str_from_lit("[object Array]", 14);
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
        tsc_throw_str(tsc_str_from_cstr("Array.isArray cannot be called on a Proxy that has been revoked"));
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
    void* env,
    double length,
    tsc_str_t* name,
    tsc_function_identity_kind_t kind
) {
    if (!name) name = tsc_str_from_lit("", 0);
    for (tsc_function_identity_t* cur = g_function_identities; cur; cur = cur->next) {
        if (cur->kind == kind && cur->code.generic == fn && cur->env == env) {
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
    id->extensible = true;
    id->sealed = false;
    id->frozen = false;
    id->func_prototype_writable = true;
    id->prototype = tsc_function_default_prototype();
    id->func_prototype = tsc_value_undefined();
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
    return tsc_value_function_named_kind(fn, env, length, name, TSC_FUNCTION_IDENTITY_GENERIC);
}

tsc_value_t tsc_value_function_closure_named(tsc_generic_function_t fn, void* env, double length, tsc_str_t* name) {
    return tsc_value_function_named_kind(fn, env, length, name, TSC_FUNCTION_IDENTITY_CLOSURE);
}

tsc_value_t tsc_value_function_builtin_named(tsc_generic_function_t fn, void* env, double length, tsc_str_t* name) {
    return tsc_value_function_named_kind(fn, env, length, name, TSC_FUNCTION_IDENTITY_BUILTIN);
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
        return ident && ident->kind == TSC_FUNCTION_IDENTITY_GENERIC;
    }
    if (value_tag(v) != TSC_VALUE_TAG_OBJECT) return false;
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    return o && o->is_proxy && tsc_value_is_constructable(o->proxy_target);
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
        tsc_throw_str(tsc_str_from_cstr(message));
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
    if (ident->kind == TSC_FUNCTION_IDENTITY_GETTER) {
        return ident->code.getter(ident->env, this_arg);
    }
    if (
        ident->kind == TSC_FUNCTION_IDENTITY_GENERIC ||
        ident->kind == TSC_FUNCTION_IDENTITY_CLOSURE ||
        ident->kind == TSC_FUNCTION_IDENTITY_BUILTIN
    ) {
        return ident->code.generic(ident->env, this_arg, list);
    }
    if (ident->kind == TSC_FUNCTION_IDENTITY_EVENT_LISTENER) {
        ident->code.event_listener.fn(ident->env, NULL, list);
        return tsc_value_undefined();
    }
    if (ident->kind == TSC_FUNCTION_IDENTITY_EVENT_RAW_LISTENER) {
        ident->code.event_raw_identity.fn(ident->env, NULL, list);
        return tsc_value_undefined();
    }
    if (ident->kind != TSC_FUNCTION_IDENTITY_SETTER) {
        tsc_panic("Reflect.apply target is not a callable function identity");
    }
    tsc_value_t value = list->len > 0 ? TSC_ARR(tsc_value_t, list, 0) : tsc_value_undefined();
    ident->code.setter(ident->env, this_arg, value);
    return tsc_value_undefined();
}

tsc_value_t tsc_value_construct(tsc_value_t target, tsc_value_t args) {
    return tsc_value_construct_with_new_target(target, args, target);
}

tsc_value_t tsc_value_construct_with_new_target(tsc_value_t target, tsc_value_t args, tsc_value_t new_target) {
    if (value_is_box(target) && value_tag(target) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* ident = (tsc_function_identity_t*)value_ptr(target);
        if (ident->kind == TSC_FUNCTION_IDENTITY_GENERIC) {
            if (!tsc_value_is_constructable(new_target)) {
                tsc_throw_str(tsc_str_from_cstr("Reflect.construct newTarget is not a constructor"));
            }
            tsc_array_t* list = value_to_argument_list(args, "Reflect.construct argumentsList must be an array or array-like object");
            tsc_value_t receiver = tsc_value_object(tsc_object_new());
            tsc_value_t new_target_proto = tsc_value_get_prop(new_target, tsc_str_from_lit("prototype", 9));
            if (value_is_valid_prototype(new_target_proto) && !value_is_null_value(new_target_proto)) {
                (void)tsc_value_set_prototype_of(receiver, new_target_proto);
            }
            tsc_value_t result = ident->code.generic(ident->env, receiver, list);
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
            if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'construct' on a proxy that has been revoked"));
            if (!tsc_value_is_constructable(o->proxy_target)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy construct target must be constructor"));
            }
            if (!tsc_value_is_constructable(new_target)) {
                tsc_throw_str(tsc_str_from_cstr("Reflect.construct newTarget is not a constructor"));
            }
            tsc_array_t* list = value_to_argument_list(args, "Reflect.construct argumentsList must be an array or array-like object");
            tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("construct", 9));
            if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
                return tsc_value_construct_with_new_target(o->proxy_target, tsc_value_array(list), new_target);
            }
            if (!value_is_callable_function(trap)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy construct trap must be callable"));
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
                tsc_throw_str(tsc_str_from_cstr("Proxy construct trap must return an object"));
            }
            return result;
        }
    }
    tsc_throw_str(tsc_str_from_cstr("Reflect.construct target is not a supported constructor"));
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
    if (tsc_value_is_undefined(ident->func_prototype)) {
        tsc_object_t* proto = tsc_object_new();
        tsc_object_set(proto, tsc_str_from_lit("constructor", 11), fn);
        ident->func_prototype = tsc_value_object(proto);
    }
    return ident->func_prototype;
}

static bool tsc_function_has_prototype_metadata(const tsc_function_identity_t* fn) {
    return fn && fn->kind == TSC_FUNCTION_IDENTITY_GENERIC;
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
        if (a->es == sizeof(tsc_value_t) && tsc_str_array_index(key, &idx)) {
            if (a->props && tsc_object_has_own(a->props, key)) {
                return tsc_object_get_receiver(a->props, key, v);
            }
            if (tsc_array_index_present(a, idx)) return TSC_ARR(tsc_value_t, a, idx);
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
        if (a->es == sizeof(tsc_value_t) && tsc_str_array_index(key, &idx)) {
            if (a->props && tsc_object_has_own(a->props, key)) {
                return tsc_object_get_receiver(a->props, key, receiver);
            }
            if (tsc_array_index_present(a, idx)) return TSC_ARR(tsc_value_t, a, idx);
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
    if (a->es != sizeof(tsc_value_t)) return tsc_value_undefined();
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
    return TSC_ARR(tsc_value_t, a, (size_t)index);
}

bool tsc_value_set_array_own_index(tsc_value_t v, size_t idx, tsc_value_t value) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_ARRAY) return false;
    tsc_array_t* a = (tsc_array_t*)value_ptr(v);
    if (a->es != sizeof(tsc_value_t)) return false;
    if (a->frozen) return false;
    tsc_str_t* key = tsc_str_from_int((int64_t)idx);
    bool exists = idx < a->len && tsc_array_index_present(a, idx);
    if (!exists && a->props && tsc_object_has_own(a->props, key)) exists = true;
    if (!exists && !a->extensible) return false;
    if (idx >= a->len && !a->length_writable) return false;
    while (a->len < idx) {
        tsc_value_t undef = tsc_value_undefined();
        tsc_array_push_raw(a, &undef);
        tsc_array_mark_hole(a, a->len - 1);
    }
    if (idx == a->len) {
        tsc_array_push_raw(a, &value);
    } else {
        if (a->props && tsc_object_has_own(a->props, key)) {
            bool ok = tsc_object_set_receiver(a->props, key, value, v);
            if (ok) tsc_array_clear_hole(a, idx);
            return ok;
        }
        tsc_array_clear_hole(a, idx);
        TSC_ARR(tsc_value_t, a, idx) = value;
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
    if (a->es != sizeof(tsc_value_t)) return false;
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
    if (!a || a->es != sizeof(tsc_value_t)) return false;
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
        tsc_value_t undef = tsc_value_undefined();
        tsc_array_push_raw(a, &undef);
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
        ((tsc_function_identity_t*)fn)->func_prototype = value;
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
    if (key == tsc_symbol_iterator()) {
        return tsc_str_from_cstr("__tsc_symbol_iterator");
    }
    if (key == tsc_symbol_async_iterator()) {
        return tsc_str_from_cstr("__tsc_symbol_asyncIterator");
    }
    if (key == tsc_symbol_async_dispose()) {
        return tsc_str_from_cstr("__tsc_symbol_asyncDispose");
    }
    if (key == tsc_symbol_dispose()) {
        return tsc_str_from_cstr("__tsc_symbol_dispose");
    }
    if (key == tsc_symbol_unscopables()) {
        return tsc_str_from_cstr("__tsc_symbol_unscopables");
    }
    if (key == tsc_symbol_is_concat_spreadable()) {
        return tsc_str_from_cstr("__tsc_symbol_isConcatSpreadable");
    }
    if (key == tsc_symbol_to_string_tag()) {
        return tsc_str_from_cstr("__tsc_symbol_toStringTag");
    }
    if (key == tsc_symbol_species()) {
        return tsc_str_from_cstr("__tsc_symbol_species");
    }
    return NULL;
}

static bool value_is_known_symbol_internal_key(const tsc_str_t* key) {
    return str_lit_eq(key, "__tsc_symbol_iterator") ||
        str_lit_eq(key, "__tsc_symbol_asyncIterator") ||
        str_lit_eq(key, "__tsc_symbol_asyncDispose") ||
        str_lit_eq(key, "__tsc_symbol_dispose") ||
        str_lit_eq(key, "__tsc_symbol_unscopables") ||
        str_lit_eq(key, "__tsc_symbol_isConcatSpreadable") ||
        str_lit_eq(key, "__tsc_symbol_toStringTag") ||
        str_lit_eq(key, "__tsc_symbol_species");
}

static tsc_symbol_t* value_known_symbol_from_internal_key(const tsc_str_t* key) {
    if (str_lit_eq(key, "__tsc_symbol_iterator")) return tsc_symbol_iterator();
    if (str_lit_eq(key, "__tsc_symbol_asyncIterator")) return tsc_symbol_async_iterator();
    if (str_lit_eq(key, "__tsc_symbol_asyncDispose")) return tsc_symbol_async_dispose();
    if (str_lit_eq(key, "__tsc_symbol_dispose")) return tsc_symbol_dispose();
    if (str_lit_eq(key, "__tsc_symbol_unscopables")) return tsc_symbol_unscopables();
    if (str_lit_eq(key, "__tsc_symbol_isConcatSpreadable")) return tsc_symbol_is_concat_spreadable();
    if (str_lit_eq(key, "__tsc_symbol_toStringTag")) return tsc_symbol_to_string_tag();
    if (str_lit_eq(key, "__tsc_symbol_species")) return tsc_symbol_species();
    return NULL;
}

static bool value_array_is_prototype_value(tsc_value_t v) {
    return value_is_box(v) &&
        value_tag(v) == TSC_VALUE_TAG_ARRAY &&
        (const tsc_array_t*)value_ptr(v) == tsc_array_prototype();
}

static bool value_symbol_uses_array_prototype_slot(tsc_symbol_t* key) {
    return key == tsc_symbol_iterator() || key == tsc_symbol_unscopables();
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
    if (value_symbol_uses_array_prototype_slot(key) && value_array_is_prototype_value(v)) {
        return tsc_array_prototype_define_symbol_desc(key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
    }
    tsc_str_t* internal_key = value_known_symbol_internal_key(key);
    if (internal_key) {
        return tsc_value_define_property_desc(v, internal_key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
    }
    return false;
}

tsc_value_t tsc_value_get_symbol_prop(tsc_value_t v, tsc_symbol_t* key) {
    if (value_symbol_uses_array_prototype_slot(key) && value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* a = (const tsc_array_t*)value_ptr(v);
        if (a == tsc_array_prototype()) return tsc_array_prototype_symbol_value(key);
        return tsc_value_get_symbol_prop(a->prototype, key);
    }
    tsc_str_t* internal_key = value_known_symbol_internal_key(key);
    if (internal_key) return tsc_value_get_prop(v, internal_key);
    return tsc_value_undefined();
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

bool tsc_value_define_properties_descriptor_map(tsc_value_t v, tsc_value_t descriptors) {
    if (!value_is_property_descriptor_object(descriptors)) {
        tsc_throw_str(tsc_str_from_cstr("Object.defineProperties descriptor map must be an object"));
    }
    tsc_array_t* keys = tsc_value_object_keys(descriptors);
    tsc_array_t* parsed = tsc_array_new(sizeof(tsc_parsed_property_descriptor_t), keys->len ? keys->len : 1);
    for (size_t i = 0; i < keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
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
        tag == TSC_VALUE_TAG_STRING;
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

static tsc_value_t primitive_prototype(tsc_object_t** slot) {
    if (!*slot) {
        tsc_runtime_lock();
        if (!*slot) *slot = tsc_object_new();
        tsc_runtime_unlock();
    }
    return tsc_value_object(*slot);
}

tsc_value_t tsc_value_number_prototype(void) {
    static tsc_object_t* proto = NULL;
    return primitive_prototype(&proto);
}

tsc_value_t tsc_value_boolean_prototype(void) {
    static tsc_object_t* proto = NULL;
    return primitive_prototype(&proto);
}

tsc_value_t tsc_value_string_prototype(void) {
    static tsc_object_t* proto = NULL;
    return primitive_prototype(&proto);
}

tsc_value_t tsc_value_bigint_prototype(void) {
    static tsc_object_t* proto = NULL;
    return primitive_prototype(&proto);
}

tsc_value_t tsc_value_symbol_prototype(void) {
    static tsc_object_t* proto = NULL;
    return primitive_prototype(&proto);
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
        fn->prototype = prototype;
        return true;
    }
    return false;
}

void tsc_value_object_require_valid_prototype(tsc_value_t prototype) {
    if (!value_is_valid_prototype(prototype)) {
        tsc_throw_str(tsc_str_from_cstr("Object.setPrototypeOf prototype must be an object or null"));
    }
}

bool tsc_value_object_set_prototype_of(tsc_value_t v, tsc_value_t prototype) {
    if (tsc_value_is_nullish(v)) {
        tsc_throw_str(tsc_str_from_cstr("Object.setPrototypeOf target must not be null or undefined"));
    }
    tsc_value_object_require_valid_prototype(prototype);
    if (
        !value_is_box(v) ||
        (value_tag(v) != TSC_VALUE_TAG_OBJECT && value_tag(v) != TSC_VALUE_TAG_ARRAY && value_tag(v) != TSC_VALUE_TAG_FUNCTION)
    ) {
        return true;
    }
    if (!tsc_value_set_prototype_of(v, prototype)) {
        tsc_throw_str(tsc_str_from_cstr("Object.setPrototypeOf failed"));
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
            fn->func_prototype = value;
            return true;
        }
        if (tsc_function_metadata_key(fn, key)) return false;
        return tsc_object_set_receiver(fn->props, key, value, v);
    }
    return false;
}

bool tsc_value_set_symbol_prop(tsc_value_t v, tsc_symbol_t* key, tsc_value_t value) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_SET_PROP);
    if (value_symbol_uses_array_prototype_slot(key) && value_array_is_prototype_value(v)) {
        return tsc_array_prototype_define_symbol_desc(
            key,
            value,
            true,
            true,
            false,
            false,
            false,
            false,
            false
        );
    }
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
    if (value_symbol_uses_array_prototype_slot(key) && value_array_is_prototype_value(v)) {
        return tsc_array_prototype_has_symbol(key);
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
    if (value_symbol_uses_array_prototype_slot(key) && value_array_is_prototype_value(v)) {
        return tsc_array_prototype_symbol_is_enumerable(key);
    }
    tsc_str_t* internal_key = value_known_symbol_internal_key(key);
    if (internal_key) return tsc_value_property_is_enumerable(v, internal_key);
    return false;
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
    if (value_symbol_uses_array_prototype_slot(key) && value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* a = (const tsc_array_t*)value_ptr(v);
        if (a == tsc_array_prototype()) return tsc_array_prototype_has_symbol(key);
        return tsc_value_has_own_symbol_prop(v, key) || tsc_value_has_symbol_prop(a->prototype, key);
    }
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
        bool is_index = a->es == sizeof(tsc_value_t) && tsc_str_array_index(key, &idx) && idx < a->len;
        if (a->props && tsc_object_has_own(a->props, key)) {
            if (!tsc_object_delete(a->props, key)) return false;
            if (is_index) {
                tsc_array_mark_hole(a, idx);
                TSC_ARR(tsc_value_t, a, idx) = tsc_value_undefined();
            }
            return true;
        }
        if (is_index) {
            if (a->sealed || a->frozen) return false;
            tsc_array_mark_hole(a, idx);
            TSC_ARR(tsc_value_t, a, idx) = tsc_value_undefined();
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
    if (value_symbol_uses_array_prototype_slot(key) && value_array_is_prototype_value(v)) {
        return tsc_array_prototype_delete_symbol(key);
    }
    tsc_str_t* internal_key = value_known_symbol_internal_key(key);
    if (internal_key) return tsc_value_delete_prop(v, internal_key);
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return true;
    }
    return true;
}

bool tsc_reflect_delete_prop(tsc_value_t v, tsc_str_t* key) {
    require_reflect_object_target(v, "Reflect.deleteProperty target must be an object");
    return tsc_value_delete_prop(v, key);
}

bool tsc_reflect_delete_symbol_prop(tsc_value_t v, tsc_symbol_t* key) {
    require_reflect_object_target(v, "Reflect.deleteProperty target must be an object");
    return tsc_value_delete_symbol_prop(v, key);
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
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx) && idx < src->len) continue;
        if (src == tsc_array_prototype() && str_lit_eq(key, "valueOf")) continue;
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
    if (src == tsc_array_prototype() && str_lit_eq(key, "valueOf")) return tsc_value_undefined();
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
            if (src == tsc_array_prototype() && str_lit_eq(key, "valueOf")) continue;
            tsc_object_set(out, key, tsc_value_get_own_property_descriptor(tsc_value_object(src->props), key));
        }
    }
    if (src == tsc_array_prototype()) {
        tsc_value_t iterator_desc = tsc_array_symbol_iterator_descriptor();
        if (!tsc_value_is_undefined(iterator_desc)) {
            tsc_object_set(out, value_known_symbol_internal_key(tsc_symbol_iterator()), iterator_desc);
        }
        tsc_value_t unscopables_desc = tsc_array_symbol_unscopables_descriptor();
        if (!tsc_value_is_undefined(unscopables_desc)) {
            tsc_object_set(out, value_known_symbol_internal_key(tsc_symbol_unscopables()), unscopables_desc);
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

tsc_array_t* tsc_value_own_keys(tsc_value_t v) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_OWN_KEYS);
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return value_object_string_keys((tsc_object_t*)value_ptr(v), false);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_array_keys((const tsc_array_t*)value_ptr(v), true);
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
                if (value_is_known_symbol_internal_key(key)) continue;
                tsc_array_push_raw(out, &key);
            }
        }
        return out;
    }
    return tsc_array_new(sizeof(tsc_str_t*), 1);
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
            (void)tsc_value_own_keys(v);
        }
    }
    return out;
}

tsc_array_t* tsc_reflect_own_keys(tsc_value_t v) {
    require_reflect_object_target(v, "Reflect.ownKeys target must be an object");
    return tsc_value_own_keys(v);
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
        tsc_array_push_value(args, tsc_value_string(key));
        tsc_value_t result = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        tsc_proxy_validate_get_own_property_descriptor_result(o, key, result);
        return result;
    }
    for (size_t i = 0; i < o->len; i++) {
        if (!tsc_str_eq(o->props[i].key, key)) continue;
        return value_descriptor_from_prop(&o->props[i]);
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_get_own_property_symbol_descriptor(tsc_value_t v, tsc_symbol_t* key) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_GET_OWN_PROPERTY_DESCRIPTOR);
    if (tsc_value_is_nullish(v)) {
        tsc_throw_str(tsc_str_from_cstr("Object.getOwnPropertyDescriptor target must not be null or undefined"));
    }
    if (value_symbol_uses_array_prototype_slot(key) && value_array_is_prototype_value(v)) {
        if (key == tsc_symbol_iterator()) return tsc_array_symbol_iterator_descriptor();
        if (key == tsc_symbol_unscopables()) return tsc_array_symbol_unscopables_descriptor();
    }
    tsc_str_t* internal_key = value_known_symbol_internal_key(key);
    if (internal_key) return tsc_value_get_own_property_descriptor(v, internal_key);
    return tsc_value_undefined();
}

tsc_value_t tsc_reflect_get_own_property_descriptor(tsc_value_t v, tsc_str_t* key) {
    require_reflect_object_target(v, "Reflect.getOwnPropertyDescriptor target must be an object");
    return tsc_value_get_own_property_descriptor(v, key);
}

tsc_value_t tsc_reflect_get_own_property_symbol_descriptor(tsc_value_t v, tsc_symbol_t* key) {
    require_reflect_object_target(v, "Reflect.getOwnPropertyDescriptor target must be an object");
    return tsc_value_get_own_property_symbol_descriptor(v, key);
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
        tsc_array_t* keys = tsc_value_own_keys(v);
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

static void object_assign_set_or_throw(tsc_value_t target, tsc_object_t* dst, tsc_str_t* key, tsc_value_t value) {
    bool ok = dst ? tsc_object_set(dst, key, value) : tsc_value_set_prop(target, key, value);
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
    tsc_object_t* dst = target_is_object ? (tsc_object_t*)value_ptr(target) : NULL;
    if (!value_is_box(source)) return target;
    if (value_tag(source) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* src = (tsc_object_t*)value_ptr(source);
        if (src && src->is_proxy) {
            tsc_array_t* keys = tsc_value_object_keys(source);
            for (size_t i = 0; i < keys->len; i++) {
                tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
                tsc_value_t value = tsc_value_get_prop(source, key);
                object_assign_set_or_throw(target, dst, key, value);
            }
            return target;
        }
        for (size_t i = 0; i < src->len; i++) {
            if (!src->props[i].enumerable) continue;
            tsc_value_t value = tsc_object_get(src, src->props[i].key);
            object_assign_set_or_throw(target, dst, src->props[i].key, value);
        }
        return target;
    }
    if (value_tag(source) == TSC_VALUE_TAG_ARRAY || value_tag(source) == TSC_VALUE_TAG_STRING || value_tag(source) == TSC_VALUE_TAG_FUNCTION) {
        tsc_array_t* keys = tsc_value_object_keys(source);
        for (size_t i = 0; i < keys->len; i++) {
            tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
            tsc_value_t value = tsc_value_get_prop(source, key);
            object_assign_set_or_throw(target, dst, key, value);
        }
    }
    return target;
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
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* a = (const tsc_array_t*)value_ptr(v);
        if (a == tsc_array_prototype()) {
            if (!tsc_array_prototype_has_symbol(tsc_symbol_iterator())) return tsc_value_undefined();
            return tsc_array_prototype_symbol_value(tsc_symbol_iterator());
        } else if (!tsc_value_has_symbol_prop(a->prototype, tsc_symbol_iterator())) {
            return tsc_value_undefined();
        }
        if (value_is_box(a->prototype) && value_tag(a->prototype) == TSC_VALUE_TAG_ARRAY && (const tsc_array_t*)value_ptr(a->prototype) == tsc_array_prototype()) {
            return tsc_array_prototype_symbol_value(tsc_symbol_iterator());
        }
        return tsc_value_undefined();
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_symbol_unscopables(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* a = (const tsc_array_t*)value_ptr(v);
        if (a == tsc_array_prototype()) {
            if (!tsc_array_prototype_has_symbol(tsc_symbol_unscopables())) return tsc_value_undefined();
            return tsc_array_prototype_symbol_value(tsc_symbol_unscopables());
        } else if (!tsc_value_has_symbol_prop(a->prototype, tsc_symbol_unscopables())) {
            return tsc_value_undefined();
        }
        if (value_is_box(a->prototype) && value_tag(a->prototype) == TSC_VALUE_TAG_ARRAY && (const tsc_array_t*)value_ptr(a->prototype) == tsc_array_prototype()) {
            return tsc_array_prototype_symbol_value(tsc_symbol_unscopables());
        }
        return tsc_value_undefined();
    }
    return tsc_value_undefined();
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

tsc_value_t tsc_value_add(tsc_value_t a, tsc_value_t b) {
    bool stringy =
        (value_is_box(a) && value_tag(a) == TSC_VALUE_TAG_STRING) ||
        (value_is_box(b) && value_tag(b) == TSC_VALUE_TAG_STRING);
    if (stringy) {
        return tsc_value_string(tsc_str_concat(tsc_value_to_string(a), tsc_value_to_string(b)));
    }
    return tsc_value_num(tsc_value_as_num(a) + tsc_value_as_num(b));
}

tsc_value_t tsc_value_sub(tsc_value_t a, tsc_value_t b) {
    return tsc_value_num(tsc_value_as_num(a) - tsc_value_as_num(b));
}

tsc_value_t tsc_value_mul(tsc_value_t a, tsc_value_t b) {
    return tsc_value_num(tsc_value_as_num(a) * tsc_value_as_num(b));
}

tsc_value_t tsc_value_div(tsc_value_t a, tsc_value_t b) {
    return tsc_value_num(tsc_value_as_num(a) / tsc_value_as_num(b));
}

tsc_value_t tsc_value_mod(tsc_value_t a, tsc_value_t b) {
    return tsc_value_num(tsc_num_mod(tsc_value_as_num(a), tsc_value_as_num(b)));
}

tsc_value_t tsc_value_pow(tsc_value_t a, tsc_value_t b) {
    return tsc_value_num(pow(tsc_value_as_num(a), tsc_value_as_num(b)));
}

tsc_value_t tsc_value_pos(tsc_value_t v) {
    return tsc_value_num(tsc_value_as_num(v));
}

tsc_value_t tsc_value_neg(tsc_value_t v) {
    return tsc_value_num(-tsc_value_as_num(v));
}

tsc_value_t tsc_value_bit_not(tsc_value_t v) {
    return tsc_value_num((double)(~tsc_to_int32(tsc_value_as_num(v))));
}

tsc_value_t tsc_value_bit_and(tsc_value_t a, tsc_value_t b) {
    return tsc_value_num((double)(tsc_to_int32(tsc_value_as_num(a)) & tsc_to_int32(tsc_value_as_num(b))));
}

tsc_value_t tsc_value_bit_or(tsc_value_t a, tsc_value_t b) {
    return tsc_value_num((double)(tsc_to_int32(tsc_value_as_num(a)) | tsc_to_int32(tsc_value_as_num(b))));
}

tsc_value_t tsc_value_bit_xor(tsc_value_t a, tsc_value_t b) {
    return tsc_value_num((double)(tsc_to_int32(tsc_value_as_num(a)) ^ tsc_to_int32(tsc_value_as_num(b))));
}

tsc_value_t tsc_value_shl(tsc_value_t a, tsc_value_t b) {
    uint32_t left = (uint32_t)tsc_to_int32(tsc_value_as_num(a));
    uint32_t shift = tsc_to_uint32(tsc_value_as_num(b)) & 31u;
    return tsc_value_num((double)tsc_int32_from_uint32(left << shift));
}

tsc_value_t tsc_value_shr(tsc_value_t a, tsc_value_t b) {
    int32_t left = tsc_to_int32(tsc_value_as_num(a));
    uint32_t shift = tsc_to_uint32(tsc_value_as_num(b)) & 31u;
    return tsc_value_num((double)tsc_shift_right_int32(left, shift));
}

tsc_value_t tsc_value_ushr(tsc_value_t a, tsc_value_t b) {
    uint32_t left = tsc_to_uint32(tsc_value_as_num(a));
    uint32_t shift = tsc_to_uint32(tsc_value_as_num(b)) & 31u;
    return tsc_value_num((double)(left >> shift));
}

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
        case TSC_VALUE_TAG_FUNCTION:
        case TSC_VALUE_TAG_ARRAY:
        case TSC_VALUE_TAG_OBJECT:
            return value_ptr(a) == value_ptr(b);
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
    if (
        value_is_box(a) && value_is_box(b) &&
        value_tag(a) == TSC_VALUE_TAG_STRING &&
        value_tag(b) == TSC_VALUE_TAG_STRING
    ) {
        int c = tsc_str_cmp((const tsc_str_t*)value_ptr(a), (const tsc_str_t*)value_ptr(b));
        return c < 0 ? -1 : c > 0 ? 1 : 0;
    }
    double an = tsc_value_as_num(a);
    double bn = tsc_value_as_num(b);
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
    tsc_str_t* key = value_known_symbol_internal_key(tsc_symbol_is_concat_spreadable());
    if (tsc_value_has_own_prop(value, key)) {
        return tsc_value_is_truthy(tsc_value_get_prop(value, key));
    }
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
            TSC_ARR(tsc_value_t, a, j) = prev;
            j--;
        }
        TSC_ARR(tsc_value_t, a, j) = key;
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
        TSC_ARR(tsc_value_t, copy, (size_t)at) = value;
        return tsc_value_array(copy);
    }
    if (value_tag(recv) == TSC_VALUE_TAG_OBJECT || value_tag(recv) == TSC_VALUE_TAG_STRING) {
        size_t len = (size_t)tsc_value_length(recv);
        int64_t at = value_array_strict_index(tsc_value_as_num(index), len);
        tsc_array_t* copy = value_array_like_slice(recv, 0.0, (double)len);
        TSC_ARR(tsc_value_t, copy, (size_t)at) = value;
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
            TSC_ARR(tsc_value_t, dst_arr, i) = tsc_structured_clone_internal(elem, seen);
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
    tsc_object_t* o = tsc_object_new_class(d);
    o->is_date = true;
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
    tsc_object_t* o = tsc_object_new_class(e);
    o->is_error = true;
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
    tsc_object_t* o = tsc_object_new_class(buffer);
    o->is_array_buffer = true;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_data_view(tsc_data_view_t* view) {
    if (!view) return tsc_value_null();
    tsc_object_t* o = tsc_object_new_class(view);
    o->is_data_view = true;
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
    return tsc_value_bool(tsc_reflect_define_property_descriptor(target, tsc_value_to_string(key), desc));
}

static tsc_value_t reflect_delete_property_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t key = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    return tsc_value_bool(tsc_reflect_delete_prop(target, tsc_value_to_string(key)));
}

static tsc_value_t reflect_get_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t key = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    tsc_value_t receiver = args->len > 2 ? TSC_ARR(tsc_value_t, args, 2) : target;
    return tsc_reflect_get_prop_receiver(target, tsc_value_to_string(key), receiver);
}

static tsc_value_t reflect_get_own_property_descriptor_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t key = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    return tsc_reflect_get_own_property_descriptor(target, tsc_value_to_string(key));
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
    return tsc_value_bool(tsc_reflect_has_prop(target, tsc_value_to_string(key)));
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
    return tsc_value_array(value_array_from_string_array(tsc_reflect_own_keys(target)));
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
    return tsc_value_bool(tsc_reflect_set_prop_receiver(target, tsc_value_to_string(key), value, receiver));
}

static tsc_value_t reflect_set_prototype_of_method(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t prototype = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    return tsc_value_bool(tsc_reflect_set_prototype_of(target, prototype));
}

static void reflect_define_method(tsc_object_t* reflect, const char* name, size_t len, double arity, tsc_generic_function_t fn) {
    tsc_object_define(
        reflect,
        tsc_str_from_lit(name, len),
        tsc_value_function_builtin_named(fn, NULL, arity, tsc_str_from_lit(name, len)),
        true,
        false,
        true
    );
}

tsc_value_t tsc_builtin_reflect(void) {
    static tsc_object_t* reflect = NULL;
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
        reflect = built;
        tsc_runtime_unlock();
    }
    return tsc_value_object(reflect);
}
