#include "tsc_internal.h"

typedef struct {
    tsc_str_t* description;
    volatile tsc_value_t value;
    void* root;
} private_name_cell_t;
typedef struct {
    tsc_symbol_t* key;
    tsc_private_element_kind_t kind;
    tsc_value_t value, getter, setter;
    void* value_root;
    void* getter_root;
    void* setter_root;
} private_element_t;

/* Cells have stable addresses; only their owning pointer collection grows. */
static private_name_cell_t* class_private_name(tsc_value_t constructor, tsc_str_t* description) {
    if (!value_is_box(constructor) || value_tag(constructor) != TSC_VALUE_TAG_FUNCTION || !description)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("private name owner is not a class constructor"));
    void* volatile owner_root = tsc_value_gc_root(constructor);
    (void)owner_root;
    tsc_function_identity_t* identity = value_ptr(constructor);
    tsc_runtime_lock();
    if (!identity->class_private_names)
        identity->class_private_names = tsc_array_new(sizeof(private_name_cell_t*), 0);
    for (size_t index = 0; index < identity->class_private_names->len; index++) {
        private_name_cell_t* cell = TSC_ARR(private_name_cell_t*, identity->class_private_names, index);
        if (tsc_str_eq(cell->description, description)) { tsc_runtime_unlock(); return cell; }
    }
    private_name_cell_t* cell = TSC_GC_MALLOC(sizeof(*cell));
    cell->description = description;
    cell->value = tsc_value_symbol(tsc_symbol_new(description));
    cell->root = tsc_value_gc_root(cell->value);
    tsc_array_push_raw(identity->class_private_names, &cell);
    tsc_runtime_unlock();
    return cell;
}

volatile tsc_value_t* tsc_value_class_private_name_value(tsc_value_t constructor, tsc_str_t* description) {
    return &class_private_name(constructor, description)->value;
}
void** tsc_value_class_private_name_root(tsc_value_t constructor, tsc_str_t* description) {
    return &class_private_name(constructor, description)->root;
}

/* Ordinary storage, function sidecars and array sidecars own their slots.
 * A Proxy's own record is used directly; private operations never run traps. */
static tsc_object_t* private_holder(tsc_value_t receiver, bool create) {
    if (value_is_box(receiver)) {
        switch (value_tag(receiver)) {
            case TSC_VALUE_TAG_OBJECT: return value_ptr(receiver);
            case TSC_VALUE_TAG_FUNCTION: {
                tsc_function_identity_t* function = value_ptr(receiver);
                if (create && !function->props) function->props = tsc_object_new();
                return function->props;
            }
            case TSC_VALUE_TAG_ARRAY: {
                tsc_array_t* array = value_ptr(receiver);
                if (create && !array->props) array->props = tsc_object_new();
                return array->props;
            }
            default: break;
        }
    }
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("private element receiver is not an object"));
    return NULL;
}
static tsc_symbol_t* private_key(tsc_value_t name) {
    if (!value_is_box(name) || value_tag(name) != TSC_VALUE_TAG_SYMBOL)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("private element name has no retained identity"));
    return value_ptr(name);
}
static private_element_t* private_find(tsc_object_t* holder, tsc_symbol_t* key) {
    if (!holder || !holder->private_elements) return NULL;
    for (size_t index = 0; index < holder->private_elements->len; index++) {
        private_element_t* element = &TSC_ARR(private_element_t, holder->private_elements, index);
        if (element->key == key) return element;
    }
    return NULL;
}
void tsc_value_private_add(tsc_value_t receiver, tsc_value_t name, tsc_private_element_kind_t kind,
    tsc_value_t value, tsc_value_t getter, tsc_value_t setter) {
    void* volatile receiver_root = tsc_value_gc_root(receiver);
    void* volatile name_root = tsc_value_gc_root(name);
    void* volatile value_root = tsc_value_gc_root(value);
    void* volatile getter_root = tsc_value_gc_root(getter);
    void* volatile setter_root = tsc_value_gc_root(setter);
    (void)receiver_root; (void)name_root; (void)value_root; (void)getter_root; (void)setter_root;
    tsc_symbol_t* key = private_key(name);
    tsc_object_t* holder = private_holder(receiver, true);
    if (private_find(holder, key))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("private element is already present on this object"));
    if (!holder->private_elements) holder->private_elements = tsc_array_new(sizeof(private_element_t), 0);
    private_element_t element = { key, kind, value, getter, setter,
        tsc_value_gc_root(value), tsc_value_gc_root(getter), tsc_value_gc_root(setter) };
    tsc_array_push_raw(holder->private_elements, &element);
}
bool tsc_value_private_has(tsc_value_t receiver, tsc_value_t name) {
    return private_find(private_holder(receiver, false), private_key(name)) != NULL;
}
tsc_value_t tsc_value_private_get(tsc_value_t receiver, tsc_value_t name) {
    void* volatile receiver_root = tsc_value_gc_root(receiver);
    (void)receiver_root;
    private_element_t* found = private_find(private_holder(receiver, false), private_key(name));
    if (!found) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("object does not have this private element"));
    private_element_t element = *found;
    if (element.kind != TSC_PRIVATE_ACCESSOR) return element.value;
    if (tsc_value_is_undefined(element.getter))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("private accessor has no getter"));
    void* volatile getter_root = tsc_value_gc_root(element.getter);
    (void)getter_root;
    return tsc_value_apply_function(element.getter, receiver, tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 0)));
}
tsc_value_t tsc_value_private_set(tsc_value_t receiver, tsc_value_t name, tsc_value_t value) {
    private_element_t* element = private_find(private_holder(receiver, false), private_key(name));
    if (!element) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("object does not have this private element"));
    if (element->kind == TSC_PRIVATE_METHOD)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("private method is not writable"));
    if (element->kind == TSC_PRIVATE_FIELD) {
        element->value = value;
        element->value_root = tsc_value_gc_root(value);
    } else {
        tsc_value_t setter = element->setter;
        if (tsc_value_is_undefined(setter))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("private accessor has no setter"));
        void* volatile receiver_root = tsc_value_gc_root(receiver);
        void* volatile setter_root = tsc_value_gc_root(setter);
        void* volatile value_root = tsc_value_gc_root(value);
        (void)receiver_root; (void)setter_root; (void)value_root;
        tsc_array_t* arguments = tsc_array_new(sizeof(tsc_value_t), 1);
        tsc_array_push_value(arguments, value);
        (void)tsc_value_apply_function(setter, receiver, tsc_value_array(arguments));
    }
    return value;
}
