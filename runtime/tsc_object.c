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
    tsc_object_t* o = (tsc_object_t*)TSC_GC_MALLOC(sizeof(tsc_object_t));
    o->len = 0;
    o->cap = 4;
    o->extensible = true;
    o->class_ptr = NULL;
    o->is_proxy = false;
    o->proxy_revoked = false;
    o->is_promise = false;
    o->is_date = false;
    o->is_regexp = false;
    o->is_map = false;
    o->is_set = false;
    o->is_error = false;
    o->is_arguments = false;
    o->is_typed_array = false;
    o->is_url = false;
    o->is_url_search_params = false;
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
    o->props = (tsc_object_prop_t*)TSC_GC_MALLOC(sizeof(tsc_object_prop_t) * o->cap);
    if (g_shape_diagnostics_enabled) {
        fprintf(stderr, "[tsc shape] Obj #%" PRIu64 " created (empty)\n", o->object_id);
    }
    return o;
}

static size_t proxy_array_target_length(tsc_value_t target) {
    if (!value_is_box(target) || value_tag(target) != TSC_VALUE_TAG_ARRAY) return 0;
    return ((const tsc_array_t*)value_ptr(target))->len;
}

static void proxy_fill_forwarded_array_growth_slots(tsc_value_t target, const tsc_str_t* key, size_t old_len, bool success) {
    if (!success || !value_is_box(target) || value_tag(target) != TSC_VALUE_TAG_ARRAY) return;
    size_t idx = 0;
    if (!tsc_str_array_index(key, &idx) || idx < old_len) return;
    tsc_array_t* array = (tsc_array_t*)value_ptr(target);
    for (size_t i = old_len; i < idx && i < array->len; i++) {
        tsc_array_clear_hole(array, i);
        TSC_ARR(tsc_value_t, array, i) = tsc_value_string(tsc_str_from_lit("undefined", 9));
    }
}

static void object_prototype_require_receiver(tsc_value_t receiver, const char* method) {
    if (tsc_value_is_nullish(receiver)) {
        char buf[128];
        snprintf(buf, sizeof buf, "Object.prototype.%s receiver is null or undefined", method);
        tsc_throw_str(tsc_str_from_cstr(buf));
    }
}

static tsc_value_t object_prototype_has_own_property(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    object_prototype_require_receiver(this_arg, "hasOwnProperty");
    tsc_value_t key_value = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    return tsc_value_bool(tsc_value_has_own_prop(this_arg, tsc_value_to_string(key_value)));
}

static tsc_value_t object_prototype_property_is_enumerable(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    object_prototype_require_receiver(this_arg, "propertyIsEnumerable");
    tsc_value_t key_value = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    return tsc_value_bool(tsc_value_property_is_enumerable(this_arg, tsc_value_to_string(key_value)));
}

static tsc_value_t object_prototype_is_prototype_of(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    object_prototype_require_receiver(this_arg, "isPrototypeOf");
    tsc_value_t value = args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    return tsc_value_bool(tsc_value_is_prototype_of(this_arg, value));
}

static tsc_value_t object_prototype_to_string(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    return tsc_value_string(tsc_value_object_to_string_tag(this_arg));
}

static tsc_value_t object_prototype_to_locale_string(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    object_prototype_require_receiver(this_arg, "toLocaleString");
    return tsc_value_string(tsc_value_to_string(this_arg));
}

static tsc_value_t object_prototype_value_of(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    object_prototype_require_receiver(this_arg, "valueOf");
    return this_arg;
}

static void object_prototype_define_method(tsc_object_t* prototype, const char* name, size_t len, double arity, tsc_generic_function_t fn) {
    tsc_object_define(
        prototype,
        tsc_str_from_lit(name, len),
        tsc_value_function_builtin_named(fn, NULL, arity, tsc_str_from_lit(name, len)),
        true,
        false,
        true
    );
}

tsc_value_t tsc_value_object_prototype(void) {
    static tsc_object_t* prototype = NULL;
    /* No unlocked fast path: the method definitions below re-enter this
     * getter through tsc_object_new, so `prototype` must be published before
     * they run. The recursive runtime lock (no-op without TSC_THREADS) keeps
     * other threads from observing the partially built prototype. */
    tsc_runtime_lock();
    if (!prototype) {
        prototype = tsc_object_alloc(tsc_value_null());
        object_prototype_define_method(prototype, "hasOwnProperty", 14, 1.0, object_prototype_has_own_property);
        object_prototype_define_method(prototype, "isPrototypeOf", 13, 1.0, object_prototype_is_prototype_of);
        object_prototype_define_method(prototype, "propertyIsEnumerable", 20, 1.0, object_prototype_property_is_enumerable);
        object_prototype_define_method(prototype, "toLocaleString", 14, 0.0, object_prototype_to_locale_string);
        object_prototype_define_method(prototype, "toString", 8, 0.0, object_prototype_to_string);
        object_prototype_define_method(prototype, "valueOf", 7, 0.0, object_prototype_value_of);
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
        tsc_throw_str(tsc_str_from_cstr(message));
    }
}

static bool proxy_trap_missing(const tsc_object_t* o, const char* name, size_t len) {
    tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit(name, len));
    return tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap);
}

