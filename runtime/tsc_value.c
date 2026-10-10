#include "tsc_internal.h"

double g_event_emitter_default_max_listeners = 10.0;
tsc_value_t tsc_value_undefined(void) { return value_box(TSC_VALUE_TAG_UNDEFINED, 0); }
tsc_value_t tsc_value_null(void) { return value_box(TSC_VALUE_TAG_NULL, 0); }
tsc_value_t tsc_value_bool(bool b) { return value_box(b ? TSC_VALUE_TAG_TRUE : TSC_VALUE_TAG_FALSE, 0); }

tsc_value_t tsc_value_store_rooted(tsc_value_t* slot, void* volatile* root, tsc_value_t value) {
    *root = tsc_value_gc_root(value);
    *slot = value;
    return value;
}

tsc_value_t tsc_value_native_field_store(tsc_value_t* slot, ptrdiff_t root_offset, tsc_value_t value) {
    void* volatile* root = (void* volatile*)((char*)slot + root_offset);
    return tsc_value_store_rooted(slot, root, value);
}

tsc_value_t* tsc_value_native_field_slot(void* owner, size_t field_offset) {
    if (!owner) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot access a field of null or undefined"));
    return (tsc_value_t*)((char*)owner + field_offset);
}

tsc_value_t tsc_value_num(double n) {
    tsc_value_t v;
    memcpy(&v, &n, sizeof v);
    // Every IEEE NaN denotes the same ECMAScript Number value. Normalize at
    // ingress so a native payload cannot enter the reserved object-tag space.
    if ((v & UINT64_C(0x7ff0000000000000)) == UINT64_C(0x7ff0000000000000) &&
        (v & UINT64_C(0x000fffffffffffff)) != 0) {
        v = UINT64_C(0x7ff8000000000000);
    }
    return v;
}

tsc_value_t tsc_value_string(tsc_str_t* s) { return value_box(TSC_VALUE_TAG_STRING, (uintptr_t)s); }
tsc_value_t tsc_value_bigint(tsc_bigint_t* value) { return value_box(TSC_VALUE_TAG_BIGINT, (uintptr_t)value); }
tsc_value_t tsc_value_symbol(tsc_symbol_t* value) { return value_box(TSC_VALUE_TAG_SYMBOL, (uintptr_t)value); }

tsc_str_t* tsc_value_diagnostic_string(tsc_value_t value) {
    if (!value_is_box(value)) return tsc_str_from_num(value_as_num(value));
    switch (value_tag(value)) {
        case TSC_VALUE_TAG_UNDEFINED: return tsc_str_from_lit("undefined", 9);
        case TSC_VALUE_TAG_NULL: return tsc_str_from_lit("null", 4);
        case TSC_VALUE_TAG_FALSE: return tsc_str_from_lit("false", 5);
        case TSC_VALUE_TAG_TRUE: return tsc_str_from_lit("true", 4);
        case TSC_VALUE_TAG_STRING: return (tsc_str_t*)value_ptr(value);
        case TSC_VALUE_TAG_BIGINT: return tsc_bigint_to_string((tsc_bigint_t*)value_ptr(value), 10.0);
        case TSC_VALUE_TAG_SYMBOL: return tsc_symbol_to_string((tsc_symbol_t*)value_ptr(value));
        case TSC_VALUE_TAG_FUNCTION: return tsc_str_from_lit("[function]", 10);
        case TSC_VALUE_TAG_ARRAY: return tsc_str_from_lit("[object Array]", 14);
        case TSC_VALUE_TAG_OBJECT: {
            tsc_object_t* object = (tsc_object_t*)value_ptr(value);
            if (object && !object->is_proxy && object->is_error) {
                return tsc_error_to_string((tsc_error_t*)object->class_ptr);
            }
            return tsc_str_from_lit("[object Object]", 15);
        }
    }
    return tsc_str_from_lit("(unknown error)", 15);
}

tsc_object_t* tsc_object_new_class(void* ptr) {
    void* volatile class_gc_root = ptr;
    tsc_object_t* o = tsc_object_new();
    o->class_ptr = class_gc_root;
    return o;
}

tsc_object_t* tsc_native_object_owner_get(tsc_native_object_owner_t* owner, void* ptr, tsc_native_object_initializer_t initialize) {
    if (!owner->object) {
        /* Publish identity before installing members so reentrant boxing
         * borrows the same object. Allocation supplies the actual native type. */
        if (!owner->initialize) owner->initialize = initialize;
        owner->object = tsc_object_new_class(ptr);
        owner->initialize(owner->object);
    }
    return owner->object;
}

void tsc_native_object_owner_attach(tsc_native_object_owner_t* owner, void* ptr, tsc_value_t receiver) {
    if (!value_is_box(receiver) || value_tag(receiver) != TSC_VALUE_TAG_OBJECT)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("native constructor requires an ordinary receiver"));
    owner->object = (tsc_object_t*)value_ptr(receiver);
    owner->object->class_ptr = ptr;
}

tsc_value_t tsc_object_entry_store(tsc_object_entry_t* entry, double index, tsc_value_t value) {
    if (!entry->pair) {
        entry->pair = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_array_push_value(entry->pair, tsc_value_undefined());
        tsc_array_push_value(entry->pair, tsc_value_undefined());
    }
    (void)tsc_value_set_index(tsc_value_array(entry->pair), index, value);
    return value;
}

tsc_value_t tsc_value_class(void* ptr) {
    if (!ptr) return tsc_value_null();
    return tsc_value_object(tsc_object_new_class(ptr));
}

static void* native_event_brand(tsc_value_t value, unsigned kind) {
    if (value_is_box(value) && value_tag(value) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = value_ptr(value);
        if ((kind == 0 && object->is_event_emitter) || (kind == 1 && object->is_event_target) || (kind == 2 && object->is_event))
            return object->class_ptr;
    }
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("incompatible native event receiver"));
}

tsc_event_emitter_t* tsc_value_as_event_emitter(tsc_value_t value) { return native_event_brand(value, 0); }
tsc_event_target_t* tsc_value_as_event_target(tsc_value_t value) { return native_event_brand(value, 1); }
tsc_event_t* tsc_value_as_event(tsc_value_t value) { return native_event_brand(value, 2); }

typedef struct {
    tsc_value_t callback;
    void* callback_gc_root;
} native_event_callback_t;

static tsc_value_t native_event_argument(tsc_array_t* args, size_t index) {
    return args && index < args->len ? TSC_ARR(tsc_value_t, args, index) : tsc_value_undefined();
}

static native_event_callback_t* native_event_callback_new(tsc_value_t callback) {
    if (!tsc_value_is_callable(callback)) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("event listener is not callable"));
    native_event_callback_t* state = TSC_GC_MALLOC(sizeof(*state));
    state->callback = callback;
    state->callback_gc_root = tsc_value_gc_root(callback);
    return state;
}

static void native_emitter_listener(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args) {
    native_event_callback_t* state = env;
    (void)tsc_value_apply_function(state->callback, tsc_value_event_emitter(emitter), tsc_value_array(args));
}

static void native_target_listener(void* env, tsc_event_target_t* target, tsc_event_t* event) {
    native_event_callback_t* state = env;
    tsc_value_t value = tsc_value_event(event);
    void* volatile value_gc_root = tsc_value_gc_root(value);
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_array_push_value(args, value);
    (void)value_gc_root;
    (void)tsc_value_apply_function(state->callback, tsc_value_event_target(target), tsc_value_array(args));
}

static tsc_value_t native_emitter_on(void* env, tsc_value_t receiver, tsc_array_t* args) {
    tsc_str_t* name = tsc_value_to_string(native_event_argument(args, 0));
    native_event_callback_t* state = native_event_callback_new(native_event_argument(args, 1));
    uintptr_t flags = (uintptr_t)env;
    tsc_event_emitter_on(tsc_value_as_event_emitter(receiver), name, native_emitter_listener, state, state->callback_gc_root,
        (flags & 1) != 0, (flags & 2) != 0);
    return receiver;
}

static tsc_value_t native_emitter_off(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    tsc_str_t* name = tsc_value_to_string(native_event_argument(args, 0));
    tsc_value_t callback = native_event_argument(args, 1);
    if (!tsc_value_is_callable(callback)) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("event listener is not callable"));
    tsc_event_emitter_off(tsc_value_as_event_emitter(receiver), name, native_emitter_listener, tsc_value_gc_root(callback));
    return receiver;
}

static tsc_value_t native_emitter_emit(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;
    tsc_str_t* name = tsc_value_to_string(native_event_argument(args, 0));
    tsc_array_t* actuals = tsc_array_slice(args, 1.0, args ? (double)args->len : 0.0);
    return tsc_value_bool(tsc_event_emitter_emit(tsc_value_as_event_emitter(receiver), name, actuals));
}

static tsc_value_t native_emitter_operation(void* env, tsc_value_t receiver, tsc_array_t* args) {
    tsc_event_emitter_t* emitter = tsc_value_as_event_emitter(receiver);
    uintptr_t operation = (uintptr_t)env;
    tsc_str_t* name = operation < 4 && args && args->len ? tsc_value_to_string(native_event_argument(args, 0)) : NULL;
    switch (operation) {
        case 0: tsc_event_emitter_remove_all(emitter, name); return receiver;
        case 1: {
            tsc_value_t listener = native_event_argument(args, 1);
            return tsc_value_num(tsc_value_is_undefined(listener) ? tsc_event_emitter_listener_count(emitter, name)
                : tsc_event_emitter_listener_count_identity(emitter, name, tsc_value_gc_root(listener)));
        }
        case 2: return tsc_value_array(tsc_event_emitter_listeners(emitter, name));
        case 3: return tsc_value_array(tsc_event_emitter_raw_listeners(emitter, name));
        case 4: {
            tsc_array_t* names = tsc_event_emitter_event_names(emitter);
            tsc_array_t* values = tsc_array_new(sizeof(tsc_value_t), names->len);
            for (size_t index = 0; index < names->len; index++)
                tsc_array_push_value(values, tsc_value_string(TSC_ARR(tsc_str_t*, names, index)));
            return tsc_value_array(values);
        }
        case 5: tsc_event_emitter_set_max_listeners(emitter, tsc_value_to_number(native_event_argument(args, 0))); return receiver;
        case 6: return tsc_value_num(tsc_event_emitter_get_max_listeners(emitter));
        case 7: tsc_event_emitter_pause(emitter); return receiver;
        case 8: tsc_event_emitter_resume(emitter); return receiver;
        case 9: return tsc_value_bool(tsc_event_emitter_is_paused(emitter));
    }
    return tsc_value_undefined();
}

static tsc_value_t native_target_operation(void* env, tsc_value_t receiver, tsc_array_t* args) {
    tsc_event_target_t* target = tsc_value_as_event_target(receiver);
    uintptr_t operation = (uintptr_t)env;
    if (operation == 2) return tsc_value_bool(tsc_event_target_dispatch(target, tsc_value_as_event(native_event_argument(args, 0))));
    tsc_str_t* name = tsc_value_to_string(native_event_argument(args, 0));
    tsc_value_t callback = native_event_argument(args, 1);
    if (tsc_value_is_nullish(callback)) return tsc_value_undefined();
    if (operation == 1) {
        tsc_event_target_remove(target, name, native_target_listener, tsc_value_gc_root(callback));
    } else {
        native_event_callback_t* state = native_event_callback_new(callback);
        tsc_value_t options = native_event_argument(args, 2);
        bool once = tsc_value_is_object(options) && tsc_value_is_truthy(tsc_value_get_prop(options, tsc_str_from_lit("once", 4)));
        tsc_event_target_add(target, name, native_target_listener, state, state->callback_gc_root, once);
    }
    return tsc_value_undefined();
}

typedef struct {
    const char* name;
    tsc_generic_function_t call;
    uintptr_t operation;
    double length;
} native_event_method_t;

static void native_event_methods(tsc_object_t* object, const native_event_method_t* methods, size_t length) {
    for (size_t index = 0; index < length; index++) {
        tsc_str_t* name = tsc_str_from_cstr(methods[index].name);
        tsc_value_t function = tsc_value_function_builtin_named(methods[index].call, (void*)methods[index].operation, methods[index].length, name);
        tsc_object_define(object, name, function, true, false, true);
    }
}

static void native_emitter_initialize(tsc_object_t* object) {
    object->is_event_emitter = true;
    const native_event_method_t methods[] = {
        {"on", native_emitter_on, 0, 2}, {"addListener", native_emitter_on, 0, 2},
        {"once", native_emitter_on, 1, 2}, {"prependListener", native_emitter_on, 2, 2},
        {"prependOnceListener", native_emitter_on, 3, 2},
        {"off", native_emitter_off, 0, 2}, {"removeListener", native_emitter_off, 0, 2},
        {"emit", native_emitter_emit, 0, 1}, {"removeAllListeners", native_emitter_operation, 0, 0},
        {"listenerCount", native_emitter_operation, 1, 1}, {"listeners", native_emitter_operation, 2, 1},
        {"rawListeners", native_emitter_operation, 3, 1}, {"eventNames", native_emitter_operation, 4, 0},
        {"setMaxListeners", native_emitter_operation, 5, 1}, {"getMaxListeners", native_emitter_operation, 6, 0},
        {"pause", native_emitter_operation, 7, 0}, {"resume", native_emitter_operation, 8, 0}, {"isPaused", native_emitter_operation, 9, 0}
    };
    native_event_methods(object, methods, sizeof(methods) / sizeof(methods[0]));
}

static void native_target_initialize(tsc_object_t* object) {
    object->is_event_target = true;
    const native_event_method_t methods[] = {
        {"addEventListener", native_target_operation, 0, 2},
        {"removeEventListener", native_target_operation, 1, 2},
        {"dispatchEvent", native_target_operation, 2, 1}
    };
    native_event_methods(object, methods, sizeof(methods) / sizeof(methods[0]));
}

tsc_value_t tsc_value_event_emitter(tsc_event_emitter_t* emitter) {
    if (!emitter) return tsc_value_null();
    return tsc_value_object(tsc_native_object_owner_get(&emitter->object_owner, emitter, native_emitter_initialize));
}

tsc_value_t tsc_value_event_target(tsc_event_target_t* target) {
    if (!target) return tsc_value_null();
    return tsc_value_object(tsc_native_object_owner_get(&target->object_owner, target, native_target_initialize));
}

static tsc_value_t native_event_type(void* env, tsc_value_t receiver) {
    (void)env;
    return tsc_value_string(tsc_event_type(tsc_value_as_event(receiver)));
}

static tsc_value_t native_event_target(void* env, tsc_value_t receiver) {
    (void)env;
    return tsc_value_event_target(tsc_event_target(tsc_value_as_event(receiver)));
}

static tsc_value_t native_event_current_target(void* env, tsc_value_t receiver) {
    (void)env;
    return tsc_value_event_target(tsc_event_current_target(tsc_value_as_event(receiver)));
}

static tsc_value_t native_event_default_prevented(void* env, tsc_value_t receiver) {
    (void)env;
    return tsc_value_bool(tsc_event_default_prevented(tsc_value_as_event(receiver)));
}

static tsc_value_t native_event_cancelable(void* env, tsc_value_t receiver) {
    (void)env;
    return tsc_value_bool(tsc_event_cancelable(tsc_value_as_event(receiver)));
}

static tsc_value_t native_event_prevent_default(void* env, tsc_value_t receiver, tsc_array_t* arguments) {
    (void)env;
    (void)arguments;
    tsc_event_prevent_default(tsc_value_as_event(receiver));
    return tsc_value_undefined();
}

static void native_event_initialize(tsc_object_t* object) {
    object->is_event = true;
    const struct { const char* name; tsc_accessor_getter_t get; } fields[] = {
        {"type", native_event_type}, {"target", native_event_target},
        {"currentTarget", native_event_current_target},
        {"defaultPrevented", native_event_default_prevented}, {"cancelable", native_event_cancelable}
    };
    for (size_t index = 0; index < sizeof(fields) / sizeof(fields[0]); index++) {
        tsc_object_define_accessor(object, tsc_str_from_cstr(fields[index].name), fields[index].get, NULL, true,
            NULL, NULL, false, true, true, true, true);
    }
    tsc_object_define(object, tsc_str_from_lit("preventDefault", 14),
        tsc_value_function_builtin_named(native_event_prevent_default, NULL, 0.0, tsc_str_from_lit("preventDefault", 14)), true, false, true);
}

tsc_value_t tsc_value_event(tsc_event_t* event) {
    if (!event) return tsc_value_null();
    return tsc_value_object(tsc_native_object_owner_get(&event->object_owner, event, native_event_initialize));
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
static tsc_array_t* value_string_iterator_values(const tsc_str_t* src);

tsc_str_t* tsc_value_object_to_string_tag(tsc_value_t value) {
    if (tsc_value_is_undefined(value)) return tsc_str_from_lit("[object Undefined]", 18);
    if (value_is_box(value) && value_tag(value) == TSC_VALUE_TAG_NULL) return tsc_str_from_lit("[object Null]", 13);
    tsc_value_t object = tsc_value_to_object(value);
    void* volatile object_root = tsc_value_gc_root(object);
    (void)object_root;
    /* The builtin brand precedes the observable @@toStringTag Get. Proxy
     * internal slots do not forward, while IsArray and IsCallable do. */
    const char* builtin_tag = "Object";
    if (tsc_value_is_array(object)) builtin_tag = "Array";
    else {
        tsc_object_t* owner = value_is_box(object) && value_tag(object) == TSC_VALUE_TAG_OBJECT
            ? (tsc_object_t*)value_ptr(object) : NULL;
        if (owner && owner->is_arguments) builtin_tag = "Arguments";
        else if (tsc_value_is_callable(object)) builtin_tag = "Function";
        else if (owner && owner->is_error) builtin_tag = "Error";
        else if (owner && owner->has_primitive_value && owner->primitive_kind == TSC_PRIMITIVE_BOOLEAN) builtin_tag = "Boolean";
        else if (owner && owner->has_primitive_value && owner->primitive_kind == TSC_PRIMITIVE_NUMBER) builtin_tag = "Number";
        else if (owner && owner->has_primitive_value && owner->primitive_kind == TSC_PRIMITIVE_STRING) builtin_tag = "String";
        else if (owner && owner->is_date) builtin_tag = "Date";
        else if (owner && owner->is_regexp) builtin_tag = "RegExp";
    }
    tsc_value_t custom_tag = tsc_value_get_symbol_prop(object, tsc_symbol_to_string_tag());
    tsc_str_t* tag = value_is_box(custom_tag) && value_tag(custom_tag) == TSC_VALUE_TAG_STRING
        ? (tsc_str_t*)value_ptr(custom_tag) : tsc_str_from_cstr(builtin_tag);
    void* volatile tag_root = tag;
    (void)tag_root;
    return tsc_str_concat(tsc_str_concat(tsc_str_from_lit("[object ", 8), tag), tsc_str_from_lit("]", 1));
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

tsc_value_t tsc_value_function_named_kind(
    tsc_generic_function_t fn,
    tsc_generic_function_t construct,
    void* env,
    double length,
    tsc_str_t* name,
    tsc_function_identity_kind_t kind
) {
    if (!name) name = tsc_str_from_lit("", 0);
    tsc_realm_t* realm = tsc_realm_current();
    tsc_parse_unit_t* unit = kind == TSC_FUNCTION_IDENTITY_BUILTIN ||
        kind == TSC_FUNCTION_IDENTITY_BOUND ? NULL : tsc_parse_unit_current();
    tsc_environment_t* environment = kind == TSC_FUNCTION_IDENTITY_BUILTIN ||
        kind == TSC_FUNCTION_IDENTITY_BOUND ? NULL : tsc_environment_current();
    tsc_function_identity_key_t key = { .kind = kind, .realm = realm,
        .parse_unit = unit, .lexical_environment = environment, .code = (uintptr_t)fn, .construct = construct, .env = env };
    tsc_function_identity_t* cur = tsc_function_identity_lookup(&key);
    if (cur) {
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
    tsc_function_identity_t* id = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
    id->kind = kind;
    id->function_kind_initialized = false;
    id->realm = realm;
    id->parse_unit = unit;
    id->lexical_environment = environment;
    id->construct_default_prototype = TSC_INTRINSIC_DEFAULT_OBJECT_PROTOTYPE;
    id->extensible = true;
    id->func_prototype_writable = true;
    tsc_function_identity_set_prototype(id, tsc_function_default_prototype());
    tsc_function_identity_set_own_prototype(id, tsc_value_undefined());
    id->func_prototype_initialized = false;
    id->construct = construct;
    id->class_elements = NULL;
    id->class_private_names = NULL;
    id->class_name_value = tsc_value_undefined();
    id->class_name_gc_root = NULL;
    id->class_name_initialized = false;
    id->class_constructor_body = tsc_value_undefined();
    id->class_constructor_body_root = NULL;
    id->derived_class_constructor = false;
    id->home_object = tsc_value_undefined();
    id->home_object_root = NULL;
    tsc_function_init_metadata(id, length, name);
    id->code.generic = fn;
    id->env = env;
    id = tsc_function_identity_register(id);
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)id);
}

void tsc_callable_owner_capture(tsc_callable_owner_t* owner) {
    if (owner->context_initialized) return;
    owner->realm = tsc_realm_current();
    owner->parse_unit = tsc_parse_unit_current();
    owner->lexical_environment = tsc_environment_current();
    owner->context_initialized = true;
}

void tsc_callable_owner_set(tsc_callable_owner_t* owner, tsc_value_t value) {
    tsc_callable_owner_capture(owner);
    if (value_is_box(value) && value_tag(value) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* identity = value_ptr(value);
        owner->realm = identity->realm;
        owner->parse_unit = identity->parse_unit;
        owner->lexical_environment = identity->lexical_environment;
    }
    tsc_value_store_rooted(&owner->value, &owner->root, value);
    owner->initialized = true;
}

tsc_value_t tsc_callable_owner_get(tsc_callable_owner_t* owner, tsc_generic_function_t apply,
    void* env, double length, tsc_str_t* name, bool constructable, tsc_str_t* source) {
    if (!env) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("native callable has no value owner"));
    tsc_runtime_lock();
    if (!owner->initialized) {
        tsc_callable_owner_capture(owner);
        tsc_realm_t* previous_realm = tsc_realm_swap(owner->realm);
        tsc_parse_unit_t* previous_unit = tsc_parse_unit_swap(owner->parse_unit);
        tsc_environment_t* previous_environment = tsc_environment_swap(owner->lexical_environment);
        tsc_value_t value = tsc_value_function_named_kind(apply, NULL, env, length, name,
            constructable ? TSC_FUNCTION_IDENTITY_GENERIC : TSC_FUNCTION_IDENTITY_CLOSURE);
        (void)tsc_value_function_with_source(value, source);
        tsc_callable_owner_set(owner, value);
        (void)tsc_parse_unit_swap(previous_unit);
        (void)tsc_environment_swap(previous_environment);
        (void)tsc_realm_swap(previous_realm);
    }
    tsc_value_t value = owner->value;
    tsc_runtime_unlock();
    return value;
}

tsc_value_t tsc_value_function_with_source(tsc_value_t function, tsc_str_t* source) {
    if (source && value_is_box(function) && value_tag(function) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* identity = (tsc_function_identity_t*)value_ptr(function);
        if (!identity->source_text) identity->source_text = source;
    }
    return function;
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

/* The constructor owns the inner name binding through every suspended
 * definition stage and escaping closure. Address projections preserve the
 * emitter's existing value/root/TDZ binding record. */
static tsc_function_identity_t* tsc_value_class_name_owner(tsc_value_t constructor) {
    if (!value_is_box(constructor) || value_tag(constructor) != TSC_VALUE_TAG_FUNCTION)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("class name owner is not a constructor"));
    return (tsc_function_identity_t*)value_ptr(constructor);
}
volatile tsc_value_t* tsc_value_class_name_value(tsc_value_t constructor) {
    return &tsc_value_class_name_owner(constructor)->class_name_value;
}
void** tsc_value_class_name_root(tsc_value_t constructor) {
    return &tsc_value_class_name_owner(constructor)->class_name_gc_root;
}
bool* tsc_value_class_name_initialized(tsc_value_t constructor) {
    return &tsc_value_class_name_owner(constructor)->class_name_initialized;
}

/* One retained ClassElement List owns ordinary fields, blocks and private
 * definitions. Private method/accessor brands precede ordered field execution. */
typedef struct {
    tsc_str_t* key;
    void* key_root;
    tsc_value_t initializer, getter, setter;
    void* initializer_root;
    void* getter_root;
    void* setter_root;
    bool is_static, is_block, inferred_name;
    int private_kind;
} tsc_class_element_t;

static tsc_array_t* class_element_list(tsc_value_t constructor) {
    if (!value_is_box(constructor) || value_tag(constructor) != TSC_VALUE_TAG_FUNCTION)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("class element owner is not a constructor"));
    tsc_function_identity_t* identity = value_ptr(constructor);
    if (!identity->class_elements) identity->class_elements = tsc_array_new(sizeof(tsc_class_element_t), 0);
    return identity->class_elements;
}
static void class_append_field(tsc_value_t constructor, tsc_str_t* key, tsc_value_t initializer,
    bool is_static, bool is_block, bool inferred_name, int private_kind) {
    void* volatile constructor_root = tsc_value_gc_root(constructor);
    void* volatile initializer_root = tsc_value_gc_root(initializer);
    (void)constructor_root; (void)initializer_root;
    tsc_symbol_t* symbol = key ? tsc_property_key_symbol(key) : NULL;
    tsc_class_element_t element = { .key = key, .key_root = symbol ? (void*)symbol : (void*)key,
        .initializer = initializer, .initializer_root = tsc_value_gc_root(initializer),
        .getter = tsc_value_undefined(), .setter = tsc_value_undefined(),
        .is_static = is_static, .is_block = is_block, .inferred_name = inferred_name, .private_kind = private_kind };
    tsc_array_push_raw(class_element_list(constructor), &element);
}
void tsc_value_class_add_element(tsc_value_t constructor, tsc_str_t* key, tsc_value_t initializer,
    bool is_static, bool is_block, bool inferred_name) {
    class_append_field(constructor, key, initializer, is_static, is_block, inferred_name, -1);
}
void tsc_value_class_add_private_field(tsc_value_t constructor, tsc_value_t name, tsc_value_t initializer,
    bool is_static, bool inferred_name) {
    class_append_field(constructor, tsc_value_to_internal_property_key(name), initializer,
        is_static, false, inferred_name, TSC_PRIVATE_FIELD);
}
void tsc_value_class_add_private_callable(tsc_value_t constructor, tsc_value_t name, tsc_value_t value,
    bool is_static, bool is_accessor, bool is_setter) {
    void* volatile constructor_root = tsc_value_gc_root(constructor);
    void* volatile name_root = tsc_value_gc_root(name);
    void* volatile value_root = tsc_value_gc_root(value);
    (void)constructor_root; (void)name_root; (void)value_root;
    tsc_str_t* key = tsc_value_to_internal_property_key(name);
    tsc_array_t* elements = class_element_list(constructor);
    if (is_accessor) {
        for (size_t index = 0; index < elements->len; index++) {
            tsc_class_element_t* element = &TSC_ARR(tsc_class_element_t, elements, index);
            if (element->private_kind != TSC_PRIVATE_ACCESSOR || element->is_static != is_static ||
                tsc_property_key_symbol(element->key) != tsc_property_key_symbol(key)) continue;
            if (is_setter) { element->setter = value; element->setter_root = tsc_value_gc_root(value); }
            else { element->getter = value; element->getter_root = tsc_value_gc_root(value); }
            return;
        }
    }
    tsc_class_element_t element = { .key = key, .key_root = tsc_value_gc_root(name),
        .initializer = is_accessor ? tsc_value_undefined() : value,
        .initializer_root = is_accessor ? NULL : tsc_value_gc_root(value),
        .getter = is_accessor && !is_setter ? value : tsc_value_undefined(),
        .getter_root = is_accessor && !is_setter ? tsc_value_gc_root(value) : NULL,
        .setter = is_accessor && is_setter ? value : tsc_value_undefined(),
        .setter_root = is_accessor && is_setter ? tsc_value_gc_root(value) : NULL,
        .is_static = is_static, .private_kind = is_accessor ? TSC_PRIVATE_ACCESSOR : TSC_PRIVATE_METHOD };
    tsc_array_push_raw(elements, &element);
}
void tsc_value_class_initialize_elements(tsc_value_t constructor, tsc_value_t receiver, bool is_static) {
    if (!value_is_box(constructor) || value_tag(constructor) != TSC_VALUE_TAG_FUNCTION)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("class element owner is not a constructor"));
    void* volatile constructor_root = tsc_value_gc_root(constructor);
    void* volatile receiver_root = tsc_value_gc_root(receiver);
    (void)constructor_root; (void)receiver_root;
    tsc_array_t* elements = ((tsc_function_identity_t*)value_ptr(constructor))->class_elements;
    if (!elements) return;
    for (size_t index = 0; index < elements->len; index++) {
        tsc_class_element_t element = TSC_ARR(tsc_class_element_t, elements, index);
        if (element.is_static != is_static || element.private_kind <= TSC_PRIVATE_FIELD) continue;
        tsc_value_private_add(receiver, tsc_value_symbol(tsc_property_key_symbol(element.key)),
            element.private_kind, element.initializer, element.getter, element.setter);
    }
    for (size_t index = 0; index < elements->len; index++) {
        tsc_class_element_t element = TSC_ARR(tsc_class_element_t, elements, index);
        if (element.is_static != is_static || element.private_kind > TSC_PRIVATE_FIELD) continue;
        tsc_value_t value = tsc_value_undefined();
        if (!tsc_value_is_undefined(element.initializer)) {
            tsc_array_t* arguments = tsc_array_new(sizeof(tsc_value_t), 0);
            if (!element.is_block) {
                tsc_symbol_t* symbol = tsc_property_key_symbol(element.key);
                tsc_array_push_value(arguments, symbol ? tsc_value_symbol(symbol) : tsc_value_string(element.key));
            }
            value = tsc_value_apply_function(element.initializer, receiver, tsc_value_array(arguments));
        }
        if (element.is_block) continue;
        void* volatile value_root = tsc_value_gc_root(value);
        (void)value_root;
        if (element.inferred_name) {
            tsc_str_t* name = element.private_kind == TSC_PRIVATE_FIELD
                ? tsc_symbol_description(tsc_property_key_symbol(element.key)) : element.key;
            value = tsc_value_function_with_property_name(value, name, NULL);
        }
        if (element.private_kind == TSC_PRIVATE_FIELD)
            tsc_value_private_add(receiver, tsc_value_symbol(tsc_property_key_symbol(element.key)),
                TSC_PRIVATE_FIELD, value, tsc_value_undefined(), tsc_value_undefined());
        else if (!tsc_value_define_property_desc(receiver, element.key, value,
                true, true, true, true, true, true, true))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("class field definition failed"));
    }
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

