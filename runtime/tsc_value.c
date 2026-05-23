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
tsc_value_t tsc_value_class(void* ptr) {
    if (!ptr) return tsc_value_null();
    tsc_object_t* o = tsc_object_new();
    o->class_ptr = ptr;
    return tsc_value_object(o);
}

bool tsc_value_is_nullish(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    tsc_value_tag_t tag = value_tag(v);
    return tag == TSC_VALUE_TAG_UNDEFINED || tag == TSC_VALUE_TAG_NULL;
}

bool tsc_value_is_undefined(tsc_value_t v) {
    return value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_UNDEFINED;
}

tsc_str_t* tsc_value_object_to_string_tag(tsc_value_t v) {
    if (!value_is_box(v)) return tsc_str_from_lit("[object Number]", 15);
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

void* tsc_value_as_class(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_NULL) return NULL;
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        if (o->class_ptr) return o->class_ptr;
    }
    tsc_panic("value is not a class instance");
    return NULL;
}

tsc_value_t tsc_value_function_generic(tsc_generic_function_t fn, void* env) {
    tsc_function_identity_t* id = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
    id->kind = TSC_FUNCTION_IDENTITY_GENERIC;
    id->code.generic = fn;
    id->env = env;
    id->next = g_function_identities;
    g_function_identities = id;
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)id);
}

static bool value_is_callable_function(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    if (value_tag(v) == TSC_VALUE_TAG_FUNCTION) return true;
    if (value_tag(v) != TSC_VALUE_TAG_OBJECT) return false;
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    return o && o->is_proxy && value_is_callable_function(o->proxy_target);
}

static bool value_is_constructable_function(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    if (value_tag(v) == TSC_VALUE_TAG_FUNCTION) return true;
    if (value_tag(v) != TSC_VALUE_TAG_OBJECT) return false;
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    return o && o->is_proxy && value_is_constructable_function(o->proxy_target);
}

