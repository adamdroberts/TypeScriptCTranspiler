#include "tsc_internal.h"

static tsc_shape_t* g_root_shape = NULL;
static uint64_t g_shape_id_counter = 0;

tsc_shape_t* tsc_shape_new_unique(void) {
    tsc_shape_t* s = (tsc_shape_t*)TSC_GC_MALLOC(sizeof(tsc_shape_t));
    s->shape_id = TSC_ID_INC(g_shape_id_counter);
    s->parent = NULL;
    s->transition_key = NULL;
    s->transitions = NULL;
    s->transitions_len = 0;
    s->transitions_cap = 0;
    return s;
}

tsc_shape_t* tsc_shape_new(tsc_shape_t* parent, const tsc_str_t* key) {
    tsc_shape_t* s = (tsc_shape_t*)TSC_GC_MALLOC(sizeof(tsc_shape_t));
    s->shape_id = TSC_ID_INC(g_shape_id_counter);
    s->parent = parent;
    s->transition_key = key;
    s->transitions = NULL;
    s->transitions_len = 0;
    s->transitions_cap = 0;
    return s;
}

void tsc_shape_add_transition(tsc_shape_t* parent, tsc_shape_t* child) {
    if (!parent) return;
    if (parent->transitions_len >= parent->transitions_cap) {
        size_t next_cap = parent->transitions_cap ? parent->transitions_cap * 2 : 4;
        tsc_shape_t** next_trans = (tsc_shape_t**)TSC_GC_MALLOC(sizeof(tsc_shape_t*) * next_cap);
        if (parent->transitions && parent->transitions_len > 0) {
            memcpy(next_trans, parent->transitions, sizeof(tsc_shape_t*) * parent->transitions_len);
        }
        parent->transitions = next_trans;
        parent->transitions_cap = next_cap;
    }
    parent->transitions[parent->transitions_len++] = child;
}

tsc_shape_t* tsc_shape_get_root(void) {
    if (!g_root_shape) {
        tsc_runtime_lock();
        if (!g_root_shape) {
            g_root_shape = tsc_shape_new_unique();
        }
        tsc_runtime_unlock();
    }
    return g_root_shape;
}

static uint64_t g_object_id_counter = 0;

static tsc_object_t* tsc_object_alloc(tsc_value_t prototype) {
    void* volatile prototype_root = tsc_value_gc_root(prototype);
    tsc_object_t* o = (tsc_object_t*)TSC_GC_MALLOC(sizeof(tsc_object_t));
    o->is_abort_signal = false;
    o->is_event_emitter = false;
    o->is_event_target = false;
    o->is_event = false;
    o->len = 0;
    o->cap = 4;
    o->extensible = true;
    o->class_ptr = NULL;
    o->private_elements = NULL;
    o->is_proxy = false;
    o->proxy_revoked = false;
    o->is_promise = false;
    o->generator = NULL;
    o->async_from_sync_iterator = NULL;
    o->is_date = false;
    o->is_regexp = false;
    o->is_weak_collection = false;
    o->is_map = false;
    o->is_set = false;
    o->is_error = false;
    o->is_arguments = false;
    o->is_array_iterator = false;
    o->is_regexp_string_iterator = false;
    o->is_module_namespace = false;
    o->is_typed_array = false;
    o->is_buffer = false;
    o->is_url = false;
    o->is_url_search_params = false;
    o->is_url_search_params_iterator = false;
    o->is_array_buffer = false;
    o->is_data_view = false;
    o->is_text_encoder = false;
    o->is_text_decoder = false;
    o->shape_version = 1;
    o->shape = tsc_shape_get_root();
    o->object_id = TSC_ID_INC(g_object_id_counter);
    o->proxy_target = tsc_value_undefined();
    o->proxy_handler = tsc_value_undefined();
    o->proxy_target_root = NULL;
    o->proxy_handler_root = NULL;
    o->has_primitive_value = false;
    o->primitive_kind = 0;
    o->primitive_value = tsc_value_undefined();
    o->primitive_value_root = NULL;
    o->arguments_parameter_cells = NULL;
    o->prototype = prototype;
    o->prototype_gc_root = tsc_value_gc_root(prototype);
    (void)prototype_root;
    o->props = (tsc_object_prop_t*)TSC_GC_MALLOC(sizeof(tsc_object_prop_t) * o->cap);
    if (g_shape_diagnostics_enabled) {
        fprintf(stderr, "[tsc shape] Obj #%" PRIu64 " created (empty)\n", o->object_id);
    }
    return o;
}

static tsc_value_t object_prototype_has_own_property(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    tsc_value_t key = tsc_value_to_property_key(args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined());
    void* volatile key_root = tsc_value_gc_root(key);
    (void)key_root;
    return tsc_value_bool(tsc_value_has_own_computed_prop(tsc_value_to_object(this_arg), key));
}

static tsc_value_t object_prototype_property_is_enumerable(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    tsc_value_t key = tsc_value_to_property_key(args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined());
    void* volatile key_root = tsc_value_gc_root(key);
    (void)key_root;
    return tsc_value_bool(tsc_value_computed_property_is_enumerable(tsc_value_to_object(this_arg), key));
}

static tsc_value_t object_prototype_is_prototype_of(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    tsc_value_t value = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    if (!tsc_value_is_object(value)) return tsc_value_bool(false);
    return tsc_value_bool(tsc_value_is_prototype_of(tsc_value_to_object(this_arg), value));
}

static tsc_value_t object_prototype_to_string(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    return tsc_value_string(tsc_value_object_to_string_tag(this_arg));
}

static tsc_value_t object_prototype_to_locale_string(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    void* volatile receiver_gc_root = tsc_value_gc_root(this_arg);
    (void)receiver_gc_root;
    tsc_array_t* volatile empty_args = tsc_array_new(sizeof(tsc_value_t), 0);
    return tsc_value_invoke(this_arg, tsc_str_from_lit("toString", 8), empty_args);
}

static tsc_value_t object_prototype_value_of(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    return tsc_value_to_object(this_arg);
}

typedef enum { OBJECT_DEFINE_GETTER, OBJECT_DEFINE_SETTER, OBJECT_LOOKUP_GETTER, OBJECT_LOOKUP_SETTER } object_legacy_accessor_kind_t;

static tsc_value_t object_prototype_legacy_accessor(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    object_legacy_accessor_kind_t kind = (object_legacy_accessor_kind_t)(uintptr_t)env;
    tsc_value_t object = tsc_value_to_object(this_arg);
    void* volatile object_root = tsc_value_gc_root(object);
    (void)object_root;
    tsc_value_t accessor = args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    bool define = kind == OBJECT_DEFINE_GETTER || kind == OBJECT_DEFINE_SETTER;
    if (define && !tsc_value_is_callable(accessor))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Legacy accessor must be callable"));
    tsc_value_t key = tsc_value_to_property_key(args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined());
    void* volatile key_root = tsc_value_gc_root(key);
    (void)key_root;
    tsc_str_t* internal_key = value_is_box(key) && value_tag(key) == TSC_VALUE_TAG_SYMBOL
        ? tsc_symbol_property_key(tsc_value_as_symbol(key)) : tsc_value_to_string(key);
    if (!define) return kind == OBJECT_LOOKUP_GETTER
        ? tsc_value_object_lookup_getter(object, internal_key) : tsc_value_object_lookup_setter(object, internal_key);
    bool success = kind == OBJECT_DEFINE_GETTER
        ? tsc_value_object_define_getter(object, internal_key, accessor) : tsc_value_object_define_setter(object, internal_key, accessor);
    if (!success) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Legacy accessor definition failed"));
    return tsc_value_undefined();
}

static void object_prototype_define_method(tsc_object_t* prototype, const char* name, size_t len, double arity, tsc_generic_function_t fn, void* env) {
    tsc_object_define(
        prototype,
        tsc_str_from_lit(name, len),
        tsc_value_function_builtin_named(fn, env, arity, tsc_str_from_lit(name, len)),
        true,
        false,
        true
    );
}

tsc_value_t tsc_value_object_prototype(void) {
    static const char object_prototype_realm_state_key = 0;
    tsc_object_t* prototype = (tsc_object_t*)tsc_realm_state_get(
        &object_prototype_realm_state_key
    );
    /* No unlocked fast path: the method definitions below re-enter this
     * getter through tsc_object_new, so `prototype` must be published before
     * they run. The recursive runtime lock (no-op without TSC_THREADS) keeps
     * other threads from observing the partially built prototype. */
    tsc_runtime_lock();
    prototype = (tsc_object_t*)tsc_realm_state_get(
        &object_prototype_realm_state_key
    );
    if (!prototype) {
        prototype = tsc_object_alloc(tsc_value_null());
        tsc_realm_state_set(&object_prototype_realm_state_key, prototype);
        object_prototype_define_method(prototype, "hasOwnProperty", 14, 1.0, object_prototype_has_own_property, NULL);
        object_prototype_define_method(prototype, "isPrototypeOf", 13, 1.0, object_prototype_is_prototype_of, NULL);
        object_prototype_define_method(prototype, "propertyIsEnumerable", 20, 1.0, object_prototype_property_is_enumerable, NULL);
        object_prototype_define_method(prototype, "toLocaleString", 14, 0.0, object_prototype_to_locale_string, NULL);
        object_prototype_define_method(prototype, "toString", 8, 0.0, object_prototype_to_string, NULL);
        object_prototype_define_method(prototype, "valueOf", 7, 0.0, object_prototype_value_of, NULL);
        object_prototype_define_method(prototype, "__defineGetter__", 16, 2.0, object_prototype_legacy_accessor, (void*)(uintptr_t)OBJECT_DEFINE_GETTER);
        object_prototype_define_method(prototype, "__defineSetter__", 16, 2.0, object_prototype_legacy_accessor, (void*)(uintptr_t)OBJECT_DEFINE_SETTER);
        object_prototype_define_method(prototype, "__lookupGetter__", 16, 1.0, object_prototype_legacy_accessor, (void*)(uintptr_t)OBJECT_LOOKUP_GETTER);
        object_prototype_define_method(prototype, "__lookupSetter__", 16, 1.0, object_prototype_legacy_accessor, (void*)(uintptr_t)OBJECT_LOOKUP_SETTER);
        /* Complete the reciprocal intrinsic link before user code can read
         * an inherited constructor, even when no global Object read has
         * occurred. Reentry sees the already published prototype. */
        (void)tsc_object_constructor_value();
    }
    tsc_runtime_unlock();
    return tsc_value_object(prototype);
}

static void print_shape_keys(const tsc_object_t* o, const tsc_str_t* skip_key, const tsc_str_t* add_key) {
    fprintf(stderr, "{");
    bool first = true;
    for (size_t i = 0; i < o->len; i++) {
        if (o->props[i].key) {
            if (skip_key && tsc_str_eq(o->props[i].key, skip_key)) {
                continue;
            }
            if (!first) {
                fprintf(stderr, ", ");
            }
            fprintf(stderr, "%.*s", (int)o->props[i].key->len, o->props[i].key->data);
            first = false;
        }
    }
    if (add_key) {
        if (!first) {
            fprintf(stderr, ", ");
        }
        fprintf(stderr, "%.*s", (int)add_key->len, add_key->data);
    }
    fprintf(stderr, "}");
}

tsc_object_t* tsc_object_new(void) {
    return tsc_object_alloc(tsc_value_object_prototype());
}

tsc_object_t* tsc_object_new_with_prototype(tsc_value_t prototype) {
    return tsc_object_alloc(prototype);
}

tsc_object_t* tsc_module_namespace_new(void) {
    tsc_object_t* object = tsc_object_alloc(tsc_value_null());
    object->is_module_namespace = true;
    return object;
}

bool tsc_module_namespace_define(
    tsc_object_t* object,
    tsc_str_t* key,
    tsc_accessor_getter_t getter
) {
    if (!object || !object->is_module_namespace || !object->extensible || !getter) return false;
    return tsc_object_define_accessor(
        object,
        key,
        getter,
        NULL,
        true,
        NULL,
        NULL,
        false,
        true,
        true,
        false,
        true
    );
}

void tsc_module_namespace_finalize(tsc_object_t* object) {
    if (!object || !object->is_module_namespace || !object->extensible) return;
    if (!tsc_value_define_symbol_property_desc(
        tsc_value_object(object),
        tsc_symbol_to_string_tag(),
        tsc_value_string(tsc_str_from_lit("Module", 6)),
        true,
        false,
        true,
        false,
        true,
        false,
        true
    )) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("module namespace @@toStringTag definition failed"));
    }
    (void)tsc_object_prevent_extensions(object);
}