tsc_realm_t* tsc_value_function_realm(tsc_value_t function) {
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
    tsc_intrinsic_default_prototype_kind_t default_prototype;
} tsc_primitive_descriptor_t;

static const tsc_primitive_descriptor_t primitive_descriptor_templates[] = {
    { TSC_PRIMITIVE_BOOLEAN, "Boolean", 7, NULL, 0, false, TSC_INTRINSIC_DEFAULT_BOOLEAN_PROTOTYPE },
    { TSC_PRIMITIVE_NUMBER, "Number", 6, NULL, 0, false, TSC_INTRINSIC_DEFAULT_NUMBER_PROTOTYPE },
    { TSC_PRIMITIVE_STRING, "String", 6, NULL, 0, false, TSC_INTRINSIC_DEFAULT_STRING_PROTOTYPE },
    { TSC_PRIMITIVE_BIGINT, "BigInt", 6, NULL, 0, false, TSC_INTRINSIC_DEFAULT_BIGINT_PROTOTYPE },
    { TSC_PRIMITIVE_SYMBOL, "Symbol", 6, NULL, 0, false, TSC_INTRINSIC_DEFAULT_SYMBOL_PROTOTYPE },
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
    tsc_array_t* args,
    bool constructing
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
        if (!constructing && value_is_box(input) && value_tag(input) == TSC_VALUE_TAG_SYMBOL) {
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
    return primitive_convert((const tsc_primitive_descriptor_t*)env, args, false);
}

static tsc_value_t primitive_initialize_wrapper(const tsc_primitive_descriptor_t* descriptor,
    tsc_value_t receiver, tsc_value_t primitive) {
    if (!value_is_box(receiver) || value_tag(receiver) != TSC_VALUE_TAG_OBJECT) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("primitive wrapper receiver is not an object"));
    }
    tsc_object_t* object = (tsc_object_t*)value_ptr(receiver);
    object->has_primitive_value = true;
    object->primitive_kind = (uint8_t)descriptor->kind;
    object->primitive_value = primitive;
    object->primitive_value_root = tsc_value_gc_root(object->primitive_value);
    if (descriptor->kind == TSC_PRIMITIVE_STRING) {
        const tsc_str_t* string = (const tsc_str_t*)value_ptr(object->primitive_value);
        tsc_array_t* code_units = tsc_str_code_units(string);
        for (size_t index = 0; index < code_units->len; index++) {
            tsc_object_define(
                object,
                tsc_str_from_num((double)index),
                tsc_value_string(TSC_ARR(tsc_str_t*, code_units, index)),
                false,
                true,
                false
            );
        }
        tsc_object_define(
            object,
            tsc_str_from_lit("length", 6),
            tsc_value_num((double)code_units->len),
            false,
            false,
            false
        );
    }
    return receiver;
}

static tsc_value_t primitive_constructor_construct(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;
    const tsc_primitive_descriptor_t* descriptor = env;
    tsc_value_t primitive = primitive_convert(descriptor, args, true);
    void* volatile primitive_root = tsc_value_gc_root(primitive);
    (void)primitive_root;
    tsc_value_t prototype = tsc_value_get_prototype_from_constructor(
        tsc_value_current_new_target(), descriptor->default_prototype);
    void* volatile prototype_root = tsc_value_gc_root(prototype);
    (void)prototype_root;
    tsc_value_t wrapper = tsc_value_object(tsc_object_new_with_prototype(prototype));
    return primitive_initialize_wrapper(descriptor, wrapper, primitive);
}

static tsc_value_t primitive_prototype_value_of(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)args;
    const tsc_primitive_descriptor_t* descriptor = (const tsc_primitive_descriptor_t*)env;
    tsc_value_t primitive;
    if (!primitive_receiver_value(descriptor, this_arg, &primitive)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("primitive valueOf called on incompatible receiver"));
    }
    return primitive;
}

static tsc_value_t primitive_prototype_to_string(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    const tsc_primitive_descriptor_t* descriptor = (const tsc_primitive_descriptor_t*)env;
    tsc_value_t primitive;
    if (!primitive_receiver_value(descriptor, this_arg, &primitive)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("primitive toString called on incompatible receiver"));
    }
    if (descriptor->kind == TSC_PRIMITIVE_NUMBER) {
        tsc_value_t radix = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
        return tsc_value_string(
            tsc_value_is_undefined(radix)
                ? tsc_str_from_num(value_as_num(primitive))
                : tsc_str_from_num_radix(value_as_num(primitive), tsc_value_to_number(radix))
        );
    }
    if (descriptor->kind == TSC_PRIMITIVE_BIGINT) {
        tsc_value_t radix = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
        return tsc_value_string(tsc_bigint_to_string(
            (const tsc_bigint_t*)value_ptr(primitive),
            tsc_value_is_undefined(radix) ? 10.0 : tsc_value_to_number(radix)
        ));
    }
    if (descriptor->kind == TSC_PRIMITIVE_SYMBOL) {
        return tsc_value_string(tsc_symbol_to_string((const tsc_symbol_t*)value_ptr(primitive)));
    }
    return tsc_value_string(tsc_value_to_string(primitive));
}

/* The documented ECMA-262 fallback excludes ECMA-402, ignores reserved
 * options, and formats Number/BigInt through their intrinsic decimal text. */
static tsc_value_t primitive_prototype_to_locale_string(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)args;
    const tsc_primitive_descriptor_t* descriptor = (const tsc_primitive_descriptor_t*)env;
    tsc_value_t primitive;
    if (!primitive_receiver_value(descriptor, receiver, &primitive))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("numeric toLocaleString called on incompatible receiver"));
    void* volatile primitive_gc_root = tsc_value_gc_root(primitive);
    (void)primitive_gc_root;
    return tsc_value_string(descriptor->kind == TSC_PRIMITIVE_NUMBER
        ? tsc_str_from_num(value_as_num(primitive))
        : tsc_bigint_to_string((const tsc_bigint_t*)value_ptr(primitive), 10.0));
}

typedef enum {
    TSC_NUMBER_FORMAT_FIXED,
    TSC_NUMBER_FORMAT_EXPONENTIAL,
    TSC_NUMBER_FORMAT_PRECISION
} tsc_number_format_kind_t;

typedef struct {
    const char* name;
    size_t name_length;
    tsc_number_format_kind_t kind;
} tsc_number_format_descriptor_t;

static const tsc_number_format_descriptor_t number_format_methods[] = {
    { "toFixed", 7, TSC_NUMBER_FORMAT_FIXED },
    { "toExponential", 13, TSC_NUMBER_FORMAT_EXPONENTIAL },
    { "toPrecision", 11, TSC_NUMBER_FORMAT_PRECISION }
};

static tsc_value_t number_prototype_format(void* env, tsc_value_t receiver, tsc_array_t* args) {
    const tsc_number_format_descriptor_t* method = (const tsc_number_format_descriptor_t*)env;
    tsc_value_t primitive;
    if (!primitive_receiver_value(&primitive_number, receiver, &primitive))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Number format called on incompatible receiver"));
    const tsc_value_t option = args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    const bool provided = !tsc_value_is_undefined(option);
    const double value = value_as_num(primitive);
    if (method->kind == TSC_NUMBER_FORMAT_PRECISION && !provided)
        return tsc_value_string(tsc_str_from_num(value));
    const double digits = tsc_value_to_number(option);
    switch (method->kind) {
        case TSC_NUMBER_FORMAT_FIXED:
            return tsc_value_string(tsc_str_from_num_fixed(value, digits));
        case TSC_NUMBER_FORMAT_EXPONENTIAL:
            return tsc_value_string(tsc_str_from_num_exponential(value, digits, provided));
        case TSC_NUMBER_FORMAT_PRECISION:
            return tsc_value_string(tsc_str_from_num_precision(value, digits, true));
    }
    tsc_panic("invalid Number formatting descriptor");
}

static void number_prototype_install_intrinsics(tsc_object_t* prototype) {
    for (size_t index = 0; index < sizeof(number_format_methods) / sizeof(number_format_methods[0]); ++index) {
        const tsc_number_format_descriptor_t* method = &number_format_methods[index];
        tsc_str_t* name = tsc_str_from_lit(method->name, method->name_length);
        tsc_object_define(prototype, name,
            tsc_value_function_builtin_named(number_prototype_format, (void*)method, 1.0, name),
            true, false, true);
    }
}

static tsc_value_t primitive_prototype(tsc_primitive_descriptor_t* descriptor);

static void string_require_object_coercible(tsc_value_t receiver, const char* method) {
    if (!tsc_value_is_nullish(receiver)) return;
    tsc_throw_error(
        TSC_ERROR_TYPE,
        tsc_str_concat(
            tsc_str_from_cstr(method),
            tsc_str_from_lit(" called on null or undefined", 28)
        )
    );
}

static tsc_value_t string_at_from_values(tsc_value_t receiver, tsc_value_t index) {
    string_require_object_coercible(receiver, "String.prototype.at");
    /* RequireObjectCoercible/ToString must complete before index conversion. */
    const tsc_str_t* string = tsc_value_to_string(receiver);
    double relative_index = tsc_value_to_number(index);
    tsc_str_t* result = tsc_str_at(string, relative_index);
    return result ? tsc_value_string(result) : tsc_value_undefined();
}

static tsc_value_t string_char_at_from_values(tsc_value_t receiver, tsc_value_t index) {
    string_require_object_coercible(receiver, "String.prototype.charAt");
    const tsc_str_t* string = tsc_value_to_string(receiver);
    double position = tsc_value_to_number(index);
    return tsc_value_string(tsc_str_char_at(string, position));
}

static tsc_value_t string_char_code_at_from_values(tsc_value_t receiver, tsc_value_t index) {
    string_require_object_coercible(receiver, "String.prototype.charCodeAt");
    const tsc_str_t* string = tsc_value_to_string(receiver);
    double position = tsc_value_to_number(index);
    return tsc_value_num(tsc_str_char_code_at(string, position));
}

static tsc_value_t string_code_point_at_from_values(tsc_value_t receiver, tsc_value_t index) {
    string_require_object_coercible(receiver, "String.prototype.codePointAt");
    const tsc_str_t* string = tsc_value_to_string(receiver);
    double position = tsc_value_to_number(index);
    double code_point = tsc_str_code_point_at(string, position);
    return isnan(code_point) ? tsc_value_undefined() : tsc_value_num(code_point);
}

static tsc_value_t string_slice_from_values(
    tsc_value_t receiver,
    tsc_value_t start,
    tsc_value_t end
) {
    string_require_object_coercible(receiver, "String.prototype.slice");
    /* Preserve the specified receiver -> start -> end coercion sequence. */
    const tsc_str_t* string = tsc_value_to_string(receiver);
    double start_index = tsc_value_to_number(start);
    double end_index = tsc_value_is_undefined(end)
        ? (double)tsc_str_utf16_length(string)
        : tsc_value_to_number(end);
    return tsc_value_string(tsc_str_slice(string, start_index, end_index));
}

static tsc_value_t string_substring_from_values(
    tsc_value_t receiver,
    tsc_value_t start,
    tsc_value_t end
) {
    string_require_object_coercible(receiver, "String.prototype.substring");
    /* Preserve the specified receiver -> start -> end coercion sequence. */
    const tsc_str_t* string = tsc_value_to_string(receiver);
    double start_index = tsc_value_to_number(start);
    double end_index = tsc_value_is_undefined(end)
        ? (double)tsc_str_utf16_length(string)
        : tsc_value_to_number(end);
    return tsc_value_string(tsc_str_substring(string, start_index, end_index));
}

static tsc_value_t string_substr_from_values(
    tsc_value_t receiver,
    tsc_value_t start,
    tsc_value_t length
) {
    string_require_object_coercible(receiver, "String.prototype.substr");
    /* Preserve the specified receiver -> start -> length coercion sequence. */
    const tsc_str_t* string = tsc_value_to_string(receiver);
    double start_index = tsc_value_to_number(start);
    double result_length = tsc_value_is_undefined(length)
        ? INFINITY
        : tsc_value_to_number(length);
    return tsc_value_string(tsc_str_substr(string, start_index, result_length));
}

static tsc_value_t string_concat_from_values(
    tsc_value_t receiver,
    const tsc_array_t* arguments
) {
    string_require_object_coercible(receiver, "String.prototype.concat");
    const size_t argument_count = arguments ? arguments->len : 0;
    if (argument_count == SIZE_MAX) {
        tsc_panic("String.prototype.concat argument list is too large");
    }

    /* This ordered collection is the complete semantic worklist.  Receiver
     * conversion precedes every argument conversion, every value is converted
     * exactly once, and the final byte join is independent of argument count. */
    tsc_array_t* parts = tsc_array_new(
        sizeof(tsc_str_t*),
        argument_count + 1
    );
    tsc_str_t* part = tsc_value_to_string(receiver);
    tsc_array_push_raw(parts, &part);
    for (size_t index = 0; index < argument_count; index++) {
        part = tsc_value_to_string(TSC_ARR(tsc_value_t, arguments, index));
        tsc_array_push_raw(parts, &part);
    }
    return tsc_value_string(tsc_str_concat_parts(parts));
}

typedef enum {
    TSC_STRING_SEARCH_INCLUDES,
    TSC_STRING_SEARCH_INDEX_OF,
    TSC_STRING_SEARCH_LAST_INDEX_OF,
    TSC_STRING_SEARCH_STARTS_WITH,
    TSC_STRING_SEARCH_ENDS_WITH,
} tsc_string_search_operation_t;

typedef enum {
    TSC_STRING_FILL_REPEAT,
    TSC_STRING_FILL_PAD_START,
    TSC_STRING_FILL_PAD_END,
} tsc_string_fill_operation_t;

static tsc_value_t string_search_from_values(
    tsc_value_t receiver,
    tsc_value_t search,
    tsc_value_t position,
    tsc_string_search_operation_t operation
) {
    string_require_object_coercible(receiver, "String search receiver");
    const tsc_str_t* string = tsc_value_to_string(receiver);
    const bool rejects_regexp =
        operation == TSC_STRING_SEARCH_INCLUDES ||
        operation == TSC_STRING_SEARCH_STARTS_WITH ||
        operation == TSC_STRING_SEARCH_ENDS_WITH;
    if (rejects_regexp && tsc_value_is_regexp(search)) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_lit("String search argument must not be a RegExp", 43)
        );
    }
    const tsc_str_t* needle = tsc_value_to_string(search);

    double numeric_position;
    if (operation == TSC_STRING_SEARCH_ENDS_WITH && tsc_value_is_undefined(position)) {
        numeric_position = (double)tsc_str_utf16_length(string);
    } else if (operation == TSC_STRING_SEARCH_LAST_INDEX_OF) {
        numeric_position = tsc_value_is_undefined(position)
            ? INFINITY
            : tsc_value_to_number(position);
        if (isnan(numeric_position)) numeric_position = INFINITY;
    } else {
        numeric_position = tsc_value_to_number(position);
    }

    switch (operation) {
        case TSC_STRING_SEARCH_INCLUDES:
            return tsc_value_bool(tsc_str_includes(string, needle, numeric_position));
        case TSC_STRING_SEARCH_INDEX_OF:
            return tsc_value_num(tsc_str_index_of(string, needle, numeric_position));
        case TSC_STRING_SEARCH_LAST_INDEX_OF:
            return tsc_value_num(tsc_str_last_index_of(string, needle, numeric_position));
        case TSC_STRING_SEARCH_STARTS_WITH:
            return tsc_value_bool(tsc_str_starts_with(string, needle, numeric_position));
        case TSC_STRING_SEARCH_ENDS_WITH:
            return tsc_value_bool(tsc_str_ends_with(string, needle, numeric_position));
    }
    tsc_panic("unknown String search operation");
}

double tsc_value_to_integer_or_infinity(tsc_value_t value) {
    double number = tsc_value_to_number(value);
    return isnan(number) || number == 0.0 ? 0.0 : trunc(number);
}

double tsc_value_to_index(tsc_value_t value) {
    double index = tsc_value_to_integer_or_infinity(value);
    if (index < 0.0 || index > 9007199254740991.0)
        tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Index must be between 0 and 2^53 - 1"));
    return index;
}

double tsc_value_to_length(tsc_value_t value) {
    double number = tsc_value_to_number(value);
    if (isnan(number) || number <= 0.0) return 0.0;
    if (number >= 9007199254740991.0) return 9007199254740991.0;
    return floor(number);
}

static tsc_value_t string_fill_from_values(
    tsc_value_t receiver,
    tsc_value_t length_or_count,
    tsc_value_t fill,
    tsc_string_fill_operation_t operation
) {
    string_require_object_coercible(receiver, "String fill receiver");
    const tsc_str_t* string = tsc_value_to_string(receiver);
    if (operation == TSC_STRING_FILL_REPEAT) {
        return tsc_value_string(tsc_str_repeat(
            string,
            tsc_value_to_number(length_or_count)
        ));
    }

    double target_length = tsc_value_to_length(length_or_count);
    if (target_length <= (double)tsc_str_utf16_length(string)) {
        return tsc_value_string((tsc_str_t*)string);
    }
    const tsc_str_t* filler = tsc_value_is_undefined(fill)
        ? tsc_str_from_lit(" ", 1)
        : tsc_value_to_string(fill);
    if (tsc_str_utf16_length(filler) == 0) {
        return tsc_value_string((tsc_str_t*)string);
    }
    return tsc_value_string(
        operation == TSC_STRING_FILL_PAD_START
            ? tsc_str_pad_start(string, target_length, filler)
            : tsc_str_pad_end(string, target_length, filler)
    );
}

typedef enum {
    TSC_STRING_TRIM_BOTH,
    TSC_STRING_TRIM_START,
    TSC_STRING_TRIM_END,
} tsc_string_trim_operation_t;

static tsc_value_t string_trim_from_values(
    tsc_value_t receiver,
    tsc_string_trim_operation_t operation
) {
    string_require_object_coercible(receiver, "String trim receiver");
    const tsc_str_t* string = tsc_value_to_string(receiver);
    switch (operation) {
        case TSC_STRING_TRIM_BOTH:
            return tsc_value_string(tsc_str_trim(string));
        case TSC_STRING_TRIM_START:
            return tsc_value_string(tsc_str_trim_start(string));
        case TSC_STRING_TRIM_END:
            return tsc_value_string(tsc_str_trim_end(string));
    }
    tsc_panic("unknown String trim operation");
}

typedef enum {
    TSC_STRING_PROTOTYPE_AT,
    TSC_STRING_PROTOTYPE_CHAR_AT,
    TSC_STRING_PROTOTYPE_CHAR_CODE_AT,
    TSC_STRING_PROTOTYPE_CODE_POINT_AT,
    TSC_STRING_PROTOTYPE_CONCAT,
    TSC_STRING_PROTOTYPE_INCLUDES,
    TSC_STRING_PROTOTYPE_INDEX_OF,
    TSC_STRING_PROTOTYPE_LAST_INDEX_OF,
    TSC_STRING_PROTOTYPE_STARTS_WITH,
    TSC_STRING_PROTOTYPE_ENDS_WITH,
    TSC_STRING_PROTOTYPE_REPEAT,
    TSC_STRING_PROTOTYPE_PAD_START,
    TSC_STRING_PROTOTYPE_PAD_END,
    TSC_STRING_PROTOTYPE_SLICE,
    TSC_STRING_PROTOTYPE_SUBSTRING,
    TSC_STRING_PROTOTYPE_SUBSTR,
    TSC_STRING_PROTOTYPE_REPLACE,
    TSC_STRING_PROTOTYPE_REPLACE_ALL,
    TSC_STRING_PROTOTYPE_SPLIT,
    TSC_STRING_PROTOTYPE_MATCH,
    TSC_STRING_PROTOTYPE_MATCH_ALL,
    TSC_STRING_PROTOTYPE_SEARCH,
    TSC_STRING_PROTOTYPE_TRIM,
    TSC_STRING_PROTOTYPE_TRIM_START,
    TSC_STRING_PROTOTYPE_TRIM_END,
    TSC_STRING_PROTOTYPE_TO_LOWER_CASE,
    TSC_STRING_PROTOTYPE_TO_UPPER_CASE,
    TSC_STRING_PROTOTYPE_TO_LOCALE_LOWER_CASE,
    TSC_STRING_PROTOTYPE_TO_LOCALE_UPPER_CASE,
    TSC_STRING_PROTOTYPE_LOCALE_COMPARE,
    TSC_STRING_PROTOTYPE_NORMALIZE,
    TSC_STRING_PROTOTYPE_IS_WELL_FORMED,
    TSC_STRING_PROTOTYPE_TO_WELL_FORMED,
    TSC_STRING_PROTOTYPE_TO_STRING,
    TSC_STRING_PROTOTYPE_VALUE_OF,
} tsc_string_prototype_operation_t;

typedef struct {
    const char* name;
    size_t name_len;
    double arity;
    tsc_string_prototype_operation_t operation;
} tsc_string_prototype_method_t;

static const tsc_string_prototype_method_t string_prototype_methods[] = {
    { "at", 2, 1.0, TSC_STRING_PROTOTYPE_AT },
    { "charAt", 6, 1.0, TSC_STRING_PROTOTYPE_CHAR_AT },
    { "charCodeAt", 10, 1.0, TSC_STRING_PROTOTYPE_CHAR_CODE_AT },
    { "codePointAt", 11, 1.0, TSC_STRING_PROTOTYPE_CODE_POINT_AT },
    { "concat", 6, 1.0, TSC_STRING_PROTOTYPE_CONCAT },
    { "includes", 8, 1.0, TSC_STRING_PROTOTYPE_INCLUDES },
    { "indexOf", 7, 1.0, TSC_STRING_PROTOTYPE_INDEX_OF },
    { "lastIndexOf", 11, 1.0, TSC_STRING_PROTOTYPE_LAST_INDEX_OF },
    { "startsWith", 10, 1.0, TSC_STRING_PROTOTYPE_STARTS_WITH },
    { "endsWith", 8, 1.0, TSC_STRING_PROTOTYPE_ENDS_WITH },
    { "repeat", 6, 1.0, TSC_STRING_PROTOTYPE_REPEAT },
    { "padStart", 8, 1.0, TSC_STRING_PROTOTYPE_PAD_START },
    { "padEnd", 6, 1.0, TSC_STRING_PROTOTYPE_PAD_END },
    { "slice", 5, 2.0, TSC_STRING_PROTOTYPE_SLICE },
    { "substring", 9, 2.0, TSC_STRING_PROTOTYPE_SUBSTRING },
    { "substr", 6, 2.0, TSC_STRING_PROTOTYPE_SUBSTR },
    { "replace", 7, 2.0, TSC_STRING_PROTOTYPE_REPLACE },
    { "replaceAll", 10, 2.0, TSC_STRING_PROTOTYPE_REPLACE_ALL },
    { "split", 5, 2.0, TSC_STRING_PROTOTYPE_SPLIT },
    { "match", 5, 1.0, TSC_STRING_PROTOTYPE_MATCH },
    { "matchAll", 8, 1.0, TSC_STRING_PROTOTYPE_MATCH_ALL },
    { "search", 6, 1.0, TSC_STRING_PROTOTYPE_SEARCH },
    { "trim", 4, 0.0, TSC_STRING_PROTOTYPE_TRIM },
    { "trimStart", 9, 0.0, TSC_STRING_PROTOTYPE_TRIM_START },
    { "trimEnd", 7, 0.0, TSC_STRING_PROTOTYPE_TRIM_END },
    { "toLowerCase", 11, 0.0, TSC_STRING_PROTOTYPE_TO_LOWER_CASE },
    { "toUpperCase", 11, 0.0, TSC_STRING_PROTOTYPE_TO_UPPER_CASE },
    { "toLocaleLowerCase", 17, 0.0, TSC_STRING_PROTOTYPE_TO_LOCALE_LOWER_CASE },
    { "toLocaleUpperCase", 17, 0.0, TSC_STRING_PROTOTYPE_TO_LOCALE_UPPER_CASE },
    { "localeCompare", 13, 1.0, TSC_STRING_PROTOTYPE_LOCALE_COMPARE },
    { "normalize", 9, 0.0, TSC_STRING_PROTOTYPE_NORMALIZE },
    { "isWellFormed", 12, 0.0, TSC_STRING_PROTOTYPE_IS_WELL_FORMED },
    { "toWellFormed", 12, 0.0, TSC_STRING_PROTOTYPE_TO_WELL_FORMED },
    { "toString", 8, 0.0, TSC_STRING_PROTOTYPE_TO_STRING },
    { "valueOf", 7, 0.0, TSC_STRING_PROTOTYPE_VALUE_OF },
};

static tsc_value_t string_case_from_values(
    tsc_value_t receiver,
    tsc_value_t form,
    tsc_string_prototype_operation_t operation
) {
    string_require_object_coercible(receiver, "String case receiver");
    const tsc_str_t* string = tsc_value_to_string(receiver);
    if (operation == TSC_STRING_PROTOTYPE_TO_LOWER_CASE ||
        operation == TSC_STRING_PROTOTYPE_TO_LOCALE_LOWER_CASE) {
        return tsc_value_string(tsc_str_to_lower(string));
    }
    if (operation == TSC_STRING_PROTOTYPE_TO_UPPER_CASE ||
        operation == TSC_STRING_PROTOTYPE_TO_LOCALE_UPPER_CASE) {
        return tsc_value_string(tsc_str_to_upper(string));
    }
    const tsc_str_t* form_string = tsc_value_is_undefined(form)
        ? tsc_str_from_lit("NFC", 3)
        : tsc_value_to_string(form);
    return tsc_value_string(tsc_str_normalize(string, form_string));
}

static tsc_value_t string_compare_from_values(tsc_value_t receiver, tsc_value_t other) {
    string_require_object_coercible(receiver, "String localeCompare receiver");
    const tsc_str_t* string = tsc_value_to_string(receiver);
    const tsc_str_t* that = tsc_value_to_string(other);
    return tsc_value_num(tsc_str_locale_compare(string, that));
}

static tsc_value_t string_well_formed_from_values(
    tsc_value_t receiver,
    tsc_string_prototype_operation_t operation
) {
    string_require_object_coercible(receiver, "String well-formed receiver");
    const tsc_str_t* string = tsc_value_to_string(receiver);
    if (operation == TSC_STRING_PROTOTYPE_IS_WELL_FORMED) {
        return tsc_value_bool(tsc_str_is_well_formed(string));
    }
    return tsc_value_string(tsc_str_to_well_formed(string));
}

static tsc_value_t string_this_value_from_values(tsc_value_t receiver) {
    tsc_value_t primitive;
    if (!primitive_receiver_value(&primitive_string, receiver, &primitive)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("String toString/valueOf called on incompatible receiver"));
    }
    return primitive;
}

