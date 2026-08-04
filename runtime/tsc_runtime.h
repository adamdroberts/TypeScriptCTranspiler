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
void* tsc_no_gc_malloc_uninit(size_t n);
#  define TSC_GC_MALLOC(n)         calloc(1, (n))
#  define TSC_GC_MALLOC_UNINIT(n)  tsc_no_gc_malloc_uninit((n))
#  define TSC_GC_MALLOC_ATOMIC(n)  malloc((n))
#  define TSC_GC_REALLOC(p, n)     realloc((p), (n))
#  define TSC_GC_INIT()            ((void)0)
#else
#  if defined(TSC_THREADS) && !defined(GC_THREADS)
#    define GC_THREADS
#  endif
#  include <gc/gc.h>
#  define TSC_GC_MALLOC(n)         GC_MALLOC(n)
#  define TSC_GC_MALLOC_UNINIT(n)  GC_MALLOC((n))
#  define TSC_GC_MALLOC_ATOMIC(n)  GC_MALLOC_ATOMIC(n)
#  define TSC_GC_REALLOC(p, n)     GC_REALLOC((p), (n))
#  define TSC_GC_INIT()            GC_INIT()
#endif

/* TSC_THREADS is defined only for programs that use the optional dispatch
 * API; without it every threading hook compiles to the plain single-threaded
 * operation and the runtime has no pthread/libdispatch dependency. */
#ifdef TSC_THREADS
#  define TSC_TLS _Thread_local
#else
#  define TSC_TLS
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
#ifndef M_SQRT1_2
#  define M_SQRT1_2 0.70710678118654752440
#endif

typedef uint64_t tsc_value_t;

/* ------------- bootstrap ------------- */
void tsc_bootstrap(int argc, char** argv);
void tsc_panic(const char* msg);

/* ------------- strings (immutable, UTF-8) ------------- */
typedef struct tsc_str {
    size_t len;
    const char* data;
    uint64_t hash;
} tsc_str_t;
struct tsc_array; /* fwd */

tsc_str_t* tsc_str_from_lit(const char* data, size_t len);
tsc_str_t* tsc_str_from_cstr(const char* s);

/* ------------- embedded Node bridge ------------- */
tsc_value_t tsc_node_eval(tsc_str_t* source);
tsc_value_t tsc_node_function(tsc_str_t* body);
tsc_value_t tsc_node_function_call(tsc_value_t fn, struct tsc_array* args);
tsc_value_t tsc_node_native_addon(tsc_str_t* resolved_path);
tsc_value_t tsc_builtin_eval(void* env, tsc_value_t this_arg, struct tsc_array* args);
tsc_value_t tsc_builtin_function(void* env, tsc_value_t this_arg, struct tsc_array* args);
tsc_value_t tsc_builtin_reflect(void);

tsc_str_t* tsc_str_concat(const tsc_str_t* a, const tsc_str_t* b);
tsc_str_t* tsc_str_concat_lit_int(const char* lit, size_t lit_len, int64_t n);
tsc_str_t* tsc_str_concat_int_lit(int64_t n, const char* lit, size_t lit_len);
tsc_str_t* tsc_str_concat_lit_num(const char* lit, size_t lit_len, double n);
tsc_str_t* tsc_str_concat_num_lit(double n, const char* lit, size_t lit_len);
tsc_str_t* tsc_str_concat_n(size_t n, ...);
tsc_str_t* tsc_str_raw(tsc_value_t template_value, const struct tsc_array* substitutions);

/* ------------- JSON build buffer -------------
 * Single growable byte buffer with one final allocation. Used to lower
 * JSON.stringify of typed values into a straight-line append walk instead
 * of N+ tsc_str_concat calls.
 */
typedef struct {
    char* data;
    size_t len, cap;
} tsc_jsonbuf_t;

void tsc_jsonbuf_init(tsc_jsonbuf_t* b);
void tsc_jsonbuf_reserve(tsc_jsonbuf_t* b, size_t need);
void tsc_jsonbuf_append(tsc_jsonbuf_t* b, const char* p, size_t n);
void tsc_jsonbuf_byte(tsc_jsonbuf_t* b, char c);
void tsc_jsonbuf_num(tsc_jsonbuf_t* b, double n);
void tsc_jsonbuf_int(tsc_jsonbuf_t* b, int64_t n);
void tsc_jsonbuf_bool(tsc_jsonbuf_t* b, bool v);
void tsc_jsonbuf_str(tsc_jsonbuf_t* b, const tsc_str_t* s);
tsc_str_t* tsc_jsonbuf_finish(tsc_jsonbuf_t* b);
tsc_str_t* tsc_str_from_num(double n);
/* Fast path for integer-shape numbers — skips the up-to-17 snprintf+strtod
 * round-trip loop in tsc_str_from_num. Used by the emitter when the operand
 * is provably integer-valued (e.g. loop counters in a string concat). */
tsc_str_t* tsc_str_from_int(int64_t n);
tsc_str_t* tsc_str_from_num_radix(double n, double radix);
tsc_str_t* tsc_str_from_num_fixed(double n, double fraction_digits);
tsc_str_t* tsc_str_from_num_exponential(double n, double fraction_digits, bool has_digits);
tsc_str_t* tsc_str_from_num_precision(double n, double precision, bool has_precision);
tsc_str_t* tsc_str_from_bool(bool b);
tsc_str_t* tsc_str_from_char_code_n(size_t n, ...);
tsc_str_t* tsc_str_from_code_point_n(size_t n, ...);
bool tsc_str_eq(const tsc_str_t* a, const tsc_str_t* b);
int tsc_str_cmp(const tsc_str_t* a, const tsc_str_t* b);
double tsc_str_locale_compare(const tsc_str_t* a, const tsc_str_t* b);
double tsc_str_length(const tsc_str_t* s);

tsc_str_t* tsc_str_char_at(const tsc_str_t* s, double idx);
tsc_str_t* tsc_str_at(const tsc_str_t* s, double idx);
double tsc_str_char_code_at(const tsc_str_t* s, double idx);
double tsc_str_code_point_at(const tsc_str_t* s, double idx);
double tsc_str_index_of(const tsc_str_t* h, const tsc_str_t* n, double position);
double tsc_str_last_index_of(const tsc_str_t* h, const tsc_str_t* n, double position);
bool tsc_str_includes(const tsc_str_t* h, const tsc_str_t* n, double position);
bool tsc_str_starts_with(const tsc_str_t* s, const tsc_str_t* p, double position);
bool tsc_str_ends_with(const tsc_str_t* s, const tsc_str_t* p, double end_position);
tsc_str_t* tsc_str_slice(const tsc_str_t* s, double start, double end);
tsc_str_t* tsc_str_encode_uri(const tsc_str_t* s);
tsc_str_t* tsc_str_encode_uri_component(const tsc_str_t* s);
tsc_str_t* tsc_str_decode_uri(const tsc_str_t* s);
tsc_str_t* tsc_str_decode_uri_component(const tsc_str_t* s);
tsc_str_t* tsc_str_substring(const tsc_str_t* s, double start, double end);
tsc_str_t* tsc_str_substr(const tsc_str_t* s, double start, double length);
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

struct tsc_buffer; /* fwd */
struct tsc_map;
struct tsc_set;
struct tsc_date;
struct tsc_regexp;
struct tsc_error;
struct tsc_array* tsc_str_split(const tsc_str_t* s, const tsc_str_t* sep);
struct tsc_array* tsc_str_split_limit(const tsc_str_t* s, const tsc_str_t* sep, uint32_t limit);
struct tsc_array* tsc_str_split_limit_num(const tsc_str_t* s, const tsc_str_t* sep, double limit);
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
tsc_symbol_t* tsc_symbol_unscopables(void);
tsc_symbol_t* tsc_symbol_is_concat_spreadable(void);
tsc_symbol_t* tsc_symbol_to_string_tag(void);
tsc_symbol_t* tsc_symbol_species(void);
tsc_str_t* tsc_symbol_description(const tsc_symbol_t* sym);
tsc_str_t* tsc_symbol_to_string(const tsc_symbol_t* sym);

/* ------------- WeakRef ------------- */
typedef struct tsc_weakref {
    void* target;
} tsc_weakref_t;

tsc_weakref_t* tsc_weakref_new(void* target);
void* tsc_weakref_deref(const tsc_weakref_t* ref);

/* ------------- FinalizationRegistry -------------
 * Stub: tracks registered entries so that `.unregister(token)` returns the
 * right boolean, but the cleanup callback never fires (this AOT runtime has
 * no GC-finalizer plumbing). */
typedef struct tsc_finregistry_entry {
    void* unregister_token; /* NULL if no token was supplied */
} tsc_finregistry_entry_t;

typedef struct tsc_finregistry {
    tsc_finregistry_entry_t* entries;
    size_t len;
    size_t cap;
} tsc_finregistry_t;

tsc_finregistry_t* tsc_finregistry_new(void);
void tsc_finregistry_register(tsc_finregistry_t* r, void* token);
bool tsc_finregistry_unregister(tsc_finregistry_t* r, void* token);

/* ------------- numbers ------------- */
/* Inline fast path: fmod is libm-slow; when both operands fit in int64 (the
 * common case for ECMAScript int-shape doubles), use C's integer modulo. */
static inline double tsc_num_mod(double a, double b) {
    long long ai = (long long)a;
    long long bi = (long long)b;
    if (bi != 0 && (double)ai == a && (double)bi == b) {
        return (double)(ai % bi);
    }
    return fmod(a, b);
}
double tsc_parse_float(const tsc_str_t* s);
double tsc_parse_int(const tsc_str_t* s, double radix);
double tsc_math_random(void);
double tsc_math_round(double x);
double tsc_math_sign(double x);
double tsc_math_imul(double a, double b);
double tsc_math_clz32(double x);
double tsc_math_fround(double x);
double tsc_math_f16round(double x);

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
    pcre2_match_data* cached_md;  /* lazily allocated; reused across .test/.match/.replace */
    tsc_str_t* source;
    tsc_str_t* flags;
    bool global;
    bool has_indices;
    bool ignore_case;
    bool multiline;
    bool dot_all;
    bool sticky;
    bool unicode;
    bool compiled;
    bool jit;
    uint32_t capture_count;
} tsc_regexp_t;

tsc_regexp_t* tsc_regexp_new(const tsc_str_t* pattern, const tsc_str_t* flags);
tsc_str_t* tsc_regexp_escape(const tsc_str_t* input);
struct tsc_array* tsc_regexp_exec(const tsc_regexp_t* re, const tsc_str_t* s);
/* Inline test: skips a function call + lazy-init function call per match.
 * Hot in tight regex loops (e.g. validators applied per line). */