static void object_shape_changed(tsc_object_t* o, const char* action, const tsc_str_t* key) {
    if (!o) return;
    if (g_shape_diagnostics_enabled) {
        fprintf(stderr, "[tsc shape] Obj #%" PRIu64 " transition: shape_version %" PRIu64 " -> %" PRIu64 " | old: ",
                o->object_id, o->shape_version, o->shape_version + 1);
        if (strcmp(action, "add") == 0) {
            print_shape_keys(o, key, NULL);
            fprintf(stderr, " -> new: ");
            print_shape_keys(o, NULL, NULL);
            fprintf(stderr, " | via add '%.*s'\n", key ? (int)key->len : 0, key ? key->data : "");
        } else if (strcmp(action, "delete") == 0) {
            print_shape_keys(o, NULL, key);
            fprintf(stderr, " -> new: ");
            print_shape_keys(o, NULL, NULL);
            fprintf(stderr, " | via delete '%.*s'\n", key ? (int)key->len : 0, key ? key->data : "");
        } else if (strcmp(action, "modify") == 0) {
            print_shape_keys(o, NULL, NULL);
            fprintf(stderr, " -> new: ");
            print_shape_keys(o, NULL, NULL);
            fprintf(stderr, " | via modify '%.*s'\n", key ? (int)key->len : 0, key ? key->data : "");
        } else if (strcmp(action, "prototype") == 0) {
            print_shape_keys(o, NULL, NULL);
            fprintf(stderr, " -> new: ");
            print_shape_keys(o, NULL, NULL);
            fprintf(stderr, " | via prototype change\n");
        } else {
            print_shape_keys(o, NULL, NULL);
            fprintf(stderr, " -> new: ");
            print_shape_keys(o, NULL, NULL);
            fprintf(stderr, " | via %s\n", action);
        }
    }
    o->shape_version++;
    tsc_dynamic_stat_hit(TSC_DYNAMIC_STAT_OBJECT_SHAPE_UPDATE);

    if (strcmp(action, "add") == 0) {
        if (!o->shape) {
            o->shape = tsc_shape_get_root();
        }
        /* The transition tree is shared across all objects; serialize the
         * walk-and-append so TSC_THREADS builds never observe a partially
         * grown transitions array. */
        tsc_runtime_lock();
        tsc_shape_t* next_shape = NULL;
        for (size_t i = 0; i < o->shape->transitions_len; i++) {
            const tsc_str_t* transition_key = o->shape->transitions[i]->transition_key;
            if (transition_key == key || tsc_str_eq(transition_key, key)) {
                next_shape = o->shape->transitions[i];
                break;
            }
        }
        if (!next_shape) {
            next_shape = tsc_shape_new(o->shape, key);
            tsc_shape_add_transition(o->shape, next_shape);
        }
        o->shape = next_shape;
        tsc_runtime_unlock();
    } else {
        o->shape = tsc_shape_new_unique();
    }
}

void object_reserve(tsc_object_t* o, size_t cap) {
    if (cap <= o->cap) return;
    size_t next = o->cap ? o->cap : 4;
    while (next < cap) next *= 2;
    tsc_object_prop_t* props = (tsc_object_prop_t*)TSC_GC_MALLOC(sizeof(tsc_object_prop_t) * next);
    if (o->props && o->len > 0) memcpy(props, o->props, sizeof(tsc_object_prop_t) * o->len);
    o->props = props;
    o->cap = next;
}

ssize_t object_find(const tsc_object_t* o, const tsc_str_t* key) {
    if (!o) return -1;
    for (size_t i = 0; i < o->len; i++) {
        if (o->props[i].key == key || tsc_str_eq(o->props[i].key, key)) return (ssize_t)i;
    }
    return -1;
}

volatile tsc_value_t* tsc_object_arguments_mapped_cell(const tsc_object_t* object, const tsc_str_t* key) {
    if (!object || !object->is_arguments || !object->arguments_parameter_cells) return NULL;
    size_t index = 0;
    if (!tsc_str_array_index(key, &index) || index >= object->arguments_parameter_cells->len) return NULL;
    return TSC_ARR(volatile tsc_value_t*, object->arguments_parameter_cells, index);
}

void tsc_object_arguments_disconnect(tsc_object_t* object, const tsc_str_t* key) {
    if (!object || !object->is_arguments || !object->arguments_parameter_cells) return;
    size_t index = 0;
    if (!tsc_str_array_index(key, &index) || index >= object->arguments_parameter_cells->len) return;
    TSC_ARR(volatile tsc_value_t*, object->arguments_parameter_cells, index) = NULL;
}

bool tsc_proxy_trap_is_callable(tsc_value_t trap) {
    if (!value_is_box(trap)) return false;
    if (value_tag(trap) == TSC_VALUE_TAG_FUNCTION) return true;
    if (value_tag(trap) != TSC_VALUE_TAG_OBJECT) return false;
    tsc_object_t* o = (tsc_object_t*)value_ptr(trap);
    return o && o->is_proxy && tsc_proxy_trap_is_callable(o->proxy_target);
}

bool tsc_proxy_chain_has_revoked(tsc_value_t v) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) return false;
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    if (!o || !o->is_proxy) return false;
    if (o->proxy_revoked) return true;
    return tsc_proxy_chain_has_revoked(o->proxy_target);
}

void tsc_proxy_require_callable_trap(tsc_value_t trap, const char* message) {
    if (!tsc_proxy_trap_is_callable(trap)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr(message));
    }
}

/* Object storage uses one opaque tsc_str_t carrier for either PropertyKey
 * kind. Proxy traps must receive the original public String or Symbol value. */
static tsc_value_t property_key_value(const tsc_str_t* key) {
    tsc_symbol_t* symbol = tsc_property_key_symbol(key);
    return symbol
        ? tsc_value_symbol(symbol)
        : tsc_value_string((tsc_str_t*)key);
}

static bool descriptor_has_prop(const tsc_object_t* desc, const char* name, size_t len, tsc_value_t* out);
static bool descriptor_value_has_prop(tsc_value_t desc, const char* name, size_t len, tsc_value_t* out);

static void validate_proxy_get_result(const tsc_object_t* proxy, const tsc_str_t* key, tsc_value_t result) {
    if (!proxy || !value_is_box(proxy->proxy_target)) return;
    if (value_tag(proxy->proxy_target) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* target = (const tsc_array_t*)value_ptr(proxy->proxy_target);
        tsc_value_t target_desc_value = value_descriptor_from_array_key(target, key);
        if (!value_is_box(target_desc_value) || value_tag(target_desc_value) != TSC_VALUE_TAG_OBJECT) return;
        const tsc_object_t* target_desc = (const tsc_object_t*)value_ptr(target_desc_value);
        tsc_value_t configurable_value = tsc_value_undefined();
        bool has_configurable = descriptor_has_prop(target_desc, "configurable", 12, &configurable_value);
        bool configurable = has_configurable ? tsc_value_is_truthy(configurable_value) : false;
        if (configurable) return;
        tsc_value_t writable_value = tsc_value_undefined();
        bool has_writable = descriptor_has_prop(target_desc, "writable", 8, &writable_value);
        bool writable = has_writable ? tsc_value_is_truthy(writable_value) : false;
        if (writable) return;
        tsc_value_t target_value = tsc_value_undefined();
        bool target_has_value = descriptor_has_prop(target_desc, "value", 5, &target_value);
        if (target_has_value && !tsc_value_object_is(result, target_value)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy get trap cannot report different value for non-configurable non-writable key"));
        }
        tsc_value_t target_getter_value = tsc_value_undefined();
        bool target_has_getter = descriptor_has_prop(target_desc, "get", 3, &target_getter_value);
        if (target_has_getter && tsc_value_is_undefined(target_getter_value) && !tsc_value_is_undefined(result)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy get trap cannot report value for non-configurable accessor without getter"));
        }
        return;
    }
    if (value_tag(proxy->proxy_target) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* target = (const tsc_function_identity_t*)value_ptr(proxy->proxy_target);
        tsc_value_t target_desc_value = value_descriptor_from_function_key(target, key);
        if (!value_is_box(target_desc_value) || value_tag(target_desc_value) != TSC_VALUE_TAG_OBJECT) return;
        const tsc_object_t* target_desc = (const tsc_object_t*)value_ptr(target_desc_value);
        tsc_value_t configurable_value = tsc_value_undefined();
        bool has_configurable = descriptor_has_prop(target_desc, "configurable", 12, &configurable_value);
        bool configurable = has_configurable ? tsc_value_is_truthy(configurable_value) : false;
        if (configurable) return;
        tsc_value_t writable_value = tsc_value_undefined();
        bool has_writable = descriptor_has_prop(target_desc, "writable", 8, &writable_value);
        bool writable = has_writable ? tsc_value_is_truthy(writable_value) : false;
        if (writable) return;
        tsc_value_t target_value = tsc_value_undefined();
        bool target_has_value = descriptor_has_prop(target_desc, "value", 5, &target_value);
        if (target_has_value && !tsc_value_object_is(result, target_value)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy get trap cannot report different value for non-configurable non-writable key"));
        }
        tsc_value_t target_getter_value = tsc_value_undefined();
        bool target_has_getter = descriptor_has_prop(target_desc, "get", 3, &target_getter_value);
        if (target_has_getter && tsc_value_is_undefined(target_getter_value) && !tsc_value_is_undefined(result)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy get trap cannot report value for non-configurable accessor without getter"));
        }
        return;
    }
    if (value_tag(proxy->proxy_target) != TSC_VALUE_TAG_OBJECT) return;
    const tsc_object_t* target = (const tsc_object_t*)value_ptr(proxy->proxy_target);
    ssize_t found = object_find(target, key);
    if (found < 0) return;
    const tsc_object_prop_t* prop = &target->props[(size_t)found];
    if (prop->configurable) return;
    if (!prop->accessor && !prop->writable && !tsc_value_object_is(result, object_prop_data_value(target, prop))) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy get trap cannot report different value for non-configurable non-writable key"));
    }
    if (prop->accessor && !prop->getter && !tsc_value_is_undefined(result)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy get trap cannot report value for non-configurable accessor without getter"));
    }
}

static void validate_proxy_set_result(const tsc_object_t* proxy, const tsc_str_t* key, tsc_value_t value, bool success) {
    if (!success || !proxy || !value_is_box(proxy->proxy_target)) return;
    if (value_tag(proxy->proxy_target) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* target = (const tsc_array_t*)value_ptr(proxy->proxy_target);
        tsc_value_t target_desc_value = value_descriptor_from_array_key(target, key);
        if (!value_is_box(target_desc_value) || value_tag(target_desc_value) != TSC_VALUE_TAG_OBJECT) return;
        const tsc_object_t* target_desc = (const tsc_object_t*)value_ptr(target_desc_value);
        tsc_value_t configurable_value = tsc_value_undefined();
        bool has_configurable = descriptor_has_prop(target_desc, "configurable", 12, &configurable_value);
        bool configurable = has_configurable ? tsc_value_is_truthy(configurable_value) : false;
        if (configurable) return;
        tsc_value_t writable_value = tsc_value_undefined();
        bool has_writable = descriptor_has_prop(target_desc, "writable", 8, &writable_value);
        bool writable = has_writable ? tsc_value_is_truthy(writable_value) : false;
        if (writable) return;
        tsc_value_t target_value = tsc_value_undefined();
        bool target_has_value = descriptor_has_prop(target_desc, "value", 5, &target_value);
        if (target_has_value && !tsc_value_object_is(value, target_value)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy set trap cannot report success changing non-configurable non-writable key"));
        }
        tsc_value_t target_setter_value = tsc_value_undefined();
        bool target_has_setter = descriptor_has_prop(target_desc, "set", 3, &target_setter_value);
        if (target_has_setter && tsc_value_is_undefined(target_setter_value)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy set trap cannot report success for non-configurable accessor without setter"));
        }
        return;
    }
    if (value_tag(proxy->proxy_target) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* target = (const tsc_function_identity_t*)value_ptr(proxy->proxy_target);
        tsc_value_t target_desc_value = value_descriptor_from_function_key(target, key);
        if (!value_is_box(target_desc_value) || value_tag(target_desc_value) != TSC_VALUE_TAG_OBJECT) return;
        const tsc_object_t* target_desc = (const tsc_object_t*)value_ptr(target_desc_value);
        tsc_value_t configurable_value = tsc_value_undefined();
        bool has_configurable = descriptor_has_prop(target_desc, "configurable", 12, &configurable_value);
        bool configurable = has_configurable ? tsc_value_is_truthy(configurable_value) : false;
        if (configurable) return;
        tsc_value_t writable_value = tsc_value_undefined();
        bool has_writable = descriptor_has_prop(target_desc, "writable", 8, &writable_value);
        bool writable = has_writable ? tsc_value_is_truthy(writable_value) : false;
        if (writable) return;
        tsc_value_t target_value = tsc_value_undefined();
        bool target_has_value = descriptor_has_prop(target_desc, "value", 5, &target_value);
        if (target_has_value && !tsc_value_object_is(value, target_value)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy set trap cannot report success changing non-configurable non-writable key"));
        }
        tsc_value_t target_setter_value = tsc_value_undefined();
        bool target_has_setter = descriptor_has_prop(target_desc, "set", 3, &target_setter_value);
        if (target_has_setter && tsc_value_is_undefined(target_setter_value)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy set trap cannot report success for non-configurable accessor without setter"));
        }
        return;
    }
    if (value_tag(proxy->proxy_target) != TSC_VALUE_TAG_OBJECT) return;
    const tsc_object_t* target = (const tsc_object_t*)value_ptr(proxy->proxy_target);
    ssize_t found = object_find(target, key);
    if (found < 0) return;
    const tsc_object_prop_t* prop = &target->props[(size_t)found];
    if (prop->configurable) return;
    if (!prop->accessor && !prop->writable && !tsc_value_object_is(value, object_prop_data_value(target, prop))) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy set trap cannot report success changing non-configurable non-writable key"));
    }
    if (prop->accessor && !prop->setter) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy set trap cannot report success for non-configurable accessor without setter"));
    }
}