static tsc_array_t* value_to_argument_list(tsc_value_t args, const char* message) {
    if (value_is_box(args) && value_tag(args) == TSC_VALUE_TAG_ARRAY) {
        return (tsc_array_t*)value_ptr(args);
    }
    if (!value_is_box(args) || value_tag(args) != TSC_VALUE_TAG_OBJECT) {
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
    if (ident->kind == TSC_FUNCTION_IDENTITY_GENERIC) {
        return ident->code.generic(ident->env, this_arg, list);
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
            if (!value_is_constructable_function(new_target)) {
                tsc_throw_str(tsc_str_from_cstr("Reflect.construct newTarget is not a constructor"));
            }
            tsc_array_t* list = value_to_argument_list(args, "Reflect.construct argumentsList must be an array or array-like object");
            tsc_value_t receiver = tsc_value_object(tsc_object_new());
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
            if (!value_is_constructable_function(o->proxy_target)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy construct target must be constructor"));
            }
            if (!value_is_constructable_function(new_target)) {
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


tsc_value_t tsc_value_get_prop(tsc_value_t v, const tsc_str_t* key) {
    if (!value_is_box(v)) return tsc_value_undefined();
    if (value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* ident = (tsc_function_identity_t*)value_ptr(v);
        if (ident->kind == TSC_FUNCTION_IDENTITY_EVENT_RAW_LISTENER && str_lit_eq(key, "listener")) {
            return value_event_listener_identity(ident->code.event_raw_identity.identity);
        }
        return tsc_value_undefined();
    }
    if (value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_get((tsc_object_t*)value_ptr(v), key);
    }
    if (value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        if (tsc_str_is_length_key(key)) return tsc_value_num((double)a->len);
        size_t idx = 0;
        if (a->es == sizeof(tsc_value_t) && tsc_str_array_index(key, &idx) && idx < a->len) {
            return TSC_ARR(tsc_value_t, a, idx);
        }
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

tsc_value_t tsc_value_get_prop_receiver(tsc_value_t v, const tsc_str_t* key, tsc_value_t receiver) {
    if (!value_is_box(v)) return tsc_value_undefined();
    if (value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_get_receiver((tsc_object_t*)value_ptr(v), key, receiver);
    }
    if (value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return tsc_value_get_prop(v, key);
    }
    if (value_tag(v) == TSC_VALUE_TAG_STRING) {
        return tsc_value_get_prop(v, key);
    }
    return tsc_value_undefined();
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
        if (isnan(index) || isinf(index) || index < 0 || floor(index) != index) {
            return tsc_value_undefined();
        }
        char key_buf[32];
        snprintf(key_buf, sizeof key_buf, "%zu", (size_t)index);
        return tsc_object_get((tsc_object_t*)value_ptr(v), tsc_str_from_cstr(key_buf));
    }
    if (value_tag(v) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(v);
    if (a->es != sizeof(tsc_value_t)) return tsc_value_undefined();
    if (isnan(index) || isinf(index) || index < 0 || (size_t)index >= a->len) {
        return tsc_value_undefined();
    }
    return TSC_ARR(tsc_value_t, a, (size_t)index);
}

bool tsc_value_set_index(tsc_value_t v, double index, tsc_value_t value) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_ARRAY) return false;
    if (isnan(index) || isinf(index) || index < 0 || floor(index) != index) return false;
    tsc_array_t* a = (tsc_array_t*)value_ptr(v);
    if (a->es != sizeof(tsc_value_t)) return false;
    size_t idx = (size_t)index;
    if (a->frozen) return false;
    if (idx >= a->len && !a->extensible) return false;
    while (a->len < idx) {
        tsc_value_t undef = tsc_value_undefined();
        tsc_array_push_raw(a, &undef);
    }
    if (idx == a->len) {
        tsc_array_push_raw(a, &value);
    } else {
        TSC_ARR(tsc_value_t, a, idx) = value;
    }
    return true;
}

bool tsc_value_array_set_length(tsc_array_t* a, tsc_value_t value) {
    if (!a || a->es != sizeof(tsc_value_t)) return false;
    double raw = tsc_value_as_num(value);
    if (isnan(raw) || isinf(raw) || raw < 0.0 || floor(raw) != raw) return false;
    if (raw > (double)SIZE_MAX) return false;
    size_t len = (size_t)raw;
    if (a->frozen) return false;
    if (a->sealed && len != a->len) return false;
    if (len > a->len && !a->extensible) return false;
    while (a->len < len) {
        tsc_value_t undef = tsc_value_undefined();
        tsc_array_push_raw(a, &undef);
    }
    a->len = len;
    return true;
}

tsc_value_t tsc_value_define_property(tsc_value_t v, tsc_str_t* key, tsc_value_t value) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_define((tsc_object_t*)value_ptr(v), key, value, false, false, false);
    }
    return v;
}

static void require_reflect_object_target(tsc_value_t v, const char* message);

bool tsc_value_define_property_desc(tsc_value_t v, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_define_desc((tsc_object_t*)value_ptr(v), key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        if (tsc_str_is_length_key(key)) {
            bool current_writable = !a->frozen;
            bool next_writable = has_writable ? writable : current_writable;
            bool next_enumerable = has_enumerable ? enumerable : false;
            bool next_configurable = has_configurable ? configurable : false;
            if (!next_writable || next_enumerable || next_configurable) return false;
            return has_value ? tsc_value_array_set_length(a, value) : true;
        }
        size_t idx = 0;
        if (a->frozen) return false;
        if (tsc_str_array_index(key, &idx)) {
            bool exists = idx < a->len;
            bool current_writable = !a->frozen;
            bool current_enumerable = true;
            bool current_configurable = !a->sealed && !a->frozen;
            bool next_writable = has_writable ? writable : (exists ? current_writable : false);
            bool next_enumerable = has_enumerable ? enumerable : (exists ? current_enumerable : false);
            bool next_configurable = has_configurable ? configurable : (exists ? current_configurable : false);
            if (!next_writable || !next_enumerable || !next_configurable) return false;
            if (exists) {
                if (next_writable != current_writable || next_enumerable != current_enumerable || next_configurable != current_configurable) return false;
            } else if (!a->extensible) {
                return false;
            }
            return has_value ? tsc_value_set_index(v, (double)idx, value) : true;
        }
    }
    return false;
}

bool tsc_value_define_accessor_desc(tsc_value_t v, tsc_str_t* key, tsc_accessor_getter_t getter, void* getter_env, bool has_getter, tsc_accessor_setter_t setter, void* setter_env, bool has_setter, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_define_accessor((tsc_object_t*)value_ptr(v), key, getter, getter_env, has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable);
    }
    return false;
}

bool tsc_reflect_define_property_desc(tsc_value_t v, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    require_reflect_object_target(v, "Reflect.defineProperty target must be an object");
    return tsc_value_define_property_desc(v, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
}

bool tsc_reflect_define_accessor_desc(tsc_value_t v, tsc_str_t* key, tsc_accessor_getter_t getter, void* getter_env, bool has_getter, tsc_accessor_setter_t setter, void* setter_env, bool has_setter, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    require_reflect_object_target(v, "Reflect.defineProperty target must be an object");
    return tsc_value_define_accessor_desc(v, key, getter, getter_env, has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable);
}

tsc_value_t tsc_value_object_create(tsc_value_t prototype) {
    if (!value_is_valid_prototype(prototype)) {
        tsc_panic("Object.create prototype must be an object or null");
    }
    tsc_object_t* o = tsc_object_new();
    o->prototype = prototype;
    return tsc_value_object(o);
}

bool tsc_value_is_prototype_of(tsc_value_t prototype, tsc_value_t object) {
    if (
        value_is_box(prototype) &&
        value_tag(prototype) == TSC_VALUE_TAG_OBJECT &&
        value_is_box(object) &&
        value_tag(object) == TSC_VALUE_TAG_OBJECT
    ) {
        return tsc_object_is_prototype_of(
            (tsc_object_t*)value_ptr(prototype),
            (tsc_object_t*)value_ptr(object)
        );
    }
    return false;
}

tsc_value_t tsc_value_get_prototype_of(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_get_prototype_of((tsc_object_t*)value_ptr(v));
    }
    return tsc_value_undefined();
}

bool tsc_value_set_prototype_of(tsc_value_t v, tsc_value_t prototype) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_set_prototype_of((tsc_object_t*)value_ptr(v), prototype);
    }
    return false;
}

