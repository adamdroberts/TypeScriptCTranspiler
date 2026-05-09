#ifndef TSC_RUNTIME_H
#define TSC_RUNTIME_H

#include <setjmp.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <gmp.h>
#define PCRE2_CODE_UNIT_WIDTH 8
#include <pcre2.h>

#ifdef TSC_NO_GC
#  define TSC_GC_MALLOC(n)         calloc(1, (n))
#  define TSC_GC_MALLOC_ATOMIC(n)  calloc(1, (n))
#  define TSC_GC_REALLOC(p, n)     realloc((p), (n))
#  define TSC_GC_INIT()            ((void)0)
#else
#  include <gc/gc.h>
#  define TSC_GC_MALLOC(n)         GC_MALLOC(n)
#  define TSC_GC_MALLOC_ATOMIC(n)  GC_MALLOC_ATOMIC(n)
#  define TSC_GC_REALLOC(p, n)     GC_REALLOC((p), (n))
#  define TSC_GC_INIT()            GC_INIT()
#endif

/* Some libc builds don't expose M_PI by default under strict C11. */
#ifndef M_PI
#  define M_PI 3.14159265358979323846
#endif
#ifndef M_E
#  define M_E 2.7182818284590452354
#endif
#ifndef M_LN2
#  define M_LN2 0.69314718055994530942
#endif
#ifndef M_LN10
#  define M_LN10 2.30258509299404568402
#endif
#ifndef M_LOG2E
#  define M_LOG2E 1.4426950408889634074
#endif
#ifndef M_LOG10E
#  define M_LOG10E 0.43429448190325182765
#endif
#ifndef M_SQRT2
#  define M_SQRT2 1.41421356237309504880
#endif

/* ------------- bootstrap ------------- */
void tsc_bootstrap(int argc, char** argv);
void tsc_panic(const char* msg);

/* ------------- strings (immutable, UTF-8) ------------- */
typedef struct tsc_str {
    size_t len;
    const char* data;
} tsc_str_t;

tsc_str_t* tsc_str_from_lit(const char* data, size_t len);
tsc_str_t* tsc_str_from_cstr(const char* s);
tsc_str_t* tsc_str_concat(const tsc_str_t* a, const tsc_str_t* b);
tsc_str_t* tsc_str_from_num(double n);
tsc_str_t* tsc_str_from_bool(bool b);
tsc_str_t* tsc_str_from_char_code_n(size_t n, ...);
bool tsc_str_eq(const tsc_str_t* a, const tsc_str_t* b);
int tsc_str_cmp(const tsc_str_t* a, const tsc_str_t* b);
double tsc_str_locale_compare(const tsc_str_t* a, const tsc_str_t* b);
double tsc_str_length(const tsc_str_t* s);

tsc_str_t* tsc_str_char_at(const tsc_str_t* s, double idx);
tsc_str_t* tsc_str_at(const tsc_str_t* s, double idx);
double tsc_str_code_point_at(const tsc_str_t* s, double idx);
double tsc_str_index_of(const tsc_str_t* h, const tsc_str_t* n);
double tsc_str_last_index_of(const tsc_str_t* h, const tsc_str_t* n);
bool tsc_str_includes(const tsc_str_t* h, const tsc_str_t* n);
bool tsc_str_starts_with(const tsc_str_t* s, const tsc_str_t* p);
bool tsc_str_ends_with(const tsc_str_t* s, const tsc_str_t* p);
tsc_str_t* tsc_str_slice(const tsc_str_t* s, double start, double end);
tsc_str_t* tsc_str_substring(const tsc_str_t* s, double start, double end);
tsc_str_t* tsc_str_to_upper(const tsc_str_t* s);
tsc_str_t* tsc_str_to_lower(const tsc_str_t* s);
tsc_str_t* tsc_str_normalize(const tsc_str_t* s, const tsc_str_t* form);
tsc_str_t* tsc_str_trim(const tsc_str_t* s);
tsc_str_t* tsc_str_trim_start(const tsc_str_t* s);
tsc_str_t* tsc_str_trim_end(const tsc_str_t* s);
tsc_str_t* tsc_str_repeat(const tsc_str_t* s, double n);
tsc_str_t* tsc_str_pad_start(const tsc_str_t* s, double target, const tsc_str_t* pad);
tsc_str_t* tsc_str_pad_end(const tsc_str_t* s, double target, const tsc_str_t* pad);
tsc_str_t* tsc_str_replace(const tsc_str_t* s, const tsc_str_t* search, const tsc_str_t* repl);
tsc_str_t* tsc_str_replace_all(const tsc_str_t* s, const tsc_str_t* search, const tsc_str_t* repl);