static bool proxy_has_no_integrity_traps(const tsc_object_t* o, bool for_mutation) {
    return proxy_trap_missing(o, "preventExtensions", 17) &&
        proxy_trap_missing(o, "ownKeys", 7) &&
        proxy_trap_missing(o, "getOwnPropertyDescriptor", 24) &&
        (!for_mutation || proxy_trap_missing(o, "defineProperty", 14));
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
            tsc_throw_str(tsc_str_from_cstr("Proxy get trap cannot report different value for non-configurable non-writable key"));
        }
        tsc_value_t target_getter_value = tsc_value_undefined();
        bool target_has_getter = descriptor_has_prop(target_desc, "get", 3, &target_getter_value);
        if (target_has_getter && tsc_value_is_undefined(target_getter_value) && !tsc_value_is_undefined(result)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy get trap cannot report value for non-configurable accessor without getter"));
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
            tsc_throw_str(tsc_str_from_cstr("Proxy get trap cannot report different value for non-configurable non-writable key"));
        }
        tsc_value_t target_getter_value = tsc_value_undefined();
        bool target_has_getter = descriptor_has_prop(target_desc, "get", 3, &target_getter_value);
        if (target_has_getter && tsc_value_is_undefined(target_getter_value) && !tsc_value_is_undefined(result)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy get trap cannot report value for non-configurable accessor without getter"));
        }
        return;
    }
    if (value_tag(proxy->proxy_target) != TSC_VALUE_TAG_OBJECT) return;
    const tsc_object_t* target = (const tsc_object_t*)value_ptr(proxy->proxy_target);
    ssize_t found = object_find(target, key);
    if (found < 0) return;
    const tsc_object_prop_t* prop = &target->props[(size_t)found];
    if (prop->configurable) return;
    if (!prop->accessor && !prop->writable && !tsc_value_object_is(result, prop->value)) {
        tsc_throw_str(tsc_str_from_cstr("Proxy get trap cannot report different value for non-configurable non-writable key"));
    }
    if (prop->accessor && !prop->getter && !tsc_value_is_undefined(result)) {
        tsc_throw_str(tsc_str_from_cstr("Proxy get trap cannot report value for non-configurable accessor without getter"));
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
            tsc_throw_str(tsc_str_from_cstr("Proxy set trap cannot report success changing non-configurable non-writable key"));
        }
        tsc_value_t target_setter_value = tsc_value_undefined();
        bool target_has_setter = descriptor_has_prop(target_desc, "set", 3, &target_setter_value);
        if (target_has_setter && tsc_value_is_undefined(target_setter_value)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy set trap cannot report success for non-configurable accessor without setter"));
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
            tsc_throw_str(tsc_str_from_cstr("Proxy set trap cannot report success changing non-configurable non-writable key"));
        }
        tsc_value_t target_setter_value = tsc_value_undefined();
        bool target_has_setter = descriptor_has_prop(target_desc, "set", 3, &target_setter_value);
        if (target_has_setter && tsc_value_is_undefined(target_setter_value)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy set trap cannot report success for non-configurable accessor without setter"));
        }
        return;
    }
    if (value_tag(proxy->proxy_target) != TSC_VALUE_TAG_OBJECT) return;
    const tsc_object_t* target = (const tsc_object_t*)value_ptr(proxy->proxy_target);
    ssize_t found = object_find(target, key);
    if (found < 0) return;
    const tsc_object_prop_t* prop = &target->props[(size_t)found];
    if (prop->configurable) return;
    if (!prop->accessor && !prop->writable && !tsc_value_object_is(value, prop->value)) {
        tsc_throw_str(tsc_str_from_cstr("Proxy set trap cannot report success changing non-configurable non-writable key"));
    }
    if (prop->accessor && !prop->setter) {
        tsc_throw_str(tsc_str_from_cstr("Proxy set trap cannot report success for non-configurable accessor without setter"));
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
                tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot add key to non-extensible target"));
            }
            if (has_configurable && !configurable) {
                tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot report new non-configurable key"));
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
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot report configurable key as non-configurable"));
        }
        if (target_configurable) return;
        if (has_configurable && configurable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot make non-configurable key configurable"));
        }
        if (has_enumerable && enumerable != target_enumerable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable enumerable flag"));
        }
        if (target_has_getter || target_has_setter) {
            if (has_value || has_writable) {
                tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot redefine non-configurable accessor key as data"));
            }
            if (has_getter && !tsc_value_object_is(getter_value, target_getter_value)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable accessor getter"));
            }
            if (has_setter && !tsc_value_object_is(setter_value, target_setter_value)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable accessor setter"));
            }
            return;
        }
        if (accessor_descriptor) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot redefine non-configurable data key as accessor"));
        }
        if (has_writable && writable && !target_writable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot make non-configurable non-writable key writable"));
        }
        if (!target_writable && target_has_value && has_value && !tsc_value_object_is(value, target_value)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable non-writable key"));
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
                tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot add key to non-extensible target"));
            }
            if (has_configurable && !configurable) {
                tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot report new non-configurable key"));
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
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot report configurable key as non-configurable"));
        }
        if (target_configurable) return;
        if (has_configurable && configurable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot make non-configurable key configurable"));
        }
        if (has_enumerable && enumerable != target_enumerable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable enumerable flag"));
        }
        if (target_has_getter || target_has_setter) {
            if (has_value || has_writable) {
                tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot redefine non-configurable accessor key as data"));
            }
            if (has_getter && !tsc_value_object_is(getter_value, target_getter_value)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable accessor getter"));
            }
            if (has_setter && !tsc_value_object_is(setter_value, target_setter_value)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable accessor setter"));
            }
            return;
        }
        if (accessor_descriptor) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot redefine non-configurable data key as accessor"));
        }
        if (has_writable && writable && !target_writable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot make non-configurable non-writable key writable"));
        }
        if (!target_writable && target_has_value && has_value && !tsc_value_object_is(value, target_value)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable non-writable key"));
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
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot add key to non-extensible target"));
        }
        if (has_configurable && !configurable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot report new non-configurable key"));
        }
        return;
    }
    const tsc_object_prop_t* prop = &target->props[(size_t)found];
    if (has_configurable && !configurable && prop->configurable) {
        tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot report configurable key as non-configurable"));
    }
    if (prop->configurable) return;
    if (has_configurable && configurable) {
        tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot make non-configurable key configurable"));
    }
    if (has_enumerable && enumerable != prop->enumerable) {
        tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable enumerable flag"));
    }
    if (prop->accessor) {
        if (has_value || has_writable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot redefine non-configurable accessor key as data"));
        }
        if (has_getter && !tsc_value_object_is(getter_value, prop->getter_value)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable accessor getter"));
        }
        if (has_setter && !tsc_value_object_is(setter_value, prop->setter_value)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable accessor setter"));
        }
        return;
    }
    if (accessor_descriptor) {
        tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot redefine non-configurable data key as accessor"));
    }
    if (has_writable && writable && !prop->writable) {
        tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot make non-configurable non-writable key writable"));
    }
    if (!prop->writable && has_value && !tsc_value_object_is(value, prop->value)) {
        tsc_throw_str(tsc_str_from_cstr("Proxy defineProperty trap cannot change non-configurable non-writable key"));
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

static void validate_proxy_get_own_property_descriptor_object(tsc_value_t desc) {
    tsc_value_t value = tsc_value_undefined();
    bool has_value = descriptor_value_has_prop(desc, "value", 5, &value);
    tsc_value_t writable_value = tsc_value_undefined();
    bool has_writable = descriptor_value_has_prop(desc, "writable", 8, &writable_value);
    tsc_value_t get_value = tsc_value_undefined();
    bool has_get = descriptor_value_has_prop(desc, "get", 3, &get_value);
    tsc_value_t set_value = tsc_value_undefined();
    bool has_set = descriptor_value_has_prop(desc, "set", 3, &set_value);
    if ((has_get || has_set) && (has_value || has_writable)) {
        tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap descriptor cannot mix value/writable with get/set"));
    }
    if (has_get && !tsc_value_is_undefined(get_value) && !tsc_proxy_trap_is_callable(get_value)) {
        tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap getter must be callable"));
    }
    if (has_set && !tsc_value_is_undefined(set_value) && !tsc_proxy_trap_is_callable(set_value)) {
        tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap setter must be callable"));
    }
    (void)value;
    (void)writable_value;
}

static bool proxy_descriptor_result_is_object(tsc_value_t result) {
    return value_is_box(result) && (
        value_tag(result) == TSC_VALUE_TAG_OBJECT ||
        value_tag(result) == TSC_VALUE_TAG_ARRAY ||
        value_tag(result) == TSC_VALUE_TAG_FUNCTION
    );
}

void tsc_proxy_validate_get_own_property_descriptor_result(const tsc_object_t* proxy, const tsc_str_t* key, tsc_value_t result) {
    if (proxy && value_is_box(proxy->proxy_target) && value_tag(proxy->proxy_target) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* target = (const tsc_array_t*)value_ptr(proxy->proxy_target);
        tsc_value_t target_desc_value = value_descriptor_from_array_key(target, key);
        const tsc_object_t* target_desc = (value_is_box(target_desc_value) && value_tag(target_desc_value) == TSC_VALUE_TAG_OBJECT)
            ? (const tsc_object_t*)value_ptr(target_desc_value)
            : NULL;
        if (tsc_value_is_undefined(result)) {
            if (target_desc) {
                tsc_value_t target_configurable_value = tsc_value_undefined();
                bool target_has_configurable = descriptor_has_prop(target_desc, "configurable", 12, &target_configurable_value);
                bool target_configurable = target_has_configurable ? tsc_value_is_truthy(target_configurable_value) : false;
                if (!target_configurable) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot hide non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot hide key on non-extensible target"));
                }
            }
            return;
        }
        if (!proxy_descriptor_result_is_object(result)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap must return object or undefined"));
        }
        validate_proxy_get_own_property_descriptor_object(result);
        tsc_value_t configurable_value = tsc_value_undefined();
        bool has_configurable = descriptor_value_has_prop(result, "configurable", 12, &configurable_value);
        bool configurable = has_configurable ? tsc_value_is_truthy(configurable_value) : false;
        tsc_value_t writable_value = tsc_value_undefined();
        bool has_writable = descriptor_value_has_prop(result, "writable", 8, &writable_value);
        bool writable = has_writable ? tsc_value_is_truthy(writable_value) : false;
        tsc_value_t enumerable_value = tsc_value_undefined();
        bool has_enumerable = descriptor_value_has_prop(result, "enumerable", 10, &enumerable_value);
        bool enumerable = has_enumerable ? tsc_value_is_truthy(enumerable_value) : false;
        tsc_value_t value = tsc_value_undefined();
        bool has_value = descriptor_value_has_prop(result, "value", 5, &value);
        tsc_value_t get_value = tsc_value_undefined();
        bool has_get = descriptor_value_has_prop(result, "get", 3, &get_value);
        tsc_value_t set_value = tsc_value_undefined();
        bool has_set = descriptor_value_has_prop(result, "set", 3, &set_value);

        if (!target_desc) {
            if (!target->extensible) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report new key on non-extensible target"));
            }
            if (!configurable) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report new non-configurable key"));
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

        if (!configurable && target_configurable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report configurable key as non-configurable"));
        }
        if (target_configurable) return;
        if (configurable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report non-configurable key as configurable"));
        }
        if (enumerable != target_enumerable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different enumerable flag for non-configurable key"));
        }
        if (target_has_getter || target_has_setter) {
            if (has_value || has_writable) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report data descriptor for non-configurable accessor key"));
            }
            if (!has_get && target_has_getter) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different getter for non-configurable accessor key"));
            }
            if (has_get && !tsc_value_object_is(get_value, target_getter_value)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different getter for non-configurable accessor key"));
            }
            if (!has_set && target_has_setter) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different setter for non-configurable accessor key"));
            }
            if (has_set && !tsc_value_object_is(set_value, target_setter_value)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different setter for non-configurable accessor key"));
            }
            return;
        }
        if (has_get || has_set) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report accessor descriptor for non-configurable data key"));
        }
        if (!target_writable) {
            if (writable) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report non-configurable non-writable key as writable"));
            }
            if (target_has_value && !tsc_value_object_is(value, target_value)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different value for non-configurable non-writable key"));
            }
        } else if (!writable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report non-configurable writable key as non-writable"));
        }
        (void)has_writable;
        (void)target_has_writable;
        return;
    }
    if (proxy && value_is_box(proxy->proxy_target) && value_tag(proxy->proxy_target) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* target = (const tsc_function_identity_t*)value_ptr(proxy->proxy_target);
        tsc_value_t target_desc_value = value_descriptor_from_function_key(target, key);
        const tsc_object_t* target_desc = (value_is_box(target_desc_value) && value_tag(target_desc_value) == TSC_VALUE_TAG_OBJECT)
            ? (const tsc_object_t*)value_ptr(target_desc_value)
            : NULL;
        if (tsc_value_is_undefined(result)) {
            if (target_desc) {
                tsc_value_t target_configurable_value = tsc_value_undefined();
                bool target_has_configurable = descriptor_has_prop(target_desc, "configurable", 12, &target_configurable_value);
                bool target_configurable = target_has_configurable ? tsc_value_is_truthy(target_configurable_value) : false;
                if (!target_configurable) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot hide non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot hide key on non-extensible target"));
                }
            }
            return;
        }
        if (!proxy_descriptor_result_is_object(result)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap must return object or undefined"));
        }
        validate_proxy_get_own_property_descriptor_object(result);
        tsc_value_t configurable_value = tsc_value_undefined();
        bool has_configurable = descriptor_value_has_prop(result, "configurable", 12, &configurable_value);
        bool configurable = has_configurable ? tsc_value_is_truthy(configurable_value) : false;
        tsc_value_t writable_value = tsc_value_undefined();
        bool has_writable = descriptor_value_has_prop(result, "writable", 8, &writable_value);
        bool writable = has_writable ? tsc_value_is_truthy(writable_value) : false;
        tsc_value_t enumerable_value = tsc_value_undefined();
        bool has_enumerable = descriptor_value_has_prop(result, "enumerable", 10, &enumerable_value);
        bool enumerable = has_enumerable ? tsc_value_is_truthy(enumerable_value) : false;
        tsc_value_t value = tsc_value_undefined();
        bool has_value = descriptor_value_has_prop(result, "value", 5, &value);
        tsc_value_t get_value = tsc_value_undefined();
        bool has_get = descriptor_value_has_prop(result, "get", 3, &get_value);
        tsc_value_t set_value = tsc_value_undefined();
        bool has_set = descriptor_value_has_prop(result, "set", 3, &set_value);

        if (!target_desc) {
            if (!target->extensible) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report new key on non-extensible target"));
            }
            if (!configurable) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report new non-configurable key"));
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

        if (!configurable && target_configurable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report configurable key as non-configurable"));
        }
        if (target_configurable) return;
        if (configurable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report non-configurable key as configurable"));
        }
        if (enumerable != target_enumerable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different enumerable flag for non-configurable key"));
        }
        if (target_has_getter || target_has_setter) {
            if (has_value || has_writable) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report data descriptor for non-configurable accessor key"));
            }
            if (!has_get && target_has_getter) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different getter for non-configurable accessor key"));
            }
            if (has_get && !tsc_value_object_is(get_value, target_getter_value)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different getter for non-configurable accessor key"));
            }
            if (!has_set && target_has_setter) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different setter for non-configurable accessor key"));
            }
            if (has_set && !tsc_value_object_is(set_value, target_setter_value)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different setter for non-configurable accessor key"));
            }
            return;
        }
        if (has_get || has_set) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report accessor descriptor for non-configurable data key"));
        }
        if (!target_writable) {
            if (writable) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report non-configurable non-writable key as writable"));
            }
            if (target_has_value && !tsc_value_object_is(value, target_value)) {
                tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different value for non-configurable non-writable key"));
            }
        } else if (!writable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report non-configurable writable key as non-writable"));
        }
        (void)has_writable;
        (void)target_has_writable;
        (void)target_has_enumerable;
        return;
    }
    if (!proxy || !value_is_box(proxy->proxy_target) || value_tag(proxy->proxy_target) != TSC_VALUE_TAG_OBJECT) return;
    const tsc_object_t* target = (const tsc_object_t*)value_ptr(proxy->proxy_target);
    ssize_t found = object_find(target, key);
    const tsc_object_prop_t* prop = found >= 0 ? &target->props[(size_t)found] : NULL;
    if (tsc_value_is_undefined(result)) {
        if (prop && !prop->configurable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot hide non-configurable key"));
        }
        if (prop && !target->extensible) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot hide key on non-extensible target"));
        }
        return;
    }
    if (!proxy_descriptor_result_is_object(result)) {
        tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap must return object or undefined"));
    }
    validate_proxy_get_own_property_descriptor_object(result);
    tsc_value_t configurable_value = tsc_value_undefined();
    bool has_configurable = descriptor_value_has_prop(result, "configurable", 12, &configurable_value);
    bool configurable = has_configurable ? tsc_value_is_truthy(configurable_value) : false;
    tsc_value_t writable_value = tsc_value_undefined();
    bool has_writable = descriptor_value_has_prop(result, "writable", 8, &writable_value);
    bool writable = has_writable ? tsc_value_is_truthy(writable_value) : false;
    tsc_value_t enumerable_value = tsc_value_undefined();
    bool has_enumerable = descriptor_value_has_prop(result, "enumerable", 10, &enumerable_value);
    bool enumerable = has_enumerable ? tsc_value_is_truthy(enumerable_value) : false;
    tsc_value_t value = tsc_value_undefined();
    bool has_value = descriptor_value_has_prop(result, "value", 5, &value);
    tsc_value_t get_value = tsc_value_undefined();
    bool has_get = descriptor_value_has_prop(result, "get", 3, &get_value);
    tsc_value_t set_value = tsc_value_undefined();
    bool has_set = descriptor_value_has_prop(result, "set", 3, &set_value);

    if (!prop) {
        if (!target->extensible) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report new key on non-extensible target"));
        }
        if (!configurable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report new non-configurable key"));
        }
        return;
    }
    if (!configurable && prop->configurable) {
        tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report configurable key as non-configurable"));
    }
    if (prop->configurable) return;
    if (configurable) {
        tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report non-configurable key as configurable"));
    }
    if (enumerable != prop->enumerable) {
        tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different enumerable flag for non-configurable key"));
    }
    if (prop->accessor) {
        if (has_value || has_writable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report data descriptor for non-configurable accessor key"));
        }
        if (!has_get && !tsc_value_is_undefined(prop->getter_value)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different getter for non-configurable accessor key"));
        }
        if (has_get && !tsc_value_object_is(get_value, prop->getter_value)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different getter for non-configurable accessor key"));
        }
        if (!has_set && !tsc_value_is_undefined(prop->setter_value)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different setter for non-configurable accessor key"));
        }
        if (has_set && !tsc_value_object_is(set_value, prop->setter_value)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different setter for non-configurable accessor key"));
        }
        return;
    }
    if (has_get || has_set) {
        tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report accessor descriptor for non-configurable data key"));
    }
    if (!prop->writable) {
        if (writable) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report non-configurable non-writable key as writable"));
        }
        if (!tsc_value_object_is(value, prop->value)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report different value for non-configurable non-writable key"));
        }
    } else if (!writable) {
        tsc_throw_str(tsc_str_from_cstr("Proxy getOwnPropertyDescriptor trap cannot report non-configurable writable key as non-writable"));
    }
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