static void validate_proxy_define_property_result(const tsc_object_t* proxy, const tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable, bool accessor_descriptor, tsc_value_t getter_value, bool has_getter, tsc_value_t setter_value, bool has_setter, bool success) {
    if (!success || !proxy || !value_is_box(proxy->proxy_target)) return;
    if (value_tag(proxy->proxy_target) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* target = (const tsc_array_t*)value_ptr(proxy->proxy_target);
        tsc_value_t target_desc_value = value_descriptor_from_array_key(target, key);
        const tsc_object_t* target_desc = (value_is_box(target_desc_value) && value_tag(target_desc_value) == TSC_VALUE_TAG_OBJECT)
            ? (const tsc_object_t*)value_ptr(target_desc_value)
            : NULL;
        if (!target_desc) {
            if (!target->extensible) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot add key to non-extensible target"));
            }
            if (has_configurable && !configurable) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot report new non-configurable key"));
            }
            return;
        }

        tsc_value_t target_configurable_value = tsc_value_undefined();
        bool target_has_configurable = descriptor_has_prop(target_desc, "configurable", 12, &target_configurable_value);
        bool target_configurable = target_has_configurable ? tsc_value_is_truthy(target_configurable_value) : false;
        tsc_value_t target_writable_value = tsc_value_undefined();
        bool target_has_writable = descriptor_has_prop(target_desc, "writable", 8, &target_writable_value);
        bool target_writable = target_has_writable ? tsc_value_is_truthy(target_writable_value) : false;
        tsc_value_t target_enumerable_value = tsc_value_undefined();
        bool target_has_enumerable = descriptor_has_prop(target_desc, "enumerable", 10, &target_enumerable_value);
        bool target_enumerable = target_has_enumerable ? tsc_value_is_truthy(target_enumerable_value) : false;
        tsc_value_t target_value = tsc_value_undefined();
        bool target_has_value = descriptor_has_prop(target_desc, "value", 5, &target_value);
        tsc_value_t target_getter_value = tsc_value_undefined();
        bool target_has_getter = descriptor_has_prop(target_desc, "get", 3, &target_getter_value);
        tsc_value_t target_setter_value = tsc_value_undefined();
        bool target_has_setter = descriptor_has_prop(target_desc, "set", 3, &target_setter_value);

        if (has_configurable && !configurable && target_configurable) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot report configurable key as non-configurable"));
        }
        if (target_configurable) return;
        if (has_configurable && configurable) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot make non-configurable key configurable"));
        }
        if (has_enumerable && enumerable != target_enumerable) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable enumerable flag"));
        }
        if (target_has_getter || target_has_setter) {
            if (has_value || has_writable) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot redefine non-configurable accessor key as data"));
            }
            if (has_getter && !tsc_value_object_is(getter_value, target_getter_value)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable accessor getter"));
            }
            if (has_setter && !tsc_value_object_is(setter_value, target_setter_value)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable accessor setter"));
            }
            return;
        }
        if (accessor_descriptor) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot redefine non-configurable data key as accessor"));
        }
        if (has_writable && writable && !target_writable) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot make non-configurable non-writable key writable"));
        }
        if (!target_writable && target_has_value && has_value && !tsc_value_object_is(value, target_value)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable non-writable key"));
        }
        (void)target_has_writable;
        (void)target_has_enumerable;
        (void)getter_value;
        (void)has_getter;
        (void)setter_value;
        (void)has_setter;
        return;
    }
    if (value_tag(proxy->proxy_target) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* target = (const tsc_function_identity_t*)value_ptr(proxy->proxy_target);
        tsc_value_t target_desc_value = value_descriptor_from_function_key(target, key);
        const tsc_object_t* target_desc = (value_is_box(target_desc_value) && value_tag(target_desc_value) == TSC_VALUE_TAG_OBJECT)
            ? (const tsc_object_t*)value_ptr(target_desc_value)
            : NULL;
        if (!target_desc) {
            if (!target->extensible) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot add key to non-extensible target"));
            }
            if (has_configurable && !configurable) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot report new non-configurable key"));
            }
            return;
        }

        tsc_value_t target_value = tsc_value_undefined();
        bool target_has_value = descriptor_has_prop(target_desc, "value", 5, &target_value);
        tsc_value_t target_writable_value = tsc_value_undefined();
        bool target_has_writable = descriptor_has_prop(target_desc, "writable", 8, &target_writable_value);
        bool target_writable = target_has_writable ? tsc_value_is_truthy(target_writable_value) : false;
        tsc_value_t target_configurable_value = tsc_value_undefined();
        bool target_has_configurable = descriptor_has_prop(target_desc, "configurable", 12, &target_configurable_value);
        bool target_configurable = target_has_configurable ? tsc_value_is_truthy(target_configurable_value) : false;
        tsc_value_t target_enumerable_value = tsc_value_undefined();
        bool target_has_enumerable = descriptor_has_prop(target_desc, "enumerable", 10, &target_enumerable_value);
        bool target_enumerable = target_has_enumerable ? tsc_value_is_truthy(target_enumerable_value) : false;
        tsc_value_t target_getter_value = tsc_value_undefined();
        bool target_has_getter = descriptor_has_prop(target_desc, "get", 3, &target_getter_value);
        tsc_value_t target_setter_value = tsc_value_undefined();
        bool target_has_setter = descriptor_has_prop(target_desc, "set", 3, &target_setter_value);
        if (has_configurable && !configurable && target_configurable) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot report configurable key as non-configurable"));
        }
        if (target_configurable) return;
        if (has_configurable && configurable) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot make non-configurable key configurable"));
        }
        if (has_enumerable && enumerable != target_enumerable) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable enumerable flag"));
        }
        if (target_has_getter || target_has_setter) {
            if (has_value || has_writable) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot redefine non-configurable accessor key as data"));
            }
            if (has_getter && !tsc_value_object_is(getter_value, target_getter_value)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable accessor getter"));
            }
            if (has_setter && !tsc_value_object_is(setter_value, target_setter_value)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable accessor setter"));
            }
            return;
        }
        if (accessor_descriptor) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot redefine non-configurable data key as accessor"));
        }
        if (has_writable && writable && !target_writable) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot make non-configurable non-writable key writable"));
        }
        if (!target_writable && target_has_value && has_value && !tsc_value_object_is(value, target_value)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable non-writable key"));
        }
        (void)target_has_writable;
        (void)target_has_enumerable;
        (void)getter_value;
        (void)has_getter;
        (void)setter_value;
        (void)has_setter;
        return;
    }
    if (value_tag(proxy->proxy_target) != TSC_VALUE_TAG_OBJECT) return;
    const tsc_object_t* target = (const tsc_object_t*)value_ptr(proxy->proxy_target);
    ssize_t found = object_find(target, key);
    if (found < 0) {
        if (!target->extensible) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot add key to non-extensible target"));
        }
        if (has_configurable && !configurable) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot report new non-configurable key"));
        }
        return;
    }
    const tsc_object_prop_t* prop = &target->props[(size_t)found];
    if (has_configurable && !configurable && prop->configurable) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot report configurable key as non-configurable"));
    }
    if (prop->configurable) return;
    if (has_configurable && configurable) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot make non-configurable key configurable"));
    }
    if (has_enumerable && enumerable != prop->enumerable) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable enumerable flag"));
    }
    if (prop->accessor) {
        if (has_value || has_writable) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot redefine non-configurable accessor key as data"));
        }
        if (has_getter && !tsc_value_object_is(getter_value, prop->getter_value)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable accessor getter"));
        }
        if (has_setter && !tsc_value_object_is(setter_value, prop->setter_value)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable accessor setter"));
        }
        return;
    }
    if (accessor_descriptor) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot redefine non-configurable data key as accessor"));
    }
    if (has_writable && writable && !prop->writable) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot make non-configurable non-writable key writable"));
    }
    if (!prop->writable && has_value && !tsc_value_object_is(value, object_prop_data_value(target, prop))) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable non-writable key"));
    }
}

static bool descriptor_has_prop(const tsc_object_t* desc, const char* name, size_t len, tsc_value_t* out) {
    ssize_t found = object_find(desc, tsc_str_from_lit(name, len));
    if (found < 0) return false;
    if (out) *out = desc->props[(size_t)found].value;
    return true;
}

static bool descriptor_value_has_prop(tsc_value_t desc, const char* name, size_t len, tsc_value_t* out) {
    const tsc_str_t* key = tsc_str_from_lit(name, len);
    if (!tsc_value_has_prop(desc, key)) return false;
    if (out) *out = tsc_value_get_prop(desc, key);
    return true;
}

static bool proxy_descriptor_result_is_object(tsc_value_t result) {
    return value_is_box(result) && (
        value_tag(result) == TSC_VALUE_TAG_OBJECT ||
        value_tag(result) == TSC_VALUE_TAG_ARRAY ||
        value_tag(result) == TSC_VALUE_TAG_FUNCTION
    );
}

const tsc_object_t* object_prototype_object(const tsc_object_t* o) {
    if (!o || !value_is_object_value(o->prototype)) return NULL;
    return (const tsc_object_t*)value_ptr(o->prototype);
}

const tsc_object_prop_t* object_find_chain_prop(const tsc_object_t* o, const tsc_str_t* key) {
    const tsc_object_t* cur = o;
    while (cur) {
        ssize_t found = object_find(cur, key);
        if (found >= 0) return &cur->props[(size_t)found];
        cur = object_prototype_object(cur);
    }
    return NULL;
}

bool object_chain_contains(tsc_value_t prototype, const tsc_object_t* needle) {
    return tsc_value_chain_contains(prototype, tsc_value_object((tsc_object_t*)needle));
}

static void object_prop_store_value(tsc_object_prop_t* prop, tsc_value_t value) {
    prop->value = value;
    prop->value_gc_root = tsc_value_gc_root(value);
}

static void object_prop_store_getter_value(tsc_object_prop_t* prop, tsc_value_t value) {
    prop->getter_value = value;
    prop->getter_value_gc_root = tsc_value_gc_root(value);
}

static void object_prop_store_setter_value(tsc_object_prop_t* prop, tsc_value_t value) {
    prop->setter_value = value;
    prop->setter_value_gc_root = tsc_value_gc_root(value);
}

bool tsc_object_is_prototype_of(const tsc_object_t* prototype, const tsc_object_t* object) {
    if (!prototype || !object) return false;
    return object_chain_contains(object->prototype, prototype);
}


bool value_set_receiver_own_data(tsc_value_t receiver, tsc_str_t* key, tsc_value_t value) {
    void* volatile value_gc_root = tsc_value_gc_root(value);
    (void)value_gc_root;
    void* volatile receiver_gc_root = tsc_value_gc_root(receiver);
    (void)receiver_gc_root;
    if (!tsc_value_is_object(receiver)) return false;
    tsc_value_t descriptor = tsc_value_get_own_property_descriptor(receiver, key);
    void* volatile descriptor_root = tsc_value_gc_root(descriptor); (void)descriptor_root;
    if (tsc_value_is_undefined(descriptor))
        return tsc_value_define_property_desc(receiver, key, value, true, true, true, true, true, true, true);
    if (tsc_value_has_own_prop(descriptor, tsc_str_from_lit("get", 3)) ||
        !tsc_value_is_truthy(tsc_value_get_prop(descriptor, tsc_str_from_lit("writable", 8)))) return false;
    return tsc_value_define_property_desc(receiver, key, value, true, false, false, false, false, false, false);
}