struct tsc_array; /* fwd */
struct tsc_array* tsc_str_split(const tsc_str_t* s, const tsc_str_t* sep);
struct tsc_array* tsc_str_chars(const tsc_str_t* s);

/* ------------- Symbol ------------- */
typedef struct tsc_symbol {
    uint64_t id;
    tsc_str_t* description;
    tsc_str_t* global_key;
} tsc_symbol_t;

tsc_symbol_t* tsc_symbol_new(const tsc_str_t* description);
tsc_symbol_t* tsc_symbol_for(const tsc_str_t* key);
tsc_str_t* tsc_symbol_key_for(const tsc_symbol_t* sym);
tsc_symbol_t* tsc_symbol_iterator(void);
tsc_symbol_t* tsc_symbol_async_iterator(void);
tsc_str_t* tsc_symbol_description(const tsc_symbol_t* sym);
tsc_str_t* tsc_symbol_to_string(const tsc_symbol_t* sym);

/* ------------- WeakRef ------------- */
typedef struct tsc_weakref {
    void* target;
} tsc_weakref_t;

tsc_weakref_t* tsc_weakref_new(void* target);
void* tsc_weakref_deref(const tsc_weakref_t* ref);

/* ------------- numbers ------------- */
double tsc_num_mod(double a, double b);
double tsc_parse_float(const tsc_str_t* s);
double tsc_parse_int(const tsc_str_t* s, double radix);
double tsc_math_random(void);

/* ------------- BigInt (GMP-backed) ------------- */
typedef struct tsc_bigint {
    mpz_t value;
} tsc_bigint_t;

tsc_bigint_t* tsc_bigint_from_lit(const char* lit);
tsc_bigint_t* tsc_bigint_from_str(const tsc_str_t* s);
tsc_bigint_t* tsc_bigint_from_num(double n);
tsc_bigint_t* tsc_bigint_from_bool(bool b);
tsc_bigint_t* tsc_bigint_neg(const tsc_bigint_t* a);
tsc_bigint_t* tsc_bigint_add(const tsc_bigint_t* a, const tsc_bigint_t* b);
tsc_bigint_t* tsc_bigint_sub(const tsc_bigint_t* a, const tsc_bigint_t* b);
tsc_bigint_t* tsc_bigint_mul(const tsc_bigint_t* a, const tsc_bigint_t* b);
tsc_bigint_t* tsc_bigint_div(const tsc_bigint_t* a, const tsc_bigint_t* b);
tsc_bigint_t* tsc_bigint_mod(const tsc_bigint_t* a, const tsc_bigint_t* b);
tsc_bigint_t* tsc_bigint_pow(const tsc_bigint_t* a, const tsc_bigint_t* b);
int tsc_bigint_cmp(const tsc_bigint_t* a, const tsc_bigint_t* b);
bool tsc_bigint_eq(const tsc_bigint_t* a, const tsc_bigint_t* b);
tsc_str_t* tsc_bigint_to_string(const tsc_bigint_t* a, double radix);

/* ------------- RegExp (PCRE2-backed) ------------- */
typedef struct tsc_regexp {
    pcre2_code* re;
    tsc_str_t* source;
    tsc_str_t* flags;
    bool global;
    bool ignore_case;
    bool multiline;
    bool dot_all;
    bool unicode;
    bool compiled;
    uint32_t capture_count;
} tsc_regexp_t;

tsc_regexp_t* tsc_regexp_new(const tsc_str_t* pattern, const tsc_str_t* flags);
bool tsc_regexp_test(const tsc_regexp_t* re, const tsc_str_t* s);
struct tsc_array* tsc_str_match_regex(const tsc_str_t* s, const tsc_regexp_t* re);
struct tsc_array* tsc_str_match_all_regex(const tsc_str_t* s, const tsc_regexp_t* re);
tsc_str_t* tsc_str_replace_regex(const tsc_str_t* s, const tsc_regexp_t* re, const tsc_str_t* repl);
struct tsc_array* tsc_str_split_regex(const tsc_str_t* s, const tsc_regexp_t* re);

/* ------------- crypto ------------- */
typedef struct tsc_hash tsc_hash_t;
tsc_hash_t* tsc_crypto_create_hash(const tsc_str_t* algorithm);
tsc_hash_t* tsc_hash_update(tsc_hash_t* h, const tsc_str_t* data);
tsc_str_t* tsc_hash_digest(tsc_hash_t* h, const tsc_str_t* encoding);