static tsc_value_t string_prototype_method_apply(
    void* env,
    tsc_value_t this_arg,
    tsc_array_t* args
) {
    const tsc_string_prototype_method_t* method =
        (const tsc_string_prototype_method_t*)env;
    tsc_value_t first = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_undefined();
    tsc_value_t second = args && args->len > 1
        ? TSC_ARR(tsc_value_t, args, 1)
        : tsc_value_undefined();
    switch (method->operation) {
        case TSC_STRING_PROTOTYPE_AT:
            return string_at_from_values(this_arg, first);
        case TSC_STRING_PROTOTYPE_CHAR_AT:
            return string_char_at_from_values(this_arg, first);
        case TSC_STRING_PROTOTYPE_CHAR_CODE_AT:
            return string_char_code_at_from_values(this_arg, first);
        case TSC_STRING_PROTOTYPE_CODE_POINT_AT:
            return string_code_point_at_from_values(this_arg, first);
        case TSC_STRING_PROTOTYPE_CONCAT:
            return string_concat_from_values(this_arg, args);
        case TSC_STRING_PROTOTYPE_INCLUDES:
            return string_search_from_values(this_arg, first, second, TSC_STRING_SEARCH_INCLUDES);
        case TSC_STRING_PROTOTYPE_INDEX_OF:
            return string_search_from_values(this_arg, first, second, TSC_STRING_SEARCH_INDEX_OF);
        case TSC_STRING_PROTOTYPE_LAST_INDEX_OF:
            return string_search_from_values(this_arg, first, second, TSC_STRING_SEARCH_LAST_INDEX_OF);
        case TSC_STRING_PROTOTYPE_STARTS_WITH:
            return string_search_from_values(this_arg, first, second, TSC_STRING_SEARCH_STARTS_WITH);
        case TSC_STRING_PROTOTYPE_ENDS_WITH:
            return string_search_from_values(this_arg, first, second, TSC_STRING_SEARCH_ENDS_WITH);
        case TSC_STRING_PROTOTYPE_REPEAT:
            return string_fill_from_values(this_arg, first, second, TSC_STRING_FILL_REPEAT);
        case TSC_STRING_PROTOTYPE_PAD_START:
            return string_fill_from_values(this_arg, first, second, TSC_STRING_FILL_PAD_START);
        case TSC_STRING_PROTOTYPE_PAD_END:
            return string_fill_from_values(this_arg, first, second, TSC_STRING_FILL_PAD_END);
        case TSC_STRING_PROTOTYPE_SLICE:
            return string_slice_from_values(this_arg, first, second);
        case TSC_STRING_PROTOTYPE_SUBSTRING:
            return string_substring_from_values(this_arg, first, second);
        case TSC_STRING_PROTOTYPE_SUBSTR:
            return string_substr_from_values(this_arg, first, second);
        case TSC_STRING_PROTOTYPE_REPLACE:
            return tsc_value_method_replace(this_arg, first, second);
        case TSC_STRING_PROTOTYPE_REPLACE_ALL:
            return tsc_value_method_replace_all(this_arg, first, second);
        case TSC_STRING_PROTOTYPE_SPLIT:
            return tsc_value_method_split(this_arg, first, second);
        case TSC_STRING_PROTOTYPE_MATCH:
            return tsc_value_method_match(this_arg, first);
        case TSC_STRING_PROTOTYPE_MATCH_ALL:
            return tsc_value_method_match_all(this_arg, first);
        case TSC_STRING_PROTOTYPE_SEARCH:
            return tsc_value_method_search(this_arg, first);
        case TSC_STRING_PROTOTYPE_TRIM:
            return string_trim_from_values(this_arg, TSC_STRING_TRIM_BOTH);
        case TSC_STRING_PROTOTYPE_TRIM_START:
            return string_trim_from_values(this_arg, TSC_STRING_TRIM_START);
        case TSC_STRING_PROTOTYPE_TRIM_END:
            return string_trim_from_values(this_arg, TSC_STRING_TRIM_END);
        case TSC_STRING_PROTOTYPE_TO_LOWER_CASE:
            return string_case_from_values(this_arg, first, TSC_STRING_PROTOTYPE_TO_LOWER_CASE);
        case TSC_STRING_PROTOTYPE_TO_UPPER_CASE:
            return string_case_from_values(this_arg, first, TSC_STRING_PROTOTYPE_TO_UPPER_CASE);
        case TSC_STRING_PROTOTYPE_TO_LOCALE_LOWER_CASE:
            return string_case_from_values(this_arg, first, TSC_STRING_PROTOTYPE_TO_LOCALE_LOWER_CASE);
        case TSC_STRING_PROTOTYPE_TO_LOCALE_UPPER_CASE:
            return string_case_from_values(this_arg, first, TSC_STRING_PROTOTYPE_TO_LOCALE_UPPER_CASE);
        case TSC_STRING_PROTOTYPE_LOCALE_COMPARE:
            return string_compare_from_values(this_arg, first);
        case TSC_STRING_PROTOTYPE_NORMALIZE:
            return string_case_from_values(this_arg, first, TSC_STRING_PROTOTYPE_NORMALIZE);
        case TSC_STRING_PROTOTYPE_IS_WELL_FORMED:
            return string_well_formed_from_values(this_arg, TSC_STRING_PROTOTYPE_IS_WELL_FORMED);
        case TSC_STRING_PROTOTYPE_TO_WELL_FORMED:
            return string_well_formed_from_values(this_arg, TSC_STRING_PROTOTYPE_TO_WELL_FORMED);
        case TSC_STRING_PROTOTYPE_TO_STRING:
            return string_this_value_from_values(this_arg);
        case TSC_STRING_PROTOTYPE_VALUE_OF:
            return string_this_value_from_values(this_arg);
    }
    tsc_panic("unknown String prototype operation");
}

/* One canonical String code-point iteration representation: the @@iterator
 * method snapshots the canonical char sequence, and the shared iterator
 * prototype drives each fresh iterator through one index worklist. Iterator
 * state lives in non-enumerable own properties so collection keeps the
 * sequence alive without extra roots. */
typedef struct {
    tsc_value_t iterator_prototype;
    void* iterator_prototype_root;
} string_iterator_method_env_t;

tsc_value_t tsc_iterator_result(tsc_value_t value, bool done) {
    void* volatile value_gc_root = tsc_value_gc_root(value);
    (void)value_gc_root;
    tsc_object_t* volatile result = tsc_object_new();
    tsc_object_set(result, tsc_str_from_lit("value", 5), value);
    tsc_object_set(result, tsc_str_from_lit("done", 4), tsc_value_bool(done));
    return tsc_value_object(result);
}

static tsc_value_t string_iterator_next_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    if (!value_is_box(this_arg) || value_tag(this_arg) != TSC_VALUE_TAG_OBJECT) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("String iterator next called on incompatible receiver"));
    }
    tsc_object_t* iterator = (tsc_object_t*)value_ptr(this_arg);
    tsc_value_t chars = tsc_object_get(iterator, tsc_str_from_lit("chars", 5));
    tsc_value_t position = tsc_object_get(iterator, tsc_str_from_lit("index", 5));
    if (!value_is_box(chars) || value_tag(chars) != TSC_VALUE_TAG_ARRAY || value_is_box(position)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("String iterator next called on incompatible receiver"));
    }
    double current = value_as_num(position);
    tsc_array_t* sequence = (tsc_array_t*)value_ptr(chars);
    if (!(current >= 0.0) || current >= (double)sequence->len) {
        return tsc_iterator_result(tsc_value_undefined(), true);
    }
    size_t next = (size_t)(current + 1.0);
    tsc_value_t value = TSC_ARR(tsc_value_t, sequence, (size_t)current);
    tsc_object_set(iterator, tsc_str_from_lit("index", 5), tsc_value_num((double)next));
    return tsc_iterator_result(value, false);
}


static tsc_value_t string_iterator_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)args;
    const string_iterator_method_env_t* method_env = (const string_iterator_method_env_t*)env;
    string_require_object_coercible(this_arg, "String.prototype [Symbol.iterator]");
    const tsc_str_t* string = tsc_value_to_string(this_arg);
    tsc_array_t* chars = value_string_iterator_values(string);
    tsc_object_t* iterator = tsc_object_new();
    tsc_object_set_prototype_of(iterator, method_env->iterator_prototype);
    tsc_object_define(iterator, tsc_str_from_lit("chars", 5), tsc_value_array(chars), true, false, true);
    tsc_object_define(iterator, tsc_str_from_lit("index", 5), tsc_value_num(0.0), true, false, true);
    return tsc_value_object(iterator);
}

static void string_prototype_install_intrinsics(tsc_value_t prototype) {
    tsc_value_t trim_start = tsc_value_undefined();
    tsc_value_t trim_end = tsc_value_undefined();
    for (
        size_t index = 0;
        index < sizeof(string_prototype_methods) / sizeof(string_prototype_methods[0]);
        index++
    ) {
        const tsc_string_prototype_method_t* method = &string_prototype_methods[index];
        tsc_value_t function = tsc_value_function_builtin_named(
            string_prototype_method_apply,
            (void*)method,
            method->arity,
            tsc_str_from_lit(method->name, method->name_len)
        );
        void* volatile function_gc_root = tsc_value_gc_root(function);
        (void)function_gc_root;
        tsc_object_define(
            (tsc_object_t*)value_ptr(prototype),
            tsc_str_from_lit(method->name, method->name_len),
            function,
            true,
            false,
            true
        );
        if (method->operation == TSC_STRING_PROTOTYPE_TRIM_START) trim_start = function;
        if (method->operation == TSC_STRING_PROTOTYPE_TRIM_END) trim_end = function;
    }
    /* Annex B aliases share the trimStart/trimEnd function identities. */
    tsc_object_define(
        (tsc_object_t*)value_ptr(prototype),
        tsc_str_from_lit("trimLeft", 8),
        trim_start,
        true,
        false,
        true
    );
    tsc_object_define(
        (tsc_object_t*)value_ptr(prototype),
        tsc_str_from_lit("trimRight", 9),
        trim_end,
        true,
        false,
        true
    );
    /* The @@iterator method lives under the well-known symbol key alongside
     * the string-keyed intrinsics above and closes over this Realm's shared
     * String iterator prototype. */
    tsc_object_t* iterator_prototype = tsc_object_new_with_prototype(tsc_iterator_prototype_value());
    tsc_object_define(
        iterator_prototype,
        tsc_str_from_lit("next", 4),
        tsc_value_function_builtin_named(
            string_iterator_next_apply, NULL, 0.0, tsc_str_from_lit("next", 4)
        ),
        true,
        false,
        true
    );
    string_iterator_method_env_t* iterator_env =
        (string_iterator_method_env_t*)TSC_GC_MALLOC(sizeof(string_iterator_method_env_t));
    iterator_env->iterator_prototype = tsc_value_object(iterator_prototype);
    iterator_env->iterator_prototype_root = tsc_value_gc_root(iterator_env->iterator_prototype);
    tsc_object_define(
        (tsc_object_t*)value_ptr(prototype),
        tsc_symbol_property_key(tsc_symbol_iterator()),
        tsc_value_function_builtin_named(
            string_iterator_apply,
            iterator_env,
            0.0,
            tsc_str_from_lit("[Symbol.iterator]", 17)
        ),
        true,
        false,
        true
    );
}

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
            prototype->has_primitive_value = descriptor->kind == TSC_PRIMITIVE_NUMBER ||
                descriptor->kind == TSC_PRIMITIVE_BOOLEAN || descriptor->kind == TSC_PRIMITIVE_STRING;
            prototype->primitive_kind = (uint8_t)descriptor->kind;
            prototype->primitive_value = prototype->has_primitive_value
                ? primitive_default(descriptor) : tsc_value_undefined();
            prototype->primitive_value_root = tsc_value_gc_root(prototype->primitive_value);
            if (descriptor->kind == TSC_PRIMITIVE_STRING) {
                tsc_object_define(
                    prototype,
                    tsc_str_from_lit("length", 6),
                    tsc_value_num(0.0),
                    false,
                    false,
                    false
                );
            }
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
            if (descriptor->kind == TSC_PRIMITIVE_STRING) {
                string_prototype_install_intrinsics(tsc_value_object(prototype));
            }
            if (descriptor->kind == TSC_PRIMITIVE_NUMBER) {
                number_prototype_install_intrinsics(prototype);
            }
            if (descriptor->kind == TSC_PRIMITIVE_SYMBOL) {
                symbol_prototype_install_intrinsics(tsc_value_object(prototype));
            }
            if (descriptor->kind == TSC_PRIMITIVE_BIGINT) {
                (void)tsc_value_define_symbol_property_desc(tsc_value_object(prototype), tsc_symbol_to_string_tag(),
                    tsc_value_string(tsc_str_from_lit(descriptor->name, descriptor->name_len)),
                    true, false, true, false, true, true, true);
            }
            if (descriptor->kind == TSC_PRIMITIVE_NUMBER || descriptor->kind == TSC_PRIMITIVE_BIGINT) {
                tsc_object_define(prototype, tsc_str_from_lit("toLocaleString", 14),
                    tsc_value_function_builtin_named(primitive_prototype_to_locale_string, descriptor,
                        0.0, tsc_str_from_lit("toLocaleString", 14)), true, false, true);
            }
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

static void number_constructor_install_static_methods(tsc_value_t constructor);

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
    void* volatile constructor_gc_root = tsc_value_gc_root(constructor);
    (void)constructor_gc_root;
    tsc_function_identity_t* identity = (tsc_function_identity_t*)value_ptr(constructor);
    identity->construct_allocates_receiver = false;
    identity->construct_default_prototype = descriptor->default_prototype;
    if (!identity->func_prototype_initialized) {
        tsc_function_identity_set_own_prototype(identity, primitive_prototype(descriptor));
        identity->func_prototype_writable = false;
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
    if (descriptor->kind == TSC_PRIMITIVE_NUMBER) {
        number_constructor_install_static_methods(constructor);
    }
    descriptor->constructor = constructor;
    descriptor->constructor_initialized = true;
    return descriptor->constructor;
}

tsc_value_t tsc_string_constructor_value(void) { return primitive_constructor_value(&primitive_string); }
tsc_value_t tsc_number_constructor_value(void) { return primitive_constructor_value(&primitive_number); }
tsc_value_t tsc_boolean_constructor_value(void) { return primitive_constructor_value(&primitive_boolean); }

static tsc_value_t value_to_bigint(tsc_value_t value, bool allow_number);

static tsc_value_t bigint_constructor_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t input = args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    return value_to_bigint(input, true);
}

typedef struct { const char* name; bool is_signed; } tsc_bigint_width_intrinsic_t;
static const tsc_bigint_width_intrinsic_t bigint_width_intrinsics[] = {
    { "asIntN", true }, { "asUintN", false },
};

static tsc_value_t bigint_width_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;
    const tsc_bigint_width_intrinsic_t* intrinsic = (const tsc_bigint_width_intrinsic_t*)env;
    tsc_value_t raw_bits = args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    double bits = tsc_value_to_index(raw_bits);
    tsc_value_t input = args && args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    tsc_value_t integer = tsc_value_to_bigint(input);
    void* volatile integer_root = tsc_value_gc_root(integer);
    (void)integer_root;
    return tsc_value_bigint(tsc_bigint_as_n(tsc_value_as_bigint(integer), bits, intrinsic->is_signed));
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
    void* volatile constructor_root = tsc_value_gc_root(constructor);
    (void)constructor_root;
    for (size_t index = 0; index < sizeof(bigint_width_intrinsics) / sizeof(bigint_width_intrinsics[0]); index++) {
        const tsc_bigint_width_intrinsic_t* intrinsic = &bigint_width_intrinsics[index];
        tsc_str_t* name = tsc_str_from_cstr(intrinsic->name);
        tsc_value_t method = tsc_value_function_builtin_named(bigint_width_apply, (void*)intrinsic, 2.0, name);
        (void)tsc_value_define_property_desc(constructor, name, method, true, true, true, false, true, true, true);
    }
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
    /* The fresh wrapper is referenced only by this boxed word until it is
     * returned: pin it across the allocating calls below. */
    void* volatile receiver_gc_root = tsc_value_gc_root(receiver);
    (void)receiver_gc_root;
    (void)tsc_value_set_prototype_of(
        receiver,
        primitive_prototype((tsc_primitive_descriptor_t*)descriptor)
    );
    return primitive_initialize_wrapper(descriptor, receiver, value);
}

tsc_value_t tsc_value_to_object(tsc_value_t value) {
    if (tsc_value_is_nullish(value))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot convert null or undefined to object"));
    if (tsc_value_is_object(value)) return value;
    const tsc_primitive_descriptor_t* descriptor = object_constructor_primitive_descriptor(value);
    if (!descriptor)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object cannot box this primitive value"));
    return object_constructor_box_primitive(descriptor, value);
}
static tsc_value_t object_constructor_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)this_arg;
    tsc_value_t value = object_constructor_arg(args, 0);
    return tsc_value_is_nullish(value) ? tsc_value_object(tsc_object_new()) : tsc_value_to_object(value);
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

static tsc_value_t object_static_define_properties(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = object_constructor_arg(args, 0);
    if (!tsc_value_define_properties_descriptor_map(target, object_constructor_arg(args, 1))) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.defineProperties failed"));
    }
    return target;
}

static tsc_value_t object_static_create(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t object = tsc_value_object_create(object_constructor_arg(args, 0));
    void* volatile object_root = tsc_value_gc_root(object);
    (void)object_root;
    tsc_value_t descriptors = object_constructor_arg(args, 1);
    if (!tsc_value_is_undefined(descriptors) && !tsc_value_define_properties_descriptor_map(object, descriptors)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.create defineProperties failed"));
    }
    return object;
}

static tsc_value_t object_static_get_own_property_descriptor(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = object_constructor_arg(args, 0);
    target = tsc_value_to_object(target);
    void* volatile target_root = tsc_value_gc_root(target);
    (void)target_root;
    return tsc_value_get_own_property_computed_descriptor(
        target,
        object_constructor_arg(args, 1)
    );
}

static tsc_value_t object_static_get_own_property_descriptors(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = object_constructor_arg(args, 0);
    object_static_require_target(target, "getOwnPropertyDescriptors");
    return tsc_value_get_own_property_descriptors(target);
}

static tsc_value_t object_static_get_own_property_names(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = object_constructor_arg(args, 0);
    target = tsc_value_to_object(target);
    void* volatile target_root = tsc_value_gc_root(target);
    (void)target_root;
    tsc_array_t* keys = tsc_value_own_keys(target);
    tsc_array_t* values = tsc_array_new(sizeof(tsc_value_t), keys->len ? keys->len : 1);
    for (size_t index = 0; index < keys->len; index++) {
        tsc_array_push_value(values, tsc_value_string(TSC_ARR(tsc_str_t*, keys, index)));
    }
    return tsc_value_array(values);
}

static tsc_value_t object_static_get_own_property_symbols(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)this_arg;
    tsc_array_t* keys = tsc_value_get_own_property_symbols(object_constructor_arg(args, 0));
    tsc_array_t* values = tsc_array_new(sizeof(tsc_value_t), keys->len);
    for (size_t index = 0; index < keys->len; index++)
        tsc_array_push_value(values, tsc_value_symbol(TSC_ARR(tsc_symbol_t*, keys, index)));
    return tsc_value_array(values);
}

static tsc_value_t object_static_has_own(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)this_arg;
    tsc_value_t target = tsc_value_to_object(object_constructor_arg(args, 0));
    void* volatile target_root = tsc_value_gc_root(target);
    (void)target_root;
    return tsc_value_bool(tsc_value_has_own_computed_prop(target, object_constructor_arg(args, 1)));
}

static tsc_value_t object_static_keys(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)this_arg;
    tsc_array_t* keys = tsc_value_object_keys(object_constructor_arg(args, 0));
    tsc_array_t* values = tsc_array_new(sizeof(tsc_value_t), keys->len);
    for (size_t index = 0; index < keys->len; index++)
        tsc_array_push_value(values, tsc_value_string(TSC_ARR(tsc_str_t*, keys, index)));
    return tsc_value_array(values);
}

static tsc_value_t object_static_values(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)this_arg;
    return tsc_value_array(tsc_value_object_values(object_constructor_arg(args, 0)));
}

static tsc_value_t object_static_entries(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env; (void)this_arg;
    return tsc_value_array(tsc_value_object_entries(object_constructor_arg(args, 0)));
}

static tsc_value_t object_static_set_prototype_of(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = object_constructor_arg(args, 0);
    tsc_value_t prototype = object_constructor_arg(args, 1);
    (void)tsc_value_object_set_prototype_of(target, prototype);
    return target;
}

static tsc_value_t object_static_is(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)receiver;
    return tsc_value_bool(tsc_value_object_is(object_constructor_arg(args, 0), object_constructor_arg(args, 1)));
}

static tsc_value_t object_static_get_prototype_of(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)receiver;
    return tsc_value_object_get_prototype_of(object_constructor_arg(args, 0));
}

static tsc_value_t object_static_assign(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)receiver;
    tsc_value_t target = tsc_value_to_object(object_constructor_arg(args, 0));
    void* volatile target_root = tsc_value_gc_root(target);
    (void)target_root;
    for (size_t index = 1; args && index < args->len; index++)
        (void)tsc_value_object_assign(target, TSC_ARR(tsc_value_t, args, index));
    return target;
}

static tsc_value_t object_static_from_entries(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)receiver;
    return tsc_value_object_from_entries(object_constructor_arg(args, 0));
}

static tsc_value_t object_static_group_by(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)receiver;
    return tsc_value_object_group_by(object_constructor_arg(args, 0), object_constructor_arg(args, 1));
}

typedef struct {
    const char* name;
    bool (*operation)(tsc_value_t);
    bool mutation;
} tsc_object_integrity_operation_t;

static const tsc_object_integrity_operation_t object_integrity_operations[] = {
    { "isExtensible", tsc_value_is_extensible, false },
    { "isSealed", tsc_value_is_sealed, false },
    { "isFrozen", tsc_value_is_frozen, false },
    { "preventExtensions", tsc_value_prevent_extensions, true },
    { "seal", tsc_value_seal, true },
    { "freeze", tsc_value_freeze, true },
};

static tsc_value_t object_static_integrity(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;
    const tsc_object_integrity_operation_t* operation = env;
    tsc_value_t target = object_constructor_arg(args, 0);
    bool result = operation->operation(target);
    if (!operation->mutation) return tsc_value_bool(result);
    if (!result) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object integrity operation failed"));
    return target;
}

typedef struct {
    const char* name;
    size_t name_len;
    double arity;
    tsc_generic_function_t apply;
} tsc_object_static_method_t;

static const tsc_object_static_method_t object_static_methods[] = {
    { "create", 6, 2.0, object_static_create },
    { "defineProperty", 14, 3.0, object_static_define_property },
    { "defineProperties", 16, 2.0, object_static_define_properties },
    { "getOwnPropertyDescriptor", 24, 2.0, object_static_get_own_property_descriptor },
    { "getOwnPropertyDescriptors", 25, 1.0, object_static_get_own_property_descriptors },
    { "getOwnPropertyNames", 19, 1.0, object_static_get_own_property_names },
    { "getOwnPropertySymbols", 21, 1.0, object_static_get_own_property_symbols },
    { "hasOwn", 6, 2.0, object_static_has_own },
    { "keys", 4, 1.0, object_static_keys },
    { "values", 6, 1.0, object_static_values },
    { "entries", 7, 1.0, object_static_entries },
    { "setPrototypeOf", 14, 2.0, object_static_set_prototype_of },
    { "is", 2, 2.0, object_static_is },
    { "getPrototypeOf", 14, 1.0, object_static_get_prototype_of },
    { "assign", 6, 2.0, object_static_assign },
    { "fromEntries", 11, 1.0, object_static_from_entries },
    { "groupBy", 7, 2.0, object_static_group_by },
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
            for (size_t index = 0; index < sizeof(object_integrity_operations) / sizeof(object_integrity_operations[0]); index++) {
                const tsc_object_integrity_operation_t* operation = &object_integrity_operations[index];
                tsc_str_t* name = tsc_str_from_cstr(operation->name);
                (void)tsc_value_define_property_desc(intrinsic->constructor, name,
                    tsc_value_function_builtin_named(object_static_integrity, (void*)operation, 1.0, name),
                    true, true, true, false, true, true, true);
            }
            intrinsic->initialization_state = 2;
        }
        tsc_runtime_unlock();
    }
    return intrinsic->constructor;
}

static tsc_value_t proxy_constructor_construct(
    void* env,
    tsc_value_t receiver,
    tsc_array_t* args
) {
    (void)env;
    (void)receiver;
    tsc_value_t target = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_undefined();
    tsc_value_t handler = args && args->len > 1
        ? TSC_ARR(tsc_value_t, args, 1)
        : tsc_value_undefined();
    return tsc_proxy_new(target, handler);
}

static tsc_value_t proxy_revocable_apply(
    void* env,
    tsc_value_t this_arg,
    tsc_array_t* args
) {
    (void)env;
    (void)this_arg;
    tsc_value_t target = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_undefined();
    tsc_value_t handler = args && args->len > 1
        ? TSC_ARR(tsc_value_t, args, 1)
        : tsc_value_undefined();
    return tsc_proxy_revocable(target, handler);
}

typedef struct {
    int initialization_state;
    tsc_value_t constructor;
} tsc_proxy_constructor_intrinsic_t;

static const char proxy_constructor_realm_state_key = 0;

tsc_value_t tsc_proxy_constructor_value(void) {
    tsc_proxy_constructor_intrinsic_t* intrinsic =
        (tsc_proxy_constructor_intrinsic_t*)tsc_realm_state_get(
            &proxy_constructor_realm_state_key
        );
    if (!intrinsic) {
        tsc_runtime_lock();
        intrinsic = (tsc_proxy_constructor_intrinsic_t*)tsc_realm_state_get(
            &proxy_constructor_realm_state_key
        );
        if (!intrinsic) {
            intrinsic = (tsc_proxy_constructor_intrinsic_t*)TSC_GC_MALLOC(
                sizeof(tsc_proxy_constructor_intrinsic_t)
            );
            memset(intrinsic, 0, sizeof(*intrinsic));
            tsc_realm_state_set(&proxy_constructor_realm_state_key, intrinsic);
        }
        tsc_runtime_unlock();
    }
    if (intrinsic->initialization_state == 0) {
        tsc_runtime_lock();
        if (intrinsic->initialization_state == 0) {
            intrinsic->initialization_state = 1;
            intrinsic->constructor = tsc_value_function_class_named(
                proxy_constructor_construct,
                NULL,
                2.0,
                tsc_str_from_lit("Proxy", 5)
            );
            tsc_function_identity_t* identity =
                (tsc_function_identity_t*)value_ptr(intrinsic->constructor);
            identity->has_prototype_property = false;
            identity->construct_allocates_receiver = false;
            (void)tsc_value_define_property_desc(
                intrinsic->constructor,
                tsc_str_from_lit("revocable", 9),
                tsc_value_function_builtin_named(
                    proxy_revocable_apply,
                    NULL,
                    2.0,
                    tsc_str_from_lit("revocable", 9)
                ),
                true,
                true,
                true,
                false,
                true,
                true,
                true
            );
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
    TSC_GLOBAL_FUNCTION_EVAL,
    TSC_GLOBAL_FUNCTION_PARSE_FLOAT,
    TSC_GLOBAL_FUNCTION_PARSE_INT,
    TSC_GLOBAL_FUNCTION_IS_FINITE,
    TSC_GLOBAL_FUNCTION_IS_NAN,
    TSC_GLOBAL_FUNCTION_ENCODE_URI,
    TSC_GLOBAL_FUNCTION_ENCODE_URI_COMPONENT,
    TSC_GLOBAL_FUNCTION_DECODE_URI,
    TSC_GLOBAL_FUNCTION_DECODE_URI_COMPONENT,
    TSC_GLOBAL_FUNCTION_BTOA,
    TSC_GLOBAL_FUNCTION_ATOB,
} tsc_global_function_kind_t;

typedef struct {
    const char* name;
    size_t name_length;
    double function_length;
    tsc_global_function_kind_t kind;
    bool constructible, enumerable;
    size_t required_arguments;
} tsc_global_function_descriptor_t;

static const tsc_global_function_descriptor_t global_function_descriptors[] = {
#define TSC_GLOBAL_INTRINSIC(name, value)
#define TSC_GLOBAL_FUNCTION(name, length, kind, constructible, enumerable, required) { #name, sizeof(#name) - 1, length, kind, constructible, enumerable, required },
#define TSC_GLOBAL_VALUE(name, value, writable, configurable)
#include "tsc_global_bindings.def"
#undef TSC_GLOBAL_INTRINSIC
#undef TSC_GLOBAL_FUNCTION
#undef TSC_GLOBAL_VALUE
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
    if (descriptor->required_arguments && (!args || args->len < descriptor->required_arguments))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("The input argument must be specified"));
    tsc_value_t input = global_function_argument(args, 0);
    switch (descriptor->kind) {
        case TSC_GLOBAL_FUNCTION_EVAL:
            return tsc_eval_indirect(args);
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
        case TSC_GLOBAL_FUNCTION_BTOA:
            return tsc_value_string(tsc_btoa(tsc_value_to_string(input)));
        case TSC_GLOBAL_FUNCTION_ATOB:
            return tsc_value_string(tsc_atob(tsc_value_to_string(input)));
    }
    tsc_panic("unknown global function descriptor");
    return tsc_value_undefined();
}

static tsc_value_t global_function_intrinsic_value(const tsc_global_function_descriptor_t* descriptor) {
    return tsc_value_function_named_kind(
        global_function_apply, NULL, (void*)descriptor,
        descriptor->function_length,
        tsc_str_from_lit(descriptor->name, descriptor->name_length),
        descriptor->constructible ? TSC_FUNCTION_IDENTITY_GENERIC : TSC_FUNCTION_IDENTITY_BUILTIN
    );
}

tsc_value_t tsc_eval_intrinsic_value(void) {
    for (size_t i = 0; i < sizeof(global_function_descriptors) / sizeof(global_function_descriptors[0]); ++i) {
        if (global_function_descriptors[i].kind == TSC_GLOBAL_FUNCTION_EVAL)
            return global_function_intrinsic_value(&global_function_descriptors[i]);
    }
    tsc_panic("missing eval intrinsic descriptor");
    return tsc_value_undefined();
}

typedef struct {
    const char* name;
    size_t name_length;
    bool (*predicate)(tsc_value_t);
} tsc_number_predicate_descriptor_t;

static const tsc_number_predicate_descriptor_t number_predicates[] = {
    { "isFinite", 8, tsc_value_number_is_finite },
    { "isInteger", 9, tsc_value_number_is_integer },
    { "isNaN", 5, tsc_value_number_is_nan },
    { "isSafeInteger", 13, tsc_value_number_is_safe_integer }
};

static tsc_value_t number_static_predicate_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;
    const tsc_number_predicate_descriptor_t* descriptor = (const tsc_number_predicate_descriptor_t*)env;
    return tsc_value_bool(descriptor->predicate(global_function_argument(args, 0)));
}