bool tsc_value_object_set_prototype_of(tsc_value_t v, tsc_value_t prototype) {
    if (tsc_value_is_nullish(v)) {
        tsc_throw_str(tsc_str_from_cstr("Object.setPrototypeOf target must not be null or undefined"));
    }
    if (!value_is_valid_prototype(prototype)) {
        tsc_throw_str(tsc_str_from_cstr("Object.setPrototypeOf prototype must be an object or null"));
    }
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) {
        return true;
    }
    if (!tsc_object_set_prototype_of((tsc_object_t*)value_ptr(v), prototype)) {
        tsc_throw_str(tsc_str_from_cstr("Object.setPrototypeOf failed"));
    }
    return true;
}

static bool value_is_reflect_object_target(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    tsc_value_tag_t tag = value_tag(v);
    return tag == TSC_VALUE_TAG_OBJECT || tag == TSC_VALUE_TAG_ARRAY || tag == TSC_VALUE_TAG_STRING || tag == TSC_VALUE_TAG_FUNCTION;
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

tsc_value_t tsc_reflect_get_prop_receiver(tsc_value_t v, const tsc_str_t* key, tsc_value_t receiver) {
    require_reflect_object_target(v, "Reflect.get target must be an object");
    return tsc_value_get_prop_receiver(v, key, receiver);
}

bool tsc_value_set_prop(tsc_value_t v, tsc_str_t* key, tsc_value_t value) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_set((tsc_object_t*)value_ptr(v), key, value);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        if (tsc_str_is_length_key(key)) return tsc_value_array_set_length(a, value);
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx)) return tsc_value_set_index(v, (double)idx, value);
    }
    return false;
}

bool tsc_value_set_prop_receiver(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_set_receiver((tsc_object_t*)value_ptr(v), key, value, receiver);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return tsc_value_set_prop(receiver, key, value);
    }
    return false;
}

bool tsc_reflect_set_prop(tsc_value_t v, tsc_str_t* key, tsc_value_t value) {
    require_reflect_object_target(v, "Reflect.set target must be an object");
    return tsc_value_set_prop(v, key, value);
}

bool tsc_reflect_set_prop_receiver(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver) {
    require_reflect_object_target(v, "Reflect.set target must be an object");
    return tsc_value_set_prop_receiver(v, key, value, receiver);
}

bool tsc_value_has_own_prop(tsc_value_t v, const tsc_str_t* key) {
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
    return false;
}

