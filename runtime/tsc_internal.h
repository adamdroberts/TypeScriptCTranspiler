
#ifndef TSC_INTERNAL_H
#define TSC_INTERNAL_H

// --- Standard Includes ---
#define _POSIX_C_SOURCE 200809L
#define _DEFAULT_SOURCE
#include "tsc_runtime.h"
#include <ctype.h>
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <arpa/inet.h>
#include <libgen.h>
#include <inttypes.h>
#include <limits.h>
#include <netdb.h>
#include <openssl/evp.h>
#include <openssl/err.h>
#include <openssl/hmac.h>
#include <openssl/opensslv.h>
#include <openssl/rand.h>
#include <openssl/ssl.h>
#include <gmp.h>
#include <poll.h>
#include <pwd.h>
#include <signal.h>
#include <sys/ioctl.h>
#include <sys/resource.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/wait.h>
#if defined(__linux__)
#include <sys/sysinfo.h>
#endif
#include <sys/types.h>
#include <sys/uio.h>
#include <sys/utsname.h>
#include <time.h>
#include <unicode/unorm2.h>
#include <unicode/ustring.h>
#include <unistd.h>

#ifndef PATH_MAX
#  define PATH_MAX 4096
#endif

// -------------------------

#include "tsc_runtime.h"

// --- Dynamic Value Structs ---
#define TSC_VALUE_BOX_MASK UINT64_C(0x7ffc000000000000)
#define TSC_VALUE_PAYLOAD_MASK UINT64_C(0x0000ffffffffffff)

typedef enum {
    TSC_VALUE_TAG_FUNCTION = 0,
    TSC_VALUE_TAG_UNDEFINED = 1,
    TSC_VALUE_TAG_NULL = 2,
    TSC_VALUE_TAG_FALSE = 3,
    TSC_VALUE_TAG_TRUE = 4,
    TSC_VALUE_TAG_STRING = 5,
    TSC_VALUE_TAG_ARRAY = 6,
    TSC_VALUE_TAG_OBJECT = 7,
} tsc_value_tag_t;

typedef struct tsc_object_prop {
    tsc_str_t* key;
    tsc_value_t value;
    bool accessor;
    tsc_accessor_getter_t getter;
    void* getter_env;
    tsc_value_t getter_value;
    tsc_accessor_setter_t setter;
    void* setter_env;
    tsc_value_t setter_value;
    bool writable;
    bool enumerable;
    bool configurable;
} tsc_object_prop_t;

typedef enum {
    TSC_FUNCTION_IDENTITY_GETTER,
    TSC_FUNCTION_IDENTITY_SETTER,
    TSC_FUNCTION_IDENTITY_EVENT_LISTENER,
    TSC_FUNCTION_IDENTITY_EVENT_RAW_LISTENER,
    TSC_FUNCTION_IDENTITY_GENERIC,
    TSC_FUNCTION_IDENTITY_CLOSURE,
    TSC_FUNCTION_IDENTITY_BUILTIN,
} tsc_function_identity_kind_t;

typedef struct tsc_function_identity {
    tsc_function_identity_kind_t kind;
    bool extensible;
    bool sealed;
    bool frozen;
    bool func_prototype_writable;
    double length;
    tsc_str_t* name;
    tsc_value_t prototype;
    tsc_value_t func_prototype;
    tsc_object_t* props;
    union {
        tsc_accessor_getter_t getter;
        tsc_accessor_setter_t setter;
        tsc_generic_function_t generic;
        struct {
            tsc_event_listener_fn_t fn;
            void* identity;
        } event_listener;
        struct {
            tsc_event_listener_fn_t fn;
            void* identity;
            uint64_t order;
        } event_raw_identity;
    } code;
    void* env;
    struct tsc_function_identity* next;
} tsc_function_identity_t;



struct tsc_shape {
    uint64_t shape_id;
    tsc_shape_t* parent;
    const tsc_str_t* transition_key;
    tsc_shape_t** transitions;
    size_t transitions_len;
    size_t transitions_cap;
};