bool object_set_own_data(tsc_object_t* o, tsc_str_t* key, tsc_value_t value) {
    ssize_t found = object_find(o, key);
    if (found >= 0) {
        tsc_object_prop_t* prop = &o->props[(size_t)found];
        if (prop->accessor || !prop->writable) return false;
        object_prop_store_value(prop, value);
        volatile tsc_value_t* mapped = tsc_object_arguments_mapped_cell(o, key);
        if (mapped) *mapped = value;
        return true;
    }
    if (!o->extensible) return false;
    object_reserve(o, o->len + 1);
    o->props[o->len].key = key;
    object_prop_store_value(&o->props[o->len], value);
    o->props[o->len].accessor = false;
    o->props[o->len].getter = NULL;
    o->props[o->len].getter_env = NULL;
    object_prop_store_getter_value(&o->props[o->len], tsc_value_undefined());
    o->props[o->len].setter = NULL;
    o->props[o->len].setter_env = NULL;
    object_prop_store_setter_value(&o->props[o->len], tsc_value_undefined());
    o->props[o->len].writable = true;
    o->props[o->len].enumerable = true;
    o->props[o->len].configurable = true;
    o->len++;
    object_shape_changed(o, "add", key);
    return true;
}

bool value_set_receiver_own_data(tsc_value_t receiver, tsc_str_t* key, tsc_value_t value) {
    if (value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* ro = (tsc_object_t*)value_ptr(receiver);
        if (ro->is_proxy) {
            return tsc_object_define_desc(ro, key, value, true, true, true, true, true, true, true);
        }
        return object_set_own_data(ro, key, value);
    }
    if (value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_ARRAY) {
        size_t idx = 0;
        if (tsc_str_array_index(key, &idx)) {
            return tsc_value_set_array_own_index(receiver, idx, value);
        }
        return tsc_value_set_prop(receiver, key, value);
    }
    if (value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_FUNCTION) {
        tsc_function_identity_t* fn = (tsc_function_identity_t*)value_ptr(receiver);
        if (
            tsc_str_is_length_key(key) ||
            str_lit_eq(key, "name") ||
            (
                str_lit_eq(key, "prototype") &&
                fn->kind != TSC_FUNCTION_IDENTITY_GETTER &&
                fn->kind != TSC_FUNCTION_IDENTITY_SETTER
            )
        ) {
            return false;
        }
        return object_set_own_data(fn->props, key, value);
    }
    return false;
}