typedef struct {
    const char* name;
    size_t name_length;
    double value;
} tsc_number_constant_descriptor_t;

static const tsc_number_constant_descriptor_t number_constants[] = {
    { "EPSILON", 7, 0x1p-52 },
    { "MAX_SAFE_INTEGER", 16, 0x1fffffffffffffp0 },
    { "MAX_VALUE", 9, 0x1.fffffffffffffp1023 },
    { "MIN_SAFE_INTEGER", 16, -0x1fffffffffffffp0 },
    { "MIN_VALUE", 9, 0x1p-1074 },
    { "NaN", 3, NAN },
    { "NEGATIVE_INFINITY", 17, -INFINITY },
    { "POSITIVE_INFINITY", 17, INFINITY }
};

static void number_constructor_install_static_methods(tsc_value_t constructor) {
    void* volatile constructor_gc_root = tsc_value_gc_root(constructor);
    (void)constructor_gc_root;
    for (size_t index = 0; index < sizeof(number_predicates) / sizeof(number_predicates[0]); ++index) {
        const tsc_number_predicate_descriptor_t* descriptor = &number_predicates[index];
        tsc_str_t* name = tsc_str_from_lit(descriptor->name, descriptor->name_length);
        (void)tsc_value_define_property_desc(constructor, name,
            tsc_value_function_builtin_named(number_static_predicate_apply, (void*)descriptor, 1.0, name),
            true, true, true, false, true, true, true);
    }
    for (size_t index = 0; index < sizeof(number_constants) / sizeof(number_constants[0]); ++index) {
        const tsc_number_constant_descriptor_t* descriptor = &number_constants[index];
        (void)tsc_value_define_property_desc(constructor,
            tsc_str_from_lit(descriptor->name, descriptor->name_length), tsc_value_num(descriptor->value),
            true, false, true, false, true, false, true);
    }
    // These properties hold the actual global parser intrinsics. The shared
    // callable registry retains their identity within each creation Realm.
    for (size_t index = 0; index < sizeof(global_function_descriptors) / sizeof(global_function_descriptors[0]); ++index) {
        const tsc_global_function_descriptor_t* descriptor = &global_function_descriptors[index];
        if (descriptor->kind != TSC_GLOBAL_FUNCTION_PARSE_FLOAT && descriptor->kind != TSC_GLOBAL_FUNCTION_PARSE_INT) continue;
        (void)tsc_value_define_property_desc(constructor,
            tsc_str_from_lit(descriptor->name, descriptor->name_length), global_function_intrinsic_value(descriptor),
            true, true, true, false, true, true, true);
    }
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
#define TSC_GLOBAL_INTRINSIC(name, value) { #name, sizeof(#name) - 1, value },
#define TSC_GLOBAL_FUNCTION(name, length, kind, constructible, enumerable, required)
#define TSC_GLOBAL_VALUE(name, value, writable, configurable)
#include "tsc_global_bindings.def"
#undef TSC_GLOBAL_INTRINSIC
#undef TSC_GLOBAL_FUNCTION
#undef TSC_GLOBAL_VALUE
    };
    tsc_object_t* built = tsc_object_new();
    tsc_value_t built_value = tsc_value_object(built);
#define TSC_GLOBAL_INTRINSIC(name, value)
#define TSC_GLOBAL_FUNCTION(name, length, kind, constructible, enumerable, required)
#define TSC_GLOBAL_VALUE(name, value, writable, configurable) \
    (void)tsc_object_define(built, tsc_str_from_lit(#name, sizeof(#name) - 1), \
        value, writable, false, configurable);
#include "tsc_global_bindings.def"
#undef TSC_GLOBAL_INTRINSIC
#undef TSC_GLOBAL_FUNCTION
#undef TSC_GLOBAL_VALUE

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
            global_function_intrinsic_value(descriptor),
            true,
            descriptor->enumerable,
            true
        );
    }

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
    void* volatile arguments_root = tsc_value_gc_root(args);
    if (
        !value_is_box(args) ||
        (
            value_tag(args) != TSC_VALUE_TAG_ARRAY &&
            value_tag(args) != TSC_VALUE_TAG_OBJECT &&
            value_tag(args) != TSC_VALUE_TAG_FUNCTION
        )
    ) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr(message));
    }
    tsc_value_t length_value = tsc_value_get_prop(args, tsc_str_from_lit("length", 6));
    double length_num = tsc_value_to_number(length_value);
    if (isnan(length_num) || length_num <= 0.0) length_num = 0.0;
    else if (isinf(length_num) || length_num >= 9007199254740991.0) {
        length_num = 9007199254740991.0;
    } else length_num = floor(length_num);
    size_t length = (size_t)length_num;
    tsc_array_t* list = tsc_array_new(sizeof(tsc_value_t), length ? length : 1);
    for (size_t i = 0; i < length; i++) {
        tsc_value_t item = tsc_value_get_index(args, (double)i);
        void* volatile item_root = tsc_value_gc_root(item);
        tsc_array_push_value(list, item);
        (void)item_root;
    }
    (void)arguments_root;
    return list;
}

typedef struct tsc_callee_frame {
    struct tsc_callee_frame* prev;
    tsc_value_t value;
    tsc_value_t new_target;
    tsc_environment_t* constructor_environment;
} tsc_callee_frame_t;

static TSC_TLS tsc_callee_frame_t* value_current_callee = NULL;

tsc_value_t tsc_value_current_callee(void) {
    return value_current_callee
        ? value_current_callee->value
        : tsc_value_undefined();
}

tsc_environment_t* tsc_value_current_constructor_environment(void) {
    return value_current_callee ? value_current_callee->constructor_environment : NULL;
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
        case TSC_INTRINSIC_DEFAULT_GENERATOR_FUNCTION_PROTOTYPE:
            return tsc_dynamic_function_prototype(TSC_DYNAMIC_FUNCTION_GENERATOR);
        case TSC_INTRINSIC_DEFAULT_ASYNC_FUNCTION_PROTOTYPE:
            return tsc_dynamic_function_prototype(TSC_DYNAMIC_FUNCTION_ASYNC);
        case TSC_INTRINSIC_DEFAULT_ASYNC_GENERATOR_FUNCTION_PROTOTYPE:
            return tsc_dynamic_function_prototype(TSC_DYNAMIC_FUNCTION_ASYNC_GENERATOR);
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
        case TSC_INTRINSIC_DEFAULT_WEAK_MAP_PROTOTYPE:
            return tsc_weak_map_prototype_value();
        case TSC_INTRINSIC_DEFAULT_WEAK_SET_PROTOTYPE:
            return tsc_weak_set_prototype_value();
        case TSC_INTRINSIC_DEFAULT_WEAK_REF_PROTOTYPE:
            return tsc_weak_ref_prototype_value();
        case TSC_INTRINSIC_DEFAULT_FINALIZATION_REGISTRY_PROTOTYPE:
            return tsc_finalization_registry_prototype_value();
        case TSC_INTRINSIC_DEFAULT_URL_PROTOTYPE:
            return tsc_url_prototype_value();
        case TSC_INTRINSIC_DEFAULT_URL_SEARCH_PARAMS_PROTOTYPE:
            return tsc_url_search_params_prototype_value();
        case TSC_INTRINSIC_DEFAULT_REGEXP_PROTOTYPE:
            return tsc_regexp_prototype_value();
        case TSC_INTRINSIC_DEFAULT_PROMISE_PROTOTYPE:
            return tsc_promise_prototype_value();
        case TSC_INTRINSIC_DEFAULT_MAP_PROTOTYPE:
            return tsc_map_prototype_value();
        case TSC_INTRINSIC_DEFAULT_SET_PROTOTYPE:
            return tsc_set_prototype_value();
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

/* GetPrototypeFromConstructor is shared by ordinary and exotic allocation. */
tsc_value_t tsc_value_get_prototype_from_constructor(
    tsc_value_t constructor, tsc_intrinsic_default_prototype_kind_t kind
) {
    tsc_value_t prototype = tsc_value_get_prop(constructor, tsc_str_from_lit("prototype", 9));
    if (!tsc_value_is_object(prototype)) {
        tsc_realm_t* realm = tsc_value_function_realm(constructor);
        tsc_realm_t* previous = tsc_realm_swap(realm);
        prototype = value_intrinsic_default_prototype(kind);
        (void)tsc_realm_swap(previous);
    }
    return prototype;
}

static tsc_value_t tsc_value_apply_with_activation(
    tsc_value_t fn, tsc_value_t this_arg, tsc_value_t args,
    tsc_value_t callee, tsc_value_t new_target, tsc_environment_t* constructor_environment
);

tsc_value_t tsc_value_apply_function(tsc_value_t fn, tsc_value_t this_arg, tsc_value_t args) {
    return tsc_value_apply_with_activation(fn, this_arg, args, fn, tsc_value_undefined(), NULL);
}

void tsc_value_class_set_constructor_body(tsc_value_t constructor, tsc_value_t body) {
    if (!value_is_box(constructor) || value_tag(constructor) != TSC_VALUE_TAG_FUNCTION ||
        !value_is_box(body) || value_tag(body) != TSC_VALUE_TAG_FUNCTION)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("class constructor body requires callable owners"));
    void* volatile constructor_root = tsc_value_gc_root(constructor);
    void* volatile body_root = tsc_value_gc_root(body);
    (void)constructor_root;
    (void)body_root;
    tsc_function_identity_t* identity = (tsc_function_identity_t*)value_ptr(constructor);
    tsc_function_identity_t* body_identity = (tsc_function_identity_t*)value_ptr(body);
    identity->class_constructor_body = body;
    identity->class_constructor_body_root = tsc_value_gc_root(body);
    identity->length = body_identity->length;
    if (!tsc_value_define_property_desc(constructor, tsc_str_from_lit("length", 6),
            tsc_value_num(body_identity->length), true, false, true, false, true, true, true))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("class constructor length definition failed"));
}

tsc_value_t tsc_value_function_with_home_object(tsc_value_t function, tsc_value_t home_object) {
    if (!value_is_box(function) || value_tag(function) != TSC_VALUE_TAG_FUNCTION ||
        !tsc_value_is_object(home_object))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("method requires a callable and home object"));
    tsc_function_identity_t* identity = (tsc_function_identity_t*)value_ptr(function);
    identity->home_object = home_object;
    identity->home_object_root = tsc_value_gc_root(home_object);
    return function;
}

tsc_value_t tsc_value_current_home_object(void) {
    tsc_value_t function = tsc_value_current_callee();
    if (!value_is_box(function) || value_tag(function) != TSC_VALUE_TAG_FUNCTION)
        return tsc_value_undefined();
    return ((tsc_function_identity_t*)value_ptr(function))->home_object;
}

void tsc_value_class_set_heritage(tsc_value_t constructor, tsc_value_t superclass) {
    void* volatile constructor_root = tsc_value_gc_root(constructor);
    void* volatile superclass_root = tsc_value_gc_root(superclass);
    (void)constructor_root; (void)superclass_root;
    tsc_value_t parent = tsc_function_default_prototype();
    tsc_value_t prototype_parent = tsc_value_null();
    if (superclass != tsc_value_null()) {
        if (!tsc_value_is_constructable(superclass))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Class extends value is not a constructor or null"));
        parent = superclass;
        prototype_parent = tsc_value_get_prop(superclass, tsc_str_from_lit("prototype", 9));
        if (!tsc_value_is_object(prototype_parent) && prototype_parent != tsc_value_null())
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Superclass prototype must be an object or null"));
    }
    void* volatile prototype_root = tsc_value_gc_root(prototype_parent);
    (void)prototype_root;
    tsc_value_t prototype = tsc_value_get_prop(constructor, tsc_str_from_lit("prototype", 9));
    if (!tsc_value_set_prototype_of(constructor, parent) || !tsc_value_set_prototype_of(prototype, prototype_parent))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Class heritage prototype definition failed"));
    tsc_function_identity_t* identity = (tsc_function_identity_t*)value_ptr(constructor);
    identity->derived_class_constructor = true;
    identity->construct_allocates_receiver = false;
}

tsc_value_t tsc_value_class_construct_body(tsc_value_t constructor, tsc_value_t receiver, tsc_array_t* arguments) {
    void* volatile constructor_root = tsc_value_gc_root(constructor);
    void* volatile receiver_root = tsc_value_gc_root(receiver);
    (void)constructor_root; (void)receiver_root;
    tsc_function_identity_t* identity = (tsc_function_identity_t*)value_ptr(constructor);
    tsc_value_t new_target = tsc_value_current_new_target();
    void* volatile target_root = tsc_value_gc_root(new_target);
    (void)target_root;
    bool default_body = tsc_value_is_undefined(identity->class_constructor_body);
    tsc_environment_t* parent = default_body ? identity->lexical_environment
        : ((tsc_function_identity_t*)value_ptr(identity->class_constructor_body))->lexical_environment;
    tsc_environment_t* volatile environment = tsc_environment_constructor_new(parent, constructor, new_target,
        receiver, identity->derived_class_constructor);
    if (!identity->derived_class_constructor) tsc_value_class_initialize_elements(constructor, receiver, false);
    if (default_body) {
        if (identity->derived_class_constructor) return tsc_environment_super_construct(environment,
            tsc_environment_super_constructor(environment), tsc_value_array(arguments));
        return receiver;
    }
    tsc_value_t result = tsc_value_apply_with_activation(identity->class_constructor_body, receiver,
        tsc_value_array(arguments), constructor, new_target, environment);
    if (tsc_value_is_object(result)) return result;
    if (identity->derived_class_constructor && !tsc_value_is_undefined(result))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Derived constructor may only return an object or undefined"));
    return tsc_environment_get_this(environment);
}

static tsc_value_t tsc_value_apply_with_activation(
    tsc_value_t fn, tsc_value_t this_arg, tsc_value_t args,
    tsc_value_t callee, tsc_value_t new_target, tsc_environment_t* constructor_environment
) {
    // The canonical invocation owns its encoded operands across argument-list
    // materialization and arbitrary user callbacks, including native callers.
    void* volatile invocation_roots[] = {
        tsc_value_gc_root(fn), tsc_value_gc_root(this_arg), tsc_value_gc_root(args),
        tsc_value_gc_root(callee), tsc_value_gc_root(new_target)
    };
    (void)invocation_roots;
    if (value_is_box(fn) && value_tag(fn) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(fn);
        if (o->is_proxy) {
            if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'apply' on a proxy that has been revoked"));
            if (!value_is_callable_function(o->proxy_target)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy apply target must be callable"));
            }
            tsc_array_t* list = value_to_argument_list(args, "Reflect.apply argumentsList must be an array or array-like object");
            tsc_array_t* volatile arguments_root = list;
            (void)arguments_root;
            tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("apply", 5));
            void* volatile trap_root = tsc_value_gc_root(trap);
            (void)trap_root;
            if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
                return tsc_value_apply_function(o->proxy_target, this_arg, tsc_value_array(list));
            }
            if (!value_is_callable_function(trap)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy apply trap must be callable"));
            }
            tsc_array_t* trap_args = tsc_array_new(sizeof(tsc_value_t), 4);
            tsc_array_push_value(trap_args, o->proxy_target);
            tsc_array_push_value(trap_args, this_arg);
            tsc_array_push_value(trap_args, tsc_value_array(list));
            return tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(trap_args));
        }
    }
    if (!value_is_box(fn) || value_tag(fn) != TSC_VALUE_TAG_FUNCTION) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Reflect.apply target is not a function")
        );
    }
    tsc_array_t* list = value_to_argument_list(args, "Reflect.apply argumentsList must be an array or array-like object");
    tsc_array_t* volatile arguments_root = list;
    (void)arguments_root;
    tsc_function_identity_t* ident = (tsc_function_identity_t*)value_ptr(fn);
    tsc_realm_t* previous_realm = tsc_realm_swap(
        ident->realm ? ident->realm : tsc_realm_current()
    );
    /* Native built-ins and bound forwarding have no source Parse Nodes of
     * their own. Their source callbacks enter their retained owner context. */
    tsc_parse_unit_t* previous_unit = tsc_parse_unit_current();
    tsc_environment_t* previous_environment = tsc_environment_current();
    if (ident->kind != TSC_FUNCTION_IDENTITY_BUILTIN && ident->kind != TSC_FUNCTION_IDENTITY_BOUND)
        (void)tsc_parse_unit_swap(ident->parse_unit);
    if (ident->kind != TSC_FUNCTION_IDENTITY_BUILTIN && ident->kind != TSC_FUNCTION_IDENTITY_BOUND)
        (void)tsc_environment_swap(ident->lexical_environment);
    if (ident->kind == TSC_FUNCTION_IDENTITY_GETTER) {
        tsc_value_t result = ident->code.getter(ident->env, this_arg);
        (void)tsc_parse_unit_swap(previous_unit);
        (void)tsc_environment_swap(previous_environment);
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
            .value = callee,
            .new_target = new_target,
            .constructor_environment = constructor_environment,
        };
        value_current_callee = &frame;
        tsc_value_t result = ident->code.generic(ident->env, this_arg, list);
        value_current_callee = frame.prev;
        (void)tsc_parse_unit_swap(previous_unit);
        (void)tsc_environment_swap(previous_environment);
        (void)tsc_realm_swap(previous_realm);
        return result;
    }
    if (ident->kind == TSC_FUNCTION_IDENTITY_EVENT_LISTENER) {
        ident->code.event_listener.fn(ident->env, NULL, list);
        (void)tsc_parse_unit_swap(previous_unit);
        (void)tsc_environment_swap(previous_environment);
        (void)tsc_realm_swap(previous_realm);
        return tsc_value_undefined();
    }
    if (ident->kind == TSC_FUNCTION_IDENTITY_EVENT_RAW_LISTENER) {
        ident->code.event_raw_identity.fn(ident->env, NULL, list);
        (void)tsc_parse_unit_swap(previous_unit);
        (void)tsc_environment_swap(previous_environment);
        (void)tsc_realm_swap(previous_realm);
        return tsc_value_undefined();
    }
    if (ident->kind != TSC_FUNCTION_IDENTITY_SETTER) {
        (void)tsc_parse_unit_swap(previous_unit);
        (void)tsc_environment_swap(previous_environment);
        (void)tsc_realm_swap(previous_realm);
        tsc_panic("Reflect.apply target is not a callable function identity");
    }
    tsc_value_t value = list->len > 0 ? TSC_ARR(tsc_value_t, list, 0) : tsc_value_undefined();
    ident->code.setter(ident->env, this_arg, value);
    (void)tsc_parse_unit_swap(previous_unit);
    (void)tsc_environment_swap(previous_environment);
    (void)tsc_realm_swap(previous_realm);
    return tsc_value_undefined();
}

tsc_value_t tsc_value_species_constructor(tsc_value_t object, tsc_value_t default_constructor) {
    tsc_value_t constructor = tsc_value_get_prop(object, tsc_str_from_lit("constructor", 11));
    if (tsc_value_is_undefined(constructor)) return default_constructor;
    if (!tsc_value_is_object(constructor))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Species constructor property must be an object"));
    void* volatile constructor_gc_root = tsc_value_gc_root(constructor);
    (void)constructor_gc_root;
    tsc_value_t species = tsc_value_get_symbol_prop(constructor, tsc_symbol_species());
    if (tsc_value_is_nullish(species)) return default_constructor;
    if (!tsc_value_is_constructable(species))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Species must be a constructor"));
    return species;
}

static tsc_value_t construct_from_argument_list(
    tsc_value_t target,
    tsc_array_t* list,
    tsc_value_t new_target
) {
    void* volatile construction_roots[] = {
        tsc_value_gc_root(target), list, tsc_value_gc_root(new_target)
    };
    (void)construction_roots;
    if (value_is_box(target) && value_tag(target) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* ident = (tsc_function_identity_t*)value_ptr(target);
        if (ident->kind == TSC_FUNCTION_IDENTITY_BOUND) {
            tsc_bound_function_env_t* bound = (tsc_bound_function_env_t*)ident->env;
            const tsc_value_t effective_new_target = new_target == target
                ? bound->target
                : new_target;
            return construct_from_argument_list(
                bound->target,
                bound_function_arguments(bound, list),
                effective_new_target
            );
        }
        if (ident->kind == TSC_FUNCTION_IDENTITY_GENERIC || ident->construct != NULL) {
            tsc_value_t receiver = tsc_value_undefined();
            if (ident->construct_allocates_receiver) {
                tsc_value_t new_target_proto = tsc_value_get_prototype_from_constructor(
                    new_target, ident->construct_default_prototype
                );
                void* volatile prototype_root = tsc_value_gc_root(new_target_proto);
                (void)prototype_root;
                receiver = tsc_value_object(
                    tsc_object_new_with_prototype(new_target_proto)
                );
            }
            // A constructor can allocate or collect before decoding this
            // freshly allocated, otherwise only NaN-boxed receiver.
            void* volatile receiver_root = tsc_value_gc_root(receiver);
            (void)receiver_root;
            tsc_generic_function_t construct = ident->construct ? ident->construct : ident->code.generic;
            tsc_realm_t* previous_realm = tsc_realm_swap(
                ident->realm ? ident->realm : tsc_realm_current()
            );
            tsc_parse_unit_t* previous_unit = tsc_parse_unit_current();
            tsc_environment_t* previous_environment = tsc_environment_current();
            if (ident->kind != TSC_FUNCTION_IDENTITY_BUILTIN)
                (void)tsc_parse_unit_swap(ident->parse_unit);
            if (ident->kind != TSC_FUNCTION_IDENTITY_BUILTIN)
                (void)tsc_environment_swap(ident->lexical_environment);
            tsc_callee_frame_t frame = {
                .prev = value_current_callee,
                .value = target,
                .new_target = new_target,
            };
            value_current_callee = &frame;
            tsc_value_t result = construct(ident->env, receiver, list);
            value_current_callee = frame.prev;
            (void)tsc_parse_unit_swap(previous_unit);
            (void)tsc_environment_swap(previous_environment);
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
            if (!ident->construct_allocates_receiver) {
                tsc_throw_error(
                    TSC_ERROR_TYPE,
                    tsc_str_from_cstr("exotic constructor must return an object")
                );
            }
            return receiver;
        }
    }
    if (value_is_box(target) && value_tag(target) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(target);
        if (o->is_proxy) {
            if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'construct' on a proxy that has been revoked"));
            tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("construct", 9));
            void* volatile trap_root = tsc_value_gc_root(trap);
            (void)trap_root;
            if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
                return construct_from_argument_list(o->proxy_target, list, new_target);
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

tsc_value_t tsc_value_construct(tsc_value_t target, tsc_value_t args) {
    return tsc_value_construct_with_new_target(target, args, target);
}

tsc_value_t tsc_value_construct_with_new_target(
    tsc_value_t target,
    tsc_value_t args,
    tsc_value_t new_target
) {
    void* volatile construction_roots[] = {
        tsc_value_gc_root(target), tsc_value_gc_root(args), tsc_value_gc_root(new_target)
    };
    (void)construction_roots;
    if (!tsc_value_is_constructable(target)) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Reflect.construct target is not a supported constructor")
        );
    }
    if (!tsc_value_is_constructable(new_target)) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Reflect.construct newTarget is not a constructor")
        );
    }
    tsc_array_t* list = value_to_argument_list(
        args,
        "Reflect.construct argumentsList must be an array or array-like object"
    );
    return construct_from_argument_list(target, list, new_target);
}


static tsc_value_t tsc_function_own_prototype(tsc_function_identity_t* ident, tsc_value_t fn) {
    if (!ident) return tsc_value_undefined();
    if (!ident->func_prototype_initialized) {
        /* MakeConstructor's default object belongs to the function's creation
         * Realm. Materialization may be triggered by a read or descriptor
         * operation in any other Realm. Keep the callable owner rooted while
         * allocating its retained prototype through the common object path. */
        void* volatile function_root = tsc_value_gc_root(fn);
        tsc_realm_t* previous_realm = tsc_realm_swap(ident->realm);
        tsc_object_t* proto = tsc_object_new();
        tsc_object_define(
            proto,
            tsc_str_from_lit("constructor", 11),
            fn,
            true,
            false,
            true
        );
        tsc_function_identity_set_own_prototype(ident, tsc_value_object(proto));
        (void)tsc_realm_swap(previous_realm);
        (void)function_root;
    }
    return ident->func_prototype;
}

static bool tsc_function_has_prototype_metadata(const tsc_function_identity_t* fn) {
    return fn && fn->has_prototype_property;
}

static bool tsc_function_metadata_key(const tsc_function_identity_t* fn, const tsc_str_t* key) {
    return str_lit_eq(key, "prototype") && tsc_function_has_prototype_metadata(fn);
}

tsc_value_t tsc_value_get_prop(tsc_value_t v, const tsc_str_t* key) {
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_GET_PROP);
    if (!value_is_box(v)) {
        return tsc_value_get_prop_receiver(primitive_prototype(&primitive_number), key, v);
    }
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
        if (a->props && tsc_object_has_own(a->props, key)) {
            return tsc_object_get_receiver(a->props, key, v);
        }
        return tsc_value_get_prop_receiver(a->prototype, key, v);
    }
    if (value_tag(v) == TSC_VALUE_TAG_STRING) {
        const tsc_str_t* s = (const tsc_str_t*)value_ptr(v);
        size_t length = tsc_str_utf16_length(s);
        if (tsc_str_is_length_key(key)) return tsc_value_num((double)length);
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx) && idx < length) {
            return tsc_value_string(tsc_str_char_at(s, (double)idx));
        }
        return tsc_value_get_prop_receiver(tsc_value_string_prototype(), key, v);
    }
    if (value_tag(v) == TSC_VALUE_TAG_FALSE || value_tag(v) == TSC_VALUE_TAG_TRUE) {
        return tsc_value_get_prop_receiver(primitive_prototype(&primitive_boolean), key, v);
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
        return object_prop_data_value(o, prop);
    }
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_MISS);
    ssize_t idx = object_find(o, key);
    if (idx >= 0) {
        prop_cache_store(cache, o, (size_t)idx);
        const tsc_object_prop_t* prop = &o->props[(size_t)idx];
        if (prop->accessor) return prop->getter ? prop->getter(prop->getter_env, v) : tsc_value_undefined();
        return object_prop_data_value(o, prop);
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
        if (a->props && tsc_object_has_own(a->props, key)) {
            return tsc_object_get_receiver(a->props, key, receiver);
        }
        return tsc_value_get_prop_receiver(a->prototype, key, receiver);
    }
    if (value_tag(v) == TSC_VALUE_TAG_STRING) {
        const tsc_str_t* string = (const tsc_str_t*)value_ptr(v);
        size_t length = tsc_str_utf16_length(string);
        if (tsc_str_is_length_key(key)) return tsc_value_num((double)length);
        size_t index = 0;
        if (tsc_str_array_index(key, &index) && index < length) {
            return tsc_value_string(tsc_str_char_at(string, (double)index));
        }
        return tsc_value_get_prop_receiver(
            tsc_value_string_prototype(),
            key,
            receiver
        );
    }
    if (value_tag(v) == TSC_VALUE_TAG_BIGINT) {
        return tsc_value_get_prop_receiver(tsc_value_bigint_prototype(), key, receiver);
    }
    if (value_tag(v) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_value_get_prop_receiver(tsc_value_symbol_prototype(), key, receiver);
    }
    if (value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* ident = (tsc_function_identity_t*)value_ptr(v);
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
        return object_prop_data_value(o, prop);
    }
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_MISS);
    ssize_t idx = object_find(o, key);
    if (idx >= 0) {
        prop_cache_store(cache, o, (size_t)idx);
        const tsc_object_prop_t* prop = &o->props[(size_t)idx];
        if (prop->accessor) return prop->getter ? prop->getter(prop->getter_env, receiver) : tsc_value_undefined();
        return object_prop_data_value(o, prop);
    }
    return tsc_object_get_receiver(o, key, receiver);
}