bool tsc_object_set_receiver(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver) {
    void* volatile value_gc_root = tsc_value_gc_root(value);
    (void)value_gc_root;
    void* volatile receiver_gc_root = tsc_value_gc_root(receiver);
    (void)receiver_gc_root;
    size_t byte_index = 0; bool byte_valid;
    if (tsc_buffer_integer_index(o, key, &byte_index, &byte_valid) && receiver == tsc_value_object(o)) {
        // IntegerIndexedElementSet converts before checking validity.
        tsc_buffer_t* volatile buffer = o->class_ptr;
        void* volatile value_root = tsc_value_gc_root(value); (void)value_root;
        double number = tsc_value_to_number(value);
        if (byte_valid) buffer->data[byte_index] = byte_from_double(number);
        return true;
    }


    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'set' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("set", 3));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_set_prop_receiver(o->proxy_target, key, value, receiver);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy set trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, property_key_value(key));
        tsc_array_push_value(args, value);
        tsc_array_push_value(args, receiver);
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        bool success = tsc_value_is_truthy(res);
        validate_proxy_set_result(o, key, value, success);
        return success;
    }
    /* Module Namespace Exotic Objects have a [[Set]] method that always
     * returns false, including for absent keys and alternate receivers. */
    if (o->is_module_namespace) return false;
    ssize_t idx = object_find(o, key);
    if (idx >= 0) {
        const tsc_object_prop_t* prop = &o->props[idx];
        if (prop->accessor) {
            return prop->setter ? prop->setter(prop->setter_env, receiver, value) : false;
        }
        if (!prop->writable) return false;
        return value_set_receiver_own_data(receiver, key, value);
    }
    if (value_is_box(o->prototype) && value_tag(o->prototype) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_set_receiver((tsc_object_t*)value_ptr(o->prototype), key, value, receiver);
    }
    if (
        value_is_box(o->prototype) &&
        (value_tag(o->prototype) == TSC_VALUE_TAG_ARRAY || value_tag(o->prototype) == TSC_VALUE_TAG_FUNCTION)
    ) {
        return tsc_value_set_prop_receiver(o->prototype, key, value, receiver);
    }
    if (str_lit_eq(key, "__proto__")) {
        if (!value_is_valid_prototype(value)) return true;
        return tsc_value_set_prototype_of(receiver, value);
    }
    return value_set_receiver_own_data(receiver, key, value);
}


bool tsc_object_set(tsc_object_t* o, tsc_str_t* key, tsc_value_t value) {
    void* volatile value_gc_root = tsc_value_gc_root(value);
    (void)value_gc_root;
    return tsc_object_set_receiver(o, key, value, tsc_value_object((tsc_object_t*)o));
}


bool tsc_object_define_desc(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    void* volatile value_gc_root = tsc_value_gc_root(value);
    (void)value_gc_root;
    size_t byte_index = 0; bool byte_valid;
    if (tsc_buffer_integer_index(o, key, &byte_index, &byte_valid)) {
        if (!byte_valid || (has_writable && !writable) || (has_enumerable && !enumerable) || (has_configurable && !configurable)) return false;
        tsc_buffer_t* volatile buffer = o->class_ptr;
        void* volatile value_root = tsc_value_gc_root(value); (void)value_root;
        if (has_value) buffer->data[byte_index] = byte_from_double(tsc_value_to_number(value));
        return true;
    }


    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'defineProperty' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("defineProperty", 14));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_define_property_desc(o->proxy_target, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy defineProperty trap must be callable");
        tsc_object_t* desc = tsc_object_new();
        if (has_value) tsc_object_set(desc, tsc_str_from_lit("value", 5), value);
        if (has_writable) tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(writable));
        if (has_enumerable) tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(enumerable));
        if (has_configurable) tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(configurable));

        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, property_key_value(key));
        tsc_array_push_value(args, tsc_value_object(desc));
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        bool success = tsc_value_is_truthy(res);
        validate_proxy_define_property_result(o, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable, false, tsc_value_undefined(), false, tsc_value_undefined(), false, success);
        return success;
    }
    if (o->is_module_namespace && !o->extensible) {
        ssize_t namespace_index = object_find(o, key);
        if (namespace_index < 0) return false;
        const tsc_object_prop_t* namespace_prop = &o->props[(size_t)namespace_index];
        if (!namespace_prop->accessor) {
            if (has_configurable && configurable) return false;
            if (has_enumerable && enumerable != namespace_prop->enumerable) return false;
            if (has_writable && writable && !namespace_prop->writable) return false;
            if (!namespace_prop->writable && has_value && !tsc_value_object_is(value, namespace_prop->value)) {
                return false;
            }
            return true;
        }
        if (has_configurable && configurable) return false;
        if (has_enumerable && !enumerable) return false;
        if (has_writable && !writable) return false;
        if (has_value) {
            tsc_value_t current = namespace_prop->getter
                ? namespace_prop->getter(namespace_prop->getter_env, tsc_value_object(o))
                : tsc_value_undefined();
            if (!tsc_value_object_is(value, current)) return false;
        }
        return true;
    }
    ssize_t found = object_find(o, key);
    if (found >= 0) {
        size_t idx = (size_t)found;
        tsc_object_prop_t* p = &o->props[idx];
        volatile tsc_value_t* mapped = tsc_object_arguments_mapped_cell(o, key);
        if (mapped && !p->accessor) object_prop_store_value(p, *mapped);
        if (p->native_data) object_prop_store_value(p, object_prop_data_value(o, p));
        if (!p->configurable) {
            if (p->accessor) {
                if (has_value || has_writable) return false;
                if (has_configurable && configurable) return false;
                if (has_enumerable && enumerable != p->enumerable) return false;
                return true;
            }
            if (has_configurable && configurable) return false;
            if (has_enumerable && enumerable != p->enumerable) return false;
            if (has_writable && writable && !p->writable) return false;
            if (!p->writable && has_value && !tsc_value_object_is(value, p->value)) return false;
        }
        if ((has_value || has_writable) && p->accessor) {
            p->native_data = false;
            p->accessor = false;
            p->getter = NULL;
            p->getter_env = NULL;
            object_prop_store_getter_value(p, tsc_value_undefined());
            p->setter = NULL;
            p->setter_env = NULL;
            object_prop_store_setter_value(p, tsc_value_undefined());
        }
        if (has_value) {
            if (p->native_data && p->setter && !p->setter(p->setter_env, tsc_value_object(o), value)) return false;
            object_prop_store_value(p, value);
            if (mapped) *mapped = value;
        }
        if (has_writable) p->writable = writable;
        if (has_enumerable) p->enumerable = enumerable;
        if (has_configurable) p->configurable = configurable;
        if (has_writable && !writable) tsc_object_arguments_disconnect(o, key);
        object_shape_changed(o, "modify", key);
        return true;
    }
    if (!o->extensible) return false;
    object_reserve(o, o->len + 1);
    o->props[o->len].key = key;
    object_prop_store_value(&o->props[o->len], has_value ? value : tsc_value_undefined());
    o->props[o->len].accessor = false;
    o->props[o->len].native_data = false;
    o->props[o->len].getter = NULL;
    o->props[o->len].getter_env = NULL;
    object_prop_store_getter_value(&o->props[o->len], tsc_value_undefined());
    o->props[o->len].setter = NULL;
    o->props[o->len].setter_env = NULL;
    object_prop_store_setter_value(&o->props[o->len], tsc_value_undefined());
    o->props[o->len].writable = has_writable ? writable : false;
    o->props[o->len].enumerable = has_enumerable ? enumerable : false;
    o->props[o->len].configurable = has_configurable ? configurable : false;
    o->len++;
    object_shape_changed(o, "add", key);
    return true;
}


bool tsc_object_define(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, bool writable, bool enumerable, bool configurable) {
    void* volatile value_gc_root = tsc_value_gc_root(value);
    (void)value_gc_root;
    return tsc_object_define_desc(o, key, value, true, writable, true, enumerable, true, configurable, true);
}

tsc_value_t object_prop_data_value(const tsc_object_t* owner, const tsc_object_prop_t* prop) {
    return prop->native_data && prop->getter
        ? prop->getter(prop->getter_env, tsc_value_object((tsc_object_t*)owner))
        : prop->value;
}

bool tsc_object_define_native_data(tsc_object_t* o, tsc_str_t* key,
    tsc_accessor_getter_t read, tsc_accessor_setter_t write, bool enumerable) {
    if (!tsc_object_define(o, key, tsc_value_undefined(), true, enumerable, true)) return false;
    tsc_object_prop_t* prop = &o->props[(size_t)object_find(o, key)];
    prop->native_data = true;
    prop->getter = read;
    prop->setter = write;
    return true;
}

bool tsc_object_define_accessor(tsc_object_t* o, tsc_str_t* key, tsc_accessor_getter_t getter, void* getter_env, bool has_getter, tsc_accessor_setter_t setter, void* setter_env, bool has_setter, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    size_t byte_index = 0; bool byte_valid;
    if (tsc_buffer_integer_index(o, key, &byte_index, &byte_valid)) return false;

    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'defineProperty' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("defineProperty", 14));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_define_accessor_desc(o->proxy_target, key, getter, getter_env, has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy defineProperty trap must be callable");
        tsc_object_t* desc = tsc_object_new();
        tsc_value_t getter_value = has_getter ? value_accessor_getter_identity(getter, getter_env) : tsc_value_undefined();
        tsc_value_t setter_value = has_setter ? value_accessor_setter_identity(setter, setter_env) : tsc_value_undefined();
        if (has_getter) tsc_object_set(desc, tsc_str_from_lit("get", 3), getter_value);
        if (has_setter) tsc_object_set(desc, tsc_str_from_lit("set", 3), setter_value);
        if (has_enumerable) tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(enumerable));
        if (has_configurable) tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(configurable));

        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, property_key_value(key));
        tsc_array_push_value(args, tsc_value_object(desc));
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        bool success = tsc_value_is_truthy(res);
        validate_proxy_define_property_result(o, key, tsc_value_undefined(), false, false, false, enumerable, has_enumerable, configurable, has_configurable, true, getter_value, has_getter, setter_value, has_setter, success);
        return success;
    }
    if (o->is_module_namespace && !o->extensible) return false;
    ssize_t found = object_find(o, key);
    if (found >= 0) {
        tsc_object_prop_t* prop = &o->props[(size_t)found];
        if (!prop->configurable) {
            if (!prop->accessor) return false;
            if (has_configurable && configurable) return false;
            if (has_enumerable && enumerable != prop->enumerable) return false;
            tsc_value_t next_getter_value = has_getter ? value_accessor_getter_identity(getter, getter_env) : prop->getter_value;
            tsc_value_t next_setter_value = has_setter ? value_accessor_setter_identity(setter, setter_env) : prop->setter_value;
            if (
                !tsc_value_object_is(next_getter_value, prop->getter_value) ||
                !tsc_value_object_is(next_setter_value, prop->setter_value)
            ) {
                return false;
            }
            return true;
        }
        tsc_accessor_getter_t next_getter = has_getter ? getter : (prop->accessor ? prop->getter : NULL);
        void* next_getter_env = has_getter ? getter_env : (prop->accessor ? prop->getter_env : NULL);
        tsc_accessor_setter_t next_setter = has_setter ? setter : (prop->accessor ? prop->setter : NULL);
        void* next_setter_env = has_setter ? setter_env : (prop->accessor ? prop->setter_env : NULL);
        bool next_enumerable = has_enumerable ? enumerable : prop->enumerable;
        bool next_configurable = has_configurable ? configurable : prop->configurable;
        object_prop_store_value(prop, tsc_value_undefined());
        prop->accessor = true;
        prop->native_data = false;
        prop->getter = next_getter;
        prop->getter_env = next_getter_env;
        object_prop_store_getter_value(prop, value_accessor_getter_identity(next_getter, next_getter_env));
        prop->setter = next_setter;
        prop->setter_env = next_setter_env;
        object_prop_store_setter_value(prop, value_accessor_setter_identity(next_setter, next_setter_env));
        prop->writable = false;
        prop->enumerable = next_enumerable;
        prop->configurable = next_configurable;
        tsc_object_arguments_disconnect(o, key);
        object_shape_changed(o, "modify", key);
        return true;
    }
    if (!o->extensible) return false;
    object_reserve(o, o->len + 1);
    o->props[o->len].key = key;
    object_prop_store_value(&o->props[o->len], tsc_value_undefined());
    o->props[o->len].accessor = true;
    o->props[o->len].native_data = false;
    o->props[o->len].getter = has_getter ? getter : NULL;
    o->props[o->len].getter_env = has_getter ? getter_env : NULL;
    object_prop_store_getter_value(&o->props[o->len], value_accessor_getter_identity(o->props[o->len].getter, o->props[o->len].getter_env));
    o->props[o->len].setter = has_setter ? setter : NULL;
    o->props[o->len].setter_env = has_setter ? setter_env : NULL;
    object_prop_store_setter_value(&o->props[o->len], value_accessor_setter_identity(o->props[o->len].setter, o->props[o->len].setter_env));
    o->props[o->len].writable = false;
    o->props[o->len].enumerable = has_enumerable ? enumerable : false;
    o->props[o->len].configurable = has_configurable ? configurable : false;
    o->len++;
    object_shape_changed(o, "add", key);
    return true;
}

