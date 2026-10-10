#ifndef TSC_ARRAY_ABI_H
#define TSC_ARRAY_ABI_H

/* Shared by the C runtime and embedded Node C++ bridge. The including
 * boundary supplies tsc_value_t, tsc_object_t and size_t. */
typedef tsc_value_t (*tsc_array_box_element_fn)(const void* element);
typedef bool (*tsc_array_unbox_element_fn)(tsc_value_t value, void* element);
typedef enum {
    TSC_NATIVE_ELEMENT_NUMBER,
    TSC_NATIVE_ELEMENT_BOOLEAN,
    TSC_NATIVE_ELEMENT_STRING,
    TSC_NATIVE_ELEMENT_BIGINT,
    TSC_NATIVE_ELEMENT_SYMBOL,
    TSC_NATIVE_ELEMENT_ARRAY,
    TSC_NATIVE_ELEMENT_OBJECT,
    TSC_NATIVE_ELEMENT_FUNCTION,
    TSC_NATIVE_ELEMENT_UNDEFINED,
    TSC_NATIVE_ELEMENT_UNSUPPORTED
} tsc_native_element_kind_t;

typedef struct tsc_array {
    size_t len;
    /* Logical length is independent of the initialized native-cell prefix.
     * Other own indices live in the ordinary descriptor collection. */
    size_t dense_len;
    size_t cap;
    size_t es;
    bool extensible;
    bool sealed;
    bool frozen;
    bool length_writable;
    /* Ordinary writes publish actual values; native views may subsequently
     * borrow the same owner only through an exact representation check. */
    bool value_storage;
    tsc_value_t prototype;
    tsc_object_t* props;
    tsc_object_t* holes;
    tsc_array_box_element_fn box_element;
    tsc_array_unbox_element_fn unbox_element;
    void* data;
    /* NaN-boxed pointer payloads are invisible to conservative GC.  Arrays
     * whose element width can hold tsc_value_t mirror decoded roots here; all
     * canonical array mutations update this vector with the data. */
    void** value_roots;
} tsc_array_t;

#endif