/* ------------- URL ------------- */
typedef struct tsc_url {
    tsc_str_t* href;
    tsc_str_t* protocol;
    tsc_str_t* host;
    tsc_str_t* hostname;
    tsc_str_t* port;
    tsc_str_t* pathname;
    tsc_str_t* search;
    tsc_str_t* hash;
    tsc_str_t* origin;
} tsc_url_t;
tsc_url_t* tsc_url_new(const tsc_str_t* input);

/* ------------- Buffer ------------- */
typedef struct tsc_buffer {
    size_t len;
    uint8_t* data;
} tsc_buffer_t;
tsc_buffer_t* tsc_buffer_from_str(const tsc_str_t* input, const tsc_str_t* encoding);
tsc_buffer_t* tsc_buffer_from_array(const struct tsc_array* input);
tsc_buffer_t* tsc_buffer_alloc(double size, double fill);
tsc_buffer_t* tsc_buffer_concat(const struct tsc_array* list);
tsc_str_t* tsc_buffer_to_string(const tsc_buffer_t* b, const tsc_str_t* encoding);
tsc_buffer_t* tsc_buffer_slice(const tsc_buffer_t* b, double start, double end);
bool tsc_buffer_equals(const tsc_buffer_t* a, const tsc_buffer_t* b);
double tsc_buffer_length(const tsc_buffer_t* b);
double tsc_buffer_get(const tsc_buffer_t* b, double idx);
#define TSC_BUF(b, i) ((b)->data[(size_t)(i)])

/* ------------- JSON ------------- */
tsc_str_t* tsc_json_escape_string(const tsc_str_t* s);  /* adds quotes + escapes */
tsc_str_t* tsc_json_num(double n);  /* JSON-safe number formatting */

/* ------------- arrays ------------- */
typedef struct tsc_array {
    size_t len;
    size_t cap;
    size_t es;
    void* data;
} tsc_array_t;

tsc_array_t* tsc_array_new(size_t elem_size, size_t initial_cap);
tsc_array_t* tsc_array_from_buf(size_t elem_size, const void* src, size_t n);
void tsc_array_reserve(tsc_array_t* a, size_t new_cap);
void tsc_array_push_raw(tsc_array_t* a, const void* elem);
void tsc_array_pop_raw(tsc_array_t* a);
void tsc_array_shift_raw(tsc_array_t* a);
void tsc_array_unshift_raw(tsc_array_t* a, const void* elem);
tsc_array_t* tsc_array_reverse(tsc_array_t* a); /* in-place */
tsc_array_t* tsc_array_to_reversed(const tsc_array_t* a); /* copy */
tsc_array_t* tsc_array_with(const tsc_array_t* a, double index, const void* elem); /* copy */
tsc_array_t* tsc_array_to_spliced(const tsc_array_t* a, double start, double delete_count, int argc, const tsc_array_t* items); /* copy */
tsc_array_t* tsc_array_fill(tsc_array_t* a, const void* elem, double start, double end); /* in-place */
tsc_array_t* tsc_array_copy_within(tsc_array_t* a, double target, double start, double end); /* in-place */
tsc_array_t* tsc_array_slice(const tsc_array_t* a, double start, double end);
tsc_array_t* tsc_array_append(tsc_array_t* dst, const tsc_array_t* src);
tsc_array_t* tsc_array_flat_once(const tsc_array_t* outer, size_t elem_size);
double tsc_array_length(const tsc_array_t* a);
void tsc_array_oob(const tsc_array_t* a, double i);

#define TSC_ARR(T, a, i) (((T*)((a)->data))[(size_t)(i)])

/* ------------- dynamic values (NaN-boxed) ------------- */
typedef uint64_t tsc_value_t;

typedef struct tsc_object tsc_object_t;
typedef tsc_value_t (*tsc_accessor_getter_t)(void);
typedef bool (*tsc_accessor_setter_t)(tsc_value_t value);

tsc_value_t tsc_value_undefined(void);
tsc_value_t tsc_value_null(void);
tsc_value_t tsc_value_bool(bool b);
tsc_value_t tsc_value_num(double n);
tsc_value_t tsc_value_string(tsc_str_t* s);
tsc_value_t tsc_value_array(tsc_array_t* a);
tsc_value_t tsc_value_object(tsc_object_t* o);