tsc_value_t tsc_object_get_prototype_of(const tsc_object_t* o) {
    if (o && o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'getPrototypeOf' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("getPrototypeOf", 14));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            if (value_is_box(o->proxy_target) && value_tag(o->proxy_target) == TSC_VALUE_TAG_OBJECT) {
                return tsc_object_get_prototype_of((tsc_object_t*)value_ptr(o->proxy_target));
            }
            return tsc_value_get_prototype_of(o->proxy_target);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy getPrototypeOf trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_value_t proto = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        if (!value_is_valid_prototype(proto)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy getPrototypeOf trap must return object or null"));
        }
        if (value_is_box(o->proxy_target)) {
            if (!tsc_value_is_extensible(o->proxy_target)) {
                tsc_value_t target_proto = tsc_value_get_prototype_of(o->proxy_target);
                if (proto != target_proto) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy getPrototypeOf trap cannot report different prototype for non-extensible target"));
                }
            }
        }
        return proto;
    }
    return o ? o->prototype : tsc_value_undefined();
}


bool tsc_object_set_prototype_of(tsc_object_t* o, tsc_value_t prototype) {
    if (o && o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'setPrototypeOf' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("setPrototypeOf", 14));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            if (value_is_box(o->proxy_target) && value_tag(o->proxy_target) == TSC_VALUE_TAG_OBJECT) {
                return tsc_object_set_prototype_of((tsc_object_t*)value_ptr(o->proxy_target), prototype);
            }
            return tsc_value_set_prototype_of(o->proxy_target, prototype);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy setPrototypeOf trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, prototype);
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        bool changed = tsc_value_is_truthy(res);
        if (changed && value_is_box(o->proxy_target)) {
            if (!tsc_value_is_extensible(o->proxy_target)) {
                tsc_value_t target_proto = tsc_value_get_prototype_of(o->proxy_target);
                if (prototype != target_proto) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy setPrototypeOf trap cannot change prototype of non-extensible target"));
                }
            }
        }
        return changed;
    }
    if (!o || !value_is_valid_prototype(prototype)) return false;
    if (o->prototype == prototype) return true;
    if (!o->extensible) return false;
    if (object_chain_contains(prototype, o)) return false;
    o->prototype = prototype;
    o->prototype_gc_root = tsc_value_gc_root(prototype);
    object_shape_changed(o, "prototype", NULL);
    return true;
}


/* CanonicalNumericIndexString is shared by Buffer's integer-indexed
 * object hooks. Noncanonical strings and Symbols remain ordinary properties. */
bool tsc_buffer_integer_index(const tsc_object_t* object, const tsc_str_t* key, size_t* index, bool* valid) {
    if (!object || !object->is_buffer || tsc_property_key_symbol(key)) return false;
    if (str_lit_eq(key, "-0")) { *valid = false; return true; }
    double numeric = tsc_value_to_number(tsc_value_string((tsc_str_t*)key));
    if (!tsc_str_eq(key, tsc_str_from_num(numeric))) return false;
    const tsc_buffer_t* buffer = object->class_ptr;
    *valid = isfinite(numeric) && numeric >= 0 && floor(numeric) == numeric && numeric < (double)buffer->len;
    if (*valid) *index = (size_t)numeric;
    return true;
}

tsc_value_t tsc_object_get_receiver(const tsc_object_t* o, const tsc_str_t* key, tsc_value_t receiver) {
    size_t byte_index = 0; bool byte_valid;
    if (tsc_buffer_integer_index(o, key, &byte_index, &byte_valid))
        return byte_valid ? tsc_value_num(((const tsc_buffer_t*)o->class_ptr)->data[byte_index]) : tsc_value_undefined();

    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'get' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("get", 3));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_get_prop_receiver(o->proxy_target, key, receiver);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy get trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, property_key_value(key));
        tsc_array_push_value(args, receiver);
        tsc_value_t result = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        validate_proxy_get_result(o, key, result);
        return result;
    }
    ssize_t idx = object_find(o, key);
    if (idx >= 0) {
        const tsc_object_prop_t* prop = &o->props[idx];
        if (prop->accessor) return prop->getter ? prop->getter(prop->getter_env, receiver) : tsc_value_undefined();
        volatile tsc_value_t* mapped = tsc_object_arguments_mapped_cell(o, key);
        if (mapped) return *mapped;
        return object_prop_data_value(o, prop);
    }


    if (value_is_box(o->prototype) && value_tag(o->prototype) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_get_receiver((tsc_object_t*)value_ptr(o->prototype), key, receiver);
    }
    if (
        value_is_box(o->prototype) &&
        (value_tag(o->prototype) == TSC_VALUE_TAG_ARRAY || value_tag(o->prototype) == TSC_VALUE_TAG_FUNCTION)
    ) {
        return tsc_value_get_prop_receiver(o->prototype, key, receiver);
    }
    if (!o->is_module_namespace && str_lit_eq(key, "__proto__")) {
        return tsc_value_get_prototype_of(receiver);
    }
    return tsc_value_undefined();
}


tsc_value_t tsc_object_get(const tsc_object_t* o, const tsc_str_t* key) {
    return tsc_object_get_receiver(o, key, tsc_value_object((tsc_object_t*)o));
}


bool tsc_object_has_own(const tsc_object_t* o, const tsc_str_t* key) {
    size_t byte_index = 0; bool byte_valid;
    if (tsc_buffer_integer_index(o, key, &byte_index, &byte_valid)) return byte_valid;

    if (o->is_proxy) {
        return !tsc_value_is_undefined(tsc_value_get_own_property_descriptor(tsc_value_object((tsc_object_t*)o), (tsc_str_t*)key));
    }
    ssize_t found = object_find(o, key);
    if (found < 0) return false;
    /* HasOwnProperty is specified through [[GetOwnProperty]].  For namespace
     * string exports that operation observes the live binding and therefore
     * preserves its TDZ, even though [[HasProperty]] itself does not. */
    const tsc_object_prop_t* prop = &o->props[(size_t)found];
    if (o->is_module_namespace && !o->extensible && prop->accessor && prop->getter) {
        (void)prop->getter(prop->getter_env, tsc_value_object((tsc_object_t*)o));
    }
    return true;
}


bool tsc_object_property_is_enumerable(const tsc_object_t* o, const tsc_str_t* key) {
    size_t byte_index = 0; bool byte_valid;
    if (tsc_buffer_integer_index(o, key, &byte_index, &byte_valid)) return byte_valid;

    if (o->is_proxy) {
        tsc_value_t desc = tsc_value_get_own_property_descriptor(tsc_value_object((tsc_object_t*)o), (tsc_str_t*)key);
        return !tsc_value_is_undefined(desc) && tsc_value_is_truthy(tsc_value_get_prop(desc, tsc_str_from_lit("enumerable", 10)));
    }
    ssize_t found = object_find(o, key);
    if (found < 0) return false;
    const tsc_object_prop_t* prop = &o->props[(size_t)found];
    if (o->is_module_namespace && !o->extensible && prop->accessor && prop->getter) {
        (void)prop->getter(prop->getter_env, tsc_value_object((tsc_object_t*)o));
    }
    return prop->enumerable;
}


bool tsc_object_has(const tsc_object_t* o, const tsc_str_t* key) {
    size_t byte_index = 0; bool byte_valid;
    if (tsc_buffer_integer_index(o, key, &byte_index, &byte_valid)) return byte_valid;

    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'has' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("has", 3));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_has_prop(o->proxy_target, key);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy has trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, property_key_value(key));
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        bool found = tsc_value_is_truthy(res);
        if (!found && value_is_box(o->proxy_target) && value_tag(o->proxy_target) == TSC_VALUE_TAG_ARRAY) {
            const tsc_array_t* target = (const tsc_array_t*)value_ptr(o->proxy_target);
            tsc_value_t target_desc_value = value_descriptor_from_array_key(target, key);
            if (value_is_box(target_desc_value) && value_tag(target_desc_value) == TSC_VALUE_TAG_OBJECT) {
                const tsc_object_t* target_desc = (const tsc_object_t*)value_ptr(target_desc_value);
                tsc_value_t configurable_value = tsc_value_undefined();
                bool has_configurable = descriptor_has_prop(target_desc, "configurable", 12, &configurable_value);
                bool configurable = has_configurable ? tsc_value_is_truthy(configurable_value) : false;
                if (!configurable) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy has trap cannot report false for non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy has trap cannot report false for key on non-extensible target"));
                }
            }
        } else if (!found && value_is_box(o->proxy_target) && value_tag(o->proxy_target) == TSC_VALUE_TAG_FUNCTION) {
            const tsc_function_identity_t* target = (const tsc_function_identity_t*)value_ptr(o->proxy_target);
            tsc_value_t target_desc_value = value_descriptor_from_function_key(target, key);
            if (value_is_box(target_desc_value) && value_tag(target_desc_value) == TSC_VALUE_TAG_OBJECT) {
                const tsc_object_t* target_desc = (const tsc_object_t*)value_ptr(target_desc_value);
                tsc_value_t configurable_value = tsc_value_undefined();
                bool has_configurable = descriptor_has_prop(target_desc, "configurable", 12, &configurable_value);
                bool configurable = has_configurable ? tsc_value_is_truthy(configurable_value) : false;
                if (!configurable) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy has trap cannot report false for non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy has trap cannot report false for key on non-extensible target"));
                }
            }
        } else if (!found && value_is_box(o->proxy_target) && value_tag(o->proxy_target) == TSC_VALUE_TAG_OBJECT) {
            const tsc_object_t* target = (const tsc_object_t*)value_ptr(o->proxy_target);
            ssize_t idx = object_find(target, key);
            if (idx >= 0) {
                const tsc_object_prop_t* prop = &target->props[(size_t)idx];
                if (!prop->configurable) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy has trap cannot report false for non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy has trap cannot report false for key on non-extensible target"));
                }
            }
        }
        return found;
    }
    ssize_t idx = object_find(o, key);
    if (idx >= 0) return true;
    if (value_is_box(o->prototype) && value_tag(o->prototype) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_has((tsc_object_t*)value_ptr(o->prototype), key);
    }
    if (
        value_is_box(o->prototype) &&
        (value_tag(o->prototype) == TSC_VALUE_TAG_ARRAY || value_tag(o->prototype) == TSC_VALUE_TAG_FUNCTION)
    ) {
        return tsc_value_has_prop(o->prototype, key);
    }
    return false;
}


bool tsc_object_delete(tsc_object_t* o, const tsc_str_t* key) {
    size_t byte_index = 0; bool byte_valid;
    if (tsc_buffer_integer_index(o, key, &byte_index, &byte_valid)) return !byte_valid;

    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'deleteProperty' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("deleteProperty", 14));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_delete_prop(o->proxy_target, (tsc_str_t*)key);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy deleteProperty trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, property_key_value(key));
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        bool deleted = tsc_value_is_truthy(res);
        if (deleted && value_is_box(o->proxy_target) && value_tag(o->proxy_target) == TSC_VALUE_TAG_ARRAY) {
            const tsc_array_t* target = (const tsc_array_t*)value_ptr(o->proxy_target);
            tsc_value_t target_desc_value = value_descriptor_from_array_key(target, key);
            if (value_is_box(target_desc_value) && value_tag(target_desc_value) == TSC_VALUE_TAG_OBJECT) {
                const tsc_object_t* target_desc = (const tsc_object_t*)value_ptr(target_desc_value);
                tsc_value_t configurable_value = tsc_value_undefined();
                bool has_configurable = descriptor_has_prop(target_desc, "configurable", 12, &configurable_value);
                bool configurable = has_configurable ? tsc_value_is_truthy(configurable_value) : false;
                if (!configurable) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy deleteProperty trap cannot report deletion of non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy deleteProperty trap cannot report deletion of key on non-extensible target"));
                }
            }
        } else if (deleted && value_is_box(o->proxy_target) && value_tag(o->proxy_target) == TSC_VALUE_TAG_OBJECT) {
            const tsc_object_t* target = (const tsc_object_t*)value_ptr(o->proxy_target);
            ssize_t idx = object_find(target, key);
            if (idx >= 0) {
                const tsc_object_prop_t* prop = &target->props[(size_t)idx];
                if (!prop->configurable) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy deleteProperty trap cannot report deletion of non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy deleteProperty trap cannot report deletion of key on non-extensible target"));
                }
            }
        } else if (deleted && value_is_box(o->proxy_target) && value_tag(o->proxy_target) == TSC_VALUE_TAG_FUNCTION) {
            const tsc_function_identity_t* target = (const tsc_function_identity_t*)value_ptr(o->proxy_target);
            tsc_value_t target_desc_value = value_descriptor_from_function_key(target, key);
            if (value_is_box(target_desc_value) && value_tag(target_desc_value) == TSC_VALUE_TAG_OBJECT) {
                const tsc_object_t* target_desc = (const tsc_object_t*)value_ptr(target_desc_value);
                tsc_value_t configurable_value = tsc_value_undefined();
                bool has_configurable = descriptor_has_prop(target_desc, "configurable", 12, &configurable_value);
                bool configurable = has_configurable ? tsc_value_is_truthy(configurable_value) : false;
                if (!configurable) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy deleteProperty trap cannot report deletion of non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy deleteProperty trap cannot report deletion of key on non-extensible target"));
                }
            }
        }
        return deleted;
    }
    ssize_t found = object_find(o, key);
    if (found < 0) return true;
    size_t idx = (size_t)found;
    if (!o->props[idx].configurable) return false;
    tsc_object_arguments_disconnect(o, key);
    for (size_t i = idx + 1; i < o->len; i++) {
        o->props[i - 1] = o->props[i];
    }
    o->len--;
    object_shape_changed(o, "delete", key);
    return true;
}