bool tsc_object_set_receiver(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver) {
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'set' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("set", 3));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            if (
                value_is_box(receiver) &&
                value_tag(receiver) == TSC_VALUE_TAG_OBJECT &&
                (tsc_object_t*)value_ptr(receiver) == o &&
                value_is_box(o->proxy_target) &&
                (
                    value_tag(o->proxy_target) == TSC_VALUE_TAG_ARRAY ||
                    value_tag(o->proxy_target) == TSC_VALUE_TAG_FUNCTION
                )
            ) {
                size_t old_len = proxy_array_target_length(o->proxy_target);
                bool success = tsc_value_set_prop(o->proxy_target, key, value);
                proxy_fill_forwarded_array_growth_slots(o->proxy_target, key, old_len, success);
                return success;
            }
            return tsc_value_set_prop_receiver(o->proxy_target, key, value, receiver);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy set trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, tsc_value_string((tsc_str_t*)key));
        tsc_array_push_value(args, value);
        tsc_array_push_value(args, receiver);
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        bool success = tsc_value_is_truthy(res);
        validate_proxy_set_result(o, key, value, success);
        return success;
    }
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
    return tsc_object_set_receiver(o, key, value, tsc_value_object((tsc_object_t*)o));
}


bool tsc_object_define_desc(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'defineProperty' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("defineProperty", 14));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            size_t old_len = proxy_array_target_length(o->proxy_target);
            bool success = tsc_value_define_property_desc(o->proxy_target, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable);
            proxy_fill_forwarded_array_growth_slots(o->proxy_target, key, old_len, success);
            return success;
        }
        tsc_proxy_require_callable_trap(trap, "Proxy defineProperty trap must be callable");
        tsc_object_t* desc = tsc_object_new();
        if (has_value) tsc_object_set(desc, tsc_str_from_lit("value", 5), value);
        if (has_writable) tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(writable));
        if (has_enumerable) tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(enumerable));
        if (has_configurable) tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(configurable));

        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, tsc_value_string((tsc_str_t*)key));
        tsc_array_push_value(args, tsc_value_object(desc));
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        bool success = tsc_value_is_truthy(res);
        validate_proxy_define_property_result(o, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable, false, tsc_value_undefined(), false, tsc_value_undefined(), false, success);
        return success;
    }
    ssize_t found = object_find(o, key);
    if (found >= 0) {
        size_t idx = (size_t)found;
        tsc_object_prop_t* p = &o->props[idx];
        volatile tsc_value_t* mapped = tsc_object_arguments_mapped_cell(o, key);
        if (mapped && !p->accessor) object_prop_store_value(p, *mapped);
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
        if (has_value || has_writable) {
            p->accessor = false;
            p->getter = NULL;
            p->getter_env = NULL;
            object_prop_store_getter_value(p, tsc_value_undefined());
            p->setter = NULL;
            p->setter_env = NULL;
            object_prop_store_setter_value(p, tsc_value_undefined());
        }
        if (has_value) {
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
    return tsc_object_define_desc(o, key, value, true, writable, true, enumerable, true, configurable, true);
}

bool tsc_object_define_accessor(tsc_object_t* o, tsc_str_t* key, tsc_accessor_getter_t getter, void* getter_env, bool has_getter, tsc_accessor_setter_t setter, void* setter_env, bool has_setter, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'defineProperty' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("defineProperty", 14));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            size_t old_len = proxy_array_target_length(o->proxy_target);
            bool success = tsc_value_define_accessor_desc(o->proxy_target, key, getter, getter_env, has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable);
            proxy_fill_forwarded_array_growth_slots(o->proxy_target, key, old_len, success);
            return success;
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
        tsc_array_push_value(args, tsc_value_string((tsc_str_t*)key));
        tsc_array_push_value(args, tsc_value_object(desc));
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        bool success = tsc_value_is_truthy(res);
        validate_proxy_define_property_result(o, key, tsc_value_undefined(), false, false, false, enumerable, has_enumerable, configurable, has_configurable, true, getter_value, has_getter, setter_value, has_setter, success);
        return success;
    }
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
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'getPrototypeOf' on a proxy that has been revoked"));
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
            tsc_throw_str(tsc_str_from_cstr("Proxy getPrototypeOf trap must return object or null"));
        }
        if (value_is_box(o->proxy_target)) {
            if (!tsc_value_is_extensible(o->proxy_target)) {
                tsc_value_t target_proto = tsc_value_get_prototype_of(o->proxy_target);
                if (proto != target_proto) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy getPrototypeOf trap cannot report different prototype for non-extensible target"));
                }
            }
        }
        return proto;
    }
    return o ? o->prototype : tsc_value_undefined();
}