struct tsc_object {
    size_t len;
    size_t cap;
    bool extensible;
    void* class_ptr;
    bool is_proxy;
    bool proxy_revoked;
    bool is_promise;
    bool is_date;
    bool is_regexp;
    bool is_map;
    bool is_set;
    bool is_error;
    bool is_typed_array;
    bool is_url;
    bool is_url_search_params;
    bool is_array_buffer;
    bool is_data_view;
    bool is_text_encoder;
    bool is_text_decoder;
    uint64_t shape_version;
    tsc_shape_t* shape;
    uint64_t object_id;
    tsc_value_t proxy_target;
    tsc_value_t proxy_handler;
    tsc_value_t prototype;
    tsc_object_prop_t* props;
};

tsc_shape_t* tsc_shape_new_unique(void);
tsc_shape_t* tsc_shape_new(tsc_shape_t* parent, const tsc_str_t* key);
void tsc_shape_add_transition(tsc_shape_t* parent, tsc_shape_t* child);
tsc_shape_t* tsc_shape_get_root(void);

typedef enum {
    TSC_PROMISE_PENDING,
    TSC_PROMISE_FULFILLED,
    TSC_PROMISE_REJECTED,
} tsc_promise_state_t;

typedef struct {
    void (*fn)(void*);
    void* env;
} tsc_promise_callback_t;

struct tsc_promise {
    tsc_promise_state_t state;
    tsc_value_t result;
    void* ptr_result;
    tsc_promise_callback_t* callbacks;
    size_t callbacks_len;
    size_t callbacks_cap;
};

typedef struct tsc_event_listener {
    tsc_str_t* event;
    tsc_event_listener_fn_t fn;
    void* env;
    void* identity;
    uint64_t order;
    bool once;
} tsc_event_listener_t;

struct tsc_event_emitter {
    size_t len;
    size_t cap;
    uint64_t next_order;
    double max_listeners;
    bool has_own_max_listeners;
    bool paused;
    tsc_event_listener_t* listeners;
};

typedef struct {
    tsc_str_t* type;
    tsc_event_target_listener_fn_t fn;
    void* env;
    void* identity;
    bool once;
} tsc_dom_event_listener_t;

struct tsc_event_target {
    size_t len;
    size_t cap;
    tsc_dom_event_listener_t* listeners;
};

struct tsc_event {
    tsc_str_t* type;
    tsc_event_target_t* target;
    tsc_event_target_t* current_target;
    bool default_prevented;
    bool cancelable;
};


typedef struct tsc_event_once_promise_env {
    tsc_event_emitter_t* emitter;
    tsc_str_t* event;
    tsc_promise_t* promise;
    tsc_object_t* signal;
    tsc_function_identity_t* abort_listener;
} tsc_event_once_promise_env_t;



extern tsc_function_identity_t* g_function_identities;
void tsc_function_init_metadata(tsc_function_identity_t* entry, double length, tsc_str_t* name);
extern double g_event_emitter_default_max_listeners;
extern bool g_shape_diagnostics_enabled;

typedef enum {
    TSC_DYNAMIC_STAT_GET_PROP,
    TSC_DYNAMIC_STAT_GET_PROP_RECEIVER,
    TSC_DYNAMIC_STAT_SET_PROP,
    TSC_DYNAMIC_STAT_SET_PROP_RECEIVER,
    TSC_DYNAMIC_STAT_HAS_PROP,
    TSC_DYNAMIC_STAT_DELETE_PROP,
    TSC_DYNAMIC_STAT_OWN_KEYS,
    TSC_DYNAMIC_STAT_GET_OWN_PROPERTY_DESCRIPTOR,
    TSC_DYNAMIC_STAT_OBJECT_SHAPE_UPDATE,
    TSC_DYNAMIC_STAT_PROP_CACHE_HIT,
    TSC_DYNAMIC_STAT_PROP_CACHE_MISS,
    TSC_DYNAMIC_STAT_COUNT,
} tsc_dynamic_stat_kind_t;

