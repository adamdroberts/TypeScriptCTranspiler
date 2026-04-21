#ifndef TSC_RUNTIME_H
#define TSC_RUNTIME_H

#include <regex.h>
#include <setjmp.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

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
bool tsc_str_eq(const tsc_str_t* a, const tsc_str_t* b);
int tsc_str_cmp(const tsc_str_t* a, const tsc_str_t* b);
double tsc_str_length(const tsc_str_t* s);

tsc_str_t* tsc_str_char_at(const tsc_str_t* s, double idx);
double tsc_str_index_of(const tsc_str_t* h, const tsc_str_t* n);
bool tsc_str_includes(const tsc_str_t* h, const tsc_str_t* n);
bool tsc_str_starts_with(const tsc_str_t* s, const tsc_str_t* p);
bool tsc_str_ends_with(const tsc_str_t* s, const tsc_str_t* p);
tsc_str_t* tsc_str_slice(const tsc_str_t* s, double start, double end);
tsc_str_t* tsc_str_to_upper(const tsc_str_t* s);
tsc_str_t* tsc_str_to_lower(const tsc_str_t* s);
tsc_str_t* tsc_str_trim(const tsc_str_t* s);
tsc_str_t* tsc_str_repeat(const tsc_str_t* s, double n);
tsc_str_t* tsc_str_pad_start(const tsc_str_t* s, double target, const tsc_str_t* pad);
tsc_str_t* tsc_str_pad_end(const tsc_str_t* s, double target, const tsc_str_t* pad);
tsc_str_t* tsc_str_replace(const tsc_str_t* s, const tsc_str_t* search, const tsc_str_t* repl);
tsc_str_t* tsc_str_replace_all(const tsc_str_t* s, const tsc_str_t* search, const tsc_str_t* repl);

struct tsc_array; /* fwd */
struct tsc_array* tsc_str_split(const tsc_str_t* s, const tsc_str_t* sep);

/* ------------- numbers ------------- */
double tsc_num_mod(double a, double b);
double tsc_parse_float(const tsc_str_t* s);
double tsc_parse_int(const tsc_str_t* s, double radix);
double tsc_math_random(void);

/* ------------- RegExp (POSIX ERE-backed) ------------- */
typedef struct tsc_regexp {
    regex_t re;
    tsc_str_t* source;
    tsc_str_t* flags;
    bool global;
    bool ignore_case;
    bool multiline;
    bool compiled;
} tsc_regexp_t;

tsc_regexp_t* tsc_regexp_new(const tsc_str_t* pattern, const tsc_str_t* flags);
bool tsc_regexp_test(const tsc_regexp_t* re, const tsc_str_t* s);
struct tsc_array* tsc_str_match_regex(const tsc_str_t* s, const tsc_regexp_t* re);
tsc_str_t* tsc_str_replace_regex(const tsc_str_t* s, const tsc_regexp_t* re, const tsc_str_t* repl);
struct tsc_array* tsc_str_split_regex(const tsc_str_t* s, const tsc_regexp_t* re);

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
tsc_array_t* tsc_array_slice(const tsc_array_t* a, double start, double end);
tsc_array_t* tsc_array_append(tsc_array_t* dst, const tsc_array_t* src);
double tsc_array_length(const tsc_array_t* a);
void tsc_array_oob(const tsc_array_t* a, double i);

#define TSC_ARR(T, a, i) (((T*)((a)->data))[(size_t)(i)])

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