bool tsc_object_set_prototype_of(tsc_object_t* o, tsc_value_t prototype) {
    if (o && o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'setPrototypeOf' on a proxy that has been revoked"));
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
                    tsc_throw_str(tsc_str_from_cstr("Proxy setPrototypeOf trap cannot change prototype of non-extensible target"));
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
    object_shape_changed(o, "prototype", NULL);
    return true;
}


tsc_value_t tsc_object_get_receiver(const tsc_object_t* o, const tsc_str_t* key, tsc_value_t receiver) {
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'get' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("get", 3));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_get_prop_receiver(o->proxy_target, key, receiver);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy get trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, tsc_value_string((tsc_str_t*)key));
        tsc_array_push_value(args, receiver);
        tsc_value_t result = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        validate_proxy_get_result(o, key, result);
        return result;
    }
    if (o->is_error && ((const tsc_error_t*)o->class_ptr)->is_suppressed) {
        const tsc_error_t* error = (const tsc_error_t*)o->class_ptr;
        if (str_lit_eq(key, "error")) return error->error;
        if (str_lit_eq(key, "suppressed")) return error->suppressed;
    }
    ssize_t idx = object_find(o, key);
    if (idx >= 0) {
        const tsc_object_prop_t* prop = &o->props[idx];
        if (prop->accessor) return prop->getter ? prop->getter(prop->getter_env, receiver) : tsc_value_undefined();
        volatile tsc_value_t* mapped = tsc_object_arguments_mapped_cell(o, key);
        if (mapped) return *mapped;
        return prop->value;
    }
    if (o->is_error && o->class_ptr) {
        const tsc_error_t* error = (const tsc_error_t*)o->class_ptr;
        if (str_lit_eq(key, "name")) return tsc_value_string(error->name);
        if (str_lit_eq(key, "message")) return tsc_value_string(error->message);
        if (str_lit_eq(key, "cause")) return error->cause;
        if (str_lit_eq(key, "code")) return error->code;
        if (str_lit_eq(key, "errors") && error->errors) return tsc_value_array(error->errors);
    }
    if (o->is_array_buffer && o->class_ptr && str_lit_eq(key, "byteLength")) {
        return tsc_value_num(tsc_array_buffer_byte_length((const tsc_array_buffer_t*)o->class_ptr));
    }
    if (o->is_data_view && o->class_ptr) {
        const tsc_data_view_t* view = (const tsc_data_view_t*)o->class_ptr;
        if (str_lit_eq(key, "buffer")) {
            return tsc_value_array_buffer(tsc_data_view_buffer(view));
        }
        if (str_lit_eq(key, "byteOffset")) {
            return tsc_value_num(tsc_data_view_byte_offset(view));
        }
        if (str_lit_eq(key, "byteLength")) {
            return tsc_value_num(tsc_data_view_byte_length(view));
        }
    }
    if (o->is_promise) {
        tsc_value_t method = tsc_promise_get_method((tsc_promise_t*)o->class_ptr, key);
        if (!tsc_value_is_undefined(method)) return method;
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
    if (str_lit_eq(key, "__proto__")) {
        return tsc_value_get_prototype_of(receiver);
    }
    return tsc_value_undefined();
}


tsc_value_t tsc_object_get(const tsc_object_t* o, const tsc_str_t* key) {
    return tsc_object_get_receiver(o, key, tsc_value_object((tsc_object_t*)o));
}


bool tsc_object_has_own(const tsc_object_t* o, const tsc_str_t* key) {
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'getOwnPropertyDescriptor' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("getOwnPropertyDescriptor", 24));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            tsc_value_t desc = tsc_value_get_own_property_descriptor(o->proxy_target, (tsc_str_t*)key);
            return !tsc_value_is_undefined(desc);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy getOwnPropertyDescriptor trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, tsc_value_string((tsc_str_t*)key));
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        tsc_proxy_validate_get_own_property_descriptor_result(o, key, res);
        return !tsc_value_is_undefined(res);
    }
    return object_find(o, key) >= 0;
}


bool tsc_object_property_is_enumerable(const tsc_object_t* o, const tsc_str_t* key) {
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'getOwnPropertyDescriptor' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("getOwnPropertyDescriptor", 24));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_property_is_enumerable(o->proxy_target, key);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy getOwnPropertyDescriptor trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, tsc_value_string((tsc_str_t*)key));
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        tsc_proxy_validate_get_own_property_descriptor_result(o, key, res);
        if (tsc_value_is_undefined(res)) return false;
        tsc_value_t enum_val = tsc_value_get_prop(res, tsc_str_from_lit("enumerable", 10));
        return tsc_value_is_truthy(enum_val);
    }
    ssize_t found = object_find(o, key);
    return found >= 0 && o->props[(size_t)found].enumerable;
}


bool tsc_object_has(const tsc_object_t* o, const tsc_str_t* key) {
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'has' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("has", 3));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_has_prop(o->proxy_target, key);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy has trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, tsc_value_string((tsc_str_t*)key));
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
                    tsc_throw_str(tsc_str_from_cstr("Proxy has trap cannot report false for non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy has trap cannot report false for key on non-extensible target"));
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
                    tsc_throw_str(tsc_str_from_cstr("Proxy has trap cannot report false for non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy has trap cannot report false for key on non-extensible target"));
                }
            }
        } else if (!found && value_is_box(o->proxy_target) && value_tag(o->proxy_target) == TSC_VALUE_TAG_OBJECT) {
            const tsc_object_t* target = (const tsc_object_t*)value_ptr(o->proxy_target);
            ssize_t idx = object_find(target, key);
            if (idx >= 0) {
                const tsc_object_prop_t* prop = &target->props[(size_t)idx];
                if (!prop->configurable) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy has trap cannot report false for non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy has trap cannot report false for key on non-extensible target"));
                }
            }
        }
        return found;
    }
    ssize_t idx = object_find(o, key);
    if (idx >= 0) return true;
    if (o->is_error && o->class_ptr) {
        const tsc_error_t* error = (const tsc_error_t*)o->class_ptr;
        if (str_lit_eq(key, "name") || str_lit_eq(key, "message")) return true;
        if (str_lit_eq(key, "cause")) return !tsc_value_is_undefined(error->cause);
        if (str_lit_eq(key, "code")) return !tsc_value_is_undefined(error->code);
        if (str_lit_eq(key, "errors")) return error->errors != NULL;
    }
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
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'deleteProperty' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("deleteProperty", 14));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_delete_prop(o->proxy_target, (tsc_str_t*)key);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy deleteProperty trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 4);
        tsc_array_push_value(args, o->proxy_target);
        tsc_array_push_value(args, tsc_value_string((tsc_str_t*)key));
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
                    tsc_throw_str(tsc_str_from_cstr("Proxy deleteProperty trap cannot report deletion of non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy deleteProperty trap cannot report deletion of key on non-extensible target"));
                }
            }
        } else if (deleted && value_is_box(o->proxy_target) && value_tag(o->proxy_target) == TSC_VALUE_TAG_OBJECT) {
            const tsc_object_t* target = (const tsc_object_t*)value_ptr(o->proxy_target);
            ssize_t idx = object_find(target, key);
            if (idx >= 0) {
                const tsc_object_prop_t* prop = &target->props[(size_t)idx];
                if (!prop->configurable) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy deleteProperty trap cannot report deletion of non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy deleteProperty trap cannot report deletion of key on non-extensible target"));
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
                    tsc_throw_str(tsc_str_from_cstr("Proxy deleteProperty trap cannot report deletion of non-configurable key"));
                }
                if (!target->extensible) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy deleteProperty trap cannot report deletion of key on non-extensible target"));
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
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'isExtensible' on a proxy that has been revoked"));
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
            tsc_throw_str(tsc_str_from_cstr("Proxy isExtensible trap result does not match target"));
        }
        return extensible;
    }
    return o->extensible;
}