void tsc_dynamic_stat_hit(tsc_dynamic_stat_kind_t kind);

// --- Inline Boxing ---
static inline tsc_value_t value_box(tsc_value_tag_t tag, uintptr_t payload) {
    return TSC_VALUE_BOX_MASK | ((uint64_t)payload & TSC_VALUE_PAYLOAD_MASK) | (uint64_t)tag;
}

static inline bool value_is_box(tsc_value_t v) {
    return (v & TSC_VALUE_BOX_MASK) == TSC_VALUE_BOX_MASK;
}

static inline tsc_value_tag_t value_tag(tsc_value_t v) {
    return (tsc_value_tag_t)(v & 0x7);
}

static inline void* value_ptr(tsc_value_t v) {
    return (void*)(uintptr_t)((v & TSC_VALUE_PAYLOAD_MASK) & ~UINT64_C(0x7));
}

static inline bool value_is_null_value(tsc_value_t v) {
    return value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_NULL;
}

static inline bool value_is_object_value(tsc_value_t v) {
    return value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT;
}

static inline bool value_is_valid_prototype(tsc_value_t v) {
    return value_is_null_value(v) || (
        value_is_box(v) &&
        (
            value_tag(v) == TSC_VALUE_TAG_OBJECT ||
            value_tag(v) == TSC_VALUE_TAG_ARRAY ||
            value_tag(v) == TSC_VALUE_TAG_FUNCTION
        )
    );
}



// --- Hash & Map Helpers ---
#define TSC_BKT_EMPTY     ((size_t)-1)
#define TSC_BKT_TOMBSTONE ((size_t)-2)

bool tsc_value_same_value_zero(tsc_value_t a, tsc_value_t b);

static bool key_eq(tsc_key_kind_t kk, size_t ks, const void* a, const void* b) {
    switch (kk) {
        case TSC_KEY_NUM: {
            double x, y; memcpy(&x, a, sizeof x); memcpy(&y, b, sizeof y);
            return x == y || (isnan(x) && isnan(y));
        }
        case TSC_KEY_STR: {
            tsc_str_t *x, *y; memcpy(&x, a, sizeof x); memcpy(&y, b, sizeof y);
            return tsc_str_eq(x, y);
        }
        case TSC_KEY_PTR: {
            void *x, *y; memcpy(&x, a, sizeof x); memcpy(&y, b, sizeof y);
            return x == y;
        }
        case TSC_KEY_BOOL: {
            bool x, y; memcpy(&x, a, sizeof x); memcpy(&y, b, sizeof y);
            return x == y;
        }
        case TSC_KEY_VALUE: {
            tsc_value_t x, y; memcpy(&x, a, sizeof x); memcpy(&y, b, sizeof y);
            return tsc_value_same_value_zero(x, y);
        }
    }
    (void)ks;
    return memcmp(a, b, ks) == 0;
}

/* SplitMix64 finalizer — fast, good distribution for 64-bit ints. */
static inline uint64_t splitmix64_mix(uint64_t x) {
    x ^= x >> 30;
    x *= 0xbf58476d1ce4e5b9ULL;
    x ^= x >> 27;
    x *= 0x94d049bb133111ebULL;
    x ^= x >> 31;
    return x;
}

/* FNV-1a 64-bit over `len` bytes. */
static inline uint64_t fnv1a64(const unsigned char* p, size_t len) {
    uint64_t h = 0xcbf29ce484222325ULL;
    for (size_t i = 0; i < len; i++) {
        h ^= (uint64_t)p[i];
        h *= 0x100000001b3ULL;
    }
    return h;
}

/* Monotonic id allocation: atomic only in TSC_THREADS builds. */
#ifdef TSC_THREADS
#  define TSC_ID_INC(counter) __atomic_add_fetch(&(counter), 1, __ATOMIC_RELAXED)
#else
#  define TSC_ID_INC(counter) (++(counter))
#endif