tsc_value_t tsc_value_get_index(tsc_value_t v, double index) {
    if (!value_is_box(v)) return tsc_value_undefined();
    if (value_tag(v) == TSC_VALUE_TAG_STRING) {
        const tsc_str_t* s = (const tsc_str_t*)value_ptr(v);
        if (isnan(index) || isinf(index) || index < 0 || floor(index) != index ||
            (size_t)index >= tsc_str_utf16_length(s)) {
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
    tsc_str_t* key = tsc_str_from_int((int64_t)idx);
    bool exists = idx < a->len && tsc_array_index_present(a, idx);
    if (!exists && a->props && tsc_object_has_own(a->props, key)) exists = true;
    if (!exists && !a->extensible) return false;
    if (idx >= a->len && !a->length_writable) return false;
    if (a->props && tsc_object_has_own(a->props, key))
        return value_set_receiver_own_data(tsc_value_object(a->props), key, value);
    tsc_array_use_value_storage(a);
    if (idx <= a->dense_len) {
        tsc_array_reserve(a, idx + 1);
        tsc_array_store_raw(a, idx, &value);
        if (idx >= a->len) a->len = idx + 1;
        tsc_array_clear_hole(a, idx);
    } else {
        if (!tsc_object_define(a->props, key, value, true, true, true)) return false;
        if (idx >= a->len) a->len = idx + 1;
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

static void array_discard_dense_tail(tsc_array_t* array, size_t length) {
    if (length >= array->dense_len) return;
    size_t count = array->dense_len - length;
    memset((char*)array->data + length * array->es, 0, count * array->es);
    if (array->value_roots) memset(array->value_roots + length, 0, count * sizeof(void*));
    array->dense_len = length;
}

/* ArraySetLength consumes one descriptor and one descending own-index List.
 * ToUint32 and ToNumber are distinct, ordered conversions of the original. */
static bool array_define_length_desc(tsc_array_t* array, tsc_value_t value, bool has_value,
    bool writable, bool has_writable, bool enumerable, bool has_enumerable,
    bool configurable, bool has_configurable) {
    void* volatile array_root = array;
    void* volatile value_root = tsc_value_gc_root(value);
    size_t length = array->len;
    if (has_value) {
        uint32_t uint_length = tsc_to_uint32(tsc_value_to_number(value));
        double number_length = tsc_value_to_number(value);
        if ((double)uint_length != number_length)
            tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Invalid array length"));
        length = uint_length;
    }
    size_t old_length = array->len;
    bool current_writable = array->length_writable;
    if ((has_enumerable && enumerable) || (has_configurable && configurable) ||
        (!current_writable && has_writable && writable)) return false;
    if (!current_writable) return !has_value || length == old_length;
    if (!has_value || length >= old_length) {
        if (has_value) array->len = length;
        if (has_writable && !writable) array->length_writable = false;
        return true;
    }
    tsc_array_t* volatile indices = tsc_array_own_indices(array);
    array->len = length;
    for (size_t cursor = indices->len; cursor > 0; --cursor) {
        size_t index = TSC_ARR(size_t, indices, cursor - 1);
        if (index < length) break;
        if (!tsc_value_delete_prop(tsc_value_array(array), tsc_str_from_int((int64_t)index))) {
            array->len = index + 1;
            array_discard_dense_tail(array, array->len);
            if (has_writable && !writable) array->length_writable = false;
            return false;
        }
    }
    array_discard_dense_tail(array, length);
    if (has_writable && !writable) array->length_writable = false;
    (void)array_root; (void)value_root;
    return true;
}

bool tsc_value_array_set_length(tsc_array_t* array, tsc_value_t value) {
    if (!array || !array->length_writable) return false;
    return array_define_length_desc(array, value, true, false, false, false, false, false, false);
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
        current_writable = fn->func_prototype_writable;
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
            return array_define_length_desc(a, value, has_value, writable, has_writable,
                enumerable, has_enumerable, configurable, has_configurable);
        }
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx)) {
            bool side_exists = a->props && tsc_object_has_own(a->props, key);
            if (side_exists) {
                bool ok = tsc_object_define_desc(a->props, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
                if (ok && has_value) tsc_array_use_value_storage(a);
                return ok;
            }
            bool exists = tsc_array_index_present(a, idx);
            bool current_writable = true;
            bool current_enumerable = true;
            bool current_configurable = true;
            bool next_writable = has_writable ? writable : (exists ? current_writable : false);
            bool next_enumerable = has_enumerable ? enumerable : (exists ? current_enumerable : false);
            bool next_configurable = has_configurable ? configurable : (exists ? current_configurable : false);
            if (exists) {
                if (next_writable == current_writable && next_enumerable == current_enumerable && next_configurable == current_configurable) {
                    if (!has_value) return true;
                    return tsc_value_set_array_own_index(v, idx, value);
                }
                tsc_value_t current = tsc_value_get_index(v, (double)idx);
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
            if (has_value && next_writable && next_enumerable && next_configurable) {
                return tsc_value_set_array_own_index(v, idx, value);
            }
            bool ok = tsc_object_define_desc(a->props, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
            if (ok && idx >= a->len) a->len = idx + 1;
            return ok;
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

/* A scope owns one acquired-resource stack. Entries capture GetMethod at
 * initialization, and retain decoded roots independently of binding storage. */
typedef struct tsc_disposable_resource {
    struct tsc_disposable_resource* previous;
    tsc_value_t value;
    tsc_value_t method;
    void* value_gc_root;
    void* method_gc_root;
    bool asynchronous;
    bool synchronous_fallback;
} tsc_disposable_resource_t;

struct tsc_dispose_capability {
    tsc_disposable_resource_t* top;
    tsc_disposable_resource_t* current;
    tsc_promise_t* pending;
    bool needs_await;
    bool has_awaited;
};

tsc_dispose_capability_t* tsc_dispose_capability_new(void) {
    tsc_dispose_capability_t* capability = TSC_GC_MALLOC(sizeof(*capability));
    *capability = (tsc_dispose_capability_t){0};
    return capability;
}

tsc_value_t tsc_dispose_capability_add(tsc_dispose_capability_t* capability, tsc_value_t value, bool asynchronous) {
    tsc_value_t method = tsc_value_undefined();
    bool fallback = false;
    void* volatile value_gc_root = tsc_value_gc_root(value);
    if (tsc_value_is_nullish(value)) {
        if (!asynchronous) return value;
    } else {
        if (!tsc_value_is_object(value))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Disposable resource must be an object"));
        if (asynchronous) method = tsc_value_get_symbol_prop(value, tsc_symbol_async_dispose());
        if (!asynchronous || tsc_value_is_nullish(method)) {
            method = tsc_value_get_symbol_prop(value, tsc_symbol_dispose());
            fallback = asynchronous;
        }
        if (!tsc_value_is_callable(method))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Resource disposal method is not callable"));
    }
    void* volatile method_gc_root = tsc_value_gc_root(method);
    tsc_disposable_resource_t* resource = TSC_GC_MALLOC(sizeof(*resource));
    *resource = (tsc_disposable_resource_t){ .previous = capability->top,
        .value = value, .method = method, .value_gc_root = value_gc_root,
        .method_gc_root = method_gc_root, .asynchronous = asynchronous,
        .synchronous_fallback = fallback };
    capability->top = resource;
    return value;
}

static void dispose_accumulate_error(tsc_completion_record_t* completion, tsc_value_t error) {
    void* volatile error_gc_root = tsc_value_gc_root(error);
    if (completion->kind == TSC_COMPLETION_THROW)
        error = tsc_value_error(tsc_suppressed_error_new(error, completion->value, NULL));
    tsc_completion_record_set(completion, TSC_COMPLETION_THROW, error, -1);
    (void)error_gc_root;
}

/* Return only the next semantic Await operand. The resumable graph awaits
 * it directly and re-enters this worklist; there is no aggregate Promise or
 * extra reaction between DisposeResources and its enclosing completion. */
tsc_promise_t* tsc_dispose_resources_async_step(tsc_dispose_capability_t* capability, tsc_completion_record_t* completion) {
    while (capability->top) {
        tsc_disposable_resource_t* resource = capability->top;
        if (!resource->asynchronous && capability->needs_await && !capability->has_awaited) {
            capability->needs_await = false;
            return capability->pending = tsc_promise_resolve(tsc_value_undefined());
        }
        capability->top = resource->previous;
        capability->current = resource;
        if (tsc_value_is_undefined(resource->method)) {
            capability->needs_await = true;
            capability->current = NULL;
            continue;
        }
        TSC_TRY_FRAME(frame);
        tsc_try_push(&frame);
        if (setjmp(frame.jb) == 0) {
            tsc_value_t result = tsc_value_apply_function(resource->method, resource->value,
                tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 0)));
            tsc_try_pop();
            if (resource->asynchronous) {
                capability->has_awaited = true;
                capability->pending = resource->synchronous_fallback
                    ? tsc_promise_resolve(tsc_value_undefined()) : tsc_promise_resolve_thenable(result);
                capability->current = NULL;
                return capability->pending;
            }
        } else {
            tsc_value_t error = tsc_current_error_value();
            void* volatile error_gc_root = tsc_value_gc_root(error);
            tsc_try_pop();
            if (resource->synchronous_fallback) {
                capability->has_awaited = true;
                capability->pending = tsc_promise_reject(error);
                capability->current = NULL;
                return capability->pending;
            }
            dispose_accumulate_error(completion, error);
            (void)error_gc_root;
        }
        capability->current = NULL;
    }
    if (capability->needs_await && !capability->has_awaited) {
        capability->needs_await = false;
        return capability->pending = tsc_promise_resolve(tsc_value_undefined());
    }
    return NULL;
}

void tsc_dispose_resources_async_resume(tsc_dispose_capability_t* capability,
        tsc_completion_record_t* completion, tsc_promise_t* settled) {
    if (tsc_promise_is_rejected(settled)) dispose_accumulate_error(completion, tsc_promise_reason(settled));
    capability->pending = NULL;
}

void tsc_dispose_resources_sync(tsc_dispose_capability_t* capability, tsc_completion_record_t* completion) {
    if (tsc_dispose_resources_async_step(capability, completion))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Asynchronous resource requires a resumable disposal scope"));
}

static bool descriptor_field(tsc_value_t desc, const char* name, size_t len, tsc_value_t* out) {
    const tsc_str_t* key = tsc_str_from_lit(name, len);
    if (!tsc_value_has_prop(desc, key)) return false;
    if (out) *out = tsc_value_get_prop(desc, key);
    return true;
}

static void* dynamic_accessor_env(tsc_value_t fn) {
    void* volatile callable_gc_root = tsc_value_gc_root(fn);
    (void)callable_gc_root;
    struct { tsc_value_t callable; void* callable_gc_root; }* env = TSC_GC_MALLOC(sizeof(*env));
    env->callable = fn;
    env->callable_gc_root = tsc_value_gc_root(fn);
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
    void* value_gc_root;
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

static tsc_parsed_property_descriptor_t parse_property_descriptor(tsc_value_t desc) {
    if (!tsc_value_is_object(desc)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Property descriptor must be an object"));
    }
    void* volatile descriptor_gc_root = tsc_value_gc_root(desc);
    (void)descriptor_gc_root;
    tsc_parsed_property_descriptor_t out;
    memset(&out, 0, sizeof(out));
    out.value = tsc_value_undefined();
    tsc_value_t field = tsc_value_undefined();
    out.has_enumerable = descriptor_field(desc, "enumerable", 10, &field);
    if (out.has_enumerable) out.enumerable = tsc_value_is_truthy(field);
    out.has_configurable = descriptor_field(desc, "configurable", 12, &field);
    if (out.has_configurable) out.configurable = tsc_value_is_truthy(field);
    out.has_value = descriptor_field(desc, "value", 5, &out.value);
    out.value_gc_root = tsc_value_gc_root(out.value);
    void* volatile value_gc_root = out.value_gc_root;
    (void)value_gc_root;
    out.has_writable = descriptor_field(desc, "writable", 8, &field);
    if (out.has_writable) out.writable = tsc_value_is_truthy(field);
    out.has_getter = descriptor_field(desc, "get", 3, &field);
    if (out.has_getter && !tsc_value_is_undefined(field)) {
        if (!value_is_callable_function(field)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Property descriptor getter must be callable"));
        }
        out.getter = tsc_value_dynamic_accessor_getter;
        out.getter_env = dynamic_accessor_env(field);
    }
    out.has_setter = descriptor_field(desc, "set", 3, &field);
    if (out.has_setter && !tsc_value_is_undefined(field)) {
        if (!value_is_callable_function(field)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Property descriptor setter must be callable"));
        }
        out.setter = tsc_value_dynamic_accessor_setter;
        out.setter_env = dynamic_accessor_env(field);
    }
    out.accessor = out.has_getter || out.has_setter;
    if (out.accessor && (out.has_value || out.has_writable)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Property descriptor cannot mix data and accessor fields"));
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
    if (!tsc_value_is_object(v)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.defineProperty target must be an object"));
    }
    void* volatile target_gc_root = tsc_value_gc_root(v);
    (void)target_gc_root;
    tsc_parsed_property_descriptor_t parsed = parse_property_descriptor(desc);
    return apply_property_descriptor(v, key, &parsed);
}

bool tsc_value_define_computed_property_descriptor(
    tsc_value_t v,
    tsc_value_t key,
    tsc_value_t desc
) {
    if (!tsc_value_is_object(v)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.defineProperty target must be an object"));
    }
    void* volatile target_gc_root = tsc_value_gc_root(v);
    void* volatile descriptor_gc_root = tsc_value_gc_root(desc);
    void* volatile key_gc_root = tsc_value_gc_root(key);
    (void)target_gc_root; (void)descriptor_gc_root; (void)key_gc_root;
    key = tsc_value_to_property_key(key);
    tsc_str_t* property = value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL
        ? tsc_symbol_property_key((tsc_symbol_t*)value_ptr(key))
        : (tsc_str_t*)value_ptr(key);
    tsc_parsed_property_descriptor_t parsed = parse_property_descriptor(desc);
    return apply_property_descriptor(v, property, &parsed);
}

bool tsc_value_create_data_property(
    tsc_value_t v,
    tsc_value_t key,
    tsc_value_t value
) {
    void* volatile key_gc_root = tsc_value_gc_root(key);
    void* volatile value_gc_root = tsc_value_gc_root(value);
    (void)key_gc_root;
    (void)value_gc_root;
    key = tsc_value_to_property_key(key);
    void* volatile property_key_gc_root = tsc_value_gc_root(key);
    (void)property_key_gc_root;
    if (value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_value_define_symbol_property_desc(
            v,
            (tsc_symbol_t*)value_ptr(key),
            value,
            true,
            true,
            true,
            true,
            true,
            true,
            true
        );
    }
    return tsc_value_define_property_desc(
        v,
        (tsc_str_t*)value_ptr(key),
        value,
        true,
        true,
        true,
        true,
        true,
        true,
        true
    );
}

bool tsc_value_define_properties_descriptor_map(tsc_value_t v, tsc_value_t descriptors) {
    if (!tsc_value_is_object(v)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.defineProperties target must be an object"));
    }
    void* volatile target_gc_root = tsc_value_gc_root(v);
    (void)target_gc_root;
    descriptors = tsc_value_to_object(descriptors);
    void* volatile descriptors_gc_root = tsc_value_gc_root(descriptors);
    (void)descriptors_gc_root;
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
            if (side_exists) return tsc_object_define_accessor(a->props, key, getter, getter_env,
                has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable);
            bool exists = tsc_array_index_present(a, idx);
            if (exists) {
                bool current_configurable = true;
                bool next_configurable = has_configurable ? configurable : current_configurable;
                bool next_enumerable = has_enumerable ? enumerable : true;
                bool props_extensible = a->props->extensible;
                if (!side_exists) a->props->extensible = true;
                bool ok = tsc_object_define_accessor(a->props, key, getter, getter_env, has_getter, setter, setter_env, has_setter, next_enumerable, true, next_configurable, true);
                a->props->extensible = props_extensible;
                if (ok) tsc_array_clear_hole(a, idx);
                return ok;
            }
            if (!a->extensible || (idx >= a->len && !a->length_writable)) return false;
            bool ok = tsc_object_define_accessor(a->props, key, getter, getter_env, has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable);
            if (ok && idx >= a->len) a->len = idx + 1;
            return ok;
        }
        return tsc_object_define_accessor(a->props, key, getter, getter_env, has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable);
    }
    return false;
}

bool tsc_value_object_define_getter(tsc_value_t v, tsc_str_t* key, tsc_value_t getter) {
    void* volatile target_gc_root = tsc_value_gc_root(v);
    void* volatile getter_gc_root = tsc_value_gc_root(getter);
    (void)target_gc_root;
    (void)getter_gc_root;
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
    void* volatile target_gc_root = tsc_value_gc_root(v);
    void* volatile setter_gc_root = tsc_value_gc_root(setter);
    (void)target_gc_root;
    (void)setter_gc_root;
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

static tsc_str_t* computed_accessor_key(tsc_value_t key) {
    key = tsc_value_to_property_key(key);
    if (value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL) {
        return value_known_symbol_internal_key((tsc_symbol_t*)value_ptr(key));
    }
    return (tsc_str_t*)value_ptr(key);
}

bool tsc_value_object_define_computed_getter(
    tsc_value_t v,
    tsc_value_t key,
    tsc_value_t getter
) {
    void* volatile target_gc_root = tsc_value_gc_root(v);
    (void)target_gc_root;
    void* volatile key_gc_root = tsc_value_gc_root(key);
    void* volatile getter_gc_root = tsc_value_gc_root(getter);
    (void)key_gc_root;
    (void)getter_gc_root;
    return tsc_value_object_define_getter(v, computed_accessor_key(key), getter);
}

bool tsc_value_object_define_computed_setter(
    tsc_value_t v,
    tsc_value_t key,
    tsc_value_t setter
) {
    void* volatile target_gc_root = tsc_value_gc_root(v);
    (void)target_gc_root;
    void* volatile key_gc_root = tsc_value_gc_root(key);
    void* volatile setter_gc_root = tsc_value_gc_root(setter);
    (void)key_gc_root;
    (void)setter_gc_root;
    return tsc_value_object_define_setter(v, computed_accessor_key(key), setter);
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
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.create prototype must be an object or null"));
    }
    return tsc_value_object(tsc_object_new_with_prototype(prototype));
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

tsc_value_t tsc_value_object_get_prototype_of(tsc_value_t value) {
    tsc_value_t object = tsc_value_to_object(value);
    void* volatile object_root = tsc_value_gc_root(object); (void)object_root;
    return tsc_value_get_prototype_of(object);
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
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr(message));
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
    void* volatile value_gc_root = tsc_value_gc_root(value);
    (void)value_gc_root;
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_SET_PROP);
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_set((tsc_object_t*)value_ptr(v), key, value);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return tsc_value_set_prop_receiver(v, key, value, v);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(v);
        if (str_lit_eq(key, "__proto__")) {
            if (!value_is_valid_prototype(value)) return true;
            return tsc_value_set_prototype_of(v, value);
        }
        if (str_lit_eq(key, "prototype") && tsc_function_has_prototype_metadata(fn)) {
            if (!fn->func_prototype_writable) return false;
            tsc_function_identity_set_own_prototype(fn, value);
            return true;
        }
        if (tsc_function_metadata_key(fn, key)) return false;
        return tsc_value_set_prop_receiver(v, key, value, v);
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
    void* volatile set_value_gc_root = tsc_value_gc_root(value);
    (void)set_value_gc_root;
    tsc_object_prop_t* cached = prop_cache_lookup(cache, o, key);
    if (cached) {
        tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_PROP_CACHE_HIT);
        tsc_object_prop_t* prop = cached;
        if (prop->accessor) return prop->setter ? prop->setter(prop->setter_env, v, value) : false;
        if (!prop->writable) return false;
        prop->value = value;
        prop->value_gc_root = tsc_value_gc_root(value);
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
    void* volatile value_gc_root = tsc_value_gc_root(value);
    (void)value_gc_root;
    void* volatile receiver_gc_root = tsc_value_gc_root(receiver);
    (void)receiver_gc_root;
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_SET_PROP_RECEIVER);
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_set_receiver((tsc_object_t*)value_ptr(v), key, value, receiver);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(v);
        if (a->props && tsc_object_has_own(a->props, key))
            return tsc_object_set_receiver(a->props, key, value, receiver);
        size_t index;
        if (tsc_str_is_length_key(key)) {
            if (!a->length_writable) return false;
            return value_set_receiver_own_data(receiver, key, value);
        }
        if (tsc_str_array_index(key, &index) && tsc_array_index_present(a, index)) {
            return value_set_receiver_own_data(receiver, key, value);
        }
        if (tsc_value_is_object(a->prototype))
            return tsc_value_set_prop_receiver(a->prototype, key, value, receiver);
        return value_set_receiver_own_data(receiver, key, value);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(v);
        if (fn->props && tsc_object_has_own(fn->props, key)) {
            return tsc_object_set_receiver(fn->props, key, value, receiver);
        }
        if (!tsc_value_is_nullish(fn->prototype)) {
            return tsc_value_set_prop_receiver(fn->prototype, key, value, receiver);
        }
        return tsc_value_define_receiver_data(receiver, key, value);
    }
    return false;
}

bool tsc_value_set_prop_receiver_cached(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver, tsc_prop_cache_t* cache) {
    void* volatile value_gc_root = tsc_value_gc_root(value);
    (void)value_gc_root;
    void* volatile receiver_gc_root = tsc_value_gc_root(receiver);
    (void)receiver_gc_root;
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
        return tsc_str_array_index(key, &idx) && idx < tsc_str_utf16_length(s);
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
        return tsc_str_array_index(key, &idx) && idx < tsc_str_utf16_length(s);
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
        size_t idx;
        bool dense = tsc_str_array_index(key, &idx) && idx < a->dense_len &&
            (!a->holes || !tsc_object_has_own(a->holes, key));
        if (a->props && tsc_object_has_own(a->props, key)) {
            if (!tsc_object_delete(a->props, key)) return false;
            if (dense) {
                tsc_array_mark_hole(a, idx);
                memset((char*)a->data + idx * a->es, 0, a->es);
            }
            return true;
        }
        if (dense) {
            tsc_array_mark_hole(a, idx);
            memset((char*)a->data + idx * a->es, 0, a->es);
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

bool tsc_value_in(tsc_value_t key, tsc_value_t object) {
    void* volatile key_root = tsc_value_gc_root(key);
    void* volatile object_root = tsc_value_gc_root(object);
    (void)key_root;
    (void)object_root;
    if (!tsc_value_is_object(object)) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("in right operand must be an object"));
    return tsc_value_has_computed_prop(object, key);
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

/* SetIntegrityLevel and TestIntegrityLevel project the same actual own-key
 * List and descriptor owners across objects, arrays, callables and Proxies. */
static bool value_set_integrity_level(tsc_value_t object, bool frozen) {
    if (!tsc_value_is_object(object)) return true;
    void* volatile object_root = tsc_value_gc_root(object); (void)object_root;
    if (!tsc_value_prevent_extensions(object)) return false;
    tsc_array_t* volatile keys = tsc_value_raw_own_keys(object);
    for (size_t index = 0; index < keys->len; ++index) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, index);
        bool data = false;
        if (frozen) {
            tsc_value_t descriptor = tsc_value_get_own_property_descriptor(object, key);
            void* volatile descriptor_root = tsc_value_gc_root(descriptor); (void)descriptor_root;
            if (tsc_value_is_undefined(descriptor)) continue;
            data = tsc_value_has_own_prop(descriptor, tsc_str_from_lit("value", 5));
        }
        if (!tsc_value_define_property_desc(object, key, tsc_value_undefined(), false,
            false, data, false, false, false, true))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Integrity operation could not define a property"));
    }
    return true;
}

static bool value_test_integrity_level(tsc_value_t object, bool frozen) {
    if (!tsc_value_is_object(object)) return true;
    void* volatile object_root = tsc_value_gc_root(object); (void)object_root;
    if (tsc_value_is_extensible(object)) return false;
    tsc_array_t* volatile keys = tsc_value_raw_own_keys(object);
    for (size_t index = 0; index < keys->len; ++index) {
        tsc_value_t descriptor = tsc_value_get_own_property_descriptor(object, TSC_ARR(tsc_str_t*, keys, index));
        void* volatile descriptor_root = tsc_value_gc_root(descriptor); (void)descriptor_root;
        if (tsc_value_is_undefined(descriptor)) continue;
        if (tsc_value_is_truthy(tsc_value_get_prop(descriptor, tsc_str_from_lit("configurable", 12)))) return false;
        if (frozen && tsc_value_has_own_prop(descriptor, tsc_str_from_lit("value", 5)) &&
            tsc_value_is_truthy(tsc_value_get_prop(descriptor, tsc_str_from_lit("writable", 8)))) return false;
    }
    return true;
}

bool tsc_value_seal(tsc_value_t object) { return value_set_integrity_level(object, false); }
bool tsc_value_freeze(tsc_value_t object) { return value_set_integrity_level(object, true); }
bool tsc_value_is_sealed(tsc_value_t object) { return value_test_integrity_level(object, false); }
bool tsc_value_is_frozen(tsc_value_t object) { return value_test_integrity_level(object, true); }

tsc_array_t* value_array_keys(const tsc_array_t* src, bool include_length) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_str_t*), 0);
    if (!src) return out;
    tsc_array_t* indices = tsc_array_own_indices(src);
    for (size_t cursor = 0; cursor < indices->len; ++cursor) {
        tsc_str_t* key = tsc_str_from_int((int64_t)TSC_ARR(size_t, indices, cursor));
        if (include_length || tsc_array_property_is_enumerable_key(src, key)) tsc_array_push_raw(out, &key);
    }
    if (include_length) {
        tsc_str_t* length = tsc_str_from_lit("length", 6);
        tsc_array_push_raw(out, &length);
    }
    tsc_array_t* side_keys = include_length ? tsc_object_own_keys_dyn(src->props) : tsc_object_keys_dyn(src->props);
    for (size_t i = 0; i < side_keys->len; ++i) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, side_keys, i);
        size_t index;
        if (!value_is_known_symbol_internal_key(key) && !tsc_str_array_index(key, &index))
            tsc_array_push_raw(out, &key);
    }
    return out;
}

tsc_array_t* value_array_values(const tsc_array_t* src) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), 0);
    if (!src) return out;
    tsc_array_t* keys = value_array_keys(src, false);
    for (size_t cursor = 0; cursor < keys->len; ++cursor)
        tsc_array_push_value(out, tsc_value_get_prop(tsc_value_array((tsc_array_t*)src), TSC_ARR(tsc_str_t*, keys, cursor)));
    return out;
}

static tsc_array_t* value_array_iter_values(const tsc_array_t* src) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), src ? src->len : 1);
    if (!src || src->es != sizeof(tsc_value_t)) return out;
    tsc_value_t recv = tsc_value_array((tsc_array_t*)src);
    for (size_t i = 0; i < src->len; i++) {
        tsc_value_t value = tsc_value_get_index(recv, (double)i);
        tsc_array_push_raw(out, &value);
    }
    return out;
}



tsc_array_t* value_string_keys(const tsc_str_t* src, bool include_length) {
    size_t length = src ? tsc_str_utf16_length(src) : 0;
    size_t cap = length + (include_length ? 1 : 0);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_str_t*), cap ? cap : 1);
    if (!src) return out;
    for (size_t i = 0; i < length; i++) {
        tsc_str_t* key = tsc_str_from_int((int64_t)i);
        tsc_array_push_raw(out, &key);
    }
    if (include_length) {
        tsc_str_t* length = tsc_str_from_lit("length", 6);
        tsc_array_push_raw(out, &length);
    }
    return out;
}


static tsc_array_t* value_string_iterator_values(const tsc_str_t* src) {
    if (!src) return tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_array_t* chars = tsc_str_chars(src);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), chars->len ? chars->len : 1);
    for (size_t i = 0; i < chars->len; i++) {
        tsc_value_t value = tsc_value_string(TSC_ARR(tsc_str_t*, chars, i));
        tsc_array_push_raw(out, &value);
    }
    return out;
}


tsc_value_t value_descriptor_from_array_index(const tsc_array_t* src, size_t idx) {
    tsc_object_t* desc = tsc_object_new();
    tsc_value_t value = src->box_element
        ? src->box_element((const char*)src->data + idx * src->es)
        : TSC_ARR(tsc_value_t, src, idx);
    void* volatile value_root = tsc_value_gc_root(value); (void)value_root;
    tsc_object_set(desc, tsc_str_from_lit("value", 5), value);
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(true));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(true));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(true));
    return tsc_value_object(desc);
}

tsc_value_t value_descriptor_from_array_length(const tsc_array_t* src) {
    tsc_object_t* desc = tsc_object_new();
    tsc_object_set(desc, tsc_str_from_lit("value", 5), tsc_value_num((double)(src ? src->len : 0)));
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(src ? (src->length_writable) : true));
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
    if ((src->box_element || src->es == sizeof(tsc_value_t)) && tsc_str_array_index(key, &idx) && tsc_array_index_present(src, idx)) {
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
    tsc_object_set(desc, tsc_str_from_lit("value", 5), tsc_value_num((double)tsc_str_utf16_length(src)));
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(false));
    return tsc_value_object(desc);
}

tsc_value_t value_descriptor_from_string_key(const tsc_str_t* src, const tsc_str_t* key) {
    if (!src) return tsc_value_undefined();
    if (tsc_str_is_length_key(key)) return value_descriptor_from_string_length(src);
    size_t idx = 0;
    if (tsc_str_array_index(key, &idx) && idx < tsc_str_utf16_length(src)) {
        return value_descriptor_from_string_index(src, idx);
    }
    return tsc_value_undefined();
}