bool tsc_value_is_truthy(tsc_value_t v);
double tsc_value_as_num(tsc_value_t v);
bool tsc_value_as_bool(tsc_value_t v);
tsc_str_t* tsc_value_as_string(tsc_value_t v);
tsc_array_t* tsc_value_as_array(tsc_value_t v);
tsc_str_t* tsc_value_to_string(tsc_value_t v);
tsc_str_t* tsc_value_typeof(tsc_value_t v);
tsc_str_t* tsc_value_json_stringify(tsc_value_t v);
bool tsc_value_is_array(tsc_value_t v);
bool tsc_value_is_nullish(tsc_value_t v);
tsc_value_t tsc_value_get_prop(tsc_value_t v, const tsc_str_t* key);
tsc_value_t tsc_value_get_index(tsc_value_t v, double index);
bool tsc_value_set_index(tsc_value_t v, double index, tsc_value_t value);
tsc_value_t tsc_value_define_property(tsc_value_t v, tsc_str_t* key, tsc_value_t value);
bool tsc_value_define_property_desc(tsc_value_t v, tsc_str_t* key, tsc_value_t value, bool writable, bool enumerable, bool configurable);
bool tsc_value_define_accessor_desc(tsc_value_t v, tsc_str_t* key, tsc_accessor_getter_t getter, tsc_accessor_setter_t setter, bool enumerable, bool configurable);
tsc_value_t tsc_value_object_create(tsc_value_t prototype);
bool tsc_value_is_prototype_of(tsc_value_t prototype, tsc_value_t object);
tsc_value_t tsc_value_get_prototype_of(tsc_value_t v);
bool tsc_value_set_prototype_of(tsc_value_t v, tsc_value_t prototype);
bool tsc_value_set_prop(tsc_value_t v, tsc_str_t* key, tsc_value_t value);
bool tsc_value_has_own_prop(tsc_value_t v, const tsc_str_t* key);
bool tsc_value_property_is_enumerable(tsc_value_t v, const tsc_str_t* key);
bool tsc_value_has_prop(tsc_value_t v, const tsc_str_t* key);
bool tsc_value_delete_prop(tsc_value_t v, tsc_str_t* key);
bool tsc_value_is_extensible(tsc_value_t v);
bool tsc_value_prevent_extensions(tsc_value_t v);
bool tsc_value_seal(tsc_value_t v);
bool tsc_value_freeze(tsc_value_t v);
bool tsc_value_is_sealed(tsc_value_t v);
bool tsc_value_is_frozen(tsc_value_t v);
tsc_array_t* tsc_value_own_keys(tsc_value_t v);
tsc_value_t tsc_value_get_own_property_descriptor(tsc_value_t v, tsc_str_t* key);
tsc_value_t tsc_value_get_own_property_descriptors(tsc_value_t v);
tsc_value_t tsc_value_object_assign(tsc_value_t target, tsc_value_t source);
double tsc_value_length(tsc_value_t v);
tsc_array_t* tsc_value_object_keys(tsc_value_t v);
tsc_array_t* tsc_value_object_values(tsc_value_t v);
tsc_array_t* tsc_value_object_entries(tsc_value_t v);
tsc_value_t tsc_value_object_from_entries(tsc_value_t entries);
tsc_value_t tsc_value_add(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_sub(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_mul(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_div(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_mod(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_pow(tsc_value_t a, tsc_value_t b);
bool tsc_value_eq(tsc_value_t a, tsc_value_t b);
bool tsc_value_object_is(tsc_value_t a, tsc_value_t b);
int tsc_value_cmp(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_method_char_at(tsc_value_t recv, tsc_value_t index);
tsc_value_t tsc_value_method_includes(tsc_value_t recv, tsc_value_t needle);
tsc_value_t tsc_value_method_index_of(tsc_value_t recv, tsc_value_t needle);
tsc_value_t tsc_value_method_last_index_of(tsc_value_t recv, tsc_value_t needle);
tsc_value_t tsc_value_method_at(tsc_value_t recv, tsc_value_t index);
tsc_value_t tsc_value_method_locale_compare(tsc_value_t recv, tsc_value_t other);
tsc_value_t tsc_value_method_join(tsc_value_t recv, tsc_value_t separator);
tsc_value_t tsc_value_method_pop(tsc_value_t recv);
tsc_value_t tsc_value_method_push(tsc_value_t recv, tsc_value_t value);
tsc_value_t tsc_value_method_shift(tsc_value_t recv);
tsc_value_t tsc_value_method_unshift(tsc_value_t recv, tsc_value_t value);
tsc_value_t tsc_value_method_concat(tsc_value_t recv, tsc_value_t value);
tsc_value_t tsc_value_method_flat(tsc_value_t recv, tsc_value_t depth);
tsc_value_t tsc_value_method_fill(tsc_value_t recv, tsc_value_t value, tsc_value_t start, tsc_value_t end);
tsc_value_t tsc_value_method_copy_within(tsc_value_t recv, tsc_value_t target, tsc_value_t start, tsc_value_t end);
tsc_value_t tsc_value_method_splice(tsc_value_t recv, tsc_value_t start, tsc_value_t delete_count, tsc_array_t* items);
tsc_value_t tsc_value_method_sort(tsc_value_t recv);
tsc_value_t tsc_value_method_to_sorted(tsc_value_t recv);
tsc_value_t tsc_value_method_with(tsc_value_t recv, tsc_value_t index, tsc_value_t value);
tsc_value_t tsc_value_method_to_spliced(tsc_value_t recv, tsc_value_t start, tsc_value_t delete_count, int argc, tsc_array_t* items);
void tsc_value_array_push_flat(tsc_array_t* out, tsc_value_t value);
tsc_value_t tsc_value_method_reverse(tsc_value_t recv);
tsc_value_t tsc_value_method_to_reversed(tsc_value_t recv);
tsc_value_t tsc_value_method_slice(tsc_value_t recv, tsc_value_t start, tsc_value_t end);
tsc_value_t tsc_value_method_substring(tsc_value_t recv, tsc_value_t start, tsc_value_t end);
tsc_value_t tsc_value_method_replace(tsc_value_t recv, tsc_value_t search, tsc_value_t replacement);
tsc_value_t tsc_value_method_replace_all(tsc_value_t recv, tsc_value_t search, tsc_value_t replacement);
tsc_value_t tsc_value_method_split(tsc_value_t recv, tsc_value_t separator);
tsc_value_t tsc_value_method_starts_with(tsc_value_t recv, tsc_value_t needle);
tsc_value_t tsc_value_method_ends_with(tsc_value_t recv, tsc_value_t needle);
tsc_value_t tsc_value_method_to_lower(tsc_value_t recv);
tsc_value_t tsc_value_method_to_upper(tsc_value_t recv);
tsc_value_t tsc_value_method_normalize(tsc_value_t recv, tsc_value_t form);
tsc_value_t tsc_value_method_trim(tsc_value_t recv);
tsc_value_t tsc_value_method_trim_start(tsc_value_t recv);
tsc_value_t tsc_value_method_trim_end(tsc_value_t recv);
tsc_value_t tsc_value_method_repeat(tsc_value_t recv, tsc_value_t count);
tsc_value_t tsc_value_method_pad_start(tsc_value_t recv, tsc_value_t target, tsc_value_t pad);
tsc_value_t tsc_value_method_pad_end(tsc_value_t recv, tsc_value_t target, tsc_value_t pad);

tsc_object_t* tsc_object_new(void);
bool tsc_object_set(tsc_object_t* o, tsc_str_t* key, tsc_value_t value);
bool tsc_object_define(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, bool writable, bool enumerable, bool configurable);
bool tsc_object_define_accessor(tsc_object_t* o, tsc_str_t* key, tsc_accessor_getter_t getter, tsc_accessor_setter_t setter, bool enumerable, bool configurable);
tsc_value_t tsc_object_get_prototype_of(const tsc_object_t* o);
bool tsc_object_set_prototype_of(tsc_object_t* o, tsc_value_t prototype);
bool tsc_object_is_prototype_of(const tsc_object_t* prototype, const tsc_object_t* object);
tsc_value_t tsc_object_get(const tsc_object_t* o, const tsc_str_t* key);
bool tsc_object_has_own(const tsc_object_t* o, const tsc_str_t* key);
bool tsc_object_property_is_enumerable(const tsc_object_t* o, const tsc_str_t* key);
bool tsc_object_has(const tsc_object_t* o, const tsc_str_t* key);
bool tsc_object_delete(tsc_object_t* o, const tsc_str_t* key);
bool tsc_object_is_extensible(const tsc_object_t* o);
bool tsc_object_prevent_extensions(tsc_object_t* o);
bool tsc_object_seal(tsc_object_t* o);
bool tsc_object_freeze(tsc_object_t* o);
bool tsc_object_is_sealed(const tsc_object_t* o);
bool tsc_object_is_frozen(const tsc_object_t* o);
tsc_array_t* tsc_object_keys_dyn(const tsc_object_t* o);
tsc_array_t* tsc_object_own_keys_dyn(const tsc_object_t* o);
tsc_array_t* tsc_object_values_dyn(const tsc_object_t* o);
tsc_array_t* tsc_object_entries_dyn(const tsc_object_t* o);

tsc_value_t tsc_json_parse(tsc_str_t* text);

typedef struct tsc_object_entry {
    tsc_str_t* key;
    double num;
    bool boolean;
    void* ptr;
} tsc_object_entry_t;

/* ------------- Map / Set (type-erased, linear scan) ------------- */
typedef enum {
    TSC_KEY_NUM = 0,
    TSC_KEY_STR = 1,
    TSC_KEY_PTR = 2,
    TSC_KEY_BOOL = 3,
} tsc_key_kind_t;

typedef struct tsc_map {
    size_t ks, vs;
    tsc_key_kind_t kk;
    size_t len, cap;
    void* keys;
    void* values;
} tsc_map_t;

tsc_map_t* tsc_map_new(size_t ks, size_t vs, int kk, size_t initial_cap);
void tsc_map_set_raw(tsc_map_t* m, const void* k, const void* v);
bool tsc_map_get_raw(const tsc_map_t* m, const void* k, void* out);
bool tsc_map_has_raw(const tsc_map_t* m, const void* k);
bool tsc_map_delete_raw(tsc_map_t* m, const void* k);
void tsc_map_clear(tsc_map_t* m);
double tsc_map_size(const tsc_map_t* m);
struct tsc_array* tsc_map_keys(const tsc_map_t* m);
struct tsc_array* tsc_map_values(const tsc_map_t* m);

typedef struct tsc_set {
    size_t es;
    tsc_key_kind_t kk;
    size_t len, cap;
    void* data;
} tsc_set_t;

tsc_set_t* tsc_set_new(size_t es, int kk, size_t initial_cap);
void tsc_set_add_raw(tsc_set_t* s, const void* v);
bool tsc_set_has_raw(const tsc_set_t* s, const void* v);
bool tsc_set_delete_raw(tsc_set_t* s, const void* v);
void tsc_set_clear(tsc_set_t* s);
double tsc_set_size(const tsc_set_t* s);
struct tsc_array* tsc_set_values(const tsc_set_t* s);

/* ------------- console ------------- */
void tsc_console_log_n(size_t n, ...);
void tsc_console_error_n(size_t n, ...);
bool tsc_instanceof(const char* type_chain, const char* class_name);

/* ------------- process ------------- */
void tsc_process_exit(double code);
extern int tsc_argc;
extern char** tsc_argv;
tsc_array_t* tsc_process_argv(void);
tsc_str_t* tsc_process_env_get(const tsc_str_t* name);
tsc_str_t* tsc_process_cwd(void);

/* ------------- fs (sync subset) ------------- */
tsc_str_t* tsc_fs_read_file_sync(const tsc_str_t* path);
void tsc_fs_write_file_sync(const tsc_str_t* path, const tsc_str_t* data);
bool tsc_fs_exists_sync(const tsc_str_t* path);
tsc_array_t* tsc_fs_readdir_sync(const tsc_str_t* path);

/* ------------- os ------------- */
tsc_str_t* tsc_os_platform(void);
tsc_str_t* tsc_os_arch(void);
tsc_str_t* tsc_os_hostname(void);
tsc_str_t* tsc_os_tmpdir(void);
tsc_str_t* tsc_os_homedir(void);
double tsc_os_cpu_count(void);
double tsc_date_now(void);

/* ------------- path ------------- */
tsc_str_t* tsc_path_join(size_t n, ...);
tsc_str_t* tsc_path_resolve(size_t n, ...);
tsc_str_t* tsc_path_basename(const tsc_str_t* p);
tsc_str_t* tsc_path_dirname(const tsc_str_t* p);
tsc_str_t* tsc_path_extname(const tsc_str_t* p);

/* ------------- exceptions ------------- */
typedef struct tsc_try_frame {
    jmp_buf jb;
    struct tsc_try_frame* prev;
} tsc_try_frame_t;

void tsc_try_push(tsc_try_frame_t* f);
void tsc_try_pop(void);
void tsc_throw_str(tsc_str_t* message);
void tsc_rethrow(void);
tsc_str_t* tsc_current_error(void);

#endif /* TSC_RUNTIME_H */