bool tsc_object_is_extensible(const tsc_object_t* o) {
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'isExtensible' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("isExtensible", 12));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            if (value_is_box(o->proxy_target) && value_tag(o->proxy_target) == TSC_VALUE_TAG_OBJECT) {
                return tsc_object_is_extensible((tsc_object_t*)value_ptr(o->proxy_target));
            }
            return tsc_value_is_extensible(o->proxy_target);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy isExtensible trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        bool extensible = tsc_value_is_truthy(res);
        if (value_is_box(o->proxy_target) && extensible != tsc_value_is_extensible(o->proxy_target)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy isExtensible trap result does not match target"));
        }
        return extensible;
    }
    return o->extensible;
}


bool tsc_object_prevent_extensions(tsc_object_t* o) {
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'preventExtensions' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("preventExtensions", 17));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            if (value_is_box(o->proxy_target) && value_tag(o->proxy_target) == TSC_VALUE_TAG_OBJECT) {
                return tsc_object_prevent_extensions((tsc_object_t*)value_ptr(o->proxy_target));
            }
            return tsc_value_prevent_extensions(o->proxy_target);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy preventExtensions trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        bool prevented = tsc_value_is_truthy(res);
        if (prevented && value_is_box(o->proxy_target) && tsc_value_is_extensible(o->proxy_target)) {
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Proxy preventExtensions trap cannot report success for extensible target"));
        }
        return prevented;
    }
    if (o->extensible) {
        o->extensible = false;
        object_shape_changed(o, "preventExtensions", NULL);
    }
    return true;
}

bool tsc_object_seal(tsc_object_t* object) {
    return object && tsc_value_seal(tsc_value_object(object));
}
bool tsc_object_freeze(tsc_object_t* object) {
    return object && tsc_value_freeze(tsc_value_object(object));
}
bool tsc_object_is_sealed(const tsc_object_t* object) {
    return object && tsc_value_is_sealed(tsc_value_object((tsc_object_t*)object));
}
bool tsc_object_is_frozen(const tsc_object_t* object) {
    return object && tsc_value_is_frozen(tsc_value_object((tsc_object_t*)object));
}

static bool str_array_contains(const tsc_array_t* keys, const tsc_str_t* key) {
    if (!keys || !key) return false;
    for (size_t i = 0; i < keys->len; i++) {
        if (tsc_str_eq(TSC_ARR(tsc_str_t*, keys, i), key)) return true;
    }
    return false;
}

static void proxy_own_keys_type_error(const char* message) {
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr(message));
}

static tsc_str_t* proxy_own_key_to_property_key(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return (tsc_str_t*)value_ptr(v);
    }
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_SYMBOL) {
        return tsc_symbol_property_key((tsc_symbol_t*)value_ptr(v));
    }
    proxy_own_keys_type_error("Proxy ownKeys trap entries must be strings or symbols");
    return tsc_str_from_lit("", 0);
}

static void validate_proxy_own_keys_result(const tsc_object_t* proxy, const tsc_array_t* keys);

static tsc_array_t* proxy_own_keys_result_to_list(const tsc_object_t* proxy, tsc_value_t result) {
    if (
        !value_is_box(result) ||
        (
            value_tag(result) != TSC_VALUE_TAG_ARRAY &&
            value_tag(result) != TSC_VALUE_TAG_OBJECT &&
            value_tag(result) != TSC_VALUE_TAG_FUNCTION
        )
    ) {
        proxy_own_keys_type_error("Proxy ownKeys trap must return an array-like object");
    }
    void* volatile result_root = tsc_value_gc_root(result); (void)result_root;
    size_t length = tsc_value_length_of_array_like(result);
    tsc_array_t* volatile keys = tsc_array_new(sizeof(tsc_str_t*), 0);
    for (size_t i = 0; i < length; i++) {
        tsc_value_t item = tsc_value_get_index(result, (double)i);
        tsc_str_t* key = proxy_own_key_to_property_key(item);
        tsc_array_push_raw(keys, &key);
    }
    validate_proxy_own_keys_result(proxy, keys);
    return keys;
}

static void validate_proxy_own_keys_result(const tsc_object_t* proxy, const tsc_array_t* keys) {
    if (!keys) return;
    const tsc_array_t* volatile result_root = keys; (void)result_root;
    for (size_t index = 0; index < keys->len; ++index) {
        for (size_t next = index + 1; next < keys->len; ++next) {
            if (tsc_str_eq(TSC_ARR(tsc_str_t*, keys, index), TSC_ARR(tsc_str_t*, keys, next)))
                proxy_own_keys_type_error("Proxy ownKeys trap returned duplicate key");
        }
    }
    if (!proxy) return;
    tsc_value_t target = proxy->proxy_target;
    void* volatile target_root = tsc_value_gc_root(target); (void)target_root;
    bool extensible = tsc_value_is_extensible(target);
    tsc_array_t* volatile target_keys = tsc_value_raw_own_keys(target);
    bool* nonconfigurable = TSC_GC_MALLOC_ATOMIC(target_keys->len * sizeof(bool));
    /* Read all actual descriptors before validating either key partition. */
    for (size_t index = 0; index < target_keys->len; ++index) {
        tsc_value_t descriptor = tsc_value_get_own_property_descriptor(target, TSC_ARR(tsc_str_t*, target_keys, index));
        void* volatile descriptor_root = tsc_value_gc_root(descriptor); (void)descriptor_root;
        nonconfigurable[index] = !tsc_value_is_undefined(descriptor) &&
            !tsc_value_is_truthy(tsc_value_get_prop(descriptor, tsc_str_from_lit("configurable", 12)));
    }
    for (size_t index = 0; index < target_keys->len; ++index) {
        if (nonconfigurable[index] && !str_array_contains(keys, TSC_ARR(tsc_str_t*, target_keys, index)))
            proxy_own_keys_type_error("Proxy ownKeys trap result missing non-configurable key");
    }
    if (extensible) return;
    for (size_t index = 0; index < target_keys->len; ++index) {
        if (!str_array_contains(keys, TSC_ARR(tsc_str_t*, target_keys, index)))
            proxy_own_keys_type_error("Proxy ownKeys trap result missing key on non-extensible target");
    }
    for (size_t index = 0; index < keys->len; ++index) {
        if (!str_array_contains(target_keys, TSC_ARR(tsc_str_t*, keys, index)))
            proxy_own_keys_type_error("Proxy ownKeys trap result included extra key on non-extensible target");
    }
}

typedef struct {
    tsc_str_t* key;
    size_t numeric_index;
    size_t creation_index;
    unsigned partition;
} object_ordered_key_t;

static int object_ordered_key_compare(const void* left, const void* right) {
    const object_ordered_key_t* a = left;
    const object_ordered_key_t* b = right;
    if (a->partition != b->partition) return a->partition < b->partition ? -1 : 1;
    size_t x = a->partition == 0 ? a->numeric_index : a->creation_index;
    size_t y = b->partition == 0 ? b->numeric_index : b->creation_index;
    return x < y ? -1 : x > y ? 1 : 0;
}

void object_order_ordinary_keys(tsc_array_t* keys) {
    object_ordered_key_t* records = TSC_GC_MALLOC(keys->len * sizeof(*records));
    for (size_t index = 0; index < keys->len; ++index) {
        object_ordered_key_t* record = &records[index];
        record->key = TSC_ARR(tsc_str_t*, keys, index);
        record->creation_index = index;
        record->numeric_index = 0;
        record->partition = tsc_property_key_symbol(record->key) ? 2
            : tsc_str_array_index(record->key, &record->numeric_index) ? 0 : 1;
    }
    qsort(records, keys->len, sizeof(*records), object_ordered_key_compare);
    for (size_t index = 0; index < keys->len; ++index)
        tsc_array_store_raw(keys, index, &records[index].key);
}

tsc_array_t* tsc_object_keys_dyn(const tsc_object_t* o) {
    tsc_array_t* volatile own_keys = tsc_object_own_keys_dyn(o);
    tsc_array_t* volatile result = tsc_array_new(sizeof(tsc_str_t*), own_keys->len);
    for (size_t index = 0; index < own_keys->len; ++index) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, own_keys, index);
        if (tsc_property_key_symbol(key)) continue;
        if (!tsc_object_property_is_enumerable(o, key)) continue;
        tsc_array_push_raw(result, &key);
    }
    return result;
}


tsc_array_t* tsc_object_own_keys_dyn(const tsc_object_t* o) {
    if (!o) return tsc_array_new(sizeof(tsc_str_t*), 1);
    const tsc_object_t* volatile object_root = o; (void)object_root;
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'ownKeys' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("ownKeys", 7));
        void* volatile trap_root = tsc_value_gc_root(trap); (void)trap_root;
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_raw_own_keys(o->proxy_target);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy ownKeys trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
        tsc_array_push_value(args, o->proxy_target);
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        return proxy_own_keys_result_to_list(o, res);
    }
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), o->len);
    if (o->is_buffer) {
        const tsc_buffer_t* buffer = o->class_ptr;
        for (size_t index = 0; index < buffer->len; ++index) {
            tsc_str_t* key = tsc_str_from_num((double)index);
            tsc_array_push_raw(a, &key);
        }
    }
    /* Project the canonical property records, then order ordinary array
     * indices numerically and other Strings/Symbols by creation order. */
    for (size_t i = 0; i < o->len; i++) {
        tsc_str_t* key = o->props[i].key;
        if (tsc_property_key_symbol(key)) continue;
        tsc_array_push_raw(a, &key);
    }
    for (size_t i = 0; i < o->len; i++) {
        tsc_str_t* key = o->props[i].key;
        if (!tsc_property_key_symbol(key)) continue;
        tsc_array_push_raw(a, &key);
    }
    if (!o->is_module_namespace) object_order_ordinary_keys(a);
    return a;
}

tsc_array_t* tsc_object_values_dyn(const tsc_object_t* o) {
    return o ? tsc_value_object_values(tsc_value_object((tsc_object_t*)o))
        : tsc_array_new(sizeof(tsc_value_t), 1);
}

tsc_array_t* tsc_object_entries_dyn(const tsc_object_t* o) {
    return o ? tsc_value_object_entries(tsc_value_object((tsc_object_t*)o))
        : tsc_array_new(sizeof(tsc_value_t), 1);
}

static bool value_is_callable_proxy(tsc_value_t v) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) return false;
    if (tsc_proxy_chain_has_revoked(v)) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'get' on a proxy that has been revoked"));
    }
    return tsc_proxy_trap_is_callable(v);
}

bool value_json_omits_object_property(tsc_value_t v) {
    return value_is_box(v) && (
        value_tag(v) == TSC_VALUE_TAG_UNDEFINED ||
        value_tag(v) == TSC_VALUE_TAG_FUNCTION ||
        value_tag(v) == TSC_VALUE_TAG_SYMBOL ||
        value_is_callable_proxy(v)
    );
}