tsc_value_t value_descriptor_from_function_prototype(const tsc_function_identity_t* fn) {
    tsc_object_t* desc = tsc_object_new();
    tsc_function_identity_t* mutable_fn = (tsc_function_identity_t*)fn;
    tsc_value_t fn_value = mutable_fn
        ? value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)mutable_fn)
        : tsc_value_undefined();
    tsc_object_set(desc, tsc_str_from_lit("value", 5), tsc_function_own_prototype(mutable_fn, fn_value));
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(fn ? (fn->func_prototype_writable) : false));
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
        object_order_ordinary_keys(out);
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
        object_order_ordinary_keys(out);
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
    tsc_value_t object = tsc_value_to_object(v);
    void* volatile object_root = tsc_value_gc_root(object);
    (void)object_root;
    tsc_array_t* keys = tsc_value_raw_own_keys(object);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_symbol_t*), keys->len);
    for (size_t index = 0; index < keys->len; index++) {
        tsc_symbol_t* symbol = value_known_symbol_from_internal_key(TSC_ARR(tsc_str_t*, keys, index));
        if (symbol) tsc_array_push_raw(out, &symbol);
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

static void proxy_own_descriptor_error(void) {
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap violated its target descriptor"));
}

static tsc_value_t proxy_complete_own_descriptor(const tsc_object_t* proxy,
    tsc_str_t* key, tsc_value_t result) {
    void* volatile result_root = tsc_value_gc_root(result); (void)result_root;
    if (!tsc_value_is_undefined(result) && !tsc_value_is_object(result))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap must return object or undefined"));
    // Read the actual target descriptor before converting the trap result.
    // This also covers nested Proxies, native fields and virtual indexed data.
    tsc_value_t target = tsc_value_get_own_property_descriptor(proxy->proxy_target, key);
    void* volatile target_root = tsc_value_gc_root(target); (void)target_root;
    bool absent = tsc_value_is_undefined(target);
    bool configurable = !absent && tsc_value_is_truthy(tsc_value_get_prop(target, tsc_str_from_lit("configurable", 12)));
    if (tsc_value_is_undefined(result)) {
        if (!absent && (!configurable || !tsc_value_is_extensible(proxy->proxy_target))) proxy_own_descriptor_error();
        return result;
    }
    bool extensible = tsc_value_is_extensible(proxy->proxy_target);
    tsc_parsed_property_descriptor_t parsed = parse_property_descriptor(result);
    // The parsed record already defaults absent fields. Complete the same
    // record, then compare its semantic partition with the canonical target.
    tsc_object_prop_t complete = {0};
    complete.accessor = parsed.accessor;
    complete.value = parsed.value;
    complete.value_gc_root = parsed.value_gc_root;
    complete.writable = parsed.writable;
    complete.enumerable = parsed.enumerable;
    complete.configurable = parsed.configurable;
    complete.getter = parsed.getter;
    complete.setter = parsed.setter;
    complete.getter_value = parsed.getter_env ? *(tsc_value_t*)parsed.getter_env : tsc_value_undefined();
    complete.setter_value = parsed.setter_env ? *(tsc_value_t*)parsed.setter_env : tsc_value_undefined();
    void* volatile getter_root = tsc_value_gc_root(complete.getter_value);
    void* volatile setter_root = tsc_value_gc_root(complete.setter_value);
    (void)getter_root; (void)setter_root;
    if (absent) {
        if (!extensible || !complete.configurable) proxy_own_descriptor_error();
    } else if (!complete.configurable && configurable) {
        proxy_own_descriptor_error();
    } else if (!configurable) {
        bool target_accessor = tsc_value_has_own_prop(target, tsc_str_from_lit("get", 3));
        bool target_enumerable = tsc_value_is_truthy(tsc_value_get_prop(target, tsc_str_from_lit("enumerable", 10)));
        if (complete.configurable || complete.enumerable != target_enumerable || complete.accessor != target_accessor)
            proxy_own_descriptor_error();
        if (target_accessor) {
            if (!tsc_value_object_is(complete.getter_value, tsc_value_get_prop(target, tsc_str_from_lit("get", 3))) ||
                !tsc_value_object_is(complete.setter_value, tsc_value_get_prop(target, tsc_str_from_lit("set", 3))))
                proxy_own_descriptor_error();
        } else {
            bool target_writable = tsc_value_is_truthy(tsc_value_get_prop(target, tsc_str_from_lit("writable", 8)));
            if (complete.writable != target_writable || (!target_writable &&
                !tsc_value_object_is(complete.value, tsc_value_get_prop(target, tsc_str_from_lit("value", 5)))))
                proxy_own_descriptor_error();
        }
    }
    return value_descriptor_from_prop(&complete);
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
        if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'getOwnPropertyDescriptor' on a proxy that has been revoked"));
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
        return proxy_complete_own_descriptor(o, key, result);
    }
    size_t byte_index = 0; bool byte_valid;
    if (tsc_buffer_integer_index(o, key, &byte_index, &byte_valid)) {
        if (!byte_valid) return tsc_value_undefined();
        tsc_object_prop_t property = {0};
        property.value = tsc_value_num(((const tsc_buffer_t*)o->class_ptr)->data[byte_index]);
        property.writable = property.enumerable = property.configurable = true;
        return value_descriptor_from_prop(&property);
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
        tsc_object_prop_t effective = o->props[i];
        effective.value = object_prop_data_value(o, &o->props[i]);
        void* volatile value_root = tsc_value_gc_root(effective.value); (void)value_root;
        return value_descriptor_from_prop(&effective);
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


tsc_value_t tsc_value_get_own_property_descriptors(tsc_value_t value) {
    // One ToObject/OwnPropertyKeys/GetOwnProperty worklist serves every
    // represented object kind, including primitive String wrappers.
    void* volatile source_root = tsc_value_gc_root(value);
    tsc_value_t object = tsc_value_to_object(value);
    void* volatile object_root = tsc_value_gc_root(object);
    (void)source_root; (void)object_root;
    tsc_object_t* volatile out = tsc_object_new();
    tsc_array_t* volatile keys = tsc_value_raw_own_keys(object);
    for (size_t index = 0; index < keys->len; ++index) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, index);
        tsc_value_t descriptor = tsc_value_get_own_property_descriptor(object, key);
        if (tsc_value_is_undefined(descriptor)) continue;
        tsc_object_define(out, key, descriptor, true, true, true);
    }
    return tsc_value_object(out);

}

tsc_value_t tsc_value_object_assign(tsc_value_t target, tsc_value_t source) {
    target = tsc_value_to_object(target);
    void* volatile target_root = tsc_value_gc_root(target); (void)target_root;
    if (tsc_value_is_nullish(source)) return target;
    source = tsc_value_to_object(source);
    void* volatile source_root = tsc_value_gc_root(source); (void)source_root;
    tsc_array_t* volatile keys = tsc_value_raw_own_keys(source);
    for (size_t index = 0; index < keys->len; ++index) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, index);
        tsc_value_t descriptor = tsc_value_get_own_property_descriptor(source, key);
        void* volatile descriptor_root = tsc_value_gc_root(descriptor); (void)descriptor_root;
        if (tsc_value_is_undefined(descriptor) ||
            !tsc_value_is_truthy(tsc_value_get_prop(descriptor, tsc_str_from_lit("enumerable", 10)))) continue;
        tsc_value_t value = tsc_value_get_prop(source, key);
        void* volatile value_root = tsc_value_gc_root(value); (void)value_root;
        if (!tsc_value_set_prop(target, key, value))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Object.assign target set failed"));
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
void tsc_value_copy_data_properties_into(tsc_value_t target, tsc_value_t source, tsc_array_t* excluded_keys) {
    if (tsc_value_is_nullish(source)) return;
    void* volatile target_gc_root = tsc_value_gc_root(target);
    void* volatile source_gc_root = tsc_value_gc_root(source);
    (void)target_gc_root; (void)source_gc_root;
    tsc_array_t* volatile keys = tsc_value_raw_own_keys(source);
    for (size_t i = 0; i < keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
        if (copy_data_property_is_excluded(key, excluded_keys)) continue;
        if (!tsc_value_property_is_enumerable(source, key)) continue;
        tsc_value_t value = tsc_value_get_prop(source, key);
        void* volatile value_gc_root = tsc_value_gc_root(value);
        (void)value_gc_root;
        tsc_symbol_t* symbol = value_known_symbol_from_internal_key(key);
        tsc_value_t public_key = symbol ? tsc_value_symbol(symbol) : tsc_value_string(key);
        if (!tsc_value_create_data_property(target, public_key, value)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("CopyDataProperties could not create a property"));
        }
    }
}

tsc_value_t tsc_value_copy_data_properties(tsc_value_t source, tsc_array_t* excluded_keys) {
    tsc_object_t* target = tsc_object_new();
    tsc_value_t result = tsc_value_object(target);
    tsc_value_copy_data_properties_into(result, source, excluded_keys);
    return result;
}

double tsc_value_length(tsc_value_t v) {
    if (!value_is_box(v)) return 0.0;
    if (value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return (double)((tsc_array_t*)value_ptr(v))->len;
    }
    if (value_tag(v) == TSC_VALUE_TAG_STRING) {
        return (double)tsc_str_utf16_length((const tsc_str_t*)value_ptr(v));
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

tsc_array_t* tsc_value_iter_values(tsc_value_t value) {
    tsc_sync_iterator_t record = tsc_sync_iterator_open(value);
    tsc_array_t* result = tsc_array_new(sizeof(tsc_value_t), 4);
    tsc_value_t current;
    while (tsc_sync_iterator_step(&record, &current)) tsc_array_push_value(result, current);
    return result;
}


tsc_value_t tsc_value_symbol_iterator(tsc_value_t v) {
    if (value_is_box(v)) {
        if (value_tag(v) == TSC_VALUE_TAG_ARRAY) {
            return v;
        }
        if (value_tag(v) == TSC_VALUE_TAG_STRING) {
            tsc_value_t method = tsc_value_get_symbol_prop(v, tsc_symbol_iterator());
            if (tsc_value_is_callable(method)) {
                tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 0);
                return tsc_value_apply_function(method, v, tsc_value_array(args));
            }
            tsc_str_t* s = (tsc_str_t*)value_ptr(v);
            tsc_array_t* chars = value_string_iterator_values(s);
            return tsc_value_array(chars);
        }
        if (value_tag(v) == TSC_VALUE_TAG_OBJECT || value_tag(v) == TSC_VALUE_TAG_FUNCTION) {
            tsc_value_t method = tsc_value_get_symbol_prop(v, tsc_symbol_iterator());
            if (tsc_value_is_callable(method)) {
                tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 0);
                return tsc_value_apply_function(method, v, tsc_value_array(args));
            }
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
        return value_string_iterator_values((const tsc_str_t*)value_ptr(v));
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
        return value_string_iterator_values((const tsc_str_t*)value_ptr(v));
    }
    tsc_throw_str(tsc_str_from_cstr("collection constructor source is not iterable"));
    return tsc_array_new(sizeof(tsc_value_t), 1);
}

tsc_map_t* tsc_value_map_constructor_entries(tsc_value_t entries) {
    void* volatile source_root = tsc_value_gc_root(entries);
    tsc_array_t* arguments = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_array_push_raw(arguments, &entries);
    tsc_value_t result = tsc_value_construct(tsc_map_constructor_value(), tsc_value_array(arguments));
    (void)source_root;
    return tsc_value_as_map(result);
}

bool tsc_value_is_weak_key(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_FUNCTION:
        case TSC_VALUE_TAG_ARRAY:
        case TSC_VALUE_TAG_OBJECT:
            return true;
        case TSC_VALUE_TAG_SYMBOL:
            return ((tsc_symbol_t*)value_ptr(v))->global_key == NULL;
        default:
            return false;
    }
}





typedef enum { VALUE_ENUM_KEYS, VALUE_ENUM_VALUES, VALUE_ENUM_ENTRIES } value_enumeration_kind_t;

/* EnumerableOwnProperties: snapshot the complete key List, then perform the
 * descriptor and optional Get for each String key in order. Getters and Proxy
 * traps may change subsequent descriptors without changing that key snapshot. */
static tsc_array_t* value_enumerable_own_properties(tsc_value_t input, value_enumeration_kind_t kind) {
    tsc_value_t object = tsc_value_to_object(input);
    void* volatile object_root = tsc_value_gc_root(object);
    (void)object_root;
    tsc_array_t* keys = tsc_value_own_keys(object);
    tsc_array_t* out = tsc_array_new(kind == VALUE_ENUM_KEYS ? sizeof(tsc_str_t*) : sizeof(tsc_value_t), keys->len);
    for (size_t index = 0; index < keys->len; index++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, index);
        tsc_value_t descriptor = tsc_value_get_own_property_descriptor(object, key);
        void* volatile descriptor_root = tsc_value_gc_root(descriptor);
        (void)descriptor_root;
        if (tsc_value_is_undefined(descriptor) || !tsc_value_is_truthy(tsc_value_get_prop(descriptor, tsc_str_from_lit("enumerable", 10)))) continue;
        if (kind == VALUE_ENUM_KEYS) {
            tsc_array_push_raw(out, &key);
            continue;
        }
        tsc_value_t value = tsc_value_get_prop(object, key);
        void* volatile value_root = tsc_value_gc_root(value);
        (void)value_root;
        if (kind == VALUE_ENUM_ENTRIES) {
            tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
            tsc_array_push_value(pair, tsc_value_string(key));
            tsc_array_push_value(pair, value);
            value = tsc_value_array(pair);
        }
        tsc_array_push_value(out, value);
    }
    return out;
}

tsc_array_t* tsc_value_object_keys(tsc_value_t v) { return value_enumerable_own_properties(v, VALUE_ENUM_KEYS); }
tsc_array_t* tsc_value_object_values(tsc_value_t v) { return value_enumerable_own_properties(v, VALUE_ENUM_VALUES); }
tsc_array_t* tsc_value_object_entries(tsc_value_t v) { return value_enumerable_own_properties(v, VALUE_ENUM_ENTRIES); }

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

static tsc_value_t value_to_bigint(tsc_value_t value, bool allow_number) {
    void* volatile root = tsc_value_gc_root(value);
    tsc_value_store_rooted(&value, &root, value_to_primitive_if_object(value, TSC_TO_PRIMITIVE_NUMBER));
    (void)root;
    if (!value_is_box(value)) {
        if (allow_number) return tsc_value_bigint(tsc_bigint_from_num(value_as_num(value)));
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot convert Number to a BigInt"));
    }
    switch (value_tag(value)) {
        case TSC_VALUE_TAG_BIGINT: return value;
        case TSC_VALUE_TAG_FALSE: return tsc_value_bigint(tsc_bigint_from_bool(false));
        case TSC_VALUE_TAG_TRUE: return tsc_value_bigint(tsc_bigint_from_bool(true));
        case TSC_VALUE_TAG_STRING: return tsc_value_bigint(tsc_bigint_from_str((const tsc_str_t*)value_ptr(value)));
        default: tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot convert value to a BigInt"));
    }
}

tsc_value_t tsc_value_to_bigint(tsc_value_t value) { return value_to_bigint(value, false); }

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
    void* volatile left_root = tsc_value_gc_root(left);
    void* volatile right_root = tsc_value_gc_root(right);
    tsc_value_store_rooted(&left, &left_root, tsc_value_to_numeric(left));
    tsc_value_store_rooted(&right, &right_root, tsc_value_to_numeric(right));
    (void)left_root; (void)right_root;
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
        case TSC_NUMERIC_POW: return tsc_value_num(tsc_number_exponentiate(a, b));
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
    void* volatile a_root = tsc_value_gc_root(a);
    void* volatile b_root = tsc_value_gc_root(b);
    tsc_value_store_rooted(&a, &a_root, value_to_primitive_if_object(a, TSC_TO_PRIMITIVE_DEFAULT));
    tsc_value_store_rooted(&b, &b_root, value_to_primitive_if_object(b, TSC_TO_PRIMITIVE_DEFAULT));
    (void)a_root; (void)b_root;
    bool stringy =
        (value_is_box(a) && value_tag(a) == TSC_VALUE_TAG_STRING) ||
        (value_is_box(b) && value_tag(b) == TSC_VALUE_TAG_STRING);
    if (stringy) {
        tsc_str_t* volatile left_string = tsc_value_to_string(a);
        tsc_str_t* volatile right_string = tsc_value_to_string(b);
        return tsc_value_string(tsc_str_concat(left_string, right_string));
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
    void* volatile object_root = tsc_value_gc_root(object);
    (void)object_root;
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
        void* volatile method_root = tsc_value_gc_root(method);
        (void)method_root;
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
    void* volatile object_root = tsc_value_gc_root(object);
    (void)object_root;
    static const struct {
        const char* name;
        size_t name_len;
    } hints[] = {
        [TSC_TO_PRIMITIVE_DEFAULT] = { "default", 7 },
        [TSC_TO_PRIMITIVE_NUMBER] = { "number", 6 },
        [TSC_TO_PRIMITIVE_STRING] = { "string", 6 },
    };

    tsc_value_t exotic = tsc_value_get_symbol_prop(object, tsc_symbol_to_primitive());
    void* volatile exotic_root = tsc_value_gc_root(exotic);
    (void)exotic_root;
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
    double values[4],
    bool local_year,
    double* base_time
) {
    const size_t actual_count = args ? args->len : 0;
    int count = actual_count > (size_t)maximum ? maximum : (int)actual_count;
    if (count == 0) count = 1;
    for (int index = 0; index < count; index++) {
        values[index] = tsc_value_to_number(date_argument(args, (size_t)index));
        if (index == 0 && local_year) {
            *base_time = isnan(*base_time) ? 0.0 : tsc_date_local_time(*base_time);
        }
    }
    return count;
}

static tsc_value_t date_prototype_to_json(tsc_value_t receiver) {
    void* volatile receiver_root = tsc_value_gc_root(receiver);
    (void)receiver_root;
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
    void* volatile method_root = tsc_value_gc_root(method);
    (void)method_root;
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
    const double captured_time = date->ms;
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
            const bool local = descriptor->operation == TSC_DATE_METHOD_SET_LOCAL_PART;
            double base_time = local && descriptor->part != 0
                ? tsc_date_local_time(captured_time) : captured_time;
            int count = date_numeric_arguments(args, descriptor->max_args, values,
                local && descriptor->part == 0, &base_time);
            return tsc_value_num(
                descriptor->operation == TSC_DATE_METHOD_SET_UTC_PART
                    ? tsc_date_set_utc_part(
                        date, base_time,
                        descriptor->part,
                        values[0], values[1], values[2], values[3],
                        count
                    )
                    : tsc_date_set_local_part(
                        date, base_time,
                        descriptor->part,
                        values[0], values[1], values[2], values[3],
                        count
                    )
            );
        }
        case TSC_DATE_METHOD_SET_LEGACY_YEAR: {
            const double year = tsc_value_to_number(date_argument(args, 0));
            const double wall_time = isnan(captured_time) ? 0.0 : tsc_date_local_time(captured_time);
            return tsc_value_num(tsc_date_set_legacy_year(
                date, wall_time, year
            ));
        }
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
    /* One semantic parameter/default collection consumes the actual argument
     * List. Presence alone selects a default; explicit undefined is converted. */
    double values[] = { NAN, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0 };
    const size_t parameter_count = sizeof(values) / sizeof(values[0]);
    const size_t argument_count = args ? args->len : 0;
    const size_t count = argument_count < parameter_count ? argument_count : parameter_count;
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
    (void)receiver;
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
    // Date computes and clips its time value before OrdinaryCreateFromConstructor.
    tsc_date_t* volatile date_root = date;
    (void)date_root;
    tsc_value_t prototype = tsc_value_get_prototype_from_constructor(
        tsc_value_current_new_target(), TSC_INTRINSIC_DEFAULT_DATE_PROTOTYPE
    );
    void* volatile prototype_root = tsc_value_gc_root(prototype);
    (void)prototype_root;
    tsc_object_t* object = tsc_object_new_with_prototype(prototype);
    object->class_ptr = date;
    object->is_date = true;
    date->object = object;
    return tsc_value_object(object);
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
        constructor_identity->construct_allocates_receiver = false;
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
            void* volatile method_gc_root = tsc_value_gc_root(method);
            (void)method_gc_root;
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

tsc_value_t tsc_value_prepare_property_reference(tsc_value_t base, tsc_value_t name) {
    void* volatile base_root = tsc_value_gc_root(base);
    void* volatile name_root = tsc_value_gc_root(name);
    (void)base_root;
    (void)name_root;
    if (tsc_value_is_nullish(base)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot access a property of null or undefined"));
    }
    return tsc_value_to_property_key(name);
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

tsc_str_t* tsc_value_to_internal_property_key(tsc_value_t value) {
    tsc_value_t key = tsc_value_to_property_key(value);
    void* volatile key_root = tsc_value_gc_root(key);
    (void)key_root;
    return value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL
        ? tsc_symbol_property_key((tsc_symbol_t*)value_ptr(key))
        : (tsc_str_t*)value_ptr(key);
}

tsc_value_t tsc_value_function_with_property_name(tsc_value_t function, const tsc_str_t* key, const tsc_str_t* prefix) {
    void* volatile function_root = tsc_value_gc_root(function);
    void* volatile key_root = (void*)key;
    (void)function_root;
    (void)key_root;
    tsc_symbol_t* symbol = tsc_property_key_symbol(key);
    tsc_str_t* name = symbol
        ? symbol->description ? tsc_str_concat(tsc_str_concat(tsc_str_from_lit("[", 1), symbol->description), tsc_str_from_lit("]", 1)) : tsc_str_from_lit("", 0)
        : (tsc_str_t*)key;
    if (prefix) name = tsc_str_concat(tsc_str_concat(prefix, tsc_str_from_lit(" ", 1)), name);
    (void)tsc_value_define_property_desc(function, tsc_str_from_lit("name", 4), tsc_value_string(name), true, false, true, false, true, true, true);
    return function;
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
    void* volatile a_root = tsc_value_gc_root(a);
    void* volatile b_root = tsc_value_gc_root(b);
    (void)a_root;
    (void)b_root;
    a = value_to_primitive_if_object(a, TSC_TO_PRIMITIVE_NUMBER);
    a_root = tsc_value_gc_root(a);
    b = value_to_primitive_if_object(b, TSC_TO_PRIMITIVE_NUMBER);
    b_root = tsc_value_gc_root(b);
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
    a_root = tsc_value_gc_root(a);
    b = tsc_value_to_numeric(b);
    b_root = tsc_value_gc_root(b);
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
    double n = tsc_value_to_integer_or_infinity(v);
    return n;
}

size_t value_array_forward_start(size_t len, double from_index) {
    if (isnan(from_index)) return 0;
    double index = trunc(from_index);
    if (index < 0) index += (double)len;
    if (index <= 0) return 0;
    if (index >= (double)len) return len;
    return (size_t)index;
}

bool value_array_last_start(size_t len, double from_index, size_t* out) {
    if (len == 0) return false;
    double index = isnan(from_index) ? 0.0 : trunc(from_index);
    if (index < 0) index += (double)len;
    if (index < 0) return false;
    *out = index >= (double)len ? len - 1 : (size_t)index;
    return true;
}

size_t tsc_value_length_of_array_like(tsc_value_t object) {
    tsc_value_t length = tsc_value_get_prop(object, tsc_str_from_lit("length", 6));
    void* volatile length_gc_root = tsc_value_gc_root(length); (void)length_gc_root;
    return (size_t)tsc_value_to_length(length);
}

static void value_array_set(tsc_value_t object, size_t index, tsc_value_t value) {
    if (!tsc_value_set_index(object, (double)index, value))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array element is not writable"));
}

static void value_array_delete(tsc_value_t object, size_t index) {
    if (!tsc_value_delete_prop(object, tsc_str_from_int((int64_t)index)))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array element is not configurable"));
}

static void value_array_set_length(tsc_value_t object, size_t length) {
    if (!tsc_value_set_prop(object, tsc_str_from_lit("length", 6), tsc_value_num((double)length)))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array length is not writable"));
}

static tsc_array_t* value_array_result_new(size_t length) {
    if (length > UINT32_MAX)
        tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Invalid Array length"));
    return tsc_array_new(sizeof(tsc_value_t), length < 4 ? length : 4);
}

static bool value_array_like_has_index(tsc_value_t recv, size_t index) {
    char key_buf[32];
    snprintf(key_buf, sizeof key_buf, "%zu", index);
    return tsc_value_has_prop(recv, tsc_str_from_cstr(key_buf));
}

int64_t value_array_strict_index(double value, size_t len) {
    if (isnan(value)) value = 0.0;
    value = trunc(value);
    if (value < 0) value = (double)len + value;
    if (value < 0 || value >= (double)len || isinf(value)) {
        tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Array.with index out of range"));
    }
    return (int64_t)value;
}

tsc_str_t* value_join_part(tsc_value_t v) {
    return tsc_value_is_nullish(v) ? tsc_str_from_lit("", 0) : tsc_value_to_string(v);
}

tsc_value_t tsc_value_method_char_at(tsc_value_t recv, tsc_value_t index) {
    return string_char_at_from_values(recv, index);
}

tsc_value_t tsc_value_method_char_code_at(tsc_value_t recv, tsc_value_t index) {
    return string_char_code_at_from_values(recv, index);
}

tsc_value_t tsc_value_method_code_point_at(tsc_value_t recv, tsc_value_t index) {
    return string_code_point_at_from_values(recv, index);
}

tsc_value_t tsc_value_method_includes(tsc_value_t recv, tsc_value_t needle, tsc_value_t position) {
    const size_t len = tsc_value_length_of_array_like(recv);
    if (len == 0) return tsc_value_bool(false);
    const size_t start = value_array_forward_start(len, value_slice_arg(position, 0.0));
    for (size_t i = start; i < len; ++i)
        if (tsc_value_same_value_zero(tsc_value_get_index(recv, (double)i), needle)) return tsc_value_bool(true);
    return tsc_value_bool(false);
}

tsc_value_t tsc_value_method_index_of(tsc_value_t recv, tsc_value_t needle, tsc_value_t position) {
    const size_t len = tsc_value_length_of_array_like(recv);
    if (len == 0) return tsc_value_num(-1.0);
    const size_t start = value_array_forward_start(len, value_slice_arg(position, 0.0));
    for (size_t i = start; i < len; ++i)
        if (value_array_like_has_index(recv, i) && tsc_value_eq(tsc_value_get_index(recv, (double)i), needle)) return tsc_value_num((double)i);
    return tsc_value_num(-1.0);
}

tsc_value_t tsc_value_method_last_index_of(tsc_value_t recv, tsc_value_t needle, tsc_value_t position) {
    const size_t len = tsc_value_length_of_array_like(recv);
    if (len == 0) return tsc_value_num(-1.0);
    size_t i;
    if (!value_array_last_start(len, tsc_value_to_integer_or_infinity(position), &i)) return tsc_value_num(-1.0);
    do {
        if (value_array_like_has_index(recv, i) && tsc_value_eq(tsc_value_get_index(recv, (double)i), needle)) return tsc_value_num((double)i);
    } while (i-- > 0);
    return tsc_value_num(-1.0);
}

tsc_value_t tsc_value_method_at(tsc_value_t recv, tsc_value_t index) {
    const size_t len = tsc_value_length_of_array_like(recv);
    double at = tsc_value_to_integer_or_infinity(index);
    if (at < 0) at += (double)len;
    if (at < 0 || at >= (double)len) return tsc_value_undefined();
    return tsc_value_get_index(recv, at);
}

tsc_value_t tsc_value_method_join(tsc_value_t recv, tsc_value_t separator) {
    const size_t len = tsc_value_length_of_array_like(recv);
    tsc_str_t* sep = tsc_value_is_undefined(separator) ? tsc_str_from_lit(",", 1) : tsc_value_to_string(separator);
    tsc_str_t* out = tsc_str_from_lit("", 0);
    for (size_t i = 0; i < len; ++i) {
        if (i > 0) out = tsc_str_concat(out, sep);
        out = tsc_str_concat(out, value_join_part(tsc_value_get_index(recv, (double)i)));
    }
    return tsc_value_string(out);
}

tsc_value_t tsc_value_method_pop(tsc_value_t recv) {
    const size_t len = tsc_value_length_of_array_like(recv);
    if (len == 0) { value_array_set_length(recv, 0); return tsc_value_undefined(); }
    tsc_value_t value = tsc_value_get_index(recv, (double)(len - 1));
    void* volatile value_gc_root = tsc_value_gc_root(value); (void)value_gc_root;
    value_array_delete(recv, len - 1);
    value_array_set_length(recv, len - 1);
    return value;
}

tsc_value_t tsc_value_method_push_items(tsc_value_t recv, tsc_array_t* items) {
    size_t len = tsc_value_length_of_array_like(recv);
    const size_t count = items ? items->len : 0;
    if (count > UINT64_C(9007199254740991) - len)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array-like length exceeds the integer limit"));
    for (size_t i = 0; i < count; ++i) value_array_set(recv, len++, TSC_ARR(tsc_value_t, items, i));
    value_array_set_length(recv, len);
    return tsc_value_num((double)len);
}

tsc_value_t tsc_value_method_shift(tsc_value_t recv) {
    const size_t len = tsc_value_length_of_array_like(recv);
    if (len == 0) { value_array_set_length(recv, 0); return tsc_value_undefined(); }
    tsc_value_t value = tsc_value_get_index(recv, 0.0);
    void* volatile value_gc_root = tsc_value_gc_root(value); (void)value_gc_root;
    for (size_t i = 1; i < len; ++i) {
        if (value_array_like_has_index(recv, i)) value_array_set(recv, i - 1, tsc_value_get_index(recv, (double)i));
        else value_array_delete(recv, i - 1);
    }
    value_array_delete(recv, len - 1); value_array_set_length(recv, len - 1);
    return value;
}

tsc_value_t tsc_value_method_unshift_items(tsc_value_t recv, tsc_array_t* items) {
    const size_t len = tsc_value_length_of_array_like(recv), count = items ? items->len : 0;
    if (count > 0) {
        if (count > UINT64_C(9007199254740991) - len)
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array-like length exceeds the integer limit"));
        for (size_t i = len; i > 0; --i) {
            if (value_array_like_has_index(recv, i - 1)) value_array_set(recv, i + count - 1, tsc_value_get_index(recv, (double)(i - 1)));
            else value_array_delete(recv, i + count - 1);
        }
        for (size_t i = 0; i < count; ++i) value_array_set(recv, i, TSC_ARR(tsc_value_t, items, i));
    }
    value_array_set_length(recv, len + count);
    return tsc_value_num((double)(len + count));
}

static bool value_is_concat_spreadable(tsc_value_t value) {
    tsc_value_t spreadable = tsc_value_get_symbol_prop(value, tsc_symbol_is_concat_spreadable());
    if (!tsc_value_is_undefined(spreadable)) return tsc_value_is_truthy(spreadable);
    return tsc_value_is_array(value);
}

static void value_concat_push(tsc_array_output_t* out, tsc_value_t value) {
    if (value_is_concat_spreadable(value)) {
        size_t len = (size_t)tsc_value_length_of_array_like(value);
        if (len > UINT64_C(9007199254740991) - out->index)
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Concatenated array exceeds the integer limit"));
        for (size_t i = 0; i < len; i++) {
            tsc_str_t* key = tsc_str_from_int((int64_t)i);
            bool present = tsc_value_has_prop(value, key);
            tsc_value_t item = present ? tsc_value_get_index(value, (double)i) : tsc_value_undefined();
            if (present) tsc_array_output_create(out, out->index, item);
            ++out->index;
        }
        return;
    }
    if (out->index >= UINT64_C(9007199254740991))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Concatenated array exceeds the integer limit"));
    tsc_array_output_append(out, value);
}

tsc_value_t tsc_value_method_concat_items(tsc_value_t recv, tsc_array_t* items) {
    tsc_array_output_t out = tsc_array_output_species(recv, 0);
    value_concat_push(&out, recv);
    for (size_t i = 0; items && i < items->len; ++i) value_concat_push(&out, TSC_ARR(tsc_value_t, items, i));
    tsc_array_output_set_length(&out, out.index);
    return out.object;
}

typedef struct value_flat_frame {
    tsc_value_t source;
    void* source_gc_root;
    size_t index, length;
    double depth;
    struct value_flat_frame* parent;
} value_flat_frame_t;

static void value_flatten_into(tsc_array_output_t* target, tsc_value_t source, size_t length, double depth) {
    value_flat_frame_t* frame = TSC_GC_MALLOC(sizeof(*frame));
    *frame = (value_flat_frame_t){source, tsc_value_gc_root(source), 0, length, depth, NULL};
    while (frame) {
        if (frame->index == frame->length) { frame = frame->parent; continue; }
        size_t index = frame->index++;
        if (!value_array_like_has_index(frame->source, index)) continue;
        tsc_value_t value = tsc_value_get_index(frame->source, (double)index);
        void* volatile value_gc_root = tsc_value_gc_root(value); (void)value_gc_root;
        if (frame->depth > 0 && tsc_value_is_array(value)) {
            size_t nested_length = tsc_value_length_of_array_like(value);
            value_flat_frame_t* nested = TSC_GC_MALLOC(sizeof(*nested));
            *nested = (value_flat_frame_t){value, tsc_value_gc_root(value), 0, nested_length,
                isinf(frame->depth) ? INFINITY : frame->depth - 1, frame};
            frame = nested;
        } else {
            if (target->index >= UINT64_C(9007199254740991))
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Flattened array exceeds the integer limit"));
            tsc_array_output_append(target, value);
        }
    }
}

tsc_value_t tsc_value_method_flat(tsc_value_t recv, tsc_value_t depth) {
    size_t len = tsc_value_length_of_array_like(recv);
    double actual_depth = tsc_value_is_undefined(depth) ? 1.0 : tsc_value_to_integer_or_infinity(depth);
    if (actual_depth < 0) actual_depth = 0;
    tsc_array_output_t out = tsc_array_output_species(recv, 0);
    value_flatten_into(&out, recv, len, actual_depth);
    return out.object;
}

tsc_value_t tsc_value_method_splice(tsc_value_t recv, tsc_value_t start, tsc_value_t delete_count, size_t argc, tsc_array_t* items) {
    size_t len = (size_t)tsc_value_length_of_array_like(recv);
    size_t at = argc == 0 ? 0 : value_array_forward_start(len, value_slice_arg(start, 0.0));
    size_t del = 0;
    if (argc == 1) {
        del = len - at;
    } else if (argc >= 2) {
        double raw = tsc_value_to_integer_or_infinity(delete_count);
        if (isinf(raw) && raw > 0) {
            del = len - at;
        } else if (!isnan(raw) && raw > 0) {
            del = raw >= (double)(len - at) ? len - at : (size_t)raw;
        }
    }

    size_t insert_len = items ? items->len : 0;
    if (insert_len > UINT64_C(9007199254740991) - (len - del))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array-like length exceeds the integer limit"));
    size_t new_len = len - del + insert_len;
    tsc_array_output_t removed = tsc_array_output_species(recv, del);
    for (size_t i = 0; i < del; ++i) {
        if (value_array_like_has_index(recv, at + i))
            tsc_array_output_create(&removed, i, tsc_value_get_index(recv, (double)(at + i)));
    }
    tsc_array_output_set_length(&removed, del);

    if (insert_len < del) {
        size_t shift = del - insert_len;
        for (size_t from = at + del; from < len; from++) {
            size_t to = from - shift;
            if (value_array_like_has_index(recv, from)) {
                if (!tsc_value_set_index(recv, (double)to, tsc_value_get_index(recv, (double)from))) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.prototype.splice could not move array-like element"));
                }
            } else if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)to))) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.prototype.splice could not delete array-like element"));
            }
        }
        for (size_t k = len; k > new_len; --k) {
            const size_t i = k - 1;
            if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)i))) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.prototype.splice could not delete array-like element"));
            }
        }
    } else if (insert_len > del) {
        size_t shift = insert_len - del;
        for (size_t from = len; from > at + del; from--) {
            size_t source = from - 1;
            size_t to = source + shift;
            if (value_array_like_has_index(recv, source)) {
                if (!tsc_value_set_index(recv, (double)to, tsc_value_get_index(recv, (double)source))) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.prototype.splice could not move array-like element"));
                }
            } else if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)to))) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.prototype.splice could not delete array-like element"));
            }
        }
    }

    for (size_t i = 0; i < insert_len; i++) {
        if (!tsc_value_set_index(recv, (double)(at + i), TSC_ARR(tsc_value_t, items, i))) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.prototype.splice could not add array-like element"));
        }
    }
    if (!tsc_value_set_prop(recv, tsc_str_from_lit("length", 6), tsc_value_num((double)new_len))) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.prototype.splice could not update array-like length"));
    }
    return removed.object;
}