bool tsc_object_prevent_extensions(tsc_object_t* o) {
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'preventExtensions' on a proxy that has been revoked"));
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
            tsc_throw_str(tsc_str_from_cstr("Proxy preventExtensions trap cannot report success for extensible target"));
        }
        return prevented;
    }
    if (o->extensible) {
        o->extensible = false;
        object_shape_changed(o, "preventExtensions", NULL);
    }
    return true;
}

static bool tsc_object_set_proxy_integrity(tsc_object_t* o, bool frozen) {
    if (!tsc_object_prevent_extensions(o)) return false;
    tsc_array_t* keys = tsc_object_own_keys_dyn(o);
    for (size_t i = 0; i < keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
        bool has_writable = false;
        if (frozen) {
            tsc_value_t desc_value = tsc_value_get_own_property_descriptor(tsc_value_object(o), key);
            if (tsc_value_is_undefined(desc_value)) continue;
            if (proxy_descriptor_result_is_object(desc_value)) {
                has_writable = descriptor_value_has_prop(desc_value, "value", 5, NULL) ||
                    descriptor_value_has_prop(desc_value, "writable", 8, NULL);
            }
        }
        if (!tsc_object_define_desc(
            o,
            key,
            tsc_value_undefined(),
            false,
            false,
            has_writable,
            false,
            false,
            false,
            true
        )) {
            return false;
        }
    }
    return true;
}

static bool tsc_object_test_proxy_integrity(tsc_object_t* o, bool frozen) {
    if (tsc_object_is_extensible(o)) return false;
    tsc_array_t* keys = tsc_object_own_keys_dyn(o);
    for (size_t i = 0; i < keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
        tsc_value_t desc_value = tsc_value_get_own_property_descriptor(tsc_value_object(o), key);
        if (tsc_value_is_undefined(desc_value)) continue;
        if (!proxy_descriptor_result_is_object(desc_value)) return false;
        tsc_value_t configurable_value = tsc_value_undefined();
        if (descriptor_value_has_prop(desc_value, "configurable", 12, &configurable_value) && tsc_value_is_truthy(configurable_value)) {
            return false;
        }
        if (frozen) {
            tsc_value_t writable_value = tsc_value_undefined();
            if (descriptor_value_has_prop(desc_value, "writable", 8, &writable_value) && tsc_value_is_truthy(writable_value)) {
                return false;
            }
        }
    }
    return true;
}


bool tsc_object_seal(tsc_object_t* o) {
    if (!o) return false;
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'seal' on a proxy that has been revoked"));
        if (proxy_has_no_integrity_traps(o, true)) return tsc_value_seal(o->proxy_target);
        return tsc_object_set_proxy_integrity(o, false);
    }
    o->extensible = false;
    for (size_t i = 0; i < o->len; i++) {
        o->props[i].configurable = false;
    }
    object_shape_changed(o, "seal", NULL);
    return true;
}

bool tsc_object_freeze(tsc_object_t* o) {
    if (o && o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'freeze' on a proxy that has been revoked"));
        if (proxy_has_no_integrity_traps(o, true)) return tsc_value_freeze(o->proxy_target);
        return tsc_object_set_proxy_integrity(o, true);
    }
    if (!tsc_object_seal(o)) return false;
    for (size_t i = 0; i < o->len; i++) {
        o->props[i].writable = false;
    }
    object_shape_changed(o, "freeze", NULL);
    return true;
}

bool tsc_object_is_sealed(const tsc_object_t* o) {
    if (o && o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'isSealed' on a proxy that has been revoked"));
        if (proxy_has_no_integrity_traps(o, false)) return tsc_value_is_sealed(o->proxy_target);
        return tsc_object_test_proxy_integrity((tsc_object_t*)o, false);
    }
    if (!o || o->extensible) return false;
    for (size_t i = 0; i < o->len; i++) {
        if (o->props[i].configurable) return false;
    }
    return true;
}

bool tsc_object_is_frozen(const tsc_object_t* o) {
    if (o && o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'isFrozen' on a proxy that has been revoked"));
        if (proxy_has_no_integrity_traps(o, false)) return tsc_value_is_frozen(o->proxy_target);
        return tsc_object_test_proxy_integrity((tsc_object_t*)o, true);
    }
    if (!tsc_object_is_sealed(o)) return false;
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].accessor && o->props[i].writable) return false;
    }
    return true;
}

static bool str_array_contains(const tsc_array_t* keys, const tsc_str_t* key) {
    if (!keys || !key) return false;
    for (size_t i = 0; i < keys->len; i++) {
        if (tsc_str_eq(TSC_ARR(tsc_str_t*, keys, i), key)) return true;
    }
    return false;
}

static tsc_str_t* proxy_own_key_to_string(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return (tsc_str_t*)value_ptr(v);
    }
    tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap entries must be strings"));
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
        tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap must return an array-like object"));
    }
    size_t length = (size_t)tsc_value_length(result);
    tsc_array_t* keys = tsc_array_new(sizeof(tsc_str_t*), length ? length : 1);
    for (size_t i = 0; i < length; i++) {
        tsc_value_t item = tsc_value_get_index(result, (double)i);
        tsc_str_t* key = proxy_own_key_to_string(item);
        tsc_array_push_raw(keys, &key);
    }
    validate_proxy_own_keys_result(proxy, keys);
    return keys;
}