tsc_str_t* tsc_value_json_stringify(tsc_value_t v) {
    if (!value_is_box(v)) return tsc_json_num(value_as_num(v));
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_FUNCTION:
        case TSC_VALUE_TAG_UNDEFINED:
        case TSC_VALUE_TAG_NULL:
            return tsc_str_from_lit("null", 4);
        case TSC_VALUE_TAG_FALSE:
            return tsc_str_from_lit("false", 5);
        case TSC_VALUE_TAG_TRUE:
            return tsc_str_from_lit("true", 4);
        case TSC_VALUE_TAG_STRING:
            return tsc_json_escape_string((tsc_str_t*)value_ptr(v));
        case TSC_VALUE_TAG_BIGINT:
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Do not know how to serialize a BigInt"));
        case TSC_VALUE_TAG_SYMBOL:
            return tsc_str_from_lit("null", 4);
        case TSC_VALUE_TAG_ARRAY: {
            tsc_array_t* a = (tsc_array_t*)value_ptr(v);
            tsc_str_t* out = tsc_str_from_lit("[", 1);
            for (size_t i = 0; i < a->len; i++) {
                if (i > 0) out = tsc_str_concat(out, tsc_str_from_lit(",", 1));
                out = tsc_str_concat(out, tsc_value_json_stringify(tsc_value_get_index(v, (double)i)));
            }
            return tsc_str_concat(out, tsc_str_from_lit("]", 1));
        }
        case TSC_VALUE_TAG_OBJECT: {
            tsc_object_t* o = (tsc_object_t*)value_ptr(v);
            if (o && o->is_proxy && tsc_proxy_chain_has_revoked(v)) {
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot perform 'get' on a proxy that has been revoked"));
            }
            if (o && o->is_proxy && tsc_value_is_array(v)) {
                size_t len = (size_t)tsc_value_length(v);
                tsc_str_t* out = tsc_str_from_lit("[", 1);
                for (size_t i = 0; i < len; i++) {
                    if (i > 0) out = tsc_str_concat(out, tsc_str_from_lit(",", 1));
                    out = tsc_str_concat(out, tsc_value_json_stringify(tsc_value_get_index(v, (double)i)));
                }
                return tsc_str_concat(out, tsc_str_from_lit("]", 1));
            }
            if (value_is_callable_proxy(v)) return tsc_str_from_lit("null", 4);
            tsc_str_t* out = tsc_str_from_lit("{", 1);
            bool first = true;
            if (o && o->is_proxy) {
                tsc_array_t* keys = tsc_object_keys_dyn(o);
                for (size_t i = 0; i < keys->len; i++) {
                    tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
                    tsc_value_t prop_value = tsc_object_get(o, key);
                    if (value_json_omits_object_property(prop_value)) continue;
                    if (!first) out = tsc_str_concat(out, tsc_str_from_lit(",", 1));
                    first = false;
                    out = tsc_str_concat(out, tsc_json_escape_string(key));
                    out = tsc_str_concat(out, tsc_str_from_lit(":", 1));
                    out = tsc_str_concat(out, tsc_value_json_stringify(prop_value));
                }
                return tsc_str_concat(out, tsc_str_from_lit("}", 1));
            }
            for (size_t i = 0; i < o->len; i++) {
                if (tsc_property_key_symbol(o->props[i].key)) continue;
                if (!o->props[i].enumerable) continue;
                tsc_value_t prop_value = tsc_object_get(o, o->props[i].key);
                if (value_json_omits_object_property(prop_value)) continue;
                if (!first) out = tsc_str_concat(out, tsc_str_from_lit(",", 1));
                first = false;
                out = tsc_str_concat(out, tsc_json_escape_string(o->props[i].key));
                out = tsc_str_concat(out, tsc_str_from_lit(":", 1));
                out = tsc_str_concat(out, tsc_value_json_stringify(prop_value));
            }
            return tsc_str_concat(out, tsc_str_from_lit("}", 1));
        }
    }
    return tsc_str_from_lit("null", 4);
}

tsc_value_t tsc_value_json_stringify_top(tsc_value_t v) {
    if (value_is_box(v)) {
        tsc_value_tag_t tag = value_tag(v);
        if (tag == TSC_VALUE_TAG_FUNCTION ||
            tag == TSC_VALUE_TAG_UNDEFINED ||
            tag == TSC_VALUE_TAG_SYMBOL ||
            (tag == TSC_VALUE_TAG_OBJECT && value_is_callable_proxy(v))) {
            return tsc_value_undefined();
        }
    }
    return tsc_value_string(tsc_value_json_stringify(v));
}



void jp_ws(json_parser_t* p) {
    while (p->pos < p->len) {
        unsigned char c = (unsigned char)p->s[p->pos];
        if (c != 0x09 && c != 0x0a && c != 0x0d && c != 0x20) break;
        p->pos++;
    }
}

bool jp_lit(json_parser_t* p, const char* lit) {
    size_t n = strlen(lit);
    if (p->pos + n <= p->len && memcmp(p->s + p->pos, lit, n) == 0) {
        p->pos += n;
        return true;
    }
    return false;
}

static _Noreturn void jp_syntax_error(const char* message) {
    tsc_throw_error(TSC_ERROR_SYNTAX, tsc_str_from_cstr(message));
}

static int jp_hex_digit(unsigned char c) {
    if (c >= '0' && c <= '9') return (int)(c - '0');
    if (c >= 'a' && c <= 'f') return (int)(c - 'a' + 10);
    if (c >= 'A' && c <= 'F') return (int)(c - 'A' + 10);
    return -1;
}

static uint32_t jp_read_u4(json_parser_t* p) {
    if (p->pos + 4 > p->len) jp_syntax_error("JSON.parse bad unicode escape");
    uint32_t cp = 0;
    for (int i = 0; i < 4; i++) {
        int digit = jp_hex_digit((unsigned char)p->s[p->pos++]);
        if (digit < 0) jp_syntax_error("JSON.parse bad unicode escape");
        cp = (cp << 4) | (uint32_t)digit;
    }
    return cp;
}

static void jp_append_code_point(char* buf, size_t* out, uint32_t cp) {
    if (cp > 0x10FFFF) jp_syntax_error("JSON.parse invalid unicode escape");
    *out += write_utf8_code_point(buf + *out, cp);
}

static bool jp_peek_u4(const json_parser_t* p, size_t pos, uint32_t* value) {
    if (pos + 4 > p->len) return false;
    uint32_t cp = 0;
    for (size_t index = 0; index < 4; index++) {
        int digit = jp_hex_digit((unsigned char)p->s[pos + index]);
        if (digit < 0) return false;
        cp = (cp << 4) | (uint32_t)digit;
    }
    *value = cp;
    return true;
}

tsc_str_t* jp_string(json_parser_t* p) {
    if (p->pos >= p->len || p->s[p->pos] != '"') jp_syntax_error("JSON.parse expected string");
    p->pos++;
    char* buf = (char*)TSC_GC_MALLOC_ATOMIC(p->len - p->pos + 1);
    size_t out = 0;
    while (p->pos < p->len) {
        unsigned char c = (unsigned char)p->s[p->pos++];
        if (c == '"') {
            tsc_str_t* s = str_alloc(out);
            memcpy((char*)s->data, buf, out);
            return s;
        }
        if (c == '\\') {
            if (p->pos >= p->len) jp_syntax_error("JSON.parse bad escape");
            c = (unsigned char)p->s[p->pos++];
            switch (c) {
                case '"': buf[out++] = '"'; break;
                case '\\': buf[out++] = '\\'; break;
                case '/': buf[out++] = '/'; break;
                case 'b': buf[out++] = '\b'; break;
                case 'f': buf[out++] = '\f'; break;
                case 'n': buf[out++] = '\n'; break;
                case 'r': buf[out++] = '\r'; break;
                case 't': buf[out++] = '\t'; break;
                case 'u': {
                    uint32_t cp = jp_read_u4(p);
                    if (cp >= 0xD800 && cp <= 0xDBFF) {
                        uint32_t low = 0;
                        if (
                            p->pos + 6 <= p->len &&
                            p->s[p->pos] == '\\' &&
                            p->s[p->pos + 1] == 'u' &&
                            jp_peek_u4(p, p->pos + 2, &low) &&
                            low >= 0xDC00 && low <= 0xDFFF
                        ) {
                            p->pos += 6;
                            cp = 0x10000 + (((cp - 0xD800) << 10) | (low - 0xDC00));
                        }
                    }
                    jp_append_code_point(buf, &out, cp);
                    break;
                }
                default: jp_syntax_error("JSON.parse unsupported escape");
            }
        } else {
            if (c < 0x20) jp_syntax_error("JSON.parse unescaped control character");
            buf[out++] = (char)c;
        }
    }
    jp_syntax_error("JSON.parse unterminated string");
    return tsc_str_from_lit("", 0);
}

tsc_value_t jp_number(json_parser_t* p) {
    size_t start = p->pos;
    if (p->pos < p->len && p->s[p->pos] == '-') p->pos++;
    if (p->pos >= p->len) jp_syntax_error("JSON.parse incomplete number");
    unsigned char first = (unsigned char)p->s[p->pos];
    if (first == '0') {
        p->pos++;
        if (p->pos < p->len && p->s[p->pos] >= '0' && p->s[p->pos] <= '9') {
            jp_syntax_error("JSON.parse leading zero");
        }
    } else if (first >= '1' && first <= '9') {
        do p->pos++; while (p->pos < p->len && p->s[p->pos] >= '0' && p->s[p->pos] <= '9');
    } else {
        jp_syntax_error("JSON.parse expected number");
    }
    if (p->pos < p->len && p->s[p->pos] == '.') {
        p->pos++;
        size_t fraction = p->pos;
        while (p->pos < p->len && p->s[p->pos] >= '0' && p->s[p->pos] <= '9') p->pos++;
        if (p->pos == fraction) jp_syntax_error("JSON.parse incomplete fraction");
    }
    if (p->pos < p->len && (p->s[p->pos] == 'e' || p->s[p->pos] == 'E')) {
        p->pos++;
        if (p->pos < p->len && (p->s[p->pos] == '+' || p->s[p->pos] == '-')) p->pos++;
        size_t exponent = p->pos;
        while (p->pos < p->len && p->s[p->pos] >= '0' && p->s[p->pos] <= '9') p->pos++;
        if (p->pos == exponent) jp_syntax_error("JSON.parse incomplete exponent");
    }
    size_t length = p->pos - start;
    char* text = (char*)TSC_GC_MALLOC_ATOMIC(length + 1);
    memcpy(text, p->s + start, length);
    text[length] = '\0';
    char* end = NULL;
    locale_t c_locale = newlocale(LC_NUMERIC_MASK, "C", (locale_t)0);
    if (!c_locale) tsc_panic("JSON.parse could not create the C numeric locale");
    locale_t previous_locale = uselocale(c_locale);
    if (!previous_locale) tsc_panic("JSON.parse could not select the C numeric locale");
    double number = strtod(text, &end);
    if (!uselocale(previous_locale)) tsc_panic("JSON.parse could not restore the numeric locale");
    freelocale(c_locale);
    if (end != text + length) jp_syntax_error("JSON.parse invalid number");
    return tsc_value_num(number);
}

typedef enum {
    JP_FRAME_ROOT,
    JP_FRAME_ARRAY,
    JP_FRAME_OBJECT,
} jp_frame_kind_t;

typedef enum {
    JP_ROOT_VALUE,
    JP_ROOT_DONE,
    JP_ARRAY_VALUE_OR_END,
    JP_ARRAY_VALUE,
    JP_ARRAY_COMMA_OR_END,
    JP_OBJECT_KEY_OR_END,
    JP_OBJECT_KEY,
    JP_OBJECT_COLON,
    JP_OBJECT_VALUE,
    JP_OBJECT_COMMA_OR_END,
} jp_frame_state_t;

typedef struct {
    jp_frame_kind_t kind;
    jp_frame_state_t state;
    tsc_array_t* array;
    tsc_object_t* object;
    tsc_str_t* key;
} jp_frame_t;

static jp_frame_t* jp_top_frame(tsc_array_t* frames) {
    if (!frames || frames->len == 0) tsc_panic("JSON.parse frame worklist is empty");
    return &TSC_ARR(jp_frame_t, frames, frames->len - 1);
}

static void jp_accept_value(jp_frame_t* frame, tsc_value_t value, tsc_value_t* root) {
    if (frame->kind == JP_FRAME_ROOT) {
        *root = value;
        frame->state = JP_ROOT_DONE;
        return;
    }
    if (frame->kind == JP_FRAME_ARRAY) {
        tsc_array_push_raw(frame->array, &value);
        frame->state = JP_ARRAY_COMMA_OR_END;
        return;
    }
    if (!frame->key) tsc_panic("JSON.parse object value has no property key");
    bool defined = tsc_object_define_desc(
        frame->object,
        frame->key,
        value,
        true,
        true,
        true,
        true,
        true,
        true,
        true
    );
    if (!defined) tsc_panic("JSON.parse could not define an own data property");
    frame->key = NULL;
    frame->state = JP_OBJECT_COMMA_OR_END;
}

static void jp_push_container_frame(
    tsc_array_t* frames,
    jp_frame_kind_t kind,
    tsc_value_t container
) {
    jp_frame_t frame = {
        .kind = kind,
        .state = kind == JP_FRAME_ARRAY ? JP_ARRAY_VALUE_OR_END : JP_OBJECT_KEY_OR_END,
        .array = kind == JP_FRAME_ARRAY ? (tsc_array_t*)value_ptr(container) : NULL,
        .object = kind == JP_FRAME_OBJECT ? (tsc_object_t*)value_ptr(container) : NULL,
        .key = NULL,
    };
    tsc_array_push_raw(frames, &frame);
}