static inline uint64_t tsc_str_cached_hash(const tsc_str_t* s) {
#ifdef TSC_THREADS
    /* The cached hash is idempotent, so racing writers all store the same
     * value; relaxed atomics just keep the load/store untorn. */
    uint64_t h = __atomic_load_n(&((tsc_str_t*)s)->hash, __ATOMIC_RELAXED);
    if (h != 0) return h;
    h = fnv1a64((const unsigned char*)s->data, s->len);
    if (h == 0) h = 1;
    __atomic_store_n(&((tsc_str_t*)s)->hash, h, __ATOMIC_RELAXED);
    return h;
#else
    uint64_t h = s->hash;
    if (h != 0) return h;
    h = fnv1a64((const unsigned char*)s->data, s->len);
    if (h == 0) h = 1;
    ((tsc_str_t*)s)->hash = h;
    return h;
#endif
}

static inline uint64_t num_hash(double x) {
    if (isnan(x)) return splitmix64_mix(0x7ff8000000000000ULL);
    if (x == 0.0) x = 0.0; /* normalize -0 to +0 */
    if (x >= -9007199254740991.0 && x <= 9007199254740991.0) {
        int64_t i = (int64_t)x;
        if ((double)i == x) {
            return (uint64_t)i * 11400714819323198485ULL;
        }
    }
    uint64_t bits; memcpy(&bits, &x, sizeof bits);
    return splitmix64_mix(bits);
}

static inline bool num_eq(double x, double y) {
    return x == y || (isnan(x) && isnan(y));
}



// --- JSON Parser Struct ---
typedef struct json_parser {
    const char* s;
    size_t len;
    size_t pos;
    bool error;
} json_parser_t;

// --- Missing Declarations ---
void replace_append_string_expanded(char** out, size_t* pos, size_t* cap, const tsc_str_t* source, const tsc_str_t* repl, size_t start, size_t end);
bool tsc_object_define_desc(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable);