static void validate_proxy_own_keys_result(const tsc_object_t* proxy, const tsc_array_t* keys) {
    if (!keys) return;
    for (size_t i = 0; i < keys->len; i++) {
        tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
        for (size_t j = i + 1; j < keys->len; j++) {
            if (tsc_str_eq(key, TSC_ARR(tsc_str_t*, keys, j))) {
                tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap returned duplicate key"));
            }
        }
    }
    if (proxy && value_is_box(proxy->proxy_target) && value_tag(proxy->proxy_target) == TSC_VALUE_TAG_ARRAY) {
        const tsc_array_t* target = (const tsc_array_t*)value_ptr(proxy->proxy_target);
        if (!str_array_contains(keys, tsc_str_from_lit("length", 6))) {
            tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap result missing non-configurable key"));
        }
        if (target->sealed || target->frozen || !target->extensible) {
            for (size_t i = 0; i < target->len; i++) {
                tsc_str_t* key = tsc_str_from_int((int64_t)i);
                if (!str_array_contains(keys, key)) {
                    if (target->sealed || target->frozen) {
                        tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap result missing non-configurable key"));
                    }
                    tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap result missing key on non-extensible target"));
                }
            }
        }
        if (target->props) {
            for (size_t i = 0; i < target->props->len; i++) {
                const tsc_object_prop_t* prop = &target->props->props[i];
                if (!prop->configurable && !str_array_contains(keys, prop->key)) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap result missing non-configurable key"));
                }
                if (!target->extensible && !str_array_contains(keys, prop->key)) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap result missing key on non-extensible target"));
                }
            }
        }
        if (!target->extensible) {
            for (size_t i = 0; i < keys->len; i++) {
                if (!tsc_array_has_own_key(target, TSC_ARR(tsc_str_t*, keys, i))) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap result included extra key on non-extensible target"));
                }
            }
        }
        return;
    }
    if (proxy && value_is_box(proxy->proxy_target) && value_tag(proxy->proxy_target) == TSC_VALUE_TAG_FUNCTION) {
        const tsc_function_identity_t* target = (const tsc_function_identity_t*)value_ptr(proxy->proxy_target);
        bool target_has_prototype =
            target &&
            target->kind != TSC_FUNCTION_IDENTITY_GETTER &&
            target->kind != TSC_FUNCTION_IDENTITY_SETTER;
        if (!str_array_contains(keys, tsc_str_from_lit("length", 6)) ||
            !str_array_contains(keys, tsc_str_from_lit("name", 4)) ||
            (target_has_prototype && !str_array_contains(keys, tsc_str_from_lit("prototype", 9)))) {
            tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap result missing non-configurable key"));
        }
        if (target->props) {
            for (size_t i = 0; i < target->props->len; i++) {
                const tsc_object_prop_t* prop = &target->props->props[i];
                if (!prop->configurable && !str_array_contains(keys, prop->key)) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap result missing non-configurable key"));
                }
                if (!target->extensible && !str_array_contains(keys, prop->key)) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap result missing key on non-extensible target"));
                }
            }
        }
        if (!target->extensible) {
            for (size_t i = 0; i < keys->len; i++) {
                tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
                if (
                    tsc_str_is_length_key(key) ||
                    str_lit_eq(key, "name") ||
                    (target_has_prototype && str_lit_eq(key, "prototype"))
                ) {
                    continue;
                }
                if (!target->props || object_find(target->props, key) < 0) {
                    tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap result included extra key on non-extensible target"));
                }
            }
        }
        return;
    }
    if (!proxy || !value_is_box(proxy->proxy_target) || value_tag(proxy->proxy_target) != TSC_VALUE_TAG_OBJECT) return;
    const tsc_object_t* target = (const tsc_object_t*)value_ptr(proxy->proxy_target);
    for (size_t i = 0; i < target->len; i++) {
        const tsc_object_prop_t* prop = &target->props[i];
        if (!prop->configurable && !str_array_contains(keys, prop->key)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap result missing non-configurable key"));
        }
        if (!target->extensible && !str_array_contains(keys, prop->key)) {
            tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap result missing key on non-extensible target"));
        }
    }
    if (!target->extensible) {
        for (size_t i = 0; i < keys->len; i++) {
            if (object_find(target, TSC_ARR(tsc_str_t*, keys, i)) < 0) {
                tsc_throw_str(tsc_str_from_cstr("Proxy ownKeys trap result included extra key on non-extensible target"));
            }
        }
    }
}

tsc_array_t* tsc_object_keys_dyn(const tsc_object_t* o) {
    if (!o) return tsc_array_new(sizeof(tsc_str_t*), 1);
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'ownKeys' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("ownKeys", 7));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_object_keys(o->proxy_target);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy ownKeys trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
        tsc_array_push_value(args, o->proxy_target);
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        tsc_array_t* result = proxy_own_keys_result_to_list(o, res);
        tsc_array_t* enumerable = tsc_array_new(sizeof(tsc_str_t*), result->len);
        for (size_t i = 0; i < result->len; i++) {
            tsc_str_t* key = TSC_ARR(tsc_str_t*, result, i);
            if (!tsc_object_property_is_enumerable(o, key)) continue;
            tsc_array_push_raw(enumerable, &key);
        }
        return enumerable;
    }
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), o->len);
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].enumerable) continue;
        tsc_str_t* key = o->props[i].key;
        tsc_array_push_raw(a, &key);
    }
    return a;
}

tsc_array_t* tsc_object_own_keys_dyn(const tsc_object_t* o) {
    if (!o) return tsc_array_new(sizeof(tsc_str_t*), 1);
    if (o->is_proxy) {
        if (o->proxy_revoked) tsc_throw_str(tsc_str_from_cstr("Cannot perform 'ownKeys' on a proxy that has been revoked"));
        tsc_value_t trap = tsc_value_get_prop(o->proxy_handler, tsc_str_from_lit("ownKeys", 7));
        if (tsc_value_is_undefined(trap) || tsc_value_is_nullish(trap)) {
            return tsc_value_own_keys(o->proxy_target);
        }
        tsc_proxy_require_callable_trap(trap, "Proxy ownKeys trap must be callable");
        tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
        tsc_array_push_value(args, o->proxy_target);
        tsc_value_t res = tsc_value_apply_function(trap, o->proxy_handler, tsc_value_array(args));
        return proxy_own_keys_result_to_list(o, res);
    }
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), o->len);
    for (size_t i = 0; i < o->len; i++) {
        tsc_str_t* key = o->props[i].key;
        tsc_array_push_raw(a, &key);
    }
    return a;
}

tsc_array_t* tsc_object_values_dyn(const tsc_object_t* o) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_value_t), o ? o->len : 1);
    if (!o) return a;
    if (o->is_proxy) {
        tsc_array_t* keys = tsc_object_keys_dyn(o);
        for (size_t i = 0; i < keys->len; i++) {
            tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
            tsc_value_t v = tsc_object_get(o, key);
            tsc_array_push_raw(a, &v);
        }
        return a;
    }
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].enumerable) continue;
        tsc_value_t v = tsc_object_get(o, o->props[i].key);
        tsc_array_push_raw(a, &v);
    }
    return a;
}

tsc_array_t* tsc_object_entries_dyn(const tsc_object_t* o) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_value_t), o ? o->len : 1);
    if (!o) return a;
    if (o->is_proxy) {
        tsc_array_t* keys = tsc_object_keys_dyn(o);
        for (size_t i = 0; i < keys->len; i++) {
            tsc_str_t* key = TSC_ARR(tsc_str_t*, keys, i);
            tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
            tsc_value_t key_value = tsc_value_string(key);
            tsc_value_t value = tsc_object_get(o, key);
            tsc_array_push_raw(pair, &key_value);
            tsc_array_push_raw(pair, &value);
            tsc_value_t boxed = tsc_value_array(pair);
            tsc_array_push_raw(a, &boxed);
        }
        return a;
    }
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].enumerable) continue;
        tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_value_t key = tsc_value_string(o->props[i].key);
        tsc_value_t value = tsc_object_get(o, o->props[i].key);
        tsc_array_push_raw(pair, &key);
        tsc_array_push_raw(pair, &value);
        tsc_value_t boxed = tsc_value_array(pair);
        tsc_array_push_raw(a, &boxed);
    }
    return a;
}

static bool value_is_callable_proxy(tsc_value_t v) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) return false;
    if (tsc_proxy_chain_has_revoked(v)) {
        tsc_throw_str(tsc_str_from_cstr("Cannot perform 'get' on a proxy that has been revoked"));
    }
    return tsc_proxy_trap_is_callable(v);
}