bool tsc_value_has_prop(tsc_value_t v, const tsc_str_t* key) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_has((tsc_object_t*)value_ptr(v), key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return tsc_array_has_own_key((const tsc_array_t*)value_ptr(v), key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return tsc_value_has_own_prop(v, key);
    }
    return false;
}

bool tsc_reflect_has_prop(tsc_value_t v, const tsc_str_t* key) {
    require_reflect_object_target(v, "Reflect.has target must be an object");
    return tsc_value_has_prop(v, key);
}

bool tsc_value_delete_prop(tsc_value_t v, tsc_str_t* key) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_delete((tsc_object_t*)value_ptr(v), key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        if (tsc_str_is_length_key(key)) return false;
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        size_t idx = 0;
        if (a->es == sizeof(tsc_value_t) && tsc_str_array_index(key, &idx) && idx < a->len) {
            if (a->sealed || a->frozen) return false;
            TSC_ARR(tsc_value_t, a, idx) = tsc_value_undefined();
        }
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return !tsc_value_has_own_prop(v, key);
    }
    return true;
}

bool tsc_reflect_delete_prop(tsc_value_t v, tsc_str_t* key) {
    require_reflect_object_target(v, "Reflect.deleteProperty target must be an object");
    return tsc_value_delete_prop(v, key);
}

bool tsc_value_is_extensible(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_is_extensible((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return ((tsc_array_t*)value_ptr(v))->extensible;
    }
    return false;
}

bool tsc_value_prevent_extensions(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_prevent_extensions((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        ((tsc_array_t*)value_ptr(v))->extensible = false;
        return true;
    }
    return false;
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
        return true;
    }
    return false;
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
        return true;
    }
    return false;
}

bool tsc_value_is_sealed(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_is_sealed((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return ((tsc_array_t*)value_ptr(v))->sealed;
    }
    return false;
}

bool tsc_value_is_frozen(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_is_frozen((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return ((tsc_array_t*)value_ptr(v))->frozen;
    }
    return false;
}

tsc_array_t* value_array_keys(const tsc_array_t* src, bool include_length) {
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

tsc_array_t* value_array_values(const tsc_array_t* src) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), src ? src->len : 1);
    if (!src || src->es != sizeof(tsc_value_t)) return out;
    for (size_t i = 0; i < src->len; i++) {
        tsc_value_t value = TSC_ARR(tsc_value_t, src, i);
        tsc_array_push_raw(out, &value);
    }
    return out;
}

tsc_array_t* value_array_entries(const tsc_array_t* src) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), src ? src->len : 1);
    if (!src || src->es != sizeof(tsc_value_t)) return out;
    for (size_t i = 0; i < src->len; i++) {
        tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_value_t key = tsc_value_string(tsc_str_from_int((int64_t)i));
        tsc_value_t value = TSC_ARR(tsc_value_t, src, i);
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
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(src ? !src->frozen : true));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(false));
    return tsc_value_object(desc);
}