static inline bool tsc_regexp_test(const tsc_regexp_t* re, const tsc_str_t* s) {
    if (!re->compiled) return false;
    if (!re->cached_md) {
        ((tsc_regexp_t*)re)->cached_md = pcre2_match_data_create_from_pattern(re->re, NULL);
    }
    if (re->jit) {
        return pcre2_jit_match(re->re, (PCRE2_SPTR)s->data, s->len, 0, 0, re->cached_md, NULL) >= 0;
    }
    return pcre2_match(re->re, (PCRE2_SPTR)s->data, s->len, 0, 0, re->cached_md, NULL) >= 0;
}
tsc_str_t* tsc_regexp_to_string(const tsc_regexp_t* re);
struct tsc_array* tsc_str_match_regex(const tsc_str_t* s, const tsc_regexp_t* re);
struct tsc_array* tsc_str_match_all_regex(const tsc_str_t* s, const tsc_regexp_t* re);
double tsc_str_search_regex(const tsc_str_t* s, const tsc_regexp_t* re);
tsc_str_t* tsc_str_replace_regex(const tsc_str_t* s, const tsc_regexp_t* re, const tsc_str_t* repl);
struct tsc_array* tsc_str_split_regex(const tsc_str_t* s, const tsc_regexp_t* re);
struct tsc_array* tsc_str_split_regex_limit(const tsc_str_t* s, const tsc_regexp_t* re, uint32_t limit);
struct tsc_array* tsc_str_split_regex_limit_num(const tsc_str_t* s, const tsc_regexp_t* re, double limit);

/* ------------- crypto ------------- */
typedef struct tsc_hash tsc_hash_t;
tsc_hash_t* tsc_crypto_create_hash(const tsc_str_t* algorithm);
struct tsc_buffer* tsc_crypto_random_bytes(double size);
struct tsc_buffer* tsc_crypto_random_fill_sync(struct tsc_buffer* buffer, double offset, double size, bool offset_is_null, bool size_is_null);
tsc_str_t* tsc_crypto_random_uuid(void);
bool tsc_crypto_timing_safe_equal(const struct tsc_buffer* a, const struct tsc_buffer* b);
struct tsc_buffer* tsc_crypto_pbkdf2_sync_ss(const tsc_str_t* password, const tsc_str_t* salt, double iterations, double keylen, const tsc_str_t* digest);
struct tsc_buffer* tsc_crypto_pbkdf2_sync_sb(const tsc_str_t* password, const struct tsc_buffer* salt, double iterations, double keylen, const tsc_str_t* digest);
struct tsc_buffer* tsc_crypto_pbkdf2_sync_bs(const struct tsc_buffer* password, const tsc_str_t* salt, double iterations, double keylen, const tsc_str_t* digest);
struct tsc_buffer* tsc_crypto_pbkdf2_sync_bb(const struct tsc_buffer* password, const struct tsc_buffer* salt, double iterations, double keylen, const tsc_str_t* digest);
struct tsc_buffer* tsc_crypto_scrypt_sync_ss(const tsc_str_t* password, const tsc_str_t* salt, double keylen, double N, double r, double p, double maxmem);
struct tsc_buffer* tsc_crypto_scrypt_sync_sb(const tsc_str_t* password, const struct tsc_buffer* salt, double keylen, double N, double r, double p, double maxmem);
struct tsc_buffer* tsc_crypto_scrypt_sync_bs(const struct tsc_buffer* password, const tsc_str_t* salt, double keylen, double N, double r, double p, double maxmem);
struct tsc_buffer* tsc_crypto_scrypt_sync_bb(const struct tsc_buffer* password, const struct tsc_buffer* salt, double keylen, double N, double r, double p, double maxmem);
struct tsc_array* tsc_crypto_get_hashes(void);
tsc_hash_t* tsc_hash_update(tsc_hash_t* h, const tsc_str_t* data);
tsc_hash_t* tsc_hash_update_buffer(tsc_hash_t* h, const struct tsc_buffer* data);
tsc_str_t* tsc_hash_digest(tsc_hash_t* h, const tsc_str_t* encoding);

typedef struct tsc_hmac tsc_hmac_t;
tsc_hmac_t* tsc_crypto_create_hmac_str(const tsc_str_t* algorithm, const tsc_str_t* key);
tsc_hmac_t* tsc_crypto_create_hmac_buffer(const tsc_str_t* algorithm, const struct tsc_buffer* key);
tsc_hmac_t* tsc_hmac_update(tsc_hmac_t* h, const tsc_str_t* data);
tsc_hmac_t* tsc_hmac_update_buffer(tsc_hmac_t* h, const struct tsc_buffer* data);
tsc_str_t* tsc_hmac_digest(tsc_hmac_t* h, const tsc_str_t* encoding);
struct tsc_buffer* tsc_hmac_digest_buffer(tsc_hmac_t* h, const tsc_str_t* encoding);
struct tsc_buffer* tsc_child_process_exec_sync(const tsc_str_t* command, const tsc_str_t* cwd, const tsc_str_t* input, const struct tsc_array* env, const tsc_str_t* shell, double uid, double gid, double max_buffer, double timeout_ms, int timeout_signal);
struct tsc_buffer* tsc_child_process_exec_file_sync(const tsc_str_t* file, const struct tsc_array* args, const tsc_str_t* cwd, const tsc_str_t* input, const struct tsc_array* env, const tsc_str_t* shell, const tsc_str_t* argv0, double uid, double gid, double max_buffer, double timeout_ms, int timeout_signal);
tsc_value_t tsc_child_process_spawn_sync(const tsc_str_t* file, const struct tsc_array* args, const tsc_str_t* cwd, const tsc_str_t* input, const struct tsc_array* env, const tsc_str_t* shell, const tsc_str_t* argv0, bool pipe_stdin, bool ignore_stdin, bool capture_stdout, bool capture_stderr, bool inherit_stdout, bool inherit_stderr, bool detached, double uid, double gid, double max_buffer, double timeout_ms, int timeout_signal, bool return_utf8);
tsc_value_t tsc_child_process_exec_utf8(const tsc_str_t* command, const tsc_str_t* cwd, const struct tsc_array* env, const tsc_str_t* shell, double uid, double gid, double max_buffer, double timeout_ms, int timeout_signal);

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
typedef struct tsc_url_search_param {
    tsc_str_t* name;
    tsc_str_t* value;
} tsc_url_search_param_t;
typedef struct tsc_url_search_params {
    tsc_url_search_param_t* items;
    size_t len;
    size_t cap;
} tsc_url_search_params_t;
bool tsc_url_can_parse(const tsc_str_t* input);
bool tsc_url_can_parse_base(const tsc_str_t* input, const tsc_str_t* base);
tsc_url_t* tsc_url_new(const tsc_str_t* input);
tsc_url_t* tsc_url_new_base(const tsc_str_t* input, const tsc_str_t* base);
tsc_str_t* tsc_url_file_path(const tsc_url_t* url);
tsc_str_t* tsc_url_file_url_to_path(const tsc_str_t* input);
tsc_url_t* tsc_url_path_to_file_url(const tsc_str_t* path);
tsc_url_search_params_t* tsc_url_search_params_new(const tsc_str_t* init);
void tsc_url_search_params_append(tsc_url_search_params_t* params, const tsc_str_t* name, const tsc_str_t* value);
void tsc_url_search_params_delete(tsc_url_search_params_t* params, const tsc_str_t* name, const tsc_str_t* value);
tsc_str_t* tsc_url_search_params_get(const tsc_url_search_params_t* params, const tsc_str_t* name);
struct tsc_array* tsc_url_search_params_get_all(const tsc_url_search_params_t* params, const tsc_str_t* name);
bool tsc_url_search_params_has(const tsc_url_search_params_t* params, const tsc_str_t* name, const tsc_str_t* value);
void tsc_url_search_params_set(tsc_url_search_params_t* params, const tsc_str_t* name, const tsc_str_t* value);
tsc_str_t* tsc_url_search_params_to_string(const tsc_url_search_params_t* params);
struct tsc_array* tsc_url_search_params_keys(const tsc_url_search_params_t* params);
struct tsc_array* tsc_url_search_params_values(const tsc_url_search_params_t* params);
struct tsc_array* tsc_url_search_params_entries(const tsc_url_search_params_t* params);
void tsc_url_search_params_sort(tsc_url_search_params_t* params);


/* ------------- Querystring ------------- */
tsc_value_t tsc_querystring_parse(const tsc_str_t* str, tsc_value_t sep_val, tsc_value_t eq_val, tsc_value_t options_val);
tsc_str_t* tsc_querystring_stringify(tsc_value_t obj_val, tsc_value_t sep_val, tsc_value_t eq_val, tsc_value_t options_val);
tsc_str_t* tsc_querystring_escape(const tsc_str_t* str);
tsc_str_t* tsc_querystring_unescape(const tsc_str_t* str);

/* ------------- Date ------------- */
typedef struct tsc_date {
    double ms;
} tsc_date_t;
tsc_date_t* tsc_date_new_now(void);
tsc_date_t* tsc_date_from_ms(double ms);
double tsc_date_get_time(const tsc_date_t* d);
double tsc_date_set_time(tsc_date_t* d, double ms);
double tsc_date_set_utc_part(tsc_date_t* d, int part, double a, double b, double c, double e, int arg_count);
double tsc_date_set_local_part(tsc_date_t* d, int part, double a, double b, double c, double e, int arg_count);
double tsc_date_set_legacy_year(tsc_date_t* d, double year);
double tsc_date_parse(const tsc_str_t* text);
double tsc_date_utc(double year, double month, double day, double hours, double minutes, double seconds, double ms);
double tsc_date_local(double year, double month, double day, double hours, double minutes, double seconds, double ms);
double tsc_date_get_utc_part(const tsc_date_t* d, int part);
double tsc_date_get_local_part(const tsc_date_t* d, int part);
double tsc_date_get_timezone_offset(const tsc_date_t* d);
tsc_str_t* tsc_date_to_iso_string(const tsc_date_t* d);
tsc_value_t tsc_date_to_json(const tsc_date_t* d);
tsc_str_t* tsc_date_to_utc_string(const tsc_date_t* d);
tsc_str_t* tsc_date_to_date_string(const tsc_date_t* d);
tsc_str_t* tsc_date_to_time_string(const tsc_date_t* d);
tsc_str_t* tsc_date_to_locale_string(const tsc_date_t* d);
tsc_str_t* tsc_date_to_locale_date_string(const tsc_date_t* d);
tsc_str_t* tsc_date_to_locale_time_string(const tsc_date_t* d);
tsc_str_t* tsc_date_to_string(const tsc_date_t* d);

/* ------------- Error ------------- */
typedef struct tsc_error {
    tsc_str_t* name;
    tsc_str_t* message;
    tsc_value_t cause;
    struct tsc_array* errors;
} tsc_error_t;
tsc_error_t* tsc_error_new(tsc_str_t* message);
tsc_error_t* tsc_error_new_named(tsc_str_t* name, tsc_str_t* message);
tsc_error_t* tsc_error_new_named_cause(tsc_str_t* name, tsc_str_t* message, tsc_value_t cause);
tsc_error_t* tsc_aggregate_error_new(struct tsc_array* errors, tsc_str_t* message);
tsc_error_t* tsc_aggregate_error_new_cause(struct tsc_array* errors, tsc_str_t* message, tsc_value_t cause);
tsc_str_t* tsc_error_to_string(const tsc_error_t* e);