static void value_sort_validate_compare_fn(tsc_value_t compare_fn) {
    if (!tsc_value_is_undefined(compare_fn)) {
        if (!tsc_value_is_callable(compare_fn)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.prototype.sort comparator must be callable"));
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
        double cmp = tsc_value_to_number(tsc_value_apply_function(compare_fn, tsc_value_undefined(), tsc_value_array(args)));
        return isnan(cmp) ? 0.0 : cmp;
    }
    return (double)tsc_str_cmp(tsc_value_to_string(left), tsc_value_to_string(right));
}

static void value_sort_array_values(tsc_array_t* a, tsc_value_t compare_fn) {
    for (size_t i = 1; i < a->len; i++) {
        tsc_value_t key = TSC_ARR(tsc_value_t, a, i);
        void* volatile key_gc_root = tsc_value_gc_root(key); (void)key_gc_root;
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
    void* volatile compare_gc_root = tsc_value_gc_root(compare_fn); (void)compare_gc_root;
    recv = tsc_value_to_object(recv);
    void* volatile recv_gc_root = tsc_value_gc_root(recv); (void)recv_gc_root;
    const size_t len = tsc_value_length_of_array_like(recv);
    tsc_array_t* a;
    a = tsc_array_new(sizeof(tsc_value_t), len < 4 ? len : 4);
    for (size_t i = 0; i < len; i++) {
        if (!value_array_like_has_index(recv, i)) continue;
        tsc_value_t value = tsc_value_get_index(recv, (double)i);
        tsc_array_push_raw(a, &value);
    }
    value_sort_array_values(a, compare_fn);
    for (size_t i = 0; i < a->len; i++) {
        if (!tsc_value_set_index(recv, (double)i, TSC_ARR(tsc_value_t, a, i))) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.prototype.sort could not write array-like element"));
        }
    }
    for (size_t i = a->len; i < len; i++) {
        if (!tsc_value_delete_prop(recv, tsc_str_from_int((int64_t)i))) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array.prototype.sort could not delete array-like element"));
        }
    }
    return recv;
}

tsc_value_t tsc_value_method_to_sorted(tsc_value_t recv, tsc_value_t compare_fn) {
    value_sort_validate_compare_fn(compare_fn);
    void* volatile compare_gc_root = tsc_value_gc_root(compare_fn); (void)compare_gc_root;
    recv = tsc_value_to_object(recv);
    void* volatile recv_gc_root = tsc_value_gc_root(recv); (void)recv_gc_root;
    const size_t len = tsc_value_length_of_array_like(recv);
    tsc_array_t* out = value_array_result_new(len);
    for (size_t i = 0; i < len; ++i) tsc_array_push_value(out, tsc_value_get_index(recv, (double)i));
    value_sort_array_values(out, compare_fn);
    return tsc_value_array(out);
}

tsc_value_t tsc_value_method_with(tsc_value_t recv, tsc_value_t index, tsc_value_t value) {
    const size_t len = tsc_value_length_of_array_like(recv);
    const size_t at = (size_t)value_array_strict_index(tsc_value_to_number(index), len);
    tsc_array_t* out = value_array_result_new(len);
    for (size_t i = 0; i < len; ++i) tsc_array_push_value(out, i == at ? value : tsc_value_get_index(recv, (double)i));
    return tsc_value_array(out);
}

tsc_value_t tsc_value_method_to_spliced(tsc_value_t recv, tsc_value_t start, tsc_value_t delete_count, size_t argc, tsc_array_t* items) {
    size_t len = (size_t)tsc_value_length_of_array_like(recv);
    size_t at = argc == 0 ? 0 : value_array_forward_start(len, value_slice_arg(start, 0.0));
    size_t del = 0;
    if (argc == 1) {
        del = len - at;
    } else if (argc >= 2) {
        double raw = tsc_value_to_integer_or_infinity(delete_count);
        if (isinf(raw) && raw > 0) {
            del = len - at;
        } else if (!isnan(raw) && raw > 0) {
            del = raw >= (double)(len - at) ? len - at : (size_t)raw;
        }
    }
    size_t insert_len = items ? items->len : 0;
    if (insert_len > UINT64_C(9007199254740991) - (len - del))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Array-like length exceeds the integer limit"));
    size_t out_len = len - del + insert_len;
    tsc_array_t* out = value_array_result_new(out_len);
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

void tsc_value_array_flatten_value(tsc_array_output_t* out, tsc_value_t value) {
    if (tsc_value_is_array(value)) value_flatten_into(out, value, tsc_value_length_of_array_like(value), 0);
    else tsc_array_output_append(out, value);
}

tsc_value_t tsc_value_method_fill(tsc_value_t recv, tsc_value_t value, tsc_value_t start, tsc_value_t end) {
    const size_t len = tsc_value_length_of_array_like(recv);
    const size_t from = value_array_forward_start(len, value_slice_arg(start, 0.0));
    const size_t to = value_array_forward_start(len, value_slice_arg(end, (double)len));
    for (size_t i = from; i < to; ++i) value_array_set(recv, i, value);
    return recv;
}

tsc_value_t tsc_value_method_copy_within(tsc_value_t recv, tsc_value_t target, tsc_value_t start, tsc_value_t end) {
    const size_t len = tsc_value_length_of_array_like(recv);
    size_t to = value_array_forward_start(len, value_slice_arg(target, 0.0));
    size_t from = value_array_forward_start(len, value_slice_arg(start, 0.0));
    const size_t final = value_array_forward_start(len, value_slice_arg(end, (double)len));
    size_t count = final > from ? final - from : 0;
    if (count > len - to) count = len - to;
    const bool backward = from < to && to - from < count;
    if (backward) { from += count - 1; to += count - 1; }
    while (count-- > 0) {
        if (value_array_like_has_index(recv, from)) value_array_set(recv, to, tsc_value_get_index(recv, (double)from));
        else value_array_delete(recv, to);
        if (backward) { --from; --to; } else { ++from; ++to; }
    }
    return recv;
}

tsc_value_t tsc_value_method_reverse(tsc_value_t recv) {
    const size_t len = tsc_value_length_of_array_like(recv);
    for (size_t lower = 0; lower < len / 2; ++lower) {
        const size_t upper = len - lower - 1;
        const bool lower_present = value_array_like_has_index(recv, lower);
        const tsc_value_t lower_value = lower_present ? tsc_value_get_index(recv, (double)lower) : tsc_value_undefined();
        void* volatile lower_gc_root = tsc_value_gc_root(lower_value); (void)lower_gc_root;
        const bool upper_present = value_array_like_has_index(recv, upper);
        const tsc_value_t upper_value = upper_present ? tsc_value_get_index(recv, (double)upper) : tsc_value_undefined();
        void* volatile upper_gc_root = tsc_value_gc_root(upper_value); (void)upper_gc_root;
        if (lower_present && upper_present) {
            value_array_set(recv, lower, upper_value); value_array_set(recv, upper, lower_value);
        } else if (upper_present) {
            value_array_set(recv, lower, upper_value); value_array_delete(recv, upper);
        } else if (lower_present) {
            value_array_delete(recv, lower); value_array_set(recv, upper, lower_value);
        }
    }
    return recv;
}

tsc_value_t tsc_value_method_to_reversed(tsc_value_t recv) {
    const size_t len = tsc_value_length_of_array_like(recv);
    tsc_array_t* out = value_array_result_new(len);
    for (size_t i = len; i > 0; --i) tsc_array_push_value(out, tsc_value_get_index(recv, (double)(i - 1)));
    return tsc_value_array(out);
}

tsc_value_t tsc_value_method_slice(tsc_value_t recv, tsc_value_t start, tsc_value_t end) {
    const size_t len = tsc_value_length_of_array_like(recv);
    const size_t from = value_array_forward_start(len, value_slice_arg(start, 0.0));
    const size_t to = value_array_forward_start(len, value_slice_arg(end, (double)len));
    const size_t count = to > from ? to - from : 0;
    tsc_array_output_t out = tsc_array_output_species(recv, count);
    for (size_t i = from; i < to; ++i) {
        if (value_array_like_has_index(recv, i)) tsc_array_output_create(&out, i - from, tsc_value_get_index(recv, (double)i));
    }
    tsc_array_output_set_length(&out, count);
    return out.object;
}

tsc_value_t tsc_value_method_substring(tsc_value_t recv, tsc_value_t start, tsc_value_t end) {
    return string_substring_from_values(recv, start, end);
}

tsc_value_t tsc_value_method_substr(tsc_value_t recv, tsc_value_t start, tsc_value_t length) {
    return string_substr_from_values(recv, start, length);
}

static bool string_protocol_call(
    tsc_value_t carrier,
    tsc_symbol_t* symbol,
    const tsc_value_t* values,
    size_t value_count,
    tsc_value_t* result
) {
    if (!tsc_value_is_object(carrier)) return false;
    tsc_value_t method = tsc_value_get_symbol_prop(carrier, symbol);
    if (tsc_value_is_nullish(method)) return false;
    if (!tsc_value_is_callable(method)) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_lit("String protocol property is not callable", 40)
        );
    }
    tsc_array_t* args = tsc_array_new(
        sizeof(tsc_value_t),
        value_count ? value_count : 1
    );
    for (size_t index = 0; index < value_count; index++) {
        tsc_array_push_value(args, values[index]);
    }
    *result = tsc_value_apply_function(method, carrier, tsc_value_array(args));
    return true;
}

static tsc_array_t* string_match_position_worklist(
    const tsc_str_t* source,
    const tsc_str_t* search,
    bool all
) {
    const size_t source_length = tsc_str_utf16_length(source);
    const size_t search_length = tsc_str_utf16_length(search);
    tsc_array_t* positions = tsc_array_new(sizeof(size_t), 4);
    size_t from = 0;
    while (from <= source_length) {
        double found = tsc_str_index_of(source, search, (double)from);
        if (found < 0.0) break;
        size_t position = (size_t)found;
        tsc_array_push_raw(positions, &position);
        if (!all) break;
        if (search_length == 0) {
            if (position >= source_length) break;
            from = position + 1;
        } else {
            from = position + search_length;
        }
    }
    return positions;
}

static tsc_str_t* string_functional_replacement(
    const tsc_str_t* source,
    const tsc_str_t* search,
    tsc_value_t callback,
    bool all
) {
    tsc_array_t* positions = string_match_position_worklist(source, search, all);
    if (positions->len == 0) return (tsc_str_t*)source;

    const size_t source_length = tsc_str_utf16_length(source);
    const size_t search_length = tsc_str_utf16_length(search);
    tsc_str_t* output = tsc_str_from_lit("", 0);
    size_t copied_through = 0;
    for (size_t index = 0; index < positions->len; index++) {
        const size_t position = TSC_ARR(size_t, positions, index);
        output = tsc_str_concat(
            output,
            tsc_str_slice(source, (double)copied_through, (double)position)
        );
        tsc_array_t* callback_args = tsc_array_new(sizeof(tsc_value_t), 3);
        tsc_array_push_value(callback_args, tsc_value_string((tsc_str_t*)search));
        tsc_array_push_value(callback_args, tsc_value_num((double)position));
        tsc_array_push_value(callback_args, tsc_value_string((tsc_str_t*)source));
        tsc_value_t replacement = tsc_value_apply_function(
            callback,
            tsc_value_undefined(),
            tsc_value_array(callback_args)
        );
        output = tsc_str_concat(output, tsc_value_to_string(replacement));
        copied_through = position + search_length;
    }
    return tsc_str_concat(
        output,
        tsc_str_slice(source, (double)copied_through, (double)source_length)
    );
}

static const tsc_regexp_t* string_native_regexp(tsc_value_t value) {
    if (!value_is_box(value) || value_tag(value) != TSC_VALUE_TAG_OBJECT) return NULL;
    const tsc_object_t* object = (const tsc_object_t*)value_ptr(value);
    return object && object->is_regexp
        ? (const tsc_regexp_t*)object->class_ptr
        : NULL;
}

bool tsc_value_is_regexp(tsc_value_t value) {
    if (!tsc_value_is_object(value)) return false;
    tsc_value_t matcher = tsc_value_get_symbol_prop(value, tsc_symbol_match());
    if (!tsc_value_is_undefined(matcher)) return tsc_value_is_truthy(matcher);
    return string_native_regexp(value) != NULL;
}

static void string_require_global_regexp(tsc_value_t search) {
    if (!tsc_value_is_regexp(search)) return;
    const tsc_str_t* flags_key = tsc_str_from_lit("flags", 5);
    tsc_value_t flags = tsc_value_get_prop(search, flags_key);
    string_require_object_coercible(flags, "String.prototype.replaceAll flags");
    if (!tsc_str_includes(
        tsc_value_to_string(flags),
        tsc_str_from_lit("g", 1),
        0.0
    )) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_lit("String.prototype.replaceAll requires a global RegExp", 52)
        );
    }
}

static tsc_value_t string_replace_from_values(
    tsc_value_t receiver,
    tsc_value_t search,
    tsc_value_t replacement,
    bool all
) {
    string_require_object_coercible(
        receiver,
        all ? "String.prototype.replaceAll" : "String.prototype.replace"
    );
    if (all && tsc_value_is_object(search)) string_require_global_regexp(search);

    tsc_value_t protocol_args[] = { receiver, replacement };
    tsc_value_t protocol_result;
    if (string_protocol_call(
        search,
        tsc_symbol_replace(),
        protocol_args,
        sizeof(protocol_args) / sizeof(protocol_args[0]),
        &protocol_result
    )) {
        return protocol_result;
    }

    const tsc_str_t* string = tsc_value_to_string(receiver);
    const tsc_str_t* search_string = tsc_value_to_string(search);
    if (tsc_value_is_callable(replacement)) {
        return tsc_value_string(string_functional_replacement(
            string,
            search_string,
            replacement,
            all
        ));
    }
    const tsc_str_t* replacement_string = tsc_value_to_string(replacement);
    return tsc_value_string(
        all
            ? tsc_str_replace_all(string, search_string, replacement_string)
            : tsc_str_replace(string, search_string, replacement_string)
    );
}

tsc_value_t tsc_value_method_replace(
    tsc_value_t recv,
    tsc_value_t search,
    tsc_value_t replacement
) {
    return string_replace_from_values(recv, search, replacement, false);
}

tsc_value_t tsc_value_method_replace_all(
    tsc_value_t recv,
    tsc_value_t search,
    tsc_value_t replacement
) {
    return string_replace_from_values(recv, search, replacement, true);
}

uint32_t split_limit_from_value(tsc_value_t limit) {
    if (value_is_box(limit) && value_tag(limit) == TSC_VALUE_TAG_UNDEFINED) return UINT32_MAX;
    return split_limit_from_num(tsc_value_to_number(limit));
}

tsc_value_t tsc_value_method_split(tsc_value_t recv, tsc_value_t separator, tsc_value_t limit) {
    string_require_object_coercible(recv, "String.prototype.split");
    tsc_value_t protocol_args[] = { recv, limit };
    tsc_value_t protocol_result;
    if (string_protocol_call(
        separator,
        tsc_symbol_split(),
        protocol_args,
        sizeof(protocol_args) / sizeof(protocol_args[0]),
        &protocol_result
    )) {
        return protocol_result;
    }
    const tsc_str_t* string = tsc_value_to_string(recv);
    uint32_t split_limit = split_limit_from_value(limit);
    const tsc_regexp_t* native_regexp = tsc_value_has_symbol_prop(
        separator,
        tsc_symbol_split()
    )
        ? NULL
        : string_native_regexp(separator);
    if (native_regexp) {
        return tsc_value_array(value_array_from_string_array(
            tsc_str_split_regex_limit(string, native_regexp, split_limit)
        ));
    }
    const tsc_str_t* separator_string = tsc_value_to_string(separator);
    if (split_limit == 0) {
        return tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 1));
    }
    if (tsc_value_is_undefined(separator)) {
        tsc_array_t* only = tsc_array_new(sizeof(tsc_value_t), 1);
        tsc_array_push_value(only, tsc_value_string((tsc_str_t*)string));
        return tsc_value_array(only);
    }
    tsc_array_t* parts = tsc_str_split_limit(
        string,
        separator_string,
        split_limit
    );
    return tsc_value_array(value_array_from_string_array(parts));
}

tsc_array_t* value_array_from_string_array(const tsc_array_t* strings) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), strings && strings->len ? strings->len : 1);
    if (!strings) return out;
    out->props = strings->props;
    out->prototype = strings->prototype;
    for (size_t i = 0; i < strings->len; i++) {
        tsc_str_t* string = TSC_ARR(tsc_str_t*, strings, i);
        tsc_value_t value = string ? tsc_value_string(string) : tsc_value_undefined();
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

/* String match/search preserve the receiver until symbol dispatch has had
 * its chance. Fallback RegExpCreate converts the pattern independently of
 * the public constructor's cloning and IsRegExp rules. */
static tsc_value_t string_regexp_protocol_from_values(tsc_value_t receiver,
                                                     tsc_value_t pattern, tsc_symbol_t* symbol) {
    string_require_object_coercible(receiver, "String RegExp receiver");
    tsc_value_t arguments[] = {receiver}, result;
    if (string_protocol_call(pattern, symbol, arguments, 1, &result)) return result;
    tsc_str_t* string = tsc_value_to_string(receiver);
    tsc_str_t* source = tsc_value_is_undefined(pattern) ? tsc_str_from_lit("", 0) : tsc_value_to_string(pattern);
    tsc_value_t regexp = tsc_value_regexp(tsc_regexp_new(source, tsc_str_from_lit("", 0)));
    tsc_value_t method = tsc_value_get_symbol_prop(regexp, symbol);
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_array_push_value(args, tsc_value_string(string));
    return tsc_value_apply_function(method, regexp, tsc_value_array(args));
}
tsc_value_t tsc_value_method_match(tsc_value_t receiver, tsc_value_t pattern) {
    return string_regexp_protocol_from_values(receiver, pattern, tsc_symbol_match());
}
tsc_value_t tsc_value_method_search(tsc_value_t receiver, tsc_value_t pattern) {
    return string_regexp_protocol_from_values(receiver, pattern, tsc_symbol_search());
}

tsc_value_t tsc_value_method_match_all(tsc_value_t receiver, tsc_value_t pattern) {
    string_require_object_coercible(receiver, "String matchAll receiver");
    if (tsc_value_is_object(pattern)) {
        if (tsc_value_is_regexp(pattern)) {
            tsc_value_t flags = tsc_value_get_prop(pattern, tsc_str_from_lit("flags", 5));
            string_require_object_coercible(flags, "String matchAll flags");
            tsc_str_t* text = tsc_value_to_string(flags);
            if (!tsc_str_includes(text, tsc_str_from_lit("g", 1), 0))
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("String matchAll requires a global RegExp"));
        }
        tsc_value_t arguments[] = {receiver}, result;
        if (string_protocol_call(pattern, tsc_symbol_match_all(), arguments, 1, &result)) return result;
    }
    tsc_str_t* string = tsc_value_to_string(receiver);
    tsc_str_t* volatile string_gc_root = string;
    (void)string_gc_root;
    tsc_array_t* create_args = tsc_array_new(sizeof(tsc_value_t), 2);
    tsc_array_push_value(create_args, pattern);
    tsc_array_push_value(create_args, tsc_value_string(tsc_str_from_lit("g", 1)));
    tsc_value_t regexp = tsc_value_construct(tsc_regexp_constructor_value(), tsc_value_array(create_args));
    void* volatile regexp_gc_root = tsc_value_gc_root(regexp);
    (void)regexp_gc_root;
    tsc_value_t method = tsc_value_get_symbol_prop(regexp, tsc_symbol_match_all());
    void* volatile method_gc_root = tsc_value_gc_root(method);
    (void)method_gc_root;
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_array_push_value(args, tsc_value_string(string));
    return tsc_value_apply_function(method, regexp, tsc_value_array(args));
}