tsc_value_t value_descriptor_from_array_key(const tsc_array_t* src, const tsc_str_t* key) {
    if (!src) return tsc_value_undefined();
    if (tsc_str_is_length_key(key)) return value_descriptor_from_array_length(src);
    size_t idx = 0;
    if (src->es == sizeof(tsc_value_t) && tsc_str_array_index(key, &idx) && idx < src->len) {
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

tsc_value_t value_descriptors_from_array(const tsc_array_t* src) {
    tsc_object_t* out = tsc_object_new();
    if (!src) return tsc_value_object(out);
    if (src->es == sizeof(tsc_value_t)) {
        for (size_t i = 0; i < src->len; i++) {
            tsc_object_set(out, tsc_str_from_int((int64_t)i), value_descriptor_from_array_index(src, i));
        }
    }
    tsc_object_set(out, tsc_str_from_lit("length", 6), value_descriptor_from_array_length(src));
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

tsc_array_t* tsc_value_own_keys(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_own_keys_dyn((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_array_keys((const tsc_array_t*)value_ptr(v), true);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_string_keys((const tsc_str_t*)value_ptr(v), true);
    }
    return tsc_array_new(sizeof(tsc_str_t*), 1);
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
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_descriptor_from_array_key((const tsc_array_t*)value_ptr(v), key);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_descriptor_from_string_key((const tsc_str_t*)value_ptr(v), key);
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

tsc_value_t tsc_reflect_get_own_property_descriptor(tsc_value_t v, tsc_str_t* key) {
    require_reflect_object_target(v, "Reflect.getOwnPropertyDescriptor target must be an object");
    return tsc_value_get_own_property_descriptor(v, key);
}


tsc_value_t tsc_value_get_own_property_descriptors(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_descriptors_from_array((const tsc_array_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_descriptors_from_string((const tsc_str_t*)value_ptr(v));
    }
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) return tsc_value_undefined();
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    tsc_object_t* out = tsc_object_new();
    for (size_t i = 0; i < o->len; i++) {
        tsc_value_t desc = value_descriptor_from_prop(&o->props[i]);
        tsc_object_set(out, o->props[i].key, desc);
    }
    return tsc_value_object(out);
}

tsc_value_t tsc_value_object_assign(tsc_value_t target, tsc_value_t source) {
    if (!value_is_box(target)) return target;
    bool target_is_object = value_tag(target) == TSC_VALUE_TAG_OBJECT;
    bool target_is_array = value_tag(target) == TSC_VALUE_TAG_ARRAY;
    if (!target_is_object && !target_is_array) return target;
    tsc_object_t* dst = target_is_object ? (tsc_object_t*)value_ptr(target) : NULL;
    if (!value_is_box(source)) return target;
    if (value_tag(source) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* src = (tsc_object_t*)value_ptr(source);
        for (size_t i = 0; i < src->len; i++) {
            if (!src->props[i].enumerable) continue;
            tsc_value_t value = tsc_object_get(src, src->props[i].key);
            if (dst) {
                tsc_object_set(dst, src->props[i].key, value);
            } else {
                tsc_value_set_prop(target, src->props[i].key, value);
            }
        }
        return target;
    }
    if (value_tag(source) == TSC_VALUE_TAG_ARRAY || value_tag(source) == TSC_VALUE_TAG_STRING) {
        tsc_array_t* keys = tsc_value_object_keys(source);
        for (size_t i = 0; i < keys->len; i++) {
            tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
            tsc_value_t value = tsc_value_get_prop(source, key);
            if (dst) {
                tsc_object_set(dst, key, value);
            } else {
                tsc_value_set_prop(target, key, value);
            }
        }
    }
    return target;
}

double tsc_value_length(tsc_value_t v) {
    if (!value_is_box(v)) return 0.0;
    if (value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return (double)((tsc_array_t*)value_ptr(v))->len;
    }
    if (value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(v);
        if (o && o->is_proxy) {
            if (o->proxy_revoked) {
                tsc_throw_str(tsc_str_from_cstr("Cannot perform 'get' on a proxy that has been revoked"));
            }
            return tsc_value_length(o->proxy_target);
        }
    }
    if (value_tag(v) == TSC_VALUE_TAG_STRING) {
        return (double)((tsc_str_t*)value_ptr(v))->len;
    }
    return 0.0;
}

tsc_array_t* tsc_value_iter_values(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_array_values((const tsc_array_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_string_values((const tsc_str_t*)value_ptr(v));
    }
    tsc_panic("for-of value is not iterable");
    return tsc_array_new(sizeof(tsc_value_t), 1);
}

tsc_array_t* tsc_value_object_keys(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_keys_dyn((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_array_keys((const tsc_array_t*)value_ptr(v), false);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_string_keys((const tsc_str_t*)value_ptr(v), false);
    }
    return tsc_array_new(sizeof(tsc_str_t*), 1);
}

tsc_array_t* tsc_value_object_values(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_values_dyn((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_array_values((const tsc_array_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_string_values((const tsc_str_t*)value_ptr(v));
    }
    return tsc_array_new(sizeof(tsc_value_t), 1);
}

tsc_array_t* tsc_value_object_entries(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_entries_dyn((tsc_object_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return value_array_entries((const tsc_array_t*)value_ptr(v));
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return value_string_entries((const tsc_str_t*)value_ptr(v));
    }
    return tsc_array_new(sizeof(tsc_value_t), 1);
}

tsc_value_t tsc_value_object_from_entries(tsc_value_t entries) {
    tsc_object_t* out = tsc_object_new();
    if (!value_is_box(entries) || value_tag(entries) != TSC_VALUE_TAG_ARRAY) {
        return tsc_value_object(out);
    }
    tsc_array_t* outer = (tsc_array_t*)value_ptr(entries);
    for (size_t i = 0; i < outer->len; i++) {
        tsc_value_t pair_value = TSC_ARR(tsc_value_t, outer, i);
        if (!value_is_box(pair_value) || value_tag(pair_value) != TSC_VALUE_TAG_ARRAY) continue;
        tsc_array_t* pair = (tsc_array_t*)value_ptr(pair_value);
        if (pair->len < 2) continue;
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
    if (tsc_value_is_nullish(v)) return fallback;
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
            if (tsc_value_same_value_zero(TSC_ARR(tsc_value_t, a, i), needle)) return tsc_value_bool(true);
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
            if (tsc_value_eq(TSC_ARR(tsc_value_t, a, i), needle)) return tsc_value_num((double)i);
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
            if (tsc_value_eq(TSC_ARR(tsc_value_t, a, i), needle)) return tsc_value_num((double)i);
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
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    double n = tsc_value_as_num(index);
    if (isnan(n)) n = 0.0;
    if (n < 0) n = (double)a->len + n;
    if (isinf(n) || n < 0 || n >= (double)a->len) return tsc_value_undefined();
    return TSC_ARR(tsc_value_t, a, (size_t)n);
}

tsc_value_t tsc_value_method_locale_compare(tsc_value_t recv, tsc_value_t other) {
    return tsc_value_num(tsc_str_locale_compare(tsc_value_to_string(recv), tsc_value_to_string(other)));
}

tsc_value_t tsc_value_method_join(tsc_value_t recv, tsc_value_t separator) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_string(tsc_str_from_lit("", 0));
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    tsc_str_t* sep = tsc_value_is_nullish(separator) ? tsc_str_from_lit(",", 1) : tsc_value_to_string(separator);
    tsc_str_t* out = tsc_str_from_lit("", 0);
    for (size_t i = 0; i < a->len; i++) {
        if (i > 0) out = tsc_str_concat(out, sep);
        out = tsc_str_concat(out, value_join_part(TSC_ARR(tsc_value_t, a, i)));
    }
    return tsc_value_string(out);
}

tsc_value_t tsc_value_method_pop(tsc_value_t recv) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    if (a->sealed || a->frozen) return tsc_value_undefined();
    if (a->len == 0) return tsc_value_undefined();
    tsc_value_t v = TSC_ARR(tsc_value_t, a, a->len - 1);
    tsc_array_pop_raw(a);
    return v;
}

tsc_value_t tsc_value_method_push(tsc_value_t recv, tsc_value_t value) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_num(0.0);
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    if (a->sealed || a->frozen || !a->extensible) return tsc_value_num((double)a->len);
    tsc_array_push_raw(a, &value);
    return tsc_value_num((double)a->len);
}

tsc_value_t tsc_value_method_shift(tsc_value_t recv) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    if (a->sealed || a->frozen) return tsc_value_undefined();
    if (a->len == 0) return tsc_value_undefined();
    tsc_value_t v = TSC_ARR(tsc_value_t, a, 0);
    tsc_array_shift_raw(a);
    return v;
}

tsc_value_t tsc_value_method_unshift(tsc_value_t recv, tsc_value_t value) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_num(0.0);
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    if (a->sealed || a->frozen || !a->extensible) return tsc_value_num((double)a->len);
    tsc_array_unshift_raw(a, &value);
    return tsc_value_num((double)a->len);
}

tsc_value_t tsc_value_method_concat(tsc_value_t recv, tsc_value_t value) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_concat(
            (const tsc_str_t*)value_ptr(recv),
            tsc_value_to_string(value)
        ));
    }
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), a->len + 1);
    tsc_array_append(out, a);
    if (value_is_box(value) && value_tag(value) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_append(out, (tsc_array_t*)value_ptr(value));
    } else {
        tsc_array_push_raw(out, &value);
    }
    return tsc_value_array(out);
}

void value_flat_push(tsc_array_t* out, tsc_value_t value, int depth) {
    if (depth > 0 && value_is_box(value) && value_tag(value) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* inner = (tsc_array_t*)value_ptr(value);
        for (size_t i = 0; i < inner->len; i++) {
            value_flat_push(out, TSC_ARR(tsc_value_t, inner, i), depth - 1);
        }
        return;
    }
    tsc_array_push_raw(out, &value);
}

tsc_value_t tsc_value_method_flat(tsc_value_t recv, tsc_value_t depth) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    double depth_num = tsc_value_is_nullish(depth) ? 1.0 : tsc_value_as_num(depth);
    int depth_i = isnan(depth_num) || depth_num < 0 ? 0 : (int)depth_num;
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), a->len ? a->len : 1);
    for (size_t i = 0; i < a->len; i++) {
        value_flat_push(out, TSC_ARR(tsc_value_t, a, i), depth_i);
    }
    return tsc_value_array(out);
}