/* ------------- Buffer ------------- */
typedef struct tsc_buffer {
    size_t len;
    uint8_t* data;
} tsc_buffer_t;
typedef struct tsc_array_buffer {
    size_t byte_length;
    uint8_t* data;
} tsc_array_buffer_t;
typedef struct tsc_data_view {
    tsc_array_buffer_t* buffer;
    size_t byte_offset;
    size_t byte_length;
} tsc_data_view_t;
tsc_array_buffer_t* tsc_array_buffer_new(double byte_length);
double tsc_array_buffer_byte_length(const tsc_array_buffer_t* b);
tsc_data_view_t* tsc_data_view_new(tsc_array_buffer_t* buffer, double byte_offset, double byte_length, bool has_byte_length);
tsc_array_buffer_t* tsc_data_view_buffer(const tsc_data_view_t* v);
double tsc_data_view_byte_offset(const tsc_data_view_t* v);
double tsc_data_view_byte_length(const tsc_data_view_t* v);
tsc_buffer_t* tsc_buffer_from_str(const tsc_str_t* input, const tsc_str_t* encoding);
tsc_buffer_t* tsc_buffer_transcode(const tsc_buffer_t* source, const tsc_str_t* from_enc, const tsc_str_t* to_enc);
tsc_buffer_t* tsc_buffer_from_array(const struct tsc_array* input);
tsc_buffer_t* tsc_buffer_from_buffer(const tsc_buffer_t* input);
tsc_buffer_t* tsc_buffer_alloc(double size, double fill);
tsc_buffer_t* tsc_buffer_concat(const struct tsc_array* list);
tsc_buffer_t* tsc_buffer_concat_len(const struct tsc_array* list, double total_length);
tsc_str_t* tsc_buffer_to_string(const tsc_buffer_t* b, const tsc_str_t* encoding);
tsc_value_t tsc_buffer_to_json(const tsc_buffer_t* b);
tsc_str_t* tsc_btoa(const tsc_str_t* input);
tsc_str_t* tsc_atob(const tsc_str_t* input);
tsc_buffer_t* tsc_buffer_slice(const tsc_buffer_t* b, double start, double end);
tsc_buffer_t* tsc_buffer_fill(tsc_buffer_t* b, double value, double start, double end);
double tsc_buffer_write(tsc_buffer_t* b, const tsc_str_t* input, double offset, double length, const tsc_str_t* encoding);
double tsc_buffer_copy(const tsc_buffer_t* source, tsc_buffer_t* target, double target_start, double source_start, double source_end);
double tsc_buffer_index_of_byte(const tsc_buffer_t* b, double value, double offset);
double tsc_buffer_last_index_of_byte(const tsc_buffer_t* b, double value, double offset);
double tsc_buffer_index_of_str(const tsc_buffer_t* b, const tsc_str_t* value, double offset);
double tsc_buffer_last_index_of_str(const tsc_buffer_t* b, const tsc_str_t* value, double offset);
double tsc_buffer_index_of_buffer(const tsc_buffer_t* b, const tsc_buffer_t* value, double offset);
double tsc_buffer_last_index_of_buffer(const tsc_buffer_t* b, const tsc_buffer_t* value, double offset);
bool tsc_buffer_equals(const tsc_buffer_t* a, const tsc_buffer_t* b);
double tsc_buffer_compare(const tsc_buffer_t* a, const tsc_buffer_t* b);
double tsc_buffer_compare_ranges(const tsc_buffer_t* source, const tsc_buffer_t* target,
                                 double target_start, double target_end,
                                 double source_start, double source_end);