bool value_json_omits_object_property(tsc_value_t v) {
    return value_is_box(v) && (
        value_tag(v) == TSC_VALUE_TAG_UNDEFINED ||
        value_tag(v) == TSC_VALUE_TAG_FUNCTION ||
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
        case TSC_VALUE_TAG_ARRAY: {
            tsc_array_t* a = (tsc_array_t*)value_ptr(v);
            tsc_str_t* out = tsc_str_from_lit("[", 1);
            for (size_t i = 0; i < a->len; i++) {
                if (i > 0) out = tsc_str_concat(out, tsc_str_from_lit(",", 1));
                out = tsc_str_concat(out, tsc_value_json_stringify(TSC_ARR(tsc_value_t, a, i)));
            }
            return tsc_str_concat(out, tsc_str_from_lit("]", 1));
        }
        case TSC_VALUE_TAG_OBJECT: {
            tsc_object_t* o = (tsc_object_t*)value_ptr(v);
            if (o && o->is_proxy && tsc_proxy_chain_has_revoked(v)) {
                tsc_throw_str(tsc_str_from_cstr("Cannot perform 'get' on a proxy that has been revoked"));
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
            (tag == TSC_VALUE_TAG_OBJECT && value_is_callable_proxy(v))) {
            return tsc_value_undefined();
        }
    }
    return tsc_value_string(tsc_value_json_stringify(v));
}



void jp_ws(json_parser_t* p) {
    while (p->pos < p->len && isspace((unsigned char)p->s[p->pos])) p->pos++;
}

bool jp_lit(json_parser_t* p, const char* lit) {
    size_t n = strlen(lit);
    if (p->pos + n <= p->len && memcmp(p->s + p->pos, lit, n) == 0) {
        p->pos += n;
        return true;
    }
    return false;
}

tsc_value_t jp_value(json_parser_t* p);

static int jp_hex_digit(unsigned char c) {
    if (c >= '0' && c <= '9') return (int)(c - '0');
    if (c >= 'a' && c <= 'f') return (int)(c - 'a' + 10);
    if (c >= 'A' && c <= 'F') return (int)(c - 'A' + 10);
    return -1;
}

static uint32_t jp_read_u4(json_parser_t* p) {
    if (p->pos + 4 > p->len) tsc_throw_str(tsc_str_from_cstr("JSON.parse bad unicode escape"));
    uint32_t cp = 0;
    for (int i = 0; i < 4; i++) {
        int digit = jp_hex_digit((unsigned char)p->s[p->pos++]);
        if (digit < 0) tsc_throw_str(tsc_str_from_cstr("JSON.parse bad unicode escape"));
        cp = (cp << 4) | (uint32_t)digit;
    }
    return cp;
}

static void jp_append_code_point(char* buf, size_t* out, uint32_t cp) {
    if (cp >= 0xD800 && cp <= 0xDFFF) tsc_throw_str(tsc_str_from_cstr("JSON.parse invalid unicode escape"));
    if (cp > 0x10FFFF) tsc_throw_str(tsc_str_from_cstr("JSON.parse invalid unicode escape"));
    *out += write_utf8_code_point(buf + *out, cp);
}

tsc_str_t* jp_string(json_parser_t* p) {
    if (p->pos >= p->len || p->s[p->pos] != '"') tsc_throw_str(tsc_str_from_cstr("JSON.parse expected string"));
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
            if (p->pos >= p->len) tsc_throw_str(tsc_str_from_cstr("JSON.parse bad escape"));
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
                        if (p->pos + 6 > p->len || p->s[p->pos] != '\\' || p->s[p->pos + 1] != 'u') {
                            tsc_throw_str(tsc_str_from_cstr("JSON.parse invalid unicode escape"));
                        }
                        p->pos += 2;
                        uint32_t low = jp_read_u4(p);
                        if (low < 0xDC00 || low > 0xDFFF) tsc_throw_str(tsc_str_from_cstr("JSON.parse invalid unicode escape"));
                        cp = 0x10000 + (((cp - 0xD800) << 10) | (low - 0xDC00));
                    }
                    jp_append_code_point(buf, &out, cp);
                    break;
                }
                default: tsc_throw_str(tsc_str_from_cstr("JSON.parse unsupported escape"));
            }
        } else {
            buf[out++] = (char)c;
        }
    }
    tsc_throw_str(tsc_str_from_cstr("JSON.parse unterminated string"));
    return tsc_str_from_lit("", 0);
}

tsc_value_t jp_array(json_parser_t* p) {
    p->pos++;
    tsc_array_t* a = tsc_array_new(sizeof(tsc_value_t), 4);
    jp_ws(p);
    if (p->pos < p->len && p->s[p->pos] == ']') {
        p->pos++;
        return tsc_value_array(a);
    }
    while (p->pos < p->len) {
        tsc_value_t v = jp_value(p);
        tsc_array_push_raw(a, &v);
        jp_ws(p);
        if (p->pos < p->len && p->s[p->pos] == ',') {
            p->pos++;
            continue;
        }
        if (p->pos < p->len && p->s[p->pos] == ']') {
            p->pos++;
            return tsc_value_array(a);
        }
        tsc_throw_str(tsc_str_from_cstr("JSON.parse expected array separator"));
    }
    tsc_throw_str(tsc_str_from_cstr("JSON.parse unterminated array"));
    return tsc_value_array(a);
}

tsc_value_t jp_object(json_parser_t* p) {
    p->pos++;
    tsc_object_t* o = tsc_object_new();
    jp_ws(p);
    if (p->pos < p->len && p->s[p->pos] == '}') {
        p->pos++;
        return tsc_value_object(o);
    }
    while (p->pos < p->len) {
        jp_ws(p);
        tsc_str_t* key = jp_string(p);
        jp_ws(p);
        if (p->pos >= p->len || p->s[p->pos] != ':') tsc_throw_str(tsc_str_from_cstr("JSON.parse expected ':'"));
        p->pos++;
        tsc_value_t value = jp_value(p);
        tsc_object_set(o, key, value);
        jp_ws(p);
        if (p->pos < p->len && p->s[p->pos] == ',') {
            p->pos++;
            continue;
        }
        if (p->pos < p->len && p->s[p->pos] == '}') {
            p->pos++;
            return tsc_value_object(o);
        }
        tsc_throw_str(tsc_str_from_cstr("JSON.parse expected object separator"));
    }
    tsc_throw_str(tsc_str_from_cstr("JSON.parse unterminated object"));
    return tsc_value_object(o);
}

tsc_value_t jp_number(json_parser_t* p) {
    const char* start = p->s + p->pos;
    char* end = NULL;
    double n = strtod(start, &end);
    if (end == start) tsc_throw_str(tsc_str_from_cstr("JSON.parse expected number"));
    p->pos += (size_t)(end - start);
    return tsc_value_num(n);
}

tsc_value_t jp_value(json_parser_t* p) {
    jp_ws(p);
    if (p->pos >= p->len) tsc_throw_str(tsc_str_from_cstr("JSON.parse unexpected end"));
    char c = p->s[p->pos];
    if (c == '"') return tsc_value_string(jp_string(p));
    if (c == '[') return jp_array(p);
    if (c == '{') return jp_object(p);
    if (jp_lit(p, "true")) return tsc_value_bool(true);
    if (jp_lit(p, "false")) return tsc_value_bool(false);
    if (jp_lit(p, "null")) return tsc_value_null();
    return jp_number(p);
}

tsc_value_t tsc_json_parse(tsc_str_t* text) {
    json_parser_t p = { text->data, text->len, 0 };
    tsc_value_t v = jp_value(&p);
    jp_ws(&p);
    if (p.pos != p.len) tsc_throw_str(tsc_str_from_cstr("JSON.parse trailing input"));
    return v;
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
    void* nk = m->keys ? TSC_GC_REALLOC(m->keys, cap * m->ks) : TSC_GC_MALLOC(cap * m->ks);
    void* nv = m->values ? TSC_GC_REALLOC(m->values, cap * m->vs) : TSC_GC_MALLOC(cap * m->vs);
    m->keys = nk; m->values = nv; m->cap = cap;
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