tsc_value_t tsc_value_method_splice(tsc_value_t recv, tsc_value_t start, tsc_value_t delete_count, tsc_array_t* items) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    if (a->sealed || a->frozen) return tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 1));
    int64_t len = (int64_t)a->len;
    double start_num = value_slice_arg(start, 0.0);
    int64_t at = isnan(start_num) ? 0 : (int64_t)start_num;
    if (at < 0) at = len + at;
    if (at < 0) at = 0;
    if (at > len) at = len;

    double del_num = tsc_value_is_nullish(delete_count)
        ? (double)(len - at)
        : tsc_value_as_num(delete_count);
    int64_t del = isnan(del_num) || del_num < 0 ? 0 : (int64_t)del_num;
    if (del > len - at) del = len - at;

    size_t insert_len = items ? items->len : 0;
    tsc_array_t* removed = tsc_array_new(sizeof(tsc_value_t), del > 0 ? (size_t)del : 1);
    for (int64_t i = 0; i < del; i++) {
        tsc_value_t v = TSC_ARR(tsc_value_t, a, (size_t)(at + i));
        tsc_array_push_raw(removed, &v);
    }

    size_t tail_start = (size_t)(at + del);
    size_t tail_len = a->len - tail_start;
    size_t new_len = a->len - (size_t)del + insert_len;
    if (new_len > a->len && !a->extensible) return tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 1));
    tsc_array_reserve(a, new_len > 0 ? new_len : 1);
    if (insert_len != (size_t)del && tail_len > 0) {
        memmove(
            (char*)a->data + ((size_t)at + insert_len) * a->es,
            (char*)a->data + tail_start * a->es,
            tail_len * a->es
        );
    }
    for (size_t i = 0; i < insert_len; i++) {
        TSC_ARR(tsc_value_t, a, (size_t)at + i) = TSC_ARR(tsc_value_t, items, i);
    }
    a->len = new_len;
    return tsc_value_array(removed);
}