// --- Function Declarations ---
tsc_value_t tsc_function_default_prototype(void);
tsc_value_t tsc_value_function_generic_arity(tsc_generic_function_t fn, void* env, double length);
tsc_value_t tsc_value_function_generic_named(tsc_generic_function_t fn, void* env, double length, tsc_str_t* name);
tsc_value_t tsc_value_function_closure_named(tsc_generic_function_t fn, void* env, double length, tsc_str_t* name);
tsc_value_t tsc_value_function_builtin_named(tsc_generic_function_t fn, void* env, double length, tsc_str_t* name);
tsc_value_t value_event_listener_identity(tsc_event_listener_fn_t fn, void* env, void* identity);
tsc_value_t value_event_raw_listener_identity(tsc_event_listener_fn_t fn, void* env, void* identity, uint64_t order, bool once);
bool str_lit_eq(const tsc_str_t* s, const char* lit);
bool process_stream_write(FILE* f, const tsc_str_t* data);
bool process_stream_write_bytes(FILE* f, const uint8_t* data, size_t len);
bool tsc_value_array_set_length(tsc_array_t* a, tsc_value_t value);
tsc_array_t* value_array_keys(const tsc_array_t* src, bool include_length);
tsc_array_t* value_array_values(const tsc_array_t* src);
tsc_array_t* value_array_entries(const tsc_array_t* src);
tsc_array_t* value_string_keys(const tsc_str_t* src, bool include_length);
tsc_array_t* value_string_values(const tsc_str_t* src);
tsc_array_t* value_string_entries(const tsc_str_t* src);
tsc_value_t value_descriptor_from_array_index(const tsc_array_t* src, size_t idx);
tsc_value_t value_descriptor_from_array_length(const tsc_array_t* src);
tsc_value_t value_descriptor_from_array_key(const tsc_array_t* src, const tsc_str_t* key);
tsc_value_t value_descriptor_from_string_index(const tsc_str_t* src, size_t idx);
tsc_value_t value_descriptor_from_string_length(const tsc_str_t* src);
tsc_value_t value_descriptor_from_string_key(const tsc_str_t* src, const tsc_str_t* key);
tsc_value_t value_descriptor_from_function_key(const tsc_function_identity_t* fn, const tsc_str_t* key);
tsc_value_t value_descriptors_from_array(const tsc_array_t* src);
tsc_value_t value_descriptors_from_string(const tsc_str_t* src);
tsc_value_t value_descriptor_from_prop(const tsc_object_prop_t* prop);
double value_slice_arg(tsc_value_t v, double fallback);
size_t value_array_forward_start(size_t len, double from_index);
bool value_array_last_start(size_t len, double from_index, size_t* out);
tsc_str_t* value_join_part(tsc_value_t v);
void value_flat_push(tsc_array_t* out, tsc_value_t value, int depth);
uint32_t split_limit_from_value(tsc_value_t limit);
tsc_array_t* value_array_from_string_array(const tsc_array_t* strings);
tsc_str_t* str_alloc(size_t len);
int number_fraction_digits(double value);
int number_exponential_fraction_digits(double value);
int number_precision_digits(double value);
uint16_t to_uint16_code_unit(double n);
size_t utf8_len_for_code_point(uint32_t cp);
size_t write_utf8_code_point(char* out, uint32_t cp);
bool decode_utf8_at(const tsc_str_t* s, size_t pos, uint32_t* cp, size_t* adv);
bool is_high_surrogate(uint16_t u);
bool is_low_surrogate(uint16_t u);
uint32_t surrogate_pair_to_code_point(uint16_t hi, uint16_t lo);
uint32_t to_valid_code_point(double n);
int64_t string_clamped_position(double value, int64_t len);
int64_t substring_index(double value, int64_t len);
int64_t substr_start_index(double value, int64_t len);
int64_t substr_count(double value, int64_t remaining);
uint32_t split_limit_from_num(double limit);
bool tsc_str_is_length_key(const tsc_str_t* key);
bool tsc_str_array_index(const tsc_str_t* key, size_t* out);
int64_t array_strict_index(double value, int64_t len);
int64_t array_range_index(double value, int64_t len, double fallback);
void object_reserve(tsc_object_t* o, size_t cap);
ssize_t object_find(const tsc_object_t* o, const tsc_str_t* key);
bool tsc_proxy_trap_is_callable(tsc_value_t trap);
bool tsc_proxy_chain_has_revoked(tsc_value_t v);
void tsc_proxy_require_callable_trap(tsc_value_t trap, const char* message);
void tsc_proxy_validate_get_own_property_descriptor_result(const tsc_object_t* proxy, const tsc_str_t* key, tsc_value_t result);
const tsc_object_t* object_prototype_object(const tsc_object_t* o);
const tsc_object_prop_t* object_find_chain_prop(const tsc_object_t* o, const tsc_str_t* key);
bool value_set_receiver_own_data(tsc_value_t receiver, tsc_str_t* key, tsc_value_t value);
bool object_chain_contains(tsc_value_t prototype, const tsc_object_t* needle);
bool tsc_value_chain_contains(tsc_value_t prototype, tsc_value_t needle);
bool object_set_own_data(tsc_object_t* o, tsc_str_t* key, tsc_value_t value);
bool value_set_receiver_own_data(tsc_value_t receiver, tsc_str_t* key, tsc_value_t value);
bool value_json_omits_object_property(tsc_value_t v);
void jp_ws(json_parser_t* p);
bool jp_lit(json_parser_t* p, const char* lit);
tsc_str_t* jp_string(json_parser_t* p);
tsc_value_t jp_array(json_parser_t* p);
tsc_value_t jp_object(json_parser_t* p);
tsc_value_t jp_number(json_parser_t* p);
tsc_value_t jp_value(json_parser_t* p);
uint64_t key_hash(tsc_key_kind_t kk, const void* k);
void map_rebuild_buckets(tsc_map_t* m, size_t new_bucket_cap);
void map_grow_ordered(tsc_map_t* m, size_t want);
size_t map_lookup(const tsc_map_t* m, const void* k, size_t* slot_out);
size_t map_lookup_str(const tsc_map_t* m, const tsc_str_t* k, size_t* slot_out);
void set_rebuild_buckets(tsc_set_t* s, size_t new_bucket_cap);
void set_grow_ordered(tsc_set_t* s, size_t want);
void set_grow_ordered_atomic(tsc_set_t* s, size_t want);
size_t set_lookup(const tsc_set_t* s, const void* v, size_t* slot_out);
size_t set_lookup_num(const tsc_set_t* s, double v, size_t* slot_out);
size_t set_lookup_int(const tsc_set_t* s, int64_t v, size_t* slot_out);
void set_copy_into(tsc_set_t* dst, const tsc_set_t* src);
uint32_t tsc_to_uint32(double n);
int32_t tsc_to_int32(double n);
int32_t tsc_int32_from_uint32(uint32_t u);
int32_t tsc_shift_right_int32(int32_t value, uint32_t shift);
tsc_bigint_t* bigint_alloc(void);
const char* bigint_digits_for(const char* s, int* base);
pcre2_match_data* re_md(const tsc_regexp_t* re);
void replace_append(char** out, size_t* pos, size_t* cap, const char* data, size_t len);
uint8_t byte_from_double(double n);
tsc_buffer_t* buffer_alloc_len(size_t len);
int hex_value(unsigned char c);
bool buffer_encoding_is_utf8(const tsc_str_t* encoding);
bool buffer_encoding_is_base64(const tsc_str_t* encoding);
bool buffer_encoding_is_latin1(const tsc_str_t* encoding);
bool buffer_encoding_is_ascii(const tsc_str_t* encoding);
size_t buffer_index(double raw, size_t len);
int base64_value(unsigned char c);
void base64_decode_group(tsc_buffer_t* out, size_t* pos, const int* q, int qlen);
tsc_buffer_t* buffer_from_base64(const tsc_str_t* input);
tsc_str_t* str_from_base64_bytes(const uint8_t* data, size_t len);
double buffer_index_of_bytes(const tsc_buffer_t* b, const uint8_t* needle, size_t needle_len, double offset);
double buffer_last_index_of_bytes(const tsc_buffer_t* b, const uint8_t* needle, size_t needle_len, double offset);
size_t buffer_checked_offset(const tsc_buffer_t* b, double offset, size_t width, const char* label);
uint32_t uint_from_double(double value);
uint64_t uint64_from_double(double value);
double double_from_float_bits(uint32_t bits);
uint32_t float_bits_from_double(double value);
double double_from_bits(uint64_t bits);
uint64_t double_bits_from_double(double value);
void hash_update_bytes(tsc_hash_t* h, const void* data, size_t len);
double child_now_millis(void);
void child_apply_env(const tsc_array_t* env);
bool child_has_id_option(double value);
int child_apply_ids(double uid, double gid);
size_t child_max_buffer_limit(double max_buffer);
void child_capture_append(uint8_t** data, size_t* len, size_t* cap, const uint8_t* chunk, size_t n);
void child_capture_append_limited(uint8_t** data, size_t* len, size_t* cap, const uint8_t* chunk, size_t n, size_t max_len, bool* exceeded);
tsc_str_t* child_capture_string(const uint8_t* data, size_t len);
tsc_str_t* child_signal_name(int sig);
tsc_str_t* child_errno_name(int err);
tsc_str_t* child_shell_quote_arg(const tsc_str_t* arg);
tsc_array_t* child_shell_args(const tsc_str_t* command, const tsc_array_t* args);
tsc_str_t* str_from_range(const char* data, size_t start, size_t end);
size_t find_byte(const char* data, size_t start, size_t end, char needle);
size_t first_of_url_tail(const char* data, size_t start, size_t end);
tsc_str_t* tsc_url_resolve_base(const tsc_str_t* input, const tsc_str_t* base);
int tsc_dns_lookup_ai_flags(double hints);
void event_target_reserve(tsc_event_target_t* target, size_t cap);
tsc_value_t value_accessor_getter_identity(tsc_accessor_getter_t getter, void* env);
tsc_value_t value_accessor_setter_identity(tsc_accessor_setter_t setter, void* env);
tsc_value_t tsc_value_dynamic_accessor_getter(void* env, tsc_value_t receiver);
bool tsc_value_dynamic_accessor_setter(void* env, tsc_value_t receiver, tsc_value_t value);
double value_as_num(tsc_value_t v);
void console_write_str(FILE* f, const tsc_str_t* s);
void console_write(FILE* f, size_t n, va_list ap);
char* cstr_dup(const tsc_str_t* s);
void fs_kind_from_mode(mode_t mode, bool* is_file, bool* is_directory, bool* is_symbolic_link, bool* is_block_device, bool* is_character_device, bool* is_fifo, bool* is_socket);
double fs_timespec_to_ms(time_t sec, long nsec);
double fs_stat_atime_ms(const struct stat* st);
double fs_stat_mtime_ms(const struct stat* st);
double fs_stat_ctime_ms(const struct stat* st);
double fs_stat_birthtime_ms(const struct stat* st);
void fs_stats_fill(tsc_fs_stats_t* out, const struct stat* st);
tsc_fs_dirent_t* fs_dirent_from_path(const char* dir_path, const char* name);
char* fs_join_path(const char* left, const char* right);
void fs_write_bytes_opts_mode(const tsc_str_t* path, const uint8_t* data, size_t len, bool append, bool exclusive, bool update, double file_mode, bool flush, const char* label);
void fs_write_bytes_opts(const tsc_str_t* path, const uint8_t* data, size_t len, bool append, bool exclusive, const char* label);
void fs_write_bytes(const tsc_str_t* path, const uint8_t* data, size_t len, const char* mode, const char* label);
struct timespec fs_seconds_to_timespec(double seconds);
void fs_utimes_path_sync(const tsc_str_t* path, double atime, double mtime, int flags, const char* message);
mode_t fs_mode_from_double(double mode);
void fs_mkdir_one_sync(const tsc_str_t* path, mode_t mode, const char* message);
int mkdir_recursive_cstr(const char* path, mode_t mode);
int rm_recursive_cstr(const char* path, bool force);
char* fs_join_path_cstr(const char* base, const char* name);
int fs_copy_file_bytes_cstr(const char* src, const char* dest, bool force, bool error_on_exist, int copy_flags, bool preserve_timestamps);
char* fs_readlink_alloc_cstr(const char* path);
int fs_copy_symlink_cstr(const char* src, const char* dest, bool force, bool error_on_exist, bool verbatim_symlinks);
int fs_cp_recursive_cstr(const char* src, const char* dest, bool recursive, bool force, bool error_on_exist, bool dereference, bool verbatim_symlinks, int copy_flags, bool preserve_timestamps);
void fs_readdir_recursive_into(const char* root, const char* rel, tsc_array_t* out);
void fs_readdir_recursive_buffer_into(const char* root, const char* rel, tsc_array_t* out);
tsc_str_t* path_join_impl(size_t n, va_list ap, bool resolve);
size_t path_split_components(const tsc_str_t* p, size_t starts[256], size_t lens[256]);
bool date_parse_fixed_int(const tsc_str_t* text, size_t* pos, size_t digits, int* out);
bool date_parse_char(const tsc_str_t* text, size_t* pos, char ch);
double date_millis_part(const tsc_date_t* d);
tsc_str_t* path_str_slice(const tsc_str_t* p, size_t start, size_t len);
tsc_str_t* path_get_string_prop(tsc_value_t object, const char* key, size_t key_len);
void event_emitter_reserve(tsc_event_emitter_t* ee, size_t cap);
tsc_array_t* event_args_copy_as_values(tsc_array_t* args);
void event_once_promise_resolve_listener(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args);
void event_once_promise_reject_listener(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args);

#endif