double tsc_buffer_byte_length_str(const tsc_str_t* input, const tsc_str_t* encoding);
bool tsc_buffer_is_encoding(const tsc_str_t* encoding);
double tsc_buffer_length(const tsc_buffer_t* b);
double tsc_buffer_get(const tsc_buffer_t* b, double idx);
double tsc_buffer_read_uint8(const tsc_buffer_t* b, double offset);
double tsc_buffer_write_uint8(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_read_int8(const tsc_buffer_t* b, double offset);
double tsc_buffer_write_int8(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_read_uint16_le(const tsc_buffer_t* b, double offset);
double tsc_buffer_read_uint16_be(const tsc_buffer_t* b, double offset);
double tsc_buffer_write_uint16_le(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_write_uint16_be(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_read_int16_le(const tsc_buffer_t* b, double offset);
double tsc_buffer_read_int16_be(const tsc_buffer_t* b, double offset);
double tsc_buffer_write_int16_le(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_write_int16_be(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_read_uint32_le(const tsc_buffer_t* b, double offset);
double tsc_buffer_read_uint32_be(const tsc_buffer_t* b, double offset);
double tsc_buffer_write_uint32_le(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_write_uint32_be(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_read_int32_le(const tsc_buffer_t* b, double offset);
double tsc_buffer_read_int32_be(const tsc_buffer_t* b, double offset);
double tsc_buffer_write_int32_le(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_write_int32_be(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_read_float_le(const tsc_buffer_t* b, double offset);
double tsc_buffer_read_float_be(const tsc_buffer_t* b, double offset);
double tsc_buffer_write_float_le(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_write_float_be(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_read_double_le(const tsc_buffer_t* b, double offset);
double tsc_buffer_read_double_be(const tsc_buffer_t* b, double offset);
double tsc_buffer_write_double_le(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_write_double_be(tsc_buffer_t* b, double value, double offset);
double tsc_buffer_read_uint_le(const tsc_buffer_t* b, double offset, double byte_len);
double tsc_buffer_read_uint_be(const tsc_buffer_t* b, double offset, double byte_len);
double tsc_buffer_read_int_le(const tsc_buffer_t* b, double offset, double byte_len);
double tsc_buffer_read_int_be(const tsc_buffer_t* b, double offset, double byte_len);
double tsc_buffer_write_uint_le(tsc_buffer_t* b, double value, double offset, double byte_len);
double tsc_buffer_write_uint_be(tsc_buffer_t* b, double value, double offset, double byte_len);
double tsc_buffer_write_int_le(tsc_buffer_t* b, double value, double offset, double byte_len);
double tsc_buffer_write_int_be(tsc_buffer_t* b, double value, double offset, double byte_len);
tsc_buffer_t* tsc_buffer_swap(tsc_buffer_t* b, size_t width);
#define TSC_BUF(b, i) ((b)->data[(size_t)(i)])

/* ------------- TextEncoder / TextDecoder ------------- */
typedef struct tsc_text_encoder {
    char dummy;
} tsc_text_encoder_t;

typedef struct tsc_text_decoder {
    char dummy;
} tsc_text_decoder_t;

tsc_text_encoder_t* tsc_text_encoder_new(void);
tsc_buffer_t* tsc_text_encoder_encode(const tsc_text_encoder_t* encoder, const tsc_str_t* input);

tsc_text_decoder_t* tsc_text_decoder_new(const tsc_str_t* encoding);
tsc_str_t* tsc_text_decoder_decode(const tsc_text_decoder_t* decoder, const tsc_buffer_t* input);

/* ------------- JSON ------------- */
tsc_str_t* tsc_json_escape_string(const tsc_str_t* s);  /* adds quotes + escapes */
tsc_str_t* tsc_json_num(double n);  /* JSON-safe number formatting */

typedef struct tsc_object tsc_object_t;

/* ------------- arrays ------------- */
typedef struct tsc_array {
    size_t len;
    size_t cap;
    size_t es;
    bool extensible;
    bool sealed;
    bool frozen;
    bool length_writable;
    tsc_value_t prototype;
    size_t iter_pos;
    bool iter_has_return;
    bool iter_return_consumed;
    tsc_value_t iter_return;
    bool is_lazy_generator;
    int state;
    void* env;
    void (*lazy_next)(struct tsc_array* a, int* state, void* env, tsc_value_t next_arg, bool* done);
    bool (*lazy_close)(struct tsc_array* a, void* env, tsc_value_t arg, bool is_throw);
    bool lazy_close_yielded;
    tsc_value_t lazy_close_value;
    tsc_object_t* props;
    tsc_object_t* holes;
    void* data;
} tsc_array_t;

tsc_array_t* tsc_array_new(size_t elem_size, size_t initial_cap);
tsc_array_t* tsc_array_new_atomic(size_t elem_size, size_t initial_cap);
tsc_array_t* tsc_array_prototype(void);
tsc_value_t tsc_array_constructor_value(void);
tsc_value_t tsc_array_unscopables_value(void);
tsc_array_t* tsc_array_prototype_own_property_names(void);
tsc_value_t tsc_array_prototype_own_property_descriptor(tsc_str_t* key);
tsc_value_t tsc_array_prototype_own_property_descriptors(void);
tsc_array_t* tsc_array_prototype_symbols(void);
bool tsc_array_prototype_has_symbol(tsc_symbol_t* key);
bool tsc_array_prototype_delete_symbol(tsc_symbol_t* key);
bool tsc_array_prototype_symbol_is_enumerable(tsc_symbol_t* key);
tsc_value_t tsc_array_prototype_symbol_value(tsc_symbol_t* key);
bool tsc_array_prototype_define_symbol_desc(tsc_symbol_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable);
tsc_value_t tsc_array_symbol_iterator_descriptor(void);
tsc_value_t tsc_array_symbol_unscopables_descriptor(void);
void tsc_array_materialize_all(tsc_array_t* a);
tsc_array_t* tsc_array_from_buf(size_t elem_size, const void* src, size_t n);
void tsc_array_reserve(tsc_array_t* a, size_t new_cap);
void tsc_array_push_raw(tsc_array_t* a, const void* elem);
void tsc_array_pop_raw(tsc_array_t* a);
void tsc_array_shift_raw(tsc_array_t* a);
void tsc_array_unshift_raw(tsc_array_t* a, const void* elem);
tsc_array_t* tsc_array_reverse(tsc_array_t* a); /* in-place */
tsc_array_t* tsc_array_to_reversed(const tsc_array_t* a); /* copy */
tsc_array_t* tsc_array_with(const tsc_array_t* a, double index, const void* elem); /* copy */
tsc_array_t* tsc_array_splice(tsc_array_t* a, double start, double delete_count, int argc, const tsc_array_t* items); /* in-place */
tsc_array_t* tsc_array_to_spliced(const tsc_array_t* a, double start, double delete_count, int argc, const tsc_array_t* items); /* copy */
tsc_array_t* tsc_array_fill(tsc_array_t* a, const void* elem, double start, double end); /* in-place */
tsc_array_t* tsc_array_copy_within(tsc_array_t* a, double target, double start, double end); /* in-place */
tsc_array_t* tsc_array_slice(const tsc_array_t* a, double start, double end);
tsc_array_t* tsc_array_append(tsc_array_t* dst, const tsc_array_t* src);
tsc_array_t* tsc_array_flat_once(const tsc_array_t* outer, size_t elem_size);
double tsc_array_length(const tsc_array_t* a);
bool tsc_array_has_own_key(const tsc_array_t* a, const tsc_str_t* key);
bool tsc_array_property_is_enumerable_key(const tsc_array_t* a, const tsc_str_t* key);
bool tsc_array_index_present(const tsc_array_t* a, size_t index);
void tsc_array_mark_hole(tsc_array_t* a, size_t index);
void tsc_array_clear_hole(tsc_array_t* a, size_t index);
void tsc_array_oob(const tsc_array_t* a, double i);

#define TSC_ARR(T, a, i) (((T*)((a)->data))[(size_t)(i)])

/* ------------- dynamic values (NaN-boxed) ------------- */
typedef struct tsc_shape tsc_shape_t;
typedef struct {
    const tsc_shape_t* shape;
    size_t index;
} tsc_cache_entry_t;

#define TSC_POLYMORPHIC_CACHE_SIZE 4

typedef struct {
    tsc_cache_entry_t entries[TSC_POLYMORPHIC_CACHE_SIZE];
} tsc_prop_cache_t;
typedef struct tsc_promise tsc_promise_t;
typedef struct tsc_event_emitter tsc_event_emitter_t;
typedef struct tsc_event tsc_event_t;
typedef struct tsc_event_target tsc_event_target_t;
typedef struct tsc_fs_stats tsc_fs_stats_t;
typedef struct tsc_fs_dirent tsc_fs_dirent_t;
typedef struct tsc_dns_lookup_result tsc_dns_lookup_result_t;
typedef struct tsc_dns_lookup_all_result tsc_dns_lookup_all_result_t;
typedef struct tsc_dns_resolve4_result tsc_dns_resolve4_result_t;
typedef struct tsc_dns_resolve6_result tsc_dns_resolve6_result_t;
typedef struct tsc_dns_lookup_service_result tsc_dns_lookup_service_result_t;
typedef tsc_value_t (*tsc_accessor_getter_t)(void* env, tsc_value_t receiver);
typedef bool (*tsc_accessor_setter_t)(void* env, tsc_value_t receiver, tsc_value_t value);
typedef tsc_value_t (*tsc_generic_function_t)(void* env, tsc_value_t this_arg, tsc_array_t* args);
typedef void (*tsc_event_listener_fn_t)(void* env, tsc_event_emitter_t* emitter, tsc_array_t* args);
typedef void (*tsc_event_target_listener_fn_t)(void* env, tsc_event_target_t* target, tsc_event_t* event);

tsc_value_t tsc_value_undefined(void);
tsc_value_t tsc_value_null(void);
tsc_value_t tsc_value_bool(bool b);
tsc_value_t tsc_value_num(double n);
tsc_value_t tsc_value_string(tsc_str_t* s);
tsc_value_t tsc_value_array(tsc_array_t* a);
tsc_value_t tsc_value_object(tsc_object_t* o);
tsc_value_t tsc_value_class(void* ptr);
tsc_value_t tsc_value_promise(tsc_promise_t* p);
tsc_value_t tsc_value_function_generic(tsc_generic_function_t fn, void* env);
tsc_value_t tsc_value_function_generic_arity(tsc_generic_function_t fn, void* env, double length);
tsc_value_t tsc_value_function_generic_named(tsc_generic_function_t fn, void* env, double length, tsc_str_t* name);
tsc_value_t tsc_value_function_closure_named(tsc_generic_function_t fn, void* env, double length, tsc_str_t* name);
tsc_value_t tsc_value_function_builtin_named(tsc_generic_function_t fn, void* env, double length, tsc_str_t* name);
tsc_value_t tsc_abort_controller_new(void);
bool tsc_abort_signal_is_aborted(tsc_value_t signal);
typedef void (*tsc_abort_callback_fn_t)(void* env);
void tsc_abort_signal_add_callback(tsc_value_t signal, tsc_abort_callback_fn_t fn, void* env);
void tsc_abort_signal_add_promise(tsc_value_t signal, tsc_promise_t* promise);
void tsc_abort_signal_add_timeout(tsc_value_t signal, double timeout_id);
void tsc_abort_signal_add_immediate(tsc_value_t signal, double immediate_id);

bool tsc_value_is_truthy(tsc_value_t v);
bool tsc_value_is_constructable(tsc_value_t v);
bool tsc_value_number_is_integer(tsc_value_t v);
bool tsc_value_number_is_finite(tsc_value_t v);
bool tsc_value_number_is_nan(tsc_value_t v);
bool tsc_value_number_is_safe_integer(tsc_value_t v);
double tsc_value_as_num(tsc_value_t v);
bool tsc_value_as_bool(tsc_value_t v);
tsc_str_t* tsc_value_as_string(tsc_value_t v);
tsc_array_t* tsc_value_as_array(tsc_value_t v);
void* tsc_value_as_class(tsc_value_t v);
bool tsc_value_is_promise(tsc_value_t v);
tsc_promise_t* tsc_value_as_promise(tsc_value_t v);
tsc_str_t* tsc_value_to_string(tsc_value_t v);
tsc_str_t* tsc_value_object_to_string_tag(tsc_value_t v);
tsc_str_t* tsc_value_typeof(tsc_value_t v);
tsc_str_t* tsc_value_json_stringify(tsc_value_t v);
tsc_value_t tsc_value_json_stringify_top(tsc_value_t v);
tsc_value_t tsc_structured_clone(tsc_value_t value);
tsc_value_t tsc_value_date(struct tsc_date* d);
tsc_value_t tsc_value_regexp(struct tsc_regexp* r);
tsc_value_t tsc_value_map(struct tsc_map* m);
tsc_value_t tsc_value_set(struct tsc_set* s);
tsc_value_t tsc_value_error(struct tsc_error* e);
tsc_value_t tsc_value_buffer(struct tsc_buffer* b);
tsc_value_t tsc_value_url(struct tsc_url* url);
tsc_value_t tsc_value_url_search_params(struct tsc_url_search_params* params);
tsc_value_t tsc_value_array_buffer(struct tsc_array_buffer* buffer);
tsc_value_t tsc_value_data_view(struct tsc_data_view* view);
tsc_value_t tsc_value_text_encoder(struct tsc_text_encoder* encoder);
tsc_value_t tsc_value_text_decoder(struct tsc_text_decoder* decoder);
bool tsc_util_types_is_date(tsc_value_t v);
bool tsc_util_types_is_regexp(tsc_value_t v);
bool tsc_util_types_is_native_error(tsc_value_t v);
bool tsc_util_types_is_promise(tsc_value_t v);
bool tsc_util_types_is_map(tsc_value_t v);
bool tsc_util_types_is_set(tsc_value_t v);
bool tsc_util_types_is_typed_array(tsc_value_t v);
tsc_value_t tsc_value_apply_function(tsc_value_t fn, tsc_value_t this_arg, tsc_value_t args);
tsc_value_t tsc_value_construct(tsc_value_t target, tsc_value_t args);
tsc_value_t tsc_value_construct_with_new_target(tsc_value_t target, tsc_value_t args, tsc_value_t new_target);
bool tsc_value_is_array(tsc_value_t v);
bool tsc_value_is_object(tsc_value_t v);
bool tsc_value_is_callable(tsc_value_t v);
bool tsc_value_is_nullish(tsc_value_t v);
bool tsc_value_is_undefined(tsc_value_t v);
tsc_value_t tsc_value_get_prop(tsc_value_t v, const tsc_str_t* key);
tsc_value_t tsc_value_get_prop_cached(tsc_value_t v, const tsc_str_t* key, tsc_prop_cache_t* cache);
tsc_value_t tsc_value_get_prop_receiver(tsc_value_t v, const tsc_str_t* key, tsc_value_t receiver);
tsc_value_t tsc_value_get_prop_receiver_cached(tsc_value_t v, const tsc_str_t* key, tsc_value_t receiver, tsc_prop_cache_t* cache);
tsc_value_t tsc_value_get_index(tsc_value_t v, double index);
bool tsc_value_set_index(tsc_value_t v, double index, tsc_value_t value);
bool tsc_value_set_array_own_index(tsc_value_t v, size_t idx, tsc_value_t value);
tsc_value_t tsc_value_get_symbol_prop(tsc_value_t v, tsc_symbol_t* key);
tsc_value_t tsc_value_define_property(tsc_value_t v, tsc_str_t* key, tsc_value_t value);
bool tsc_value_define_property_desc(tsc_value_t v, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable);
bool tsc_value_define_symbol_property_desc(tsc_value_t v, tsc_symbol_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable);
bool tsc_value_define_property_descriptor(tsc_value_t v, tsc_str_t* key, tsc_value_t desc);
bool tsc_value_define_properties_descriptor_map(tsc_value_t v, tsc_value_t descriptors);
bool tsc_value_define_accessor_desc(tsc_value_t v, tsc_str_t* key, tsc_accessor_getter_t getter, void* getter_env, bool has_getter, tsc_accessor_setter_t setter, void* setter_env, bool has_setter, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable);
bool tsc_value_object_define_getter(tsc_value_t v, tsc_str_t* key, tsc_value_t getter);
bool tsc_value_object_define_setter(tsc_value_t v, tsc_str_t* key, tsc_value_t setter);
tsc_value_t tsc_value_object_lookup_getter(tsc_value_t v, tsc_str_t* key);
tsc_value_t tsc_value_object_lookup_setter(tsc_value_t v, tsc_str_t* key);
bool tsc_reflect_define_property_desc(tsc_value_t v, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable);
bool tsc_reflect_define_symbol_property_desc(tsc_value_t v, tsc_symbol_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable);
bool tsc_reflect_define_property_descriptor(tsc_value_t v, tsc_str_t* key, tsc_value_t desc);
bool tsc_reflect_define_accessor_desc(tsc_value_t v, tsc_str_t* key, tsc_accessor_getter_t getter, void* getter_env, bool has_getter, tsc_accessor_setter_t setter, void* setter_env, bool has_setter, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable);
tsc_value_t tsc_value_object_create(tsc_value_t prototype);
bool tsc_value_is_prototype_of(tsc_value_t prototype, tsc_value_t object);
tsc_value_t tsc_value_get_prototype_of(tsc_value_t v);
tsc_value_t tsc_value_object_prototype(void);
tsc_value_t tsc_value_number_prototype(void);
tsc_value_t tsc_value_boolean_prototype(void);
tsc_value_t tsc_value_string_prototype(void);
tsc_value_t tsc_value_bigint_prototype(void);
tsc_value_t tsc_value_symbol_prototype(void);
tsc_value_t tsc_value_object_get_prototype_of(tsc_value_t v);
bool tsc_value_set_prototype_of(tsc_value_t v, tsc_value_t prototype);
void tsc_value_object_require_valid_prototype(tsc_value_t prototype);
bool tsc_value_object_set_prototype_of(tsc_value_t v, tsc_value_t prototype);
tsc_value_t tsc_reflect_get_prototype_of(tsc_value_t v);
bool tsc_reflect_set_prototype_of(tsc_value_t v, tsc_value_t prototype);
bool tsc_value_set_prop(tsc_value_t v, tsc_str_t* key, tsc_value_t value);
bool tsc_value_set_symbol_prop(tsc_value_t v, tsc_symbol_t* key, tsc_value_t value);
bool tsc_value_set_prop_cached(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_prop_cache_t* cache);
bool tsc_value_set_prop_receiver(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver);
bool tsc_value_set_prop_receiver_cached(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver, tsc_prop_cache_t* cache);
tsc_value_t tsc_reflect_get_prop(tsc_value_t v, const tsc_str_t* key);
tsc_value_t tsc_reflect_get_prop_cached(tsc_value_t v, const tsc_str_t* key, tsc_prop_cache_t* cache);
tsc_value_t tsc_reflect_get_prop_receiver(tsc_value_t v, const tsc_str_t* key, tsc_value_t receiver);
tsc_value_t tsc_reflect_get_prop_receiver_cached(tsc_value_t v, const tsc_str_t* key, tsc_value_t receiver, tsc_prop_cache_t* cache);
bool tsc_reflect_set_prop(tsc_value_t v, tsc_str_t* key, tsc_value_t value);
bool tsc_reflect_set_symbol_prop(tsc_value_t v, tsc_symbol_t* key, tsc_value_t value);
bool tsc_reflect_set_prop_cached(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_prop_cache_t* cache);
bool tsc_reflect_set_prop_receiver(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver);
bool tsc_reflect_set_prop_receiver_cached(tsc_value_t v, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver, tsc_prop_cache_t* cache);
bool tsc_value_has_own_prop(tsc_value_t v, const tsc_str_t* key);
bool tsc_value_has_own_symbol_prop(tsc_value_t v, tsc_symbol_t* key);
bool tsc_value_property_is_enumerable(tsc_value_t v, const tsc_str_t* key);
bool tsc_value_symbol_property_is_enumerable(tsc_value_t v, tsc_symbol_t* key);
bool tsc_value_has_prop(tsc_value_t v, const tsc_str_t* key);
bool tsc_value_has_symbol_prop(tsc_value_t v, tsc_symbol_t* key);
bool tsc_value_has_prop_cached(tsc_value_t v, const tsc_str_t* key, tsc_prop_cache_t* cache);
bool tsc_value_delete_prop(tsc_value_t v, tsc_str_t* key);
bool tsc_value_delete_symbol_prop(tsc_value_t v, tsc_symbol_t* key);
bool tsc_reflect_has_prop(tsc_value_t v, const tsc_str_t* key);
bool tsc_reflect_has_symbol_prop(tsc_value_t v, tsc_symbol_t* key);
bool tsc_reflect_has_prop_cached(tsc_value_t v, const tsc_str_t* key, tsc_prop_cache_t* cache);
bool tsc_reflect_delete_prop(tsc_value_t v, tsc_str_t* key);
bool tsc_reflect_delete_symbol_prop(tsc_value_t v, tsc_symbol_t* key);
bool tsc_value_is_extensible(tsc_value_t v);
bool tsc_value_prevent_extensions(tsc_value_t v);
bool tsc_reflect_is_extensible(tsc_value_t v);
bool tsc_reflect_prevent_extensions(tsc_value_t v);
bool tsc_value_seal(tsc_value_t v);
bool tsc_value_freeze(tsc_value_t v);
bool tsc_value_is_sealed(tsc_value_t v);
bool tsc_value_is_frozen(tsc_value_t v);
tsc_array_t* tsc_value_own_keys(tsc_value_t v);
tsc_array_t* tsc_value_get_own_property_symbols(tsc_value_t v);
tsc_value_t tsc_value_get_own_property_descriptor(tsc_value_t v, tsc_str_t* key);
tsc_value_t tsc_value_get_own_property_symbol_descriptor(tsc_value_t v, tsc_symbol_t* key);
tsc_array_t* tsc_reflect_own_keys(tsc_value_t v);
tsc_value_t tsc_reflect_get_own_property_descriptor(tsc_value_t v, tsc_str_t* key);
tsc_value_t tsc_reflect_get_own_property_symbol_descriptor(tsc_value_t v, tsc_symbol_t* key);
tsc_value_t tsc_value_get_own_property_descriptors(tsc_value_t v);
tsc_value_t tsc_value_object_assign(tsc_value_t target, tsc_value_t source);
double tsc_value_length(tsc_value_t v);
tsc_array_t* value_array_keys(const tsc_array_t* src, bool include_length);
tsc_array_t* tsc_value_iter_values(tsc_value_t v);
tsc_value_t tsc_value_symbol_iterator(tsc_value_t v);
tsc_value_t tsc_value_symbol_iterator_method(tsc_value_t v);
tsc_value_t tsc_value_symbol_iterator_method_value(void);
tsc_value_t tsc_value_symbol_unscopables(tsc_value_t v);
tsc_array_t* tsc_value_array_from_values(tsc_value_t v);
tsc_array_t* tsc_value_collection_constructor_values(tsc_value_t v);
struct tsc_map* tsc_value_map_constructor_entries(tsc_value_t entries);
bool tsc_value_is_weak_key(tsc_value_t v);
struct tsc_map* tsc_value_weak_map_constructor_entries(tsc_value_t entries);
struct tsc_set* tsc_value_weak_set_constructor_values(tsc_value_t values);
tsc_array_t* tsc_value_object_keys(tsc_value_t v);
tsc_array_t* tsc_value_object_values(tsc_value_t v);
tsc_array_t* tsc_value_object_entries(tsc_value_t v);
tsc_value_t tsc_value_object_from_entries(tsc_value_t entries);

tsc_promise_t* tsc_promise_resolve(tsc_value_t value);
tsc_promise_t* tsc_promise_resolve_fs_stats(tsc_fs_stats_t* value);
tsc_promise_t* tsc_promise_resolve_buffer(tsc_buffer_t* value);
tsc_promise_t* tsc_promise_resolve_array(tsc_array_t* value);
tsc_promise_t* tsc_promise_resolve_thenable(tsc_value_t value);
tsc_value_t tsc_async_iterator_get(tsc_value_t value);
tsc_promise_t* tsc_async_iterator_next(tsc_value_t iterator);
tsc_promise_t* tsc_async_iterator_return(tsc_value_t iterator);
tsc_promise_t* tsc_promise_all_dynamic(tsc_array_t* src);
tsc_promise_t* tsc_promise_race_dynamic(tsc_array_t* src);
tsc_promise_t* tsc_promise_any_dynamic(tsc_array_t* src);
tsc_promise_t* tsc_promise_all_settled_dynamic(tsc_array_t* src);
tsc_value_t tsc_promise_get_method(tsc_promise_t* promise, const tsc_str_t* key);
tsc_promise_t* tsc_promise_reject(tsc_value_t reason);
tsc_promise_t* tsc_promise_pending(void);
tsc_value_t tsc_promise_with_resolvers(void);
tsc_promise_t* tsc_promise_adopt(tsc_promise_t* promise);
void tsc_promise_fulfill_in_place(tsc_promise_t* p, tsc_value_t value);
void tsc_promise_fulfill_in_place_ptr(tsc_promise_t* p, void* ptr_result);
void tsc_promise_reject_in_place(tsc_promise_t* p, tsc_value_t reason);
void tsc_promise_adopt_into(tsc_promise_t* dest, tsc_promise_t* source);
void tsc_promise_add_callback(tsc_promise_t* p, void (*fn)(void*), void* env);
bool tsc_promise_is_fulfilled(const tsc_promise_t* p);
bool tsc_promise_is_rejected(const tsc_promise_t* p);
bool tsc_promise_is_pending(const tsc_promise_t* p);
tsc_value_t tsc_promise_value(const tsc_promise_t* p);
tsc_fs_stats_t* tsc_promise_fs_stats_value(const tsc_promise_t* p);
tsc_buffer_t* tsc_promise_buffer_value(const tsc_promise_t* p);
tsc_array_t* tsc_promise_array_value(const tsc_promise_t* p);
tsc_value_t tsc_promise_reason(const tsc_promise_t* p);

tsc_event_emitter_t* tsc_event_emitter_new(void);
void tsc_event_emitter_on(tsc_event_emitter_t* ee, tsc_str_t* event, tsc_event_listener_fn_t fn, void* env, void* identity, bool once, bool prepend);
void tsc_event_emitter_off(tsc_event_emitter_t* ee, const tsc_str_t* event, tsc_event_listener_fn_t fn, void* identity);
void tsc_event_emitter_remove_all(tsc_event_emitter_t* ee, const tsc_str_t* event);
bool tsc_event_emitter_emit(tsc_event_emitter_t* ee, const tsc_str_t* event, tsc_array_t* args);
double tsc_event_emitter_listener_count(const tsc_event_emitter_t* ee, const tsc_str_t* event);
double tsc_event_emitter_listener_count_identity(const tsc_event_emitter_t* ee, const tsc_str_t* event, void* identity);
tsc_array_t* tsc_event_emitter_listeners(const tsc_event_emitter_t* ee, const tsc_str_t* event);
tsc_array_t* tsc_event_emitter_raw_listeners(const tsc_event_emitter_t* ee, const tsc_str_t* event);
tsc_array_t* tsc_event_emitter_event_names(const tsc_event_emitter_t* ee);
void tsc_event_emitter_pause(tsc_event_emitter_t* ee);
void tsc_event_emitter_resume(tsc_event_emitter_t* ee);
bool tsc_event_emitter_is_paused(const tsc_event_emitter_t* ee);
tsc_promise_t* tsc_event_emitter_once_promise(tsc_event_emitter_t* ee, tsc_str_t* event, tsc_value_t signal);
tsc_value_t tsc_event_emitter_on_async_iterator(tsc_event_emitter_t* ee, tsc_str_t* event, tsc_value_t signal, tsc_array_t* close_events, double high_water_mark, double low_water_mark);
double tsc_event_emitter_get_default_max_listeners(void);
void tsc_event_emitter_set_default_max_listeners(double n);
void tsc_event_emitter_set_max_listeners(tsc_event_emitter_t* ee, double n);
double tsc_event_emitter_get_max_listeners(const tsc_event_emitter_t* ee);

tsc_event_t* tsc_event_new(tsc_str_t* type, bool cancelable);
tsc_str_t* tsc_event_type(const tsc_event_t* event);
tsc_event_target_t* tsc_event_target(const tsc_event_t* event);
tsc_event_target_t* tsc_event_current_target(const tsc_event_t* event);
bool tsc_event_default_prevented(const tsc_event_t* event);
bool tsc_event_cancelable(const tsc_event_t* event);
void tsc_event_prevent_default(tsc_event_t* event);
tsc_event_target_t* tsc_event_target_new(void);
void tsc_event_target_add(tsc_event_target_t* target, tsc_str_t* type, tsc_event_target_listener_fn_t fn, void* env, void* identity, bool once);
void tsc_event_target_remove(tsc_event_target_t* target, const tsc_str_t* type, tsc_event_target_listener_fn_t fn, void* identity);
bool tsc_event_target_dispatch(tsc_event_target_t* target, tsc_event_t* event);

struct tsc_dns_lookup_result {
    tsc_str_t* error;
    tsc_str_t* address;
    double family;
};
struct tsc_dns_lookup_all_result {
    tsc_str_t* error;
    tsc_array_t* addresses;
};
struct tsc_dns_resolve4_result {
    tsc_str_t* error;
    tsc_array_t* addresses;
};
struct tsc_dns_resolve6_result {
    tsc_str_t* error;
    tsc_array_t* addresses;
};
struct tsc_dns_lookup_service_result {
    tsc_str_t* error;
    tsc_str_t* hostname;
    tsc_str_t* service;
};
tsc_dns_lookup_result_t tsc_dns_lookup(tsc_str_t* hostname, double family, double hints, double order);
tsc_dns_lookup_all_result_t tsc_dns_lookup_all(tsc_str_t* hostname, double family, double hints, double order);
tsc_dns_resolve4_result_t tsc_dns_resolve4(tsc_str_t* hostname);
tsc_dns_resolve6_result_t tsc_dns_resolve6(tsc_str_t* hostname);
tsc_dns_lookup_service_result_t tsc_dns_lookup_service(tsc_str_t* address, double port);
tsc_str_t* tsc_dns_get_default_result_order(void);
void tsc_dns_set_default_result_order(tsc_str_t* order);
double tsc_net_is_ip(tsc_str_t* input);
bool tsc_net_is_ipv4(tsc_str_t* input);
bool tsc_net_is_ipv6(tsc_str_t* input);
tsc_value_t tsc_net_socket_address_new(tsc_value_t options);
tsc_value_t tsc_net_socket_address_parse(tsc_str_t* input);

tsc_value_t tsc_value_add(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_sub(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_mul(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_div(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_mod(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_pow(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_pos(tsc_value_t v);
tsc_value_t tsc_value_neg(tsc_value_t v);
tsc_value_t tsc_value_bit_not(tsc_value_t v);
tsc_value_t tsc_value_bit_and(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_bit_or(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_bit_xor(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_shl(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_shr(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_ushr(tsc_value_t a, tsc_value_t b);
bool tsc_value_eq(tsc_value_t a, tsc_value_t b);
bool tsc_value_object_is(tsc_value_t a, tsc_value_t b);
int tsc_value_cmp(tsc_value_t a, tsc_value_t b);
tsc_value_t tsc_value_method_char_at(tsc_value_t recv, tsc_value_t index);
tsc_value_t tsc_value_method_char_code_at(tsc_value_t recv, tsc_value_t index);
tsc_value_t tsc_value_method_code_point_at(tsc_value_t recv, tsc_value_t index);
tsc_value_t tsc_value_method_includes(tsc_value_t recv, tsc_value_t needle, tsc_value_t position);
tsc_value_t tsc_value_method_index_of(tsc_value_t recv, tsc_value_t needle, tsc_value_t position);
tsc_value_t tsc_value_method_last_index_of(tsc_value_t recv, tsc_value_t needle, tsc_value_t position);
tsc_value_t tsc_value_method_at(tsc_value_t recv, tsc_value_t index);
tsc_value_t tsc_value_method_locale_compare(tsc_value_t recv, tsc_value_t other);
tsc_value_t tsc_value_method_join(tsc_value_t recv, tsc_value_t separator);
tsc_value_t tsc_value_method_pop(tsc_value_t recv);
tsc_value_t tsc_value_method_push_empty(tsc_value_t recv);
tsc_value_t tsc_value_method_push(tsc_value_t recv, tsc_value_t value);
tsc_value_t tsc_value_method_shift(tsc_value_t recv);
tsc_value_t tsc_value_method_unshift_empty(tsc_value_t recv);
tsc_value_t tsc_value_method_unshift(tsc_value_t recv, tsc_value_t value);
tsc_value_t tsc_value_method_concat(tsc_value_t recv, tsc_value_t value);
tsc_value_t tsc_value_method_concat_empty(tsc_value_t recv);
tsc_value_t tsc_value_method_flat(tsc_value_t recv, tsc_value_t depth);
tsc_value_t tsc_value_method_fill(tsc_value_t recv, tsc_value_t value, tsc_value_t start, tsc_value_t end);
tsc_value_t tsc_value_method_copy_within(tsc_value_t recv, tsc_value_t target, tsc_value_t start, tsc_value_t end);
tsc_value_t tsc_value_method_splice(tsc_value_t recv, tsc_value_t start, tsc_value_t delete_count, int argc, tsc_array_t* items);
tsc_value_t tsc_value_method_sort(tsc_value_t recv, tsc_value_t compare_fn);
tsc_value_t tsc_value_method_to_sorted(tsc_value_t recv, tsc_value_t compare_fn);
tsc_value_t tsc_value_method_with(tsc_value_t recv, tsc_value_t index, tsc_value_t value);
tsc_value_t tsc_value_method_to_spliced(tsc_value_t recv, tsc_value_t start, tsc_value_t delete_count, int argc, tsc_array_t* items);
void tsc_value_array_push_flat(tsc_array_t* out, tsc_value_t value);
tsc_value_t tsc_value_method_reverse(tsc_value_t recv);
tsc_value_t tsc_value_method_to_reversed(tsc_value_t recv);
tsc_value_t tsc_value_method_slice(tsc_value_t recv, tsc_value_t start, tsc_value_t end);
tsc_value_t tsc_value_method_keys(tsc_value_t recv);
tsc_value_t tsc_value_method_values(tsc_value_t recv);
tsc_value_t tsc_value_method_entries(tsc_value_t recv);
tsc_value_t tsc_value_method_substring(tsc_value_t recv, tsc_value_t start, tsc_value_t end);
tsc_value_t tsc_value_method_substr(tsc_value_t recv, tsc_value_t start, tsc_value_t length);
tsc_value_t tsc_value_method_replace(tsc_value_t recv, tsc_value_t search, tsc_value_t replacement);
tsc_value_t tsc_value_method_replace_all(tsc_value_t recv, tsc_value_t search, tsc_value_t replacement);
tsc_value_t tsc_value_method_split(tsc_value_t recv, tsc_value_t separator, tsc_value_t limit);
tsc_value_t tsc_value_method_split_regex(tsc_value_t recv, const tsc_regexp_t* re, tsc_value_t limit);
tsc_value_t tsc_value_method_match_regex(tsc_value_t recv, const tsc_regexp_t* re);
tsc_value_t tsc_value_method_match_all_regex(tsc_value_t recv, const tsc_regexp_t* re);
tsc_value_t tsc_value_method_starts_with(tsc_value_t recv, tsc_value_t needle, tsc_value_t position);
tsc_value_t tsc_value_method_ends_with(tsc_value_t recv, tsc_value_t needle, tsc_value_t end_position);
tsc_str_t* tsc_value_method_to_string(tsc_value_t recv, tsc_value_t radix);
tsc_str_t* tsc_value_method_to_locale_string(tsc_value_t recv);
tsc_str_t* tsc_value_method_to_locale_string_args(tsc_value_t recv, tsc_array_t* args);
tsc_value_t tsc_value_method_value_of(tsc_value_t recv);
tsc_str_t* tsc_value_method_to_fixed(tsc_value_t recv, tsc_value_t fraction_digits);
tsc_str_t* tsc_value_method_to_exponential(tsc_value_t recv, tsc_value_t fraction_digits);
tsc_str_t* tsc_value_method_to_precision(tsc_value_t recv, tsc_value_t precision);
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
tsc_object_t* tsc_object_new_class(void* ptr);
bool tsc_object_set(tsc_object_t* o, tsc_str_t* key, tsc_value_t value);
bool tsc_object_set_receiver(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver);
bool tsc_object_define(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, bool writable, bool enumerable, bool configurable);
bool tsc_object_define_accessor(tsc_object_t* o, tsc_str_t* key, tsc_accessor_getter_t getter, void* getter_env, bool has_getter, tsc_accessor_setter_t setter, void* setter_env, bool has_setter, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable);
tsc_value_t tsc_object_get_prototype_of(const tsc_object_t* o);
bool tsc_object_set_prototype_of(tsc_object_t* o, tsc_value_t prototype);
bool tsc_object_is_prototype_of(const tsc_object_t* prototype, const tsc_object_t* object);
tsc_value_t tsc_object_get(const tsc_object_t* o, const tsc_str_t* key);
tsc_value_t tsc_object_get_receiver(const tsc_object_t* o, const tsc_str_t* key, tsc_value_t receiver);
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
    double key_num;
    bool key_boolean;
    void* key_ptr;
    double num;
    bool boolean;
    void* ptr;
} tsc_object_entry_t;

/* ------------- Map / Set (open-addressed hash + insertion-order array) ------------- */
typedef enum {
    TSC_KEY_NUM = 0,
    TSC_KEY_STR = 1,
    TSC_KEY_PTR = 2,
    TSC_KEY_BOOL = 3,
    TSC_KEY_VALUE = 4,
} tsc_key_kind_t;

typedef struct tsc_map {
    size_t ks, vs;
    tsc_key_kind_t kk;
    size_t len, cap;          /* ordered (insertion-order) keys/values arrays */
    void* keys;
    void* values;
    size_t* buckets;          /* power-of-2-sized open-addressing index table */
    size_t bucket_cap;        /* always a power of 2 (or 0 before first insert) */
} tsc_map_t;

tsc_map_t* tsc_map_new(size_t ks, size_t vs, int kk, size_t initial_cap);
void tsc_map_set_raw(tsc_map_t* m, const void* k, const void* v);
void tsc_map_set_str_num(tsc_map_t* m, tsc_str_t* k, double v);
bool tsc_map_get_raw(const tsc_map_t* m, const void* k, void* out);
double tsc_map_get_str_num(const tsc_map_t* m, tsc_str_t* k, double fallback);
bool tsc_map_has_raw(const tsc_map_t* m, const void* k);
bool tsc_map_has_str(const tsc_map_t* m, tsc_str_t* k);
bool tsc_map_delete_raw(tsc_map_t* m, const void* k);
void tsc_map_clear(tsc_map_t* m);
double tsc_map_size(const tsc_map_t* m);
struct tsc_array* tsc_map_keys(const tsc_map_t* m);
struct tsc_array* tsc_map_values(const tsc_map_t* m);

typedef struct tsc_set {
    size_t es;
    tsc_key_kind_t kk;
    size_t len, cap;          /* ordered (insertion-order) data array */
    void* data;
    size_t* buckets;          /* power-of-2-sized open-addressing index table */
    size_t bucket_cap;
} tsc_set_t;

tsc_map_t* tsc_value_as_map(tsc_value_t v);
tsc_set_t* tsc_value_as_set(tsc_value_t v);
tsc_date_t* tsc_value_as_date(tsc_value_t v);
tsc_regexp_t* tsc_value_as_regexp(tsc_value_t v);
tsc_error_t* tsc_value_as_error(tsc_value_t v);
tsc_buffer_t* tsc_value_as_buffer(tsc_value_t v);
tsc_url_t* tsc_value_as_url(tsc_value_t v);
tsc_url_search_params_t* tsc_value_as_url_search_params(tsc_value_t v);
tsc_array_buffer_t* tsc_value_as_array_buffer(tsc_value_t v);
tsc_data_view_t* tsc_value_as_data_view(tsc_value_t v);
tsc_text_encoder_t* tsc_value_as_text_encoder(tsc_value_t v);
tsc_text_decoder_t* tsc_value_as_text_decoder(tsc_value_t v);

tsc_set_t* tsc_set_new(size_t es, int kk, size_t initial_cap);
void tsc_set_add_raw(tsc_set_t* s, const void* v);
void tsc_set_add_int(tsc_set_t* s, int64_t v);
void tsc_set_add_num(tsc_set_t* s, double v);
bool tsc_set_has_raw(const tsc_set_t* s, const void* v);
bool tsc_set_has_int(const tsc_set_t* s, int64_t v);
bool tsc_set_has_num(const tsc_set_t* s, double v);
bool tsc_set_delete_raw(tsc_set_t* s, const void* v);
void tsc_set_clear(tsc_set_t* s);
double tsc_set_size(const tsc_set_t* s);
struct tsc_array* tsc_set_values(const tsc_set_t* s);
/* Set composition helpers — both operands must be Set<T> with matching es/kk. */
tsc_set_t* tsc_set_union(const tsc_set_t* a, const tsc_set_t* b);
tsc_set_t* tsc_set_intersection(const tsc_set_t* a, const tsc_set_t* b);
tsc_set_t* tsc_set_difference(const tsc_set_t* a, const tsc_set_t* b);
tsc_set_t* tsc_set_symmetric_difference(const tsc_set_t* a, const tsc_set_t* b);
bool tsc_set_is_subset_of(const tsc_set_t* a, const tsc_set_t* b);
bool tsc_set_is_superset_of(const tsc_set_t* a, const tsc_set_t* b);
bool tsc_set_is_disjoint_from(const tsc_set_t* a, const tsc_set_t* b);

/* ------------- console ------------- */
void tsc_console_log_n(size_t n, ...);
void tsc_console_error_n(size_t n, ...);
tsc_str_t* tsc_util_format_n(size_t n, ...);
bool tsc_instanceof(const char* type_chain, const char* class_name);

/* ------------- process ------------- */
typedef void (*tsc_next_tick_fn_t)(void* env);
typedef void (*tsc_microtask_fn_t)(void* env);
typedef void (*tsc_immediate_fn_t)(void* env);
typedef void (*tsc_timeout_fn_t)(void* env);
void tsc_process_exit(double code);
extern int tsc_argc;
extern char** tsc_argv;
tsc_array_t* tsc_process_argv(void);
tsc_str_t* tsc_process_argv0(void);
tsc_array_t* tsc_process_exec_argv(void);
tsc_set_t* tsc_process_allowed_node_environment_flags(void);
tsc_str_t* tsc_process_version(void);
tsc_value_t tsc_process_versions(void);
tsc_value_t tsc_process_release(void);
tsc_value_t tsc_process_features(void);
tsc_str_t* tsc_process_env_get(const tsc_str_t* name);
void tsc_process_env_set(const tsc_str_t* name, const tsc_str_t* value);
bool tsc_process_env_unset(const tsc_str_t* name);
tsc_str_t* tsc_process_cwd(void);
void tsc_process_chdir(const tsc_str_t* directory);
double tsc_process_pid(void);
double tsc_process_ppid(void);
double tsc_process_getuid(void);
double tsc_process_getgid(void);
double tsc_process_geteuid(void);
double tsc_process_getegid(void);
tsc_array_t* tsc_process_getgroups(void);
double tsc_process_umask_get(void);
double tsc_process_umask_set(double mask);
double tsc_process_uptime(void);
tsc_value_t tsc_process_memory_usage(void);
double tsc_process_memory_usage_rss(void);
tsc_value_t tsc_process_cpu_usage(void);
tsc_value_t tsc_process_cpu_usage_diff(tsc_value_t previous);
tsc_value_t tsc_process_resource_usage(void);
bool tsc_process_kill(double pid, double signal);
int tsc_posix_signal_number(const tsc_str_t* signal);
tsc_array_t* tsc_process_hrtime(tsc_array_t* previous);
tsc_bigint_t* tsc_process_hrtime_bigint(void);
bool tsc_process_stdout_write(const tsc_str_t* data);
bool tsc_process_stderr_write(const tsc_str_t* data);
bool tsc_process_stdout_write_buffer(const tsc_buffer_t* data);
bool tsc_process_stderr_write_buffer(const tsc_buffer_t* data);
void tsc_process_stdout_end(void);
void tsc_process_stderr_end(void);
bool tsc_process_stdout_writable_ended(void);
bool tsc_process_stderr_writable_ended(void);
bool tsc_process_stdio_is_tty(int fd);
double tsc_process_stdio_columns(int fd);
double tsc_process_stdio_rows(int fd);
void tsc_process_next_tick(tsc_next_tick_fn_t fn, void* env);
void tsc_process_drain_next_ticks(void);
void tsc_queue_microtask(tsc_microtask_fn_t fn, void* env);
void tsc_drain_microtasks(void);
void tsc_drain_microtasks_and_next_ticks(void);
double tsc_set_immediate(tsc_immediate_fn_t fn, void* env);
void tsc_clear_immediate(double id);
void tsc_drain_immediates(void);
double tsc_set_timeout(tsc_timeout_fn_t fn, void* env, double delay);
double tsc_set_interval(tsc_timeout_fn_t fn, void* env, double delay);
void tsc_clear_timeout(double id);
void tsc_drain_timeouts(void);
void tsc_run_event_loop(void);
bool tsc_fs_libuv_pending(void);
void tsc_fs_libuv_run_once(bool block);

/* ---------------- optional dispatch concurrency (TSC_THREADS) ----------------
 * Implemented in tsc_dispatch.c, which is compiled into the program only when
 * the emitter saw a dispatch API use. The lock/cross-post hooks below live in
 * tsc_core.c and are no-ops (or unreachable) in single-threaded builds. */
typedef struct tsc_dispatch_queue tsc_dispatch_queue_t;
typedef tsc_value_t (*tsc_dispatch_task_fn_t)(void* env);
tsc_dispatch_queue_t* tsc_dispatch_queue_serial(tsc_str_t* label);
tsc_dispatch_queue_t* tsc_dispatch_queue_concurrent(void);
tsc_promise_t* tsc_dispatch_async(tsc_dispatch_queue_t* q, tsc_dispatch_task_fn_t fn, void* env);
tsc_promise_t* tsc_dispatch_after(tsc_dispatch_queue_t* q, tsc_dispatch_task_fn_t fn, void* env, double delay_ms);
tsc_promise_t* tsc_dispatch_barrier(tsc_dispatch_queue_t* q, tsc_dispatch_task_fn_t fn, void* env);
tsc_value_t tsc_dispatch_sync(tsc_dispatch_queue_t* q, tsc_dispatch_task_fn_t fn, void* env);

/* Global recursive lock serializing rare runtime slow paths (shape
 * transitions, lazy singleton init, the Symbol registry) when TSC_THREADS. */
void tsc_runtime_lock(void);
void tsc_runtime_unlock(void);
/* True on the thread that ran tsc_bootstrap. Always true without TSC_THREADS. */
bool tsc_is_main_thread(void);
/* Post promise settlement from a worker thread to the main event loop. */
void tsc_cross_post_settle(tsc_promise_t* p, tsc_value_t value, bool is_error);
/* Bump/drop the count of dispatch tasks the event loop must wait for. */
void tsc_dispatch_task_scheduled(void);

/* ------------- fs (sync and bounded async subset) ------------- */
tsc_str_t* tsc_fs_read_file_sync(const tsc_str_t* path);
tsc_buffer_t* tsc_fs_read_file_buffer_sync(const tsc_str_t* path);
tsc_promise_t* tsc_fs_promises_read_file_async(const tsc_str_t* path, bool want_buffer, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_read_file_encoded_async(const tsc_str_t* path, tsc_str_t* encoding, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_open_async(const tsc_str_t* path, const tsc_str_t* flags_str, double flags_num, bool flags_is_num, double mode);
tsc_promise_t* tsc_fs_promises_write_file_string_async(const tsc_str_t* path, const tsc_str_t* data, bool append, bool exclusive, bool update, double file_mode, bool flush, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_write_file_buffer_async(const tsc_str_t* path, const tsc_buffer_t* data, bool append, bool exclusive, bool update, double file_mode, bool flush, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_readdir_async(const tsc_str_t* path, bool want_buffer, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_readdir_recursive_async(const tsc_str_t* path, bool want_buffer, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_readdir_encoded_async(const tsc_str_t* path, tsc_str_t* encoding, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_readdir_recursive_encoded_async(const tsc_str_t* path, tsc_str_t* encoding, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_readdir_dirents_async(const tsc_str_t* path, tsc_str_t* encoding, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_readdir_recursive_dirents_async(const tsc_str_t* path, tsc_str_t* encoding, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_access_async(const tsc_str_t* path, double mode, tsc_value_t signal);
void tsc_fs_write_file_sync(const tsc_str_t* path, const tsc_str_t* data);
void tsc_fs_write_file_buffer_sync(const tsc_str_t* path, const tsc_buffer_t* data);
void tsc_fs_write_file_sync_opts(const tsc_str_t* path, const tsc_str_t* data, bool append, bool exclusive);
void tsc_fs_write_file_buffer_sync_opts(const tsc_str_t* path, const tsc_buffer_t* data, bool append, bool exclusive);
void tsc_fs_write_file_sync_opts_mode(const tsc_str_t* path, const tsc_str_t* data, bool append, bool exclusive, bool update, double mode, bool flush);
void tsc_fs_write_file_buffer_sync_opts_mode(const tsc_str_t* path, const tsc_buffer_t* data, bool append, bool exclusive, bool update, double mode, bool flush);
void tsc_fs_append_file_sync(const tsc_str_t* path, const tsc_str_t* data);
void tsc_fs_append_file_buffer_sync(const tsc_str_t* path, const tsc_buffer_t* data);
bool tsc_fs_exists_sync(const tsc_str_t* path);
tsc_array_t* tsc_fs_readdir_sync(const tsc_str_t* path);
tsc_array_t* tsc_fs_readdir_buffer_sync(const tsc_str_t* path);
tsc_array_t* tsc_fs_readdir_recursive_sync(const tsc_str_t* path);
tsc_array_t* tsc_fs_readdir_recursive_buffer_sync(const tsc_str_t* path);
tsc_array_t* tsc_fs_readdir_dirents_sync(const tsc_str_t* path);
tsc_array_t* tsc_fs_readdir_recursive_dirents_sync(const tsc_str_t* path);
tsc_array_t* tsc_fs_readdir_encode_names(tsc_array_t* entries, const tsc_str_t* encoding);
tsc_array_t* tsc_fs_dirents_encode_names(tsc_array_t* entries, const tsc_str_t* encoding);
tsc_fs_stats_t* tsc_fs_stat_sync(const tsc_str_t* path);
tsc_fs_stats_t* tsc_fs_stat_sync_no_throw(const tsc_str_t* path);
tsc_promise_t* tsc_fs_promises_stat_async(const tsc_str_t* path, bool throw_if_no_entry, tsc_value_t signal);
tsc_fs_stats_t* tsc_fs_lstat_sync(const tsc_str_t* path);
tsc_fs_stats_t* tsc_fs_lstat_sync_no_throw(const tsc_str_t* path);
tsc_promise_t* tsc_fs_promises_lstat_async(const tsc_str_t* path, bool throw_if_no_entry, tsc_value_t signal);
tsc_value_t tsc_fs_statfs_sync(const tsc_str_t* path);
tsc_promise_t* tsc_fs_promises_statfs_async(const tsc_str_t* path, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_copy_file_async(const tsc_str_t* src, const tsc_str_t* dest, double mode);
tsc_promise_t* tsc_fs_promises_cp_async(const tsc_str_t* src, const tsc_str_t* dest, bool recursive, bool force, bool error_on_exist, bool dereference, bool verbatim_symlinks, double mode, bool preserve_timestamps);
tsc_promise_t* tsc_fs_promises_rename_async(const tsc_str_t* old_path, const tsc_str_t* new_path);
tsc_promise_t* tsc_fs_promises_symlink_async(const tsc_str_t* target, const tsc_str_t* path);
tsc_promise_t* tsc_fs_promises_link_async(const tsc_str_t* existing_path, const tsc_str_t* new_path);
tsc_promise_t* tsc_fs_promises_utimes_async(const tsc_str_t* path, double atime, double mtime);
tsc_promise_t* tsc_fs_promises_lutimes_async(const tsc_str_t* path, double atime, double mtime);
tsc_promise_t* tsc_fs_promises_chmod_async(const tsc_str_t* path, double mode);
tsc_promise_t* tsc_fs_promises_chown_async(const tsc_str_t* path, double uid, double gid);
tsc_promise_t* tsc_fs_promises_lchown_async(const tsc_str_t* path, double uid, double gid);
tsc_promise_t* tsc_fs_promises_mkdir_async(const tsc_str_t* path, double mode, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_mkdir_recursive_async(const tsc_str_t* path, double mode, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_unlink_async(const tsc_str_t* path);
tsc_promise_t* tsc_fs_promises_rmdir_async(const tsc_str_t* path, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_rmdir_recursive_async(const tsc_str_t* path, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_rm_async(const tsc_str_t* path, bool force, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_rm_recursive_async(const tsc_str_t* path, bool force, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_truncate_async(const tsc_str_t* path, double len);
tsc_promise_t* tsc_fs_promises_realpath_async(const tsc_str_t* path, int encoding, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_readlink_async(const tsc_str_t* path, int encoding, tsc_value_t signal);
tsc_promise_t* tsc_fs_promises_mkdtemp_async(const tsc_str_t* prefix, int encoding, tsc_value_t signal);
tsc_str_t* tsc_fs_realpath_sync(const tsc_str_t* path);
tsc_str_t* tsc_fs_readlink_sync(const tsc_str_t* path);
void tsc_fs_symlink_sync(const tsc_str_t* target, const tsc_str_t* path);
void tsc_fs_link_sync(const tsc_str_t* existing_path, const tsc_str_t* new_path);
tsc_str_t* tsc_fs_mkdtemp_sync(const tsc_str_t* prefix);
void tsc_fs_truncate_sync(const tsc_str_t* path, double len);
void tsc_fs_utimes_sync(const tsc_str_t* path, double atime, double mtime);
void tsc_fs_lutimes_sync(const tsc_str_t* path, double atime, double mtime);
void tsc_fs_chown_sync(const tsc_str_t* path, double uid, double gid);
void tsc_fs_lchown_sync(const tsc_str_t* path, double uid, double gid);
double tsc_fs_stats_dev(const tsc_fs_stats_t* st);
double tsc_fs_stats_ino(const tsc_fs_stats_t* st);
double tsc_fs_stats_size(const tsc_fs_stats_t* st);
double tsc_fs_stats_mode(const tsc_fs_stats_t* st);
double tsc_fs_stats_nlink(const tsc_fs_stats_t* st);
double tsc_fs_stats_uid(const tsc_fs_stats_t* st);
double tsc_fs_stats_gid(const tsc_fs_stats_t* st);
double tsc_fs_stats_rdev(const tsc_fs_stats_t* st);
double tsc_fs_stats_blksize(const tsc_fs_stats_t* st);
double tsc_fs_stats_blocks(const tsc_fs_stats_t* st);
double tsc_fs_stats_atime_ms(const tsc_fs_stats_t* st);
double tsc_fs_stats_mtime_ms(const tsc_fs_stats_t* st);
double tsc_fs_stats_ctime_ms(const tsc_fs_stats_t* st);
double tsc_fs_stats_birthtime_ms(const tsc_fs_stats_t* st);
bool tsc_fs_stats_is_file(const tsc_fs_stats_t* st);
bool tsc_fs_stats_is_directory(const tsc_fs_stats_t* st);
bool tsc_fs_stats_is_symbolic_link(const tsc_fs_stats_t* st);
bool tsc_fs_stats_is_block_device(const tsc_fs_stats_t* st);
bool tsc_fs_stats_is_character_device(const tsc_fs_stats_t* st);
bool tsc_fs_stats_is_fifo(const tsc_fs_stats_t* st);
bool tsc_fs_stats_is_socket(const tsc_fs_stats_t* st);
tsc_str_t* tsc_fs_dirent_name(const tsc_fs_dirent_t* ent);
bool tsc_fs_dirent_is_file(const tsc_fs_dirent_t* ent);
bool tsc_fs_dirent_is_directory(const tsc_fs_dirent_t* ent);
bool tsc_fs_dirent_is_symbolic_link(const tsc_fs_dirent_t* ent);
bool tsc_fs_dirent_is_block_device(const tsc_fs_dirent_t* ent);
bool tsc_fs_dirent_is_character_device(const tsc_fs_dirent_t* ent);
bool tsc_fs_dirent_is_fifo(const tsc_fs_dirent_t* ent);
bool tsc_fs_dirent_is_socket(const tsc_fs_dirent_t* ent);
void tsc_fs_access_sync(const tsc_str_t* path);
void tsc_fs_access_sync_mode(const tsc_str_t* path, double mode);
void tsc_fs_chmod_sync(const tsc_str_t* path, double mode);
double tsc_fs_open_sync(const tsc_str_t* path, const tsc_str_t* flags_str, double flags_num, bool flags_is_num, double mode);
void tsc_fs_close_sync(double fd);
double tsc_fs_read_sync(double fd, tsc_buffer_t* buffer, double offset, double length, double position, bool position_is_null);
double tsc_fs_readv_sync(double fd, const tsc_array_t* buffers, double position, bool position_is_null);
double tsc_fs_write_buffer_sync(double fd, const tsc_buffer_t* buffer, double offset, double length, double position, bool position_is_null);
double tsc_fs_write_string_sync(double fd, const tsc_str_t* str, double position, bool position_is_null);
void tsc_fs_fsync_sync(double fd);
void tsc_fs_fdatasync_sync(double fd);
void tsc_fs_ftruncate_sync(double fd, double len);
double tsc_fs_writev_sync(double fd, const tsc_array_t* buffers, double position, bool position_is_null);
void tsc_fs_mkdir_sync(const tsc_str_t* path);
void tsc_fs_mkdir_sync_opts(const tsc_str_t* path, bool recursive, double mode);
void tsc_fs_unlink_sync(const tsc_str_t* path);
void tsc_fs_rm_sync(const tsc_str_t* path);
void tsc_fs_rm_sync_opts(const tsc_str_t* path, bool recursive, bool force);
void tsc_fs_rmdir_sync(const tsc_str_t* path);
void tsc_fs_rmdir_sync_opts(const tsc_str_t* path, bool recursive);
void tsc_fs_cp_sync_opts(const tsc_str_t* src, const tsc_str_t* dest, bool recursive, bool force, bool error_on_exist, bool dereference, bool verbatim_symlinks, double mode, bool preserve_timestamps);
void tsc_fs_copy_file_sync(const tsc_str_t* src, const tsc_str_t* dest);
void tsc_fs_copy_file_sync_mode(const tsc_str_t* src, const tsc_str_t* dest, double mode);
void tsc_fs_rename_sync(const tsc_str_t* old_path, const tsc_str_t* new_path);

/* ------------- os ------------- */
tsc_str_t* tsc_os_platform(void);
tsc_str_t* tsc_os_type(void);
tsc_str_t* tsc_os_release(void);
tsc_str_t* tsc_os_version(void);
tsc_str_t* tsc_os_endianness(void);
tsc_str_t* tsc_os_machine(void);
tsc_str_t* tsc_os_arch(void);
tsc_str_t* tsc_os_hostname(void);
tsc_str_t* tsc_os_tmpdir(void);
tsc_str_t* tsc_os_homedir(void);
double tsc_os_cpu_count(void);
double tsc_os_available_parallelism(void);
double tsc_os_totalmem(void);
double tsc_os_freemem(void);
double tsc_os_uptime(void);
tsc_array_t* tsc_os_loadavg(void);
tsc_value_t tsc_os_user_info(void);
tsc_value_t tsc_os_user_info_opts(const tsc_str_t* encoding);
tsc_value_t tsc_os_network_interfaces(void);
double tsc_os_get_priority(double pid);
void tsc_os_set_priority(double pid, double priority);
double getPriority(double pid, tsc_array_t* ignore);
void setPriority(double pid, double priority, tsc_array_t* ignore);
double tsc_date_now(void);

/* ------------- path ------------- */
tsc_str_t* tsc_path_join(size_t n, ...);
tsc_str_t* tsc_path_resolve(size_t n, ...);
tsc_str_t* tsc_path_normalize(const tsc_str_t* p);
bool tsc_path_is_absolute(const tsc_str_t* p);
bool tsc_path_matches_glob(const tsc_str_t* path, const tsc_str_t* pattern);
tsc_str_t* tsc_path_relative(const tsc_str_t* from, const tsc_str_t* to);
tsc_str_t* tsc_path_basename(const tsc_str_t* p);
tsc_str_t* tsc_path_basename_suffix(const tsc_str_t* p, const tsc_str_t* suffix);
tsc_str_t* tsc_path_dirname(const tsc_str_t* p);
tsc_str_t* tsc_path_extname(const tsc_str_t* p);
tsc_value_t tsc_path_parse(const tsc_str_t* p);
tsc_str_t* tsc_path_format(tsc_value_t path_object);

tsc_str_t* tsc_path_win32_join(size_t n, ...);
tsc_str_t* tsc_path_win32_resolve(size_t n, ...);
tsc_str_t* tsc_path_win32_normalize(const tsc_str_t* p);
bool tsc_path_win32_is_absolute(const tsc_str_t* p);
tsc_str_t* tsc_path_win32_basename(const tsc_str_t* p);
tsc_str_t* tsc_path_win32_basename_suffix(const tsc_str_t* p, const tsc_str_t* suffix);
tsc_str_t* tsc_path_win32_dirname(const tsc_str_t* p);
tsc_str_t* tsc_path_win32_extname(const tsc_str_t* p);
tsc_value_t tsc_path_win32_parse(const tsc_str_t* p);
tsc_str_t* tsc_path_win32_format(tsc_value_t path_object);
tsc_str_t* tsc_path_win32_relative(const tsc_str_t* from, const tsc_str_t* to);
bool tsc_path_win32_matches_glob(const tsc_str_t* path, const tsc_str_t* pattern);

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

tsc_value_t tsc_proxy_new(tsc_value_t target, tsc_value_t handler);
tsc_value_t tsc_proxy_revocable(tsc_value_t target, tsc_value_t handler);

static inline void tsc_array_push_value(tsc_array_t* a, tsc_value_t v) {
    tsc_array_push_raw(a, &v);
}

#endif /* TSC_RUNTIME_H */