tsc_value_t tsc_value_method_sort(tsc_value_t recv) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return recv;
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    if (a->frozen) return recv;
    for (size_t i = 1; i < a->len; i++) {
        tsc_value_t key = TSC_ARR(tsc_value_t, a, i);
        size_t j = i;
        while (j > 0) {
            tsc_value_t prev = TSC_ARR(tsc_value_t, a, j - 1);
            if (tsc_str_cmp(tsc_value_to_string(prev), tsc_value_to_string(key)) <= 0) break;
            TSC_ARR(tsc_value_t, a, j) = prev;
            j--;
        }
        TSC_ARR(tsc_value_t, a, j) = key;
    }
    return recv;
}

tsc_value_t tsc_value_method_to_sorted(tsc_value_t recv) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return recv;
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    tsc_value_t copy = tsc_value_array(tsc_array_slice(a, 0.0, (double)a->len));
    return tsc_value_method_sort(copy);
}

tsc_value_t tsc_value_method_with(tsc_value_t recv, tsc_value_t index, tsc_value_t value) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    return tsc_value_array(tsc_array_with(a, tsc_value_as_num(index), &value));
}

tsc_value_t tsc_value_method_to_spliced(tsc_value_t recv, tsc_value_t start, tsc_value_t delete_count, int argc, tsc_array_t* items) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    return tsc_value_array(tsc_array_to_spliced(a, tsc_value_as_num(start), tsc_value_as_num(delete_count), argc, items));
}

void tsc_value_array_push_flat(tsc_array_t* out, tsc_value_t value) {
    if (value_is_box(value) && value_tag(value) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_append(out, (tsc_array_t*)value_ptr(value));
        return;
    }
    tsc_array_push_raw(out, &value);
}