tsc_value_t tsc_value_invoke(tsc_value_t receiver, const tsc_str_t* name, tsc_array_t* args) {
    void* volatile receiver_gc_root = tsc_value_gc_root(receiver);
    const tsc_str_t* volatile name_gc_root = name;
    tsc_array_t* volatile arguments_gc_root = args;
    (void)receiver_gc_root; (void)name_gc_root; (void)arguments_gc_root;
    if (tsc_value_is_nullish(receiver))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot invoke a method on null or undefined"));
    const tsc_value_t method = tsc_value_get_prop(receiver, name);
    void* volatile method_gc_root = tsc_value_gc_root(method);
    (void)method_gc_root;
    return tsc_value_apply_function(method, receiver, tsc_value_array(args));
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
        tsc_array_t* dst_arr = tsc_array_new(sizeof(tsc_value_t), 0);
        tsc_value_t cloned_val = tsc_value_array(dst_arr);

        tsc_map_set_raw(seen, &v, &cloned_val);

        dst_arr->len = src_arr->len;
        tsc_array_t* volatile keys = value_array_keys(src_arr, false);
        for (size_t cursor = 0; cursor < keys->len; ++cursor) {
            tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, cursor);
            tsc_value_t elem = tsc_value_get_prop(v, key);
            void* volatile elem_root = tsc_value_gc_root(elem); (void)elem_root;
            tsc_value_t cloned = tsc_structured_clone_internal(elem, seen);
            if (!tsc_value_create_data_property(cloned_val, tsc_value_string(key), cloned))
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cloned Array could not create a property"));
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
        if (!tsc_value_is_nullish(src_obj->prototype) &&
            !tsc_value_eq(src_obj->prototype, tsc_value_object_prototype())) {
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
    o->prototype_gc_root = tsc_value_gc_root(o->prototype);
    d->object = o;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_regexp(tsc_regexp_t* r) {
    if (!r) return tsc_value_null();
    if (r->object) return tsc_value_object(r->object);
    tsc_object_t* o = tsc_object_new_class(r);
    o->is_regexp = true;
    o->prototype = r->prototype;
    o->prototype_gc_root = tsc_value_gc_root(o->prototype);
    tsc_object_define(o, tsc_str_from_lit("lastIndex", 9), tsc_value_num(0), true, false, false);
    r->object = o;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_map(tsc_map_t* m) {
    if (!m) return tsc_value_null();
    if (m->object) return tsc_value_object(m->object);
    tsc_object_t* o = tsc_object_new_class(m);
    o->is_map = true;
    o->prototype = tsc_map_prototype_value();
    o->prototype_gc_root = tsc_value_gc_root(o->prototype);
    m->object = o;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_set(tsc_set_t* s) {
    if (!s) return tsc_value_null();
    if (s->object) return tsc_value_object(s->object);
    tsc_object_t* o = tsc_object_new_class(s);
    o->is_set = true;
    o->prototype = tsc_set_prototype_value();
    o->prototype_gc_root = tsc_value_gc_root(o->prototype);
    s->object = o;
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
    o->prototype_gc_root = tsc_value_gc_root(o->prototype);
    e->object = o;
    if (e->is_suppressed) {
        (void)tsc_object_define(o, tsc_str_from_lit("error", 5), e->error, true, false, true);
        (void)tsc_object_define(o, tsc_str_from_lit("suppressed", 10), e->suppressed, true, false, true);
        e->error_gc_root = NULL;
        e->suppressed_gc_root = NULL;
    }
    return tsc_value_object(o);
}

typedef enum {
    BUFFER_NUMBER, BUFFER_TEXT, BUFFER_JSON, BUFFER_SLICE, BUFFER_SUBARRAY,
    BUFFER_FILL, BUFFER_WRITE, BUFFER_SWAP, BUFFER_COPY, BUFFER_SEARCH,
    BUFFER_EQUALS, BUFFER_COMPARE, BUFFER_KEYS, BUFFER_VALUES, BUFFER_ENTRIES
} buffer_operation_t;
typedef struct {
    const char* name;
    const char* function_name;
    double arity;
    buffer_operation_t operation;
    size_t width;
    tsc_buffer_number_kind_t number_kind;
    bool little_endian;
    bool write;
} buffer_method_t;
#define BUFFER_METHOD(name, arity, operation, option) \
    { name, name, arity, operation, option, TSC_BUFFER_UNSIGNED, false, false }
#define BUFFER_IO(name, function_name, arity, width, kind, little, write) \
    { name, function_name, arity, BUFFER_NUMBER, width, kind, little, write }
static const buffer_method_t buffer_methods[] = {
    BUFFER_METHOD("toString", 3, BUFFER_TEXT, 0),
    BUFFER_METHOD("toJSON", 0, BUFFER_JSON, 0),
    BUFFER_METHOD("slice", 2, BUFFER_SLICE, 0),
    BUFFER_METHOD("subarray", 2, BUFFER_SUBARRAY, 0),
    BUFFER_METHOD("fill", 4, BUFFER_FILL, 0),
    BUFFER_METHOD("write", 4, BUFFER_WRITE, 0),
    BUFFER_METHOD("swap16", 0, BUFFER_SWAP, 2),
    BUFFER_METHOD("swap32", 0, BUFFER_SWAP, 4),
    BUFFER_METHOD("swap64", 0, BUFFER_SWAP, 8),
    BUFFER_METHOD("copy", 4, BUFFER_COPY, 0),
    BUFFER_METHOD("indexOf", 4, BUFFER_SEARCH, 0),
    BUFFER_METHOD("lastIndexOf", 4, BUFFER_SEARCH, 1),
    BUFFER_METHOD("includes", 4, BUFFER_SEARCH, 2),
    BUFFER_METHOD("equals", 1, BUFFER_EQUALS, 0),
    BUFFER_METHOD("compare", 5, BUFFER_COMPARE, 0),
    BUFFER_METHOD("keys", 0, BUFFER_KEYS, 0),
    BUFFER_METHOD("values", 0, BUFFER_VALUES, 0),
    BUFFER_METHOD("entries", 0, BUFFER_ENTRIES, 0),
    BUFFER_IO("readUInt8", "", 1, 1, TSC_BUFFER_UNSIGNED, true, false),
    BUFFER_IO("writeUInt8", "writeUInt8", 1, 1, TSC_BUFFER_UNSIGNED, true, true),
    BUFFER_IO("readUInt16LE", "", 1, 2, TSC_BUFFER_UNSIGNED, true, false),
    BUFFER_IO("writeUInt16LE", "writeUInt16LE", 1, 2, TSC_BUFFER_UNSIGNED, true, true),
    BUFFER_IO("readUInt16BE", "", 1, 2, TSC_BUFFER_UNSIGNED, false, false),
    BUFFER_IO("writeUInt16BE", "writeUInt16BE", 1, 2, TSC_BUFFER_UNSIGNED, false, true),
    BUFFER_IO("readUInt32LE", "", 1, 4, TSC_BUFFER_UNSIGNED, true, false),
    BUFFER_IO("writeUInt32LE", "writeUInt32LE", 1, 4, TSC_BUFFER_UNSIGNED, true, true),
    BUFFER_IO("readUInt32BE", "", 1, 4, TSC_BUFFER_UNSIGNED, false, false),
    BUFFER_IO("writeUInt32BE", "writeUInt32BE", 1, 4, TSC_BUFFER_UNSIGNED, false, true),
    BUFFER_IO("readInt8", "", 1, 1, TSC_BUFFER_SIGNED, true, false),
    BUFFER_IO("writeInt8", "writeInt8", 1, 1, TSC_BUFFER_SIGNED, true, true),
    BUFFER_IO("readInt16LE", "", 1, 2, TSC_BUFFER_SIGNED, true, false),
    BUFFER_IO("writeInt16LE", "writeInt16LE", 1, 2, TSC_BUFFER_SIGNED, true, true),
    BUFFER_IO("readInt16BE", "", 1, 2, TSC_BUFFER_SIGNED, false, false),
    BUFFER_IO("writeInt16BE", "writeInt16BE", 1, 2, TSC_BUFFER_SIGNED, false, true),
    BUFFER_IO("readInt32LE", "", 1, 4, TSC_BUFFER_SIGNED, true, false),
    BUFFER_IO("writeInt32LE", "writeInt32LE", 1, 4, TSC_BUFFER_SIGNED, true, true),
    BUFFER_IO("readInt32BE", "", 1, 4, TSC_BUFFER_SIGNED, false, false),
    BUFFER_IO("writeInt32BE", "writeInt32BE", 1, 4, TSC_BUFFER_SIGNED, false, true),
    BUFFER_IO("readFloatLE", "readFloatForwards", 0, 4, TSC_BUFFER_FLOAT, true, false),
    BUFFER_IO("writeFloatLE", "writeFloatForwards", 1, 4, TSC_BUFFER_FLOAT, true, true),
    BUFFER_IO("readFloatBE", "readFloatBackwards", 0, 4, TSC_BUFFER_FLOAT, false, false),
    BUFFER_IO("writeFloatBE", "writeFloatBackwards", 1, 4, TSC_BUFFER_FLOAT, false, true),
    BUFFER_IO("readDoubleLE", "readDoubleForwards", 0, 8, TSC_BUFFER_FLOAT, true, false),
    BUFFER_IO("writeDoubleLE", "writeDoubleForwards", 1, 8, TSC_BUFFER_FLOAT, true, true),
    BUFFER_IO("readDoubleBE", "readDoubleBackwards", 0, 8, TSC_BUFFER_FLOAT, false, false),
    BUFFER_IO("writeDoubleBE", "writeDoubleBackwards", 1, 8, TSC_BUFFER_FLOAT, false, true),
    BUFFER_IO("readUIntLE", "readUIntLE", 2, 0, TSC_BUFFER_UNSIGNED, true, false),
    BUFFER_IO("writeUIntLE", "writeUIntLE", 3, 0, TSC_BUFFER_UNSIGNED, true, true),
    BUFFER_IO("readUIntBE", "readUIntBE", 2, 0, TSC_BUFFER_UNSIGNED, false, false),
    BUFFER_IO("writeUIntBE", "writeUIntBE", 3, 0, TSC_BUFFER_UNSIGNED, false, true),
    BUFFER_IO("readIntLE", "readIntLE", 2, 0, TSC_BUFFER_SIGNED, true, false),
    BUFFER_IO("writeIntLE", "writeIntLE", 3, 0, TSC_BUFFER_SIGNED, true, true),
    BUFFER_IO("readIntBE", "readIntBE", 2, 0, TSC_BUFFER_SIGNED, false, false),
    BUFFER_IO("writeIntBE", "writeIntBE", 3, 0, TSC_BUFFER_SIGNED, false, true),
};
#undef BUFFER_METHOD
#undef BUFFER_IO

static tsc_value_t buffer_argument(const tsc_array_t* args, size_t index) {
    return args && index < args->len ? TSC_ARR(tsc_value_t, args, index) : tsc_value_undefined();
}
static double buffer_numeric_option(tsc_value_t value, double fallback) {
    return tsc_value_is_undefined(value) ? fallback : tsc_value_to_number(value);
}
static double buffer_strict_number(tsc_value_t value, double fallback, bool optional) {
    if (optional && tsc_value_is_undefined(value)) return fallback;
    if (!(!value_is_box(value)))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Buffer numeric option must be a Number"));
    return value_as_num(value);
}
static double buffer_range_option(tsc_value_t value, double fallback, size_t limit) {
    double number = buffer_strict_number(value, fallback, true);
    if (!isfinite(number) || number < 0 || number > (double)limit || floor(number) != number)
        tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Buffer option is outside the byte range"));
    return number;
}
static tsc_str_t* buffer_encoding_option(tsc_value_t value) {
    if (tsc_value_is_undefined(value)) return tsc_str_from_lit("utf8", 4);
    tsc_str_t* encoding = tsc_str_to_lower(tsc_value_to_string(value));
    if (!tsc_buffer_is_encoding(encoding))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Unknown Buffer encoding"));
    return encoding;
}
tsc_buffer_t* tsc_buffer_from_value(tsc_value_t input, tsc_value_t encoding) {
    void* volatile input_root = tsc_value_gc_root(input);
    void* volatile encoding_root = tsc_value_gc_root(encoding);
    (void)input_root; (void)encoding_root;
    if (value_is_box(input) && value_tag(input) == TSC_VALUE_TAG_STRING) {
        // Buffer.from defaults non-string encoding arguments rather than
        // invoking their conversion hooks.
        if (!value_is_box(encoding) || value_tag(encoding) != TSC_VALUE_TAG_STRING || !((tsc_str_t*)value_ptr(encoding))->len)
            encoding = tsc_value_undefined();
        return tsc_buffer_from_str((tsc_str_t*)value_ptr(input), buffer_encoding_option(encoding));
    }
    if (value_is_box(input) && value_tag(input) == TSC_VALUE_TAG_OBJECT && ((tsc_object_t*)value_ptr(input))->is_buffer)
        return tsc_buffer_from_buffer(tsc_value_as_buffer(input));
    if (value_is_box(input) && (value_tag(input) == TSC_VALUE_TAG_ARRAY || value_tag(input) == TSC_VALUE_TAG_OBJECT)) {
        tsc_value_t length_value = tsc_value_get_prop(input, tsc_str_from_lit("length", 6));
        if (value_tag(input) == TSC_VALUE_TAG_OBJECT && tsc_value_is_undefined(length_value))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Buffer.from requires bytes, a String or an array-like byte source"));
        double length = value_is_box(length_value) ? 0 : value_as_num(length_value);
        if (isnan(length) || length < 0) length = 0;
        if (!isfinite(length) || length > (double)SIZE_MAX)
            tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Buffer byte length is outside the allocation range"));
        tsc_buffer_t* volatile result = buffer_alloc_len((size_t)length);
        for (size_t index = 0; index < result->len; ++index) {
            tsc_value_t element = tsc_value_get_index(input, (double)index);
            result->data[index] = byte_from_double(tsc_value_to_number(element));
        }
        return result;
    }
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Buffer.from requires bytes, a String or an array-like byte source"));
}

static void buffer_integer_value_range(double value, size_t width, tsc_buffer_number_kind_t kind) {
    if (kind == TSC_BUFFER_FLOAT) return;
    double modulus = ldexp(1.0, (int)(width * 8));
    double minimum = kind == TSC_BUFFER_SIGNED ? -modulus / 2 : 0;
    double maximum = kind == TSC_BUFFER_SIGNED ? modulus / 2 - 1 : modulus - 1;
    if (value < minimum || value > maximum)
        tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Buffer value is outside the numeric range"));
}

static tsc_value_t buffer_method_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    const buffer_method_t* method = env;
    tsc_buffer_t* volatile buffer = tsc_value_as_buffer(receiver);
    void* volatile receiver_root = tsc_value_gc_root(receiver);
    (void)receiver_root;
    tsc_value_t first = buffer_argument(args, 0);
    switch (method->operation) {
        case BUFFER_NUMBER: {
            size_t width = method->width;
            size_t offset_index = method->write ? 1 : 0;
            tsc_value_t offset_value = buffer_argument(args, offset_index);
            if (!width) {
                if (!method->write && tsc_value_is_undefined(offset_value))
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Buffer offset must be a Number"));
                double requested = buffer_strict_number(buffer_argument(args, offset_index + 1), 0, false);
                if (!isfinite(requested) || floor(requested) != requested || requested < 1 || requested > 6)
                    tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Buffer byteLength must be between 1 and 6"));
                width = (size_t)requested;
            }
            double value = method->write ? tsc_value_to_number(first) : 0;
            // Node's single-byte writer validates the offset type before the
            // value range. Other integer writers validate the range first.
            if (method->write && width > 1) buffer_integer_value_range(value, width, method->number_kind);
            double offset = buffer_strict_number(offset_value, 0, method->width != 0);
            return tsc_value_num(method->write
                ? tsc_buffer_write_number(buffer, value, offset, width, method->number_kind, method->little_endian)
                : tsc_buffer_read_number(buffer, offset, width, method->number_kind, method->little_endian));
        }
        case BUFFER_TEXT: {
            double start = buffer_numeric_option(buffer_argument(args, 1), 0);
            double end = buffer_numeric_option(buffer_argument(args, 2), (double)buffer->len);
            start = isnan(start) || start <= 0 ? 0 : start >= (double)buffer->len ? (double)buffer->len : trunc(start);
            end = isnan(end) || end <= 0 ? 0 : end >= (double)buffer->len ? (double)buffer->len : trunc(end);
            if (end <= start) return tsc_value_string(tsc_str_from_lit("", 0));
            tsc_str_t* encoding = buffer_encoding_option(first);
            tsc_buffer_t* volatile view = tsc_buffer_slice(buffer, start, end);
            return tsc_value_string(tsc_buffer_to_string(view, encoding));
        }
        case BUFFER_JSON: return tsc_buffer_to_json(buffer);
        case BUFFER_SLICE: {
            // slice performs ordinary lookup of subarray, so overrides are
            // observable and may return any value.
            tsc_array_t* volatile forwarded = tsc_array_new(sizeof(tsc_value_t), 2);
            tsc_array_push_value(forwarded, first);
            tsc_array_push_value(forwarded, buffer_argument(args, 1));
            return tsc_value_invoke(receiver, tsc_str_from_lit("subarray", 8), forwarded);
        }
        case BUFFER_SUBARRAY: {
            double start = buffer_numeric_option(first, 0);
            double end = buffer_numeric_option(buffer_argument(args, 1), (double)buffer->len);
            return tsc_value_buffer(tsc_buffer_slice(buffer, start, end));
        }
        case BUFFER_FILL: {
            double start = buffer_range_option(buffer_argument(args, 1), 0, buffer->len);
            double end = buffer_range_option(buffer_argument(args, 2), (double)buffer->len, buffer->len);
            if (end <= start) return receiver;
            if ((value_is_box(first) && value_tag(first) == TSC_VALUE_TAG_STRING)) {
                tsc_buffer_t* volatile pattern = tsc_buffer_from_str(tsc_value_as_string(first), buffer_encoding_option(buffer_argument(args, 3)));
                if (!pattern->len) { memset(buffer->data + (size_t)start, 0, (size_t)(end - start)); return receiver; }
                for (size_t index = (size_t)start; index < (size_t)end; ++index)
                    buffer->data[index] = pattern->data[(index - (size_t)start) % pattern->len];
            } else if (tsc_util_types_is_typed_array(first)) {
                tsc_buffer_t* volatile pattern = tsc_value_as_buffer(first);
                if (!pattern->len) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Buffer fill pattern is empty"));
                // Snapshot permits overlapping source and target views.
                tsc_buffer_t* volatile copy = tsc_buffer_from_buffer(pattern);
                for (size_t index = (size_t)start; index < (size_t)end; ++index)
                    buffer->data[index] = copy->data[(index - (size_t)start) % copy->len];
            } else tsc_buffer_fill(buffer, tsc_value_to_number(first), start, end);
            return receiver;
        }
        case BUFFER_WRITE: {
            if (!(value_is_box(first) && value_tag(first) == TSC_VALUE_TAG_STRING))
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Buffer.write requires a String"));
            tsc_value_t offset_value = buffer_argument(args, 1), length_value = buffer_argument(args, 2);
            tsc_value_t encoding_value = buffer_argument(args, 3);
            double offset = 0, length = NAN;
            if ((value_is_box(offset_value) && value_tag(offset_value) == TSC_VALUE_TAG_STRING)) encoding_value = offset_value;
            else {
                offset = buffer_range_option(offset_value, 0, buffer->len);
                if ((value_is_box(length_value) && value_tag(length_value) == TSC_VALUE_TAG_STRING)) encoding_value = length_value;
                else if (!tsc_value_is_undefined(length_value)) length = buffer_range_option(length_value, 0, UINT32_MAX);
            }
            tsc_str_t* encoding = buffer_encoding_option(encoding_value);
            return tsc_value_num(tsc_buffer_write(buffer, tsc_value_as_string(first), offset, length, encoding));
        }
        case BUFFER_SWAP: tsc_buffer_swap(buffer, method->width); return receiver;
        case BUFFER_COPY: {
            tsc_buffer_t* volatile target = tsc_value_as_buffer(first);
            double target_start = buffer_numeric_option(buffer_argument(args, 1), 0);
            double source_start = buffer_numeric_option(buffer_argument(args, 2), 0);
            double source_end = buffer_numeric_option(buffer_argument(args, 3), (double)buffer->len);
            if (target_start < 0 || source_start < 0 || source_start > (double)buffer->len || source_end < 0)
                tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Buffer copy option is outside the byte range"));
            return tsc_value_num(tsc_buffer_copy(buffer, target, target_start, source_start, source_end));
        }
        case BUFFER_SEARCH: {
            bool backwards = method->width == 1;
            tsc_value_t offset_value = buffer_argument(args, 1), encoding_value = buffer_argument(args, 2);
            if ((value_is_box(offset_value) && value_tag(offset_value) == TSC_VALUE_TAG_STRING)) { encoding_value = offset_value; offset_value = tsc_value_undefined(); }
            double offset = buffer_numeric_option(offset_value, backwards ? NAN : 0);
            if (!tsc_value_is_truthy(encoding_value)) encoding_value = tsc_value_undefined();
            double found;
            if ((!value_is_box(first))) found = backwards
                ? tsc_buffer_last_index_of_byte(buffer, value_as_num(first), offset)
                : tsc_buffer_index_of_byte(buffer, value_as_num(first), offset);
            else {
                tsc_buffer_t* volatile needle;
                if ((value_is_box(first) && value_tag(first) == TSC_VALUE_TAG_STRING)) needle = tsc_buffer_from_str(tsc_value_as_string(first), buffer_encoding_option(encoding_value));
                else needle = tsc_value_as_buffer(first);
                found = backwards ? tsc_buffer_last_index_of_buffer(buffer, needle, offset) : tsc_buffer_index_of_buffer(buffer, needle, offset);
            }
            return method->width == 2 ? tsc_value_bool(found >= 0) : tsc_value_num(found);
        }
        case BUFFER_EQUALS: return tsc_value_bool(tsc_buffer_equals(buffer, tsc_value_as_buffer(first)));
        case BUFFER_COMPARE: {
            tsc_buffer_t* volatile target = tsc_value_as_buffer(first);
            double target_start = buffer_range_option(buffer_argument(args, 1), 0, target->len);
            double target_end = buffer_range_option(buffer_argument(args, 2), (double)target->len, target->len);
            double source_start = buffer_range_option(buffer_argument(args, 3), 0, buffer->len);
            double source_end = buffer_range_option(buffer_argument(args, 4), (double)buffer->len, buffer->len);
            return tsc_value_num(tsc_buffer_compare_ranges(buffer, target, target_start, target_end, source_start, source_end));
        }
        case BUFFER_KEYS: return tsc_value_method_keys(receiver);
        case BUFFER_VALUES: return tsc_value_method_values(receiver);
        case BUFFER_ENTRIES: return tsc_value_method_entries(receiver);
    }
    tsc_panic("unknown Buffer method descriptor");
}

static tsc_value_t buffer_length_getter(void* env, tsc_value_t receiver) {
    (void)env;
    return tsc_value_num((double)tsc_value_as_buffer(receiver)->len);
}

typedef struct { tsc_object_t* prototype; tsc_object_t* uint8_prototype; tsc_object_t* typed_array_prototype; } buffer_intrinsics_t;
static const char buffer_intrinsics_key = 0;

tsc_value_t tsc_buffer_prototype_value(void) {
    buffer_intrinsics_t* state = tsc_realm_state_get(&buffer_intrinsics_key);
    if (state) return tsc_value_object(state->prototype);
    tsc_runtime_lock();
    state = tsc_realm_state_get(&buffer_intrinsics_key);
    if (!state) {
        state = TSC_GC_MALLOC(sizeof(*state));
        state->typed_array_prototype = tsc_object_new();
        state->uint8_prototype = tsc_object_new_with_prototype(tsc_value_object(state->typed_array_prototype));
        state->prototype = tsc_object_new_with_prototype(tsc_value_object(state->uint8_prototype));
        tsc_realm_state_set(&buffer_intrinsics_key, state);
        tsc_object_define_accessor(state->typed_array_prototype, tsc_str_from_lit("length", 6),
            buffer_length_getter, NULL, true, NULL, NULL, true, false, true, true, true);
        tsc_object_define_accessor(state->typed_array_prototype, tsc_str_from_lit("byteLength", 10),
            buffer_length_getter, NULL, true, NULL, NULL, true, false, true, true, true);
        for (size_t index = 0; index < sizeof(buffer_methods) / sizeof(buffer_methods[0]); ++index) {
            const buffer_method_t* method = &buffer_methods[index];
            tsc_object_t* owner = method->operation >= BUFFER_KEYS ? state->typed_array_prototype : state->prototype;
            tsc_value_t function = tsc_value_function_builtin_named(buffer_method_apply, (void*)method,
                method->arity, tsc_str_from_cstr(method->function_name));
            void* volatile function_root = tsc_value_gc_root(function);
            (void)function_root;
            tsc_object_define(owner, tsc_str_from_cstr(method->name), function, true, owner == state->prototype, true);
            if (str_lit_eq(tsc_str_from_cstr(method->name), "toString"))
                tsc_object_define(state->prototype, tsc_str_from_lit("toLocaleString", 14), function, true, true, true);
            if (method->operation == BUFFER_VALUES)
                tsc_object_define(owner, tsc_symbol_property_key(tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_ITERATOR)), function, true, false, true);
            if (method->operation == BUFFER_NUMBER && method->number_kind == TSC_BUFFER_UNSIGNED) {
                // Uint spellings are aliases of the very same callable.
                tsc_str_t* name = tsc_str_from_cstr(method->name);
                char* alias = TSC_GC_MALLOC_ATOMIC(name->len + 1);
                memcpy(alias, name->data, name->len); alias[name->len] = 0;
                char* suffix = strstr(alias, "UInt"); suffix[1] = 'i';
                tsc_object_define(owner, tsc_str_from_cstr(alias), function, true, true, true);
            }
        }
    }
    tsc_runtime_unlock();
    return tsc_value_object(state->prototype);
}

tsc_value_t tsc_value_buffer(tsc_buffer_t* b) {
    if (!b) return tsc_value_null();
    if (b->object) return tsc_value_object(b->object);
    tsc_object_t* o = tsc_object_new_class(b);
    o->is_typed_array = true;
    o->is_buffer = true;
    o->prototype = tsc_buffer_prototype_value();
    o->prototype_gc_root = tsc_value_gc_root(o->prototype);
    b->object = o;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_url(tsc_url_t* url) {
    if (!url) return tsc_value_null();
    if (url->object) return tsc_value_object(url->object);
    tsc_object_t* o = tsc_object_new_class(url);
    o->is_url = true;
    o->prototype = tsc_url_prototype_value();
    o->prototype_gc_root = tsc_value_gc_root(o->prototype);
    url->object = o;
    return tsc_value_object(o);
}

tsc_value_t tsc_value_url_search_params(tsc_url_search_params_t* params) {
    if (!params) return tsc_value_null();
    if (params->object) return tsc_value_object(params->object);
    tsc_object_t* o = tsc_object_new_class(params);
    o->is_url_search_params = true;
    o->prototype = tsc_url_search_params_prototype_value();
    o->prototype_gc_root = tsc_value_gc_root(o->prototype);
    params->object = o;
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
    TSC_MATH_SUM_PRECISE,
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
    TSC_MATH_BINARY_ENTRY("pow", tsc_number_exponentiate),
    TSC_MATH_VARIADIC_ENTRY("random", 0.0, TSC_MATH_RANDOM),
    TSC_MATH_UNARY_ENTRY("round", tsc_math_round),
    TSC_MATH_UNARY_ENTRY("sign", tsc_math_sign),
    TSC_MATH_UNARY_ENTRY("sin", sin),
    TSC_MATH_UNARY_ENTRY("sinh", sinh),
    TSC_MATH_UNARY_ENTRY("sqrt", sqrt),
    TSC_MATH_VARIADIC_ENTRY("sumPrecise", 1.0, TSC_MATH_SUM_PRECISE),
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
        ? tsc_value_to_number(TSC_ARR(tsc_value_t, args, index))
        : NAN;
}

static tsc_value_t math_intrinsic_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    const tsc_math_intrinsic_t* intrinsic = (const tsc_math_intrinsic_t*)env;
    if (intrinsic->kind == TSC_MATH_UNARY) {
        return tsc_value_num(intrinsic->implementation.unary(math_argument(args, 0)));
    }
    if (intrinsic->kind == TSC_MATH_BINARY) {
        double first = math_argument(args, 0);
        double second = math_argument(args, 1);
        return tsc_value_num(intrinsic->implementation.binary(first, second));
    }
    if (intrinsic->kind == TSC_MATH_SUM_PRECISE) {
        return tsc_value_num(tsc_math_sum_precise(args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined()));
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
    bool any_nan = false;
    for (size_t index = 0; index < args->len; index++) {
        double value = math_argument(args, index);
        if (isnan(value)) { any_nan = true; continue; }
        if (value == 0.0 && result == 0.0) {
            bool negative = intrinsic->kind == TSC_MATH_MIN
                ? signbit(value) || signbit(result) : signbit(value) && signbit(result);
            result = negative ? -0.0 : 0.0;
        } else result = intrinsic->kind == TSC_MATH_MIN ? fmin(result, value) : fmax(result, value);
    }
    return tsc_value_num(any_nan ? NAN : result);
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
            (void)tsc_value_define_symbol_property_desc(tsc_value_object(built),
                tsc_symbol_to_string_tag(), tsc_value_string(tsc_str_from_lit("Math", 4)),
                true, false, true, false, true, true, true);
            tsc_math_random_initialize();
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

typedef struct {
    const char* name;
    size_t name_len;
    double arity;
    tsc_generic_function_t apply;
} tsc_reflect_method_descriptor_t;

#define TSC_REFLECT_METHOD(NAME, ARITY, APPLY) \
    { NAME, sizeof(NAME) - 1, ARITY, APPLY }

static const tsc_reflect_method_descriptor_t reflect_method_descriptors[] = {
    TSC_REFLECT_METHOD("apply", 3.0, reflect_apply_method),
    TSC_REFLECT_METHOD("construct", 2.0, reflect_construct_method),
    TSC_REFLECT_METHOD("defineProperty", 3.0, reflect_define_property_method),
    TSC_REFLECT_METHOD("deleteProperty", 2.0, reflect_delete_property_method),
    TSC_REFLECT_METHOD("get", 2.0, reflect_get_method),
    TSC_REFLECT_METHOD("getOwnPropertyDescriptor", 2.0, reflect_get_own_property_descriptor_method),
    TSC_REFLECT_METHOD("getPrototypeOf", 1.0, reflect_get_prototype_of_method),
    TSC_REFLECT_METHOD("has", 2.0, reflect_has_method),
    TSC_REFLECT_METHOD("isExtensible", 1.0, reflect_is_extensible_method),
    TSC_REFLECT_METHOD("ownKeys", 1.0, reflect_own_keys_method),
    TSC_REFLECT_METHOD("preventExtensions", 1.0, reflect_prevent_extensions_method),
    TSC_REFLECT_METHOD("set", 3.0, reflect_set_method),
    TSC_REFLECT_METHOD("setPrototypeOf", 2.0, reflect_set_prototype_of_method),
};

tsc_value_t tsc_builtin_reflect(void) {
    tsc_namespace_intrinsics_state_t* state = namespace_intrinsics_for_current_realm();
    tsc_object_t* reflect = state->reflect;
    if (!reflect) {
        tsc_runtime_lock();
        reflect = state->reflect;
        if (reflect) {
            tsc_runtime_unlock();
            return tsc_value_object(reflect);
        }
        tsc_object_t* built = tsc_object_new();
        for (
            size_t index = 0;
            index < sizeof(reflect_method_descriptors) / sizeof(reflect_method_descriptors[0]);
            index++
        ) {
            const tsc_reflect_method_descriptor_t* descriptor =
                &reflect_method_descriptors[index];
            intrinsic_define_method(
                built,
                descriptor->name,
                descriptor->name_len,
                descriptor->arity,
                descriptor->apply,
                NULL
            );
        }
        (void)tsc_value_define_property_desc(
            tsc_value_object(built),
            tsc_symbol_property_key(tsc_symbol_to_string_tag()),
            tsc_value_string(tsc_str_from_lit("Reflect", 7)),
            true,
            false,
            true,
            false,
            true,
            true,
            true
        );
        state->reflect = built;
        reflect = built;
        tsc_runtime_unlock();
    }
    return tsc_value_object(reflect);
}