static void jp_consume_value(
    json_parser_t* parser,
    tsc_array_t* frames,
    jp_frame_t* frame,
    tsc_value_t* root
) {
    jp_ws(parser);
    if (parser->pos >= parser->len) jp_syntax_error("JSON.parse unexpected end");
    char c = parser->s[parser->pos];
    if (c == '[') {
        parser->pos++;
        tsc_value_t value = tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 4));
        void* volatile value_gc_root = tsc_value_gc_root(value);
        (void)value_gc_root;
        jp_accept_value(frame, value, root);
        jp_push_container_frame(frames, JP_FRAME_ARRAY, value);
        return;
    }
    if (c == '{') {
        parser->pos++;
        tsc_value_t value = tsc_value_object(tsc_object_new());
        void* volatile value_gc_root = tsc_value_gc_root(value);
        (void)value_gc_root;
        jp_accept_value(frame, value, root);
        jp_push_container_frame(frames, JP_FRAME_OBJECT, value);
        return;
    }
    tsc_value_t value;
    if (c == '"') value = tsc_value_string(jp_string(parser));
    else if (jp_lit(parser, "true")) value = tsc_value_bool(true);
    else if (jp_lit(parser, "false")) value = tsc_value_bool(false);
    else if (jp_lit(parser, "null")) value = tsc_value_null();
    else if (c == '-' || (c >= '0' && c <= '9')) value = jp_number(parser);
    else jp_syntax_error("JSON.parse expected value");
    jp_accept_value(frame, value, root);
}

tsc_value_t tsc_json_parse(tsc_str_t* text) {
    json_parser_t parser = { text->data, text->len, 0 };
    tsc_array_t* frames = tsc_array_new(sizeof(jp_frame_t), 8);
    jp_frame_t root_frame = {
        .kind = JP_FRAME_ROOT,
        .state = JP_ROOT_VALUE,
        .array = NULL,
        .object = NULL,
        .key = NULL,
    };
    tsc_array_push_raw(frames, &root_frame);
    tsc_value_t root = tsc_value_undefined();

    while (frames->len > 0) {
        jp_ws(&parser);
        jp_frame_t* frame = jp_top_frame(frames);
        if (frame->kind == JP_FRAME_ROOT) {
            if (frame->state == JP_ROOT_DONE) {
                if (parser.pos != parser.len) jp_syntax_error("JSON.parse trailing input");
                return root;
            }
            jp_consume_value(&parser, frames, frame, &root);
            continue;
        }
        if (frame->kind == JP_FRAME_ARRAY) {
            if (
                frame->state == JP_ARRAY_VALUE_OR_END &&
                parser.pos < parser.len && parser.s[parser.pos] == ']'
            ) {
                parser.pos++;
                frames->len--;
                continue;
            }
            if (frame->state == JP_ARRAY_VALUE_OR_END || frame->state == JP_ARRAY_VALUE) {
                jp_consume_value(&parser, frames, frame, &root);
                continue;
            }
            if (parser.pos < parser.len && parser.s[parser.pos] == ',') {
                parser.pos++;
                frame->state = JP_ARRAY_VALUE;
                continue;
            }
            if (parser.pos < parser.len && parser.s[parser.pos] == ']') {
                parser.pos++;
                frames->len--;
                continue;
            }
            jp_syntax_error(parser.pos >= parser.len
                ? "JSON.parse unterminated array"
                : "JSON.parse expected array separator");
        }

        if (
            frame->state == JP_OBJECT_KEY_OR_END &&
            parser.pos < parser.len && parser.s[parser.pos] == '}'
        ) {
            parser.pos++;
            frames->len--;
            continue;
        }
        if (frame->state == JP_OBJECT_KEY_OR_END || frame->state == JP_OBJECT_KEY) {
            if (parser.pos >= parser.len) jp_syntax_error("JSON.parse unterminated object");
            if (parser.s[parser.pos] != '"') jp_syntax_error("JSON.parse expected string");
            frame->key = jp_string(&parser);
            frame->state = JP_OBJECT_COLON;
            continue;
        }
        if (frame->state == JP_OBJECT_COLON) {
            if (parser.pos >= parser.len || parser.s[parser.pos] != ':') {
                jp_syntax_error("JSON.parse expected ':'");
            }
            parser.pos++;
            frame->state = JP_OBJECT_VALUE;
            continue;
        }
        if (frame->state == JP_OBJECT_VALUE) {
            jp_consume_value(&parser, frames, frame, &root);
            continue;
        }
        if (parser.pos < parser.len && parser.s[parser.pos] == ',') {
            parser.pos++;
            frame->state = JP_OBJECT_KEY;
            continue;
        }
        if (parser.pos < parser.len && parser.s[parser.pos] == '}') {
            parser.pos++;
            frames->len--;
            continue;
        }
        jp_syntax_error(parser.pos >= parser.len
            ? "JSON.parse unterminated object"
            : "JSON.parse expected object separator");
    }
    tsc_panic("JSON.parse frame worklist terminated without a root value");
    return tsc_value_undefined();
}

/* ---------------- Map / Set (hash + insertion-order array) ----------------
 *
 * Storage is split:
 *   - `keys` / `values` arrays hold entries in insertion order (the
 *     spec-mandated iteration order). The ordered array is the source of truth
 *     and is what `tsc_map_keys` / `tsc_map_values` returns.
 *   - `buckets` is a power-of-2 open-addressing table of *indices* into the
 *     ordered array, plus two sentinels:
 *         BKT_EMPTY     = SIZE_MAX     — never written
 *         BKT_TOMBSTONE = SIZE_MAX - 1 — vacated by delete
 *
 * Lookups: hash key → probe `buckets` linearly until empty (miss) or until
 * the slot points at an ordered-array entry whose key matches.
 *
 * Inserts: append to ordered array; write its index into the first free
 * (empty or tombstone) bucket on the probe.
 *
 * Deletes: compact the ordered array so iteration order is preserved, then
 * rebuild the bucket table because ordered indices may have shifted.
 *
 * Resizes when load > 75% — the bucket table doubles and is rebuilt by
 * re-inserting every ordered entry.
 */

uint64_t key_hash(tsc_key_kind_t kk, const void* k) {
    switch (kk) {
        case TSC_KEY_NUM: {
            double x; memcpy(&x, k, sizeof x);
            return num_hash(x);
        }
        case TSC_KEY_STR: {
            const tsc_str_t* s; memcpy(&s, k, sizeof s);
            return tsc_str_cached_hash(s);
        }
        case TSC_KEY_PTR: {
            void* p; memcpy(&p, k, sizeof p);
            return splitmix64_mix((uint64_t)(uintptr_t)p);
        }
        case TSC_KEY_BOOL: {
            bool b; memcpy(&b, k, sizeof b);
            return splitmix64_mix(b ? 0x9e3779b97f4a7c15ULL : 0x517cc1b727220a95ULL);
        }
        case TSC_KEY_VALUE: {
            tsc_value_t v; memcpy(&v, k, sizeof v);
            if (!value_is_box(v)) return num_hash(value_as_num(v));
            switch (value_tag(v)) {
                case TSC_VALUE_TAG_UNDEFINED: return splitmix64_mix(0x0f1f2f3f4f5f6f70ULL);
                case TSC_VALUE_TAG_NULL: return splitmix64_mix(0x1021324354657687ULL);
                case TSC_VALUE_TAG_FALSE: return splitmix64_mix(0x517cc1b727220a95ULL);
                case TSC_VALUE_TAG_TRUE: return splitmix64_mix(0x9e3779b97f4a7c15ULL);
                case TSC_VALUE_TAG_STRING: return tsc_str_cached_hash((const tsc_str_t*)value_ptr(v));
                case TSC_VALUE_TAG_BIGINT:
                    return tsc_str_cached_hash(tsc_bigint_to_string((const tsc_bigint_t*)value_ptr(v), 10.0));
                case TSC_VALUE_TAG_SYMBOL:
                case TSC_VALUE_TAG_FUNCTION:
                case TSC_VALUE_TAG_ARRAY:
                case TSC_VALUE_TAG_OBJECT:
                    return splitmix64_mix((uint64_t)(uintptr_t)value_ptr(v) ^ (uint64_t)value_tag(v));
            }
            return splitmix64_mix(v);
        }
    }
    return 0;
}

void map_rebuild_buckets(tsc_map_t* m, size_t new_bucket_cap) {
    size_t* nb = (size_t*)TSC_GC_MALLOC_ATOMIC(new_bucket_cap * sizeof(size_t));
    for (size_t i = 0; i < new_bucket_cap; i++) nb[i] = TSC_BKT_EMPTY;
    size_t mask = new_bucket_cap - 1;
    for (size_t i = 0; i < m->len; i++) {
        const void* k = (const char*)m->keys + i * m->ks;
        size_t slot = (size_t)(key_hash(m->kk, k) & mask);
        while (nb[slot] != TSC_BKT_EMPTY) slot = (slot + 1) & mask;
        nb[slot] = i;
    }
    m->buckets = nb;
    m->bucket_cap = new_bucket_cap;
}

void map_grow_ordered(tsc_map_t* m, size_t want) {
    if (want <= m->cap) return;
    size_t cap = m->cap ? m->cap : 256;
    while (cap < want) cap *= 2;
    const size_t old_cap = m->cap;
    void* nk = m->keys ? TSC_GC_REALLOC(m->keys, cap * m->ks) : TSC_GC_MALLOC(cap * m->ks);
    void* nv = m->values ? TSC_GC_REALLOC(m->values, cap * m->vs) : TSC_GC_MALLOC(cap * m->vs);
    m->keys = nk;
    m->values = nv;
    m->order.entries = TSC_GC_REALLOC(m->order.entries, cap * sizeof(*m->order.entries));
    memset(m->order.entries + old_cap, 0, (cap - old_cap) * sizeof(*m->order.entries));
    if (m->ks == sizeof(tsc_value_t)) {
        m->key_roots = m->key_roots
            ? (void**)TSC_GC_REALLOC(m->key_roots, cap * sizeof(void*))
            : (void**)TSC_GC_MALLOC(cap * sizeof(void*));
        memset(m->key_roots + old_cap, 0, (cap - old_cap) * sizeof(void*));
    }
    if (m->vs == sizeof(tsc_value_t)) {
        m->value_roots = m->value_roots
            ? (void**)TSC_GC_REALLOC(m->value_roots, cap * sizeof(void*))
            : (void**)TSC_GC_MALLOC(cap * sizeof(void*));
        memset(m->value_roots + old_cap, 0, (cap - old_cap) * sizeof(void*));
    }
    m->cap = cap;
}

/* Returns ordered-index if the key is in the map, else TSC_BKT_EMPTY.
 * Output `*slot_out` (if non-NULL) receives the bucket index where an
 * insert should write — preferring the first tombstone seen during probe. */
size_t map_lookup(const tsc_map_t* m, const void* k, size_t* slot_out) {
    if (m->bucket_cap == 0) {
        if (slot_out) *slot_out = TSC_BKT_EMPTY;
        return TSC_BKT_EMPTY;
    }
    size_t mask = m->bucket_cap - 1;
    size_t slot = (size_t)(key_hash(m->kk, k) & mask);
    size_t first_tomb = TSC_BKT_EMPTY;
    while (1) {
        size_t e = m->buckets[slot];
        if (e == TSC_BKT_EMPTY) {
            if (slot_out) *slot_out = (first_tomb != TSC_BKT_EMPTY) ? first_tomb : slot;
            return TSC_BKT_EMPTY;
        }
        if (e == TSC_BKT_TOMBSTONE) {
            if (first_tomb == TSC_BKT_EMPTY) first_tomb = slot;
        } else if (key_eq(m->kk, m->ks, (const char*)m->keys + e * m->ks, k)) {
            if (slot_out) *slot_out = slot;
            return e;
        }
        slot = (slot + 1) & mask;
    }
}

size_t map_lookup_str(const tsc_map_t* m, const tsc_str_t* k, size_t* slot_out) {
    if (m->bucket_cap == 0) {
        if (slot_out) *slot_out = TSC_BKT_EMPTY;
        return TSC_BKT_EMPTY;
    }
    size_t mask = m->bucket_cap - 1;
    size_t slot = (size_t)(tsc_str_cached_hash(k) & mask);
    size_t first_tomb = TSC_BKT_EMPTY;
    tsc_str_t** keys = (tsc_str_t**)m->keys;
    while (1) {
        size_t e = m->buckets[slot];
        if (e == TSC_BKT_EMPTY) {
            if (slot_out) *slot_out = (first_tomb != TSC_BKT_EMPTY) ? first_tomb : slot;
            return TSC_BKT_EMPTY;
        }
        if (e == TSC_BKT_TOMBSTONE) {
            if (first_tomb == TSC_BKT_EMPTY) first_tomb = slot;
        } else if (tsc_str_eq(keys[e], k)) {
            if (slot_out) *slot_out = slot;
            return e;
        }
        slot = (slot + 1) & mask;
    }
}