tsc_value_t tsc_value_method_fill(tsc_value_t recv, tsc_value_t value, tsc_value_t start, tsc_value_t end) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return recv;
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    if (a->frozen) return recv;
    double len = (double)a->len;
    double s = value_slice_arg(start, 0.0);
    double e = value_slice_arg(end, len);
    tsc_array_fill(a, &value, s, e);
    return recv;
}

tsc_value_t tsc_value_method_copy_within(tsc_value_t recv, tsc_value_t target, tsc_value_t start, tsc_value_t end) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return recv;
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    if (a->frozen) return recv;
    double len = (double)a->len;
    double t = value_slice_arg(target, 0.0);
    double s = value_slice_arg(start, 0.0);
    double e = value_slice_arg(end, len);
    tsc_array_copy_within(a, t, s, e);
    return recv;
}

tsc_value_t tsc_value_method_reverse(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        if (!a->frozen) tsc_array_reverse(a);
    }
    return recv;
}

tsc_value_t tsc_value_method_to_reversed(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        return tsc_value_array(tsc_array_to_reversed((const tsc_array_t*)value_ptr(recv)));
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
        return tsc_value_array(tsc_array_slice((const tsc_array_t*)value_ptr(recv), s, e));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_keys(tsc_value_t recv) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    const tsc_array_t* a = (const tsc_array_t*)value_ptr(recv);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), a->len);
    for (size_t i = 0; i < a->len; i++) {
        tsc_value_t v = tsc_value_num((double)i);
        tsc_array_push_raw(out, &v);
    }
    return tsc_value_array(out);
}

tsc_value_t tsc_value_method_values(tsc_value_t recv) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    const tsc_array_t* a = (const tsc_array_t*)value_ptr(recv);
    return tsc_value_array(tsc_array_slice(a, 0.0, (double)a->len));
}

tsc_value_t tsc_value_method_entries(tsc_value_t recv) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    const tsc_array_t* a = (const tsc_array_t*)value_ptr(recv);
    return tsc_value_array(value_array_entries(a));
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
        if (tsc_value_is_nullish(radix)) return tsc_str_from_num(value_as_num(recv));
        return tsc_str_from_num_radix(value_as_num(recv), tsc_value_as_num(radix));
    }
    return tsc_value_to_string(recv);
}

tsc_str_t* tsc_value_method_to_fixed(tsc_value_t recv, tsc_value_t fraction_digits) {
    if (value_is_box(recv)) tsc_panic("Number.toFixed: receiver must be a number");
    double digits = tsc_value_is_nullish(fraction_digits) ? 0.0 : tsc_value_as_num(fraction_digits);
    return tsc_str_from_num_fixed(value_as_num(recv), digits);
}

tsc_str_t* tsc_value_method_to_exponential(tsc_value_t recv, tsc_value_t fraction_digits) {
    if (value_is_box(recv)) tsc_panic("Number.toExponential: receiver must be a number");
    bool omitted = value_is_box(fraction_digits) && value_tag(fraction_digits) == TSC_VALUE_TAG_UNDEFINED;
    double digits = omitted ? 0.0 : tsc_value_as_num(fraction_digits);
    return tsc_str_from_num_exponential(value_as_num(recv), digits, !omitted);
}

tsc_str_t* tsc_value_method_to_precision(tsc_value_t recv, tsc_value_t precision) {
    if (value_is_box(recv)) tsc_panic("Number.toPrecision: receiver must be a number");
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
        tsc_str_t* f = tsc_value_is_nullish(form) ? tsc_str_from_lit("NFC", 3) : tsc_value_to_string(form);
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
        tsc_str_t* fill = tsc_value_is_nullish(pad) ? tsc_str_from_lit(" ", 1) : tsc_value_to_string(pad);
        return tsc_value_string(tsc_str_pad_start((const tsc_str_t*)value_ptr(recv), tsc_value_as_num(target), fill));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_pad_end(tsc_value_t recv, tsc_value_t target, tsc_value_t pad) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        tsc_str_t* fill = tsc_value_is_nullish(pad) ? tsc_str_from_lit(" ", 1) : tsc_value_to_string(pad);
        return tsc_value_string(tsc_str_pad_end((const tsc_str_t*)value_ptr(recv), tsc_value_as_num(target), fill));
    }
    return tsc_value_undefined();
}
