#define _POSIX_C_SOURCE 200809L
#define _DEFAULT_SOURCE
#include "tsc_runtime.h"
#include <ctype.h>
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <arpa/inet.h>
#include <libgen.h>
#include <limits.h>
#include <netdb.h>
#include <openssl/evp.h>
#include <openssl/opensslv.h>
#include <openssl/rand.h>
#include <gmp.h>
#include <poll.h>
#include <pwd.h>
#include <signal.h>
#include <sys/resource.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/wait.h>
#if defined(__linux__)
#include <sys/sysinfo.h>
#endif
#include <sys/types.h>
#include <sys/utsname.h>
#include <time.h>
#include <unicode/unorm2.h>
#include <unicode/ustring.h>
#include <unistd.h>

#ifndef PATH_MAX
#  define PATH_MAX 4096
#endif

int tsc_argc;
char** tsc_argv;

#ifdef TSC_NO_GC
typedef struct tsc_no_gc_chunk {
    struct tsc_no_gc_chunk* next;
    size_t cap;
    size_t used;
    unsigned char data[];
} tsc_no_gc_chunk_t;

static tsc_no_gc_chunk_t* tsc_no_gc_chunks = NULL;

void* tsc_no_gc_malloc_uninit(size_t n) {
    const size_t align = sizeof(max_align_t);
    n = (n + align - 1) & ~(align - 1);
    if (!tsc_no_gc_chunks || tsc_no_gc_chunks->used + n > tsc_no_gc_chunks->cap) {
        size_t cap = n > (1u << 20) ? n : (1u << 20);
        tsc_no_gc_chunk_t* chunk = (tsc_no_gc_chunk_t*)malloc(sizeof(tsc_no_gc_chunk_t) + cap);
        if (!chunk) tsc_panic("out of memory");
        chunk->next = tsc_no_gc_chunks;
        chunk->cap = cap;
        chunk->used = 0;
        tsc_no_gc_chunks = chunk;
    }
    void* p = tsc_no_gc_chunks->data + tsc_no_gc_chunks->used;
    tsc_no_gc_chunks->used += n;
    return p;
}
#endif

static tsc_try_frame_t* g_try_top = NULL;
static tsc_str_t* g_current_error = NULL;
static struct timespec g_boot_time;
static bool g_boot_time_set = false;
typedef struct {
    tsc_next_tick_fn_t fn;
    void* env;
} tsc_next_tick_entry_t;
static tsc_next_tick_entry_t* g_next_tick_queue = NULL;
static size_t g_next_tick_len = 0;
static size_t g_next_tick_cap = 0;
typedef struct {
    tsc_microtask_fn_t fn;
    void* env;
} tsc_microtask_entry_t;
static tsc_microtask_entry_t* g_microtask_queue = NULL;
static size_t g_microtask_len = 0;
static size_t g_microtask_cap = 0;
typedef struct {
    tsc_immediate_fn_t fn;
    void* env;
} tsc_immediate_entry_t;
static tsc_immediate_entry_t* g_immediate_queue = NULL;
static size_t g_immediate_len = 0;
static size_t g_immediate_cap = 0;
typedef struct {
    tsc_timeout_fn_t fn;
    void* env;
} tsc_timeout_entry_t;
static tsc_timeout_entry_t* g_timeout_queue = NULL;
static size_t g_timeout_len = 0;
static size_t g_timeout_cap = 0;

/* Forward decls for helpers used across sections. */
static tsc_str_t* str_alloc(size_t len);
static tsc_str_t* str_from_base64_bytes(const uint8_t* data, size_t len);
static char* cstr_dup(const tsc_str_t* s);
static void replace_append(char** out, size_t* pos, size_t* cap, const char* data, size_t len);
static void replace_append_string_expanded(char** out, size_t* pos, size_t* cap, const tsc_str_t* source, const tsc_str_t* repl, size_t start, size_t end);
static tsc_array_t* value_array_from_string_array(const tsc_array_t* strings);
bool tsc_object_define_desc(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable);

static bool str_lit_eq(const tsc_str_t* s, const char* lit) {
    size_t n = strlen(lit);
    return s && s->len == n && memcmp(s->data, lit, n) == 0;
}

void tsc_bootstrap(int argc, char** argv) {
    TSC_GC_INIT();
    tsc_argc = argc;
    tsc_argv = argv;
    srand((unsigned)time(NULL));
    if (clock_gettime(CLOCK_MONOTONIC, &g_boot_time) == 0) {
        g_boot_time_set = true;
    }
}

void tsc_panic(const char* msg) {
    fputs("tsc: panic: ", stderr);
    fputs(msg, stderr);
    fputc('\n', stderr);
    abort();
}

void tsc_process_exit(double code) {
    int c = 0;
    if (!isnan(code) && !isinf(code)) c = (int)code;
    exit(c);
}

tsc_array_t* tsc_process_argv(void) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), (size_t)tsc_argc);
    for (int i = 0; i < tsc_argc; i++) {
        tsc_str_t* s = tsc_str_from_cstr(tsc_argv[i]);
        tsc_array_push_raw(a, &s);
    }
    return a;
}

tsc_str_t* tsc_process_argv0(void) {
    return tsc_argc > 0 ? tsc_str_from_cstr(tsc_argv[0]) : tsc_str_from_lit("", 0);
}

tsc_array_t* tsc_process_exec_argv(void) {
    return tsc_array_new(sizeof(tsc_str_t*), 1);
}

tsc_str_t* tsc_process_version(void) {
    return tsc_str_from_lit("v0.0.0-tsc2c", 12);
}

tsc_value_t tsc_process_versions(void) {
    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("node", 4), tsc_value_string(tsc_str_from_lit("0.0.0-tsc2c", 11)));
    tsc_object_set(out, tsc_str_from_lit("openssl", 7), tsc_value_string(tsc_str_from_cstr(OPENSSL_VERSION_TEXT)));
    tsc_object_set(out, tsc_str_from_lit("tsc2c", 5), tsc_value_string(tsc_str_from_lit("0.0.0", 5)));
    return tsc_value_object(out);
}

tsc_value_t tsc_process_release(void) {
    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("name", 4), tsc_value_string(tsc_str_from_lit("node", 4)));
    tsc_object_set(out, tsc_str_from_lit("sourceUrl", 9), tsc_value_string(tsc_str_from_lit("", 0)));
    tsc_object_set(out, tsc_str_from_lit("headersUrl", 10), tsc_value_string(tsc_str_from_lit("", 0)));
    tsc_object_set(out, tsc_str_from_lit("libUrl", 6), tsc_value_string(tsc_str_from_lit("", 0)));
    return tsc_value_object(out);
}

tsc_value_t tsc_process_features(void) {
    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("inspector", 9), tsc_value_bool(false));
    tsc_object_set(out, tsc_str_from_lit("debug", 5), tsc_value_bool(false));
    tsc_object_set(out, tsc_str_from_lit("uv", 2), tsc_value_bool(false));
    tsc_object_set(out, tsc_str_from_lit("ipv6", 4), tsc_value_bool(false));
    tsc_object_set(out, tsc_str_from_lit("tls", 3), tsc_value_bool(false));
    tsc_object_set(out, tsc_str_from_lit("tls_alpn", 8), tsc_value_bool(false));
    tsc_object_set(out, tsc_str_from_lit("tls_sni", 7), tsc_value_bool(false));
    tsc_object_set(out, tsc_str_from_lit("tls_ocsp", 8), tsc_value_bool(false));
    tsc_object_set(out, tsc_str_from_lit("cached_builtins", 15), tsc_value_bool(false));
    return tsc_value_object(out);
}

tsc_str_t* tsc_process_env_get(const tsc_str_t* name) {
    char key[512];
    size_t n = name->len < 511 ? name->len : 511;
    memcpy(key, name->data, n);
    key[n] = '\0';
    const char* v = getenv(key);
    return v ? tsc_str_from_cstr(v) : NULL;
}

void tsc_process_env_set(const tsc_str_t* name, const tsc_str_t* value) {
    char* key = cstr_dup(name);
    if (!value) {
        int r = unsetenv(key);
        bool is_tz = strcmp(key, "TZ") == 0;
        free(key);
        if (r != 0) tsc_throw_str(tsc_str_from_cstr("process.env: could not unset variable"));
        if (is_tz) tzset();
        return;
    }
    char* val = cstr_dup(value);
    int r = setenv(key, val, 1);
    bool is_tz = strcmp(key, "TZ") == 0;
    free(key);
    free(val);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("process.env: could not set variable"));
    if (is_tz) tzset();
}

bool tsc_process_env_unset(const tsc_str_t* name) {
    char* key = cstr_dup(name);
    int r = unsetenv(key);
    bool is_tz = strcmp(key, "TZ") == 0;
    free(key);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("process.env: could not unset variable"));
    if (is_tz) tzset();
    return true;
}

tsc_str_t* tsc_process_cwd(void) {
    char buf[4096];
    if (getcwd(buf, sizeof buf)) {
        return tsc_str_from_cstr(buf);
    }
    return tsc_str_from_lit("/", 1);
}

void tsc_process_chdir(const tsc_str_t* directory) {
    char* path = cstr_dup(directory);
    int r = chdir(path);
    free(path);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("process.chdir: could not change directory"));
}

double tsc_process_pid(void) {
    return (double)getpid();
}

double tsc_process_ppid(void) {
    return (double)getppid();
}

double tsc_process_getuid(void) {
    return (double)getuid();
}

double tsc_process_getgid(void) {
    return (double)getgid();
}

double tsc_process_geteuid(void) {
    return (double)geteuid();
}

double tsc_process_getegid(void) {
    return (double)getegid();
}

tsc_array_t* tsc_process_getgroups(void) {
    int n = getgroups(0, NULL);
    if (n < 0) tsc_throw_str(tsc_str_from_cstr("process.getgroups: could not read groups"));

    gid_t* groups = NULL;
    if (n > 0) {
        groups = (gid_t*)TSC_GC_MALLOC_ATOMIC(sizeof(gid_t) * (size_t)n);
        n = getgroups(n, groups);
        if (n < 0) tsc_throw_str(tsc_str_from_cstr("process.getgroups: could not read groups"));
    }

    gid_t effective = getegid();
    bool has_effective = false;
    for (int i = 0; i < n; i++) {
        if (groups[i] == effective) {
            has_effective = true;
            break;
        }
    }

    tsc_array_t* out = tsc_array_new(sizeof(double), (size_t)n + (has_effective ? 0 : 1));
    for (int i = 0; i < n; i++) {
        double group_id = (double)groups[i];
        tsc_array_push_raw(out, &group_id);
    }
    if (!has_effective) {
        double group_id = (double)effective;
        tsc_array_push_raw(out, &group_id);
    }
    return out;
}

double tsc_process_umask_get(void) {
    mode_t old_mask = umask(0);
    umask(old_mask);
    return (double)old_mask;
}

double tsc_process_umask_set(double mask) {
    mode_t next = (mode_t)((isnan(mask) || isinf(mask) || mask < 0) ? 0 : (int)mask);
    return (double)umask(next);
}

double tsc_process_uptime(void) {
    if (!g_boot_time_set) return 0.0;
    struct timespec now;
    if (clock_gettime(CLOCK_MONOTONIC, &now) != 0) return 0.0;
    double seconds = (double)(now.tv_sec - g_boot_time.tv_sec);
    seconds += (double)(now.tv_nsec - g_boot_time.tv_nsec) / 1e9;
    return seconds < 0.0 ? 0.0 : seconds;
}

tsc_value_t tsc_process_memory_usage(void) {
    double rss = 0.0;
    struct rusage usage;
    if (getrusage(RUSAGE_SELF, &usage) == 0) {
#if defined(__APPLE__)
        rss = (double)usage.ru_maxrss;
#else
        rss = (double)usage.ru_maxrss * 1024.0;
#endif
    }
    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("rss", 3), tsc_value_num(rss));
    tsc_object_set(out, tsc_str_from_lit("heapTotal", 9), tsc_value_num(0.0));
    tsc_object_set(out, tsc_str_from_lit("heapUsed", 8), tsc_value_num(0.0));
    tsc_object_set(out, tsc_str_from_lit("external", 8), tsc_value_num(0.0));
    tsc_object_set(out, tsc_str_from_lit("arrayBuffers", 12), tsc_value_num(0.0));
    return tsc_value_object(out);
}

tsc_value_t tsc_process_cpu_usage(void) {
    double user = 0.0;
    double system = 0.0;
    struct rusage usage;
    if (getrusage(RUSAGE_SELF, &usage) == 0) {
        user = (double)usage.ru_utime.tv_sec * 1000000.0 + (double)usage.ru_utime.tv_usec;
        system = (double)usage.ru_stime.tv_sec * 1000000.0 + (double)usage.ru_stime.tv_usec;
    }
    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("user", 4), tsc_value_num(user));
    tsc_object_set(out, tsc_str_from_lit("system", 6), tsc_value_num(system));
    return tsc_value_object(out);
}

tsc_value_t tsc_process_resource_usage(void) {
    struct rusage usage;
    memset(&usage, 0, sizeof usage);
    (void)getrusage(RUSAGE_SELF, &usage);

    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("userCPUTime", 11), tsc_value_num((double)usage.ru_utime.tv_sec * 1000000.0 + (double)usage.ru_utime.tv_usec));
    tsc_object_set(out, tsc_str_from_lit("systemCPUTime", 13), tsc_value_num((double)usage.ru_stime.tv_sec * 1000000.0 + (double)usage.ru_stime.tv_usec));
    tsc_object_set(out, tsc_str_from_lit("maxRSS", 6), tsc_value_num((double)usage.ru_maxrss));
    tsc_object_set(out, tsc_str_from_lit("sharedMemorySize", 16), tsc_value_num((double)usage.ru_ixrss));
    tsc_object_set(out, tsc_str_from_lit("unsharedDataSize", 16), tsc_value_num((double)usage.ru_idrss));
    tsc_object_set(out, tsc_str_from_lit("unsharedStackSize", 17), tsc_value_num((double)usage.ru_isrss));
    tsc_object_set(out, tsc_str_from_lit("minorPageFault", 14), tsc_value_num((double)usage.ru_minflt));
    tsc_object_set(out, tsc_str_from_lit("majorPageFault", 14), tsc_value_num((double)usage.ru_majflt));
    tsc_object_set(out, tsc_str_from_lit("swappedOut", 10), tsc_value_num((double)usage.ru_nswap));
    tsc_object_set(out, tsc_str_from_lit("fsRead", 6), tsc_value_num((double)usage.ru_inblock));
    tsc_object_set(out, tsc_str_from_lit("fsWrite", 7), tsc_value_num((double)usage.ru_oublock));
    tsc_object_set(out, tsc_str_from_lit("ipcSent", 7), tsc_value_num((double)usage.ru_msgsnd));
    tsc_object_set(out, tsc_str_from_lit("ipcReceived", 11), tsc_value_num((double)usage.ru_msgrcv));
    tsc_object_set(out, tsc_str_from_lit("signalsCount", 12), tsc_value_num((double)usage.ru_nsignals));
    tsc_object_set(out, tsc_str_from_lit("voluntaryContextSwitches", 24), tsc_value_num((double)usage.ru_nvcsw));
    tsc_object_set(out, tsc_str_from_lit("involuntaryContextSwitches", 26), tsc_value_num((double)usage.ru_nivcsw));
    return tsc_value_object(out);
}

bool tsc_process_kill(double pid_value, double signal_value) {
    if (isnan(pid_value) || isinf(pid_value)) {
        tsc_throw_str(tsc_str_from_cstr("process.kill: invalid pid"));
    }
    if (isnan(signal_value) || isinf(signal_value)) {
        tsc_throw_str(tsc_str_from_cstr("process.kill: invalid signal"));
    }
    pid_t pid = (pid_t)pid_value;
    int sig = (int)signal_value;
    if (kill(pid, sig) != 0) {
        tsc_throw_str(tsc_str_from_cstr("process.kill: signal failed"));
    }
    return true;
}

tsc_array_t* tsc_process_hrtime(tsc_array_t* previous) {
    struct timespec now;
    if (clock_gettime(CLOCK_MONOTONIC, &now) != 0) {
        now.tv_sec = 0;
        now.tv_nsec = 0;
    }
    double seconds = (double)now.tv_sec;
    double nanos = (double)now.tv_nsec;
    if (previous && previous->len >= 2) {
        seconds -= TSC_ARR(double, previous, 0);
        nanos -= TSC_ARR(double, previous, 1);
        if (nanos < 0.0) {
            seconds -= 1.0;
            nanos += 1000000000.0;
        }
        if (seconds < 0.0) {
            seconds = 0.0;
            nanos = 0.0;
        }
    }
    tsc_array_t* out = tsc_array_new(sizeof(double), 2);
    tsc_array_push_raw(out, &seconds);
    tsc_array_push_raw(out, &nanos);
    return out;
}

static bool process_stream_write(FILE* f, const tsc_str_t* data) {
    if (!data || data->len == 0) {
        fflush(f);
        return ferror(f) == 0;
    }
    size_t written = fwrite(data->data, 1, data->len, f);
    fflush(f);
    return written == data->len && ferror(f) == 0;
}

static bool process_stream_write_bytes(FILE* f, const uint8_t* data, size_t len) {
    if (!data || len == 0) {
        fflush(f);
        return ferror(f) == 0;
    }
    size_t written = fwrite(data, 1, len, f);
    fflush(f);
    return written == len && ferror(f) == 0;
}

bool tsc_process_stdout_write(const tsc_str_t* data) {
    return process_stream_write(stdout, data);
}

bool tsc_process_stderr_write(const tsc_str_t* data) {
    return process_stream_write(stderr, data);
}

bool tsc_process_stdout_write_buffer(const tsc_buffer_t* data) {
    return data ? process_stream_write_bytes(stdout, data->data, data->len) : process_stream_write_bytes(stdout, NULL, 0);
}

bool tsc_process_stderr_write_buffer(const tsc_buffer_t* data) {
    return data ? process_stream_write_bytes(stderr, data->data, data->len) : process_stream_write_bytes(stderr, NULL, 0);
}

void tsc_process_next_tick(tsc_next_tick_fn_t fn, void* env) {
    if (!fn) return;
    if (g_next_tick_len == g_next_tick_cap) {
        size_t next = g_next_tick_cap ? g_next_tick_cap * 2 : 8;
        tsc_next_tick_entry_t* entries = (tsc_next_tick_entry_t*)TSC_GC_REALLOC(g_next_tick_queue, next * sizeof(tsc_next_tick_entry_t));
        if (!entries) tsc_panic("process.nextTick: out of memory");
        g_next_tick_queue = entries;
        g_next_tick_cap = next;
    }
    g_next_tick_queue[g_next_tick_len++] = (tsc_next_tick_entry_t){ fn, env };
}

void tsc_process_drain_next_ticks(void) {
    size_t idx = 0;
    while (idx < g_next_tick_len) {
        tsc_next_tick_entry_t entry = g_next_tick_queue[idx++];
        if (entry.fn) entry.fn(entry.env);
    }
    g_next_tick_len = 0;
}

void tsc_queue_microtask(tsc_microtask_fn_t fn, void* env) {
    if (!fn) return;
    if (g_microtask_len == g_microtask_cap) {
        size_t next = g_microtask_cap ? g_microtask_cap * 2 : 8;
        tsc_microtask_entry_t* entries = (tsc_microtask_entry_t*)TSC_GC_REALLOC(g_microtask_queue, next * sizeof(tsc_microtask_entry_t));
        if (!entries) tsc_panic("queueMicrotask: out of memory");
        g_microtask_queue = entries;
        g_microtask_cap = next;
    }
    g_microtask_queue[g_microtask_len++] = (tsc_microtask_entry_t){ fn, env };
}

void tsc_drain_microtasks(void) {
    size_t idx = 0;
    while (idx < g_microtask_len) {
        tsc_microtask_entry_t entry = g_microtask_queue[idx++];
        if (entry.fn) entry.fn(entry.env);
    }
    g_microtask_len = 0;
}

void tsc_set_immediate(tsc_immediate_fn_t fn, void* env) {
    if (!fn) return;
    if (g_immediate_len == g_immediate_cap) {
        size_t next = g_immediate_cap ? g_immediate_cap * 2 : 8;
        tsc_immediate_entry_t* entries = (tsc_immediate_entry_t*)TSC_GC_REALLOC(g_immediate_queue, next * sizeof(tsc_immediate_entry_t));
        if (!entries) tsc_panic("setImmediate: out of memory");
        g_immediate_queue = entries;
        g_immediate_cap = next;
    }
    g_immediate_queue[g_immediate_len++] = (tsc_immediate_entry_t){ fn, env };
}

void tsc_drain_immediates(void) {
    size_t idx = 0;
    while (idx < g_immediate_len) {
        tsc_immediate_entry_t entry = g_immediate_queue[idx++];
        if (entry.fn) entry.fn(entry.env);
        tsc_process_drain_next_ticks();
        tsc_drain_microtasks();
    }
    g_immediate_len = 0;
}

void tsc_set_timeout(tsc_timeout_fn_t fn, void* env) {
    if (!fn) return;
    if (g_timeout_len == g_timeout_cap) {
        size_t next = g_timeout_cap ? g_timeout_cap * 2 : 8;
        tsc_timeout_entry_t* entries = (tsc_timeout_entry_t*)TSC_GC_REALLOC(g_timeout_queue, next * sizeof(tsc_timeout_entry_t));
        if (!entries) tsc_panic("setTimeout: out of memory");
        g_timeout_queue = entries;
        g_timeout_cap = next;
    }
    g_timeout_queue[g_timeout_len++] = (tsc_timeout_entry_t){ fn, env };
}

void tsc_drain_timeouts(void) {
    size_t idx = 0;
    while (idx < g_timeout_len) {
        tsc_timeout_entry_t entry = g_timeout_queue[idx++];
        if (entry.fn) entry.fn(entry.env);
        tsc_process_drain_next_ticks();
        tsc_drain_microtasks();
    }
    g_timeout_len = 0;
}

/* ---------------- strings ---------------- */

static inline size_t fast_itoa(char* dst, int64_t n);

static tsc_str_t* str_alloc(size_t len) {
    tsc_str_t* s = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    char* buf = (char*)TSC_GC_MALLOC_ATOMIC(len + 1);
    buf[len] = '\0';
    s->len = len;
    s->data = buf;
    return s;
}

tsc_str_t* tsc_str_from_lit(const char* data, size_t len) {
    tsc_str_t* s = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    s->len = len;
    s->data = data;
    return s;
}

tsc_str_t* tsc_str_from_cstr(const char* src) {
    size_t n = strlen(src);
    tsc_str_t* s = str_alloc(n);
    memcpy((char*)s->data, src, n);
    return s;
}

tsc_str_t* tsc_str_concat(const tsc_str_t* a, const tsc_str_t* b) {
    tsc_str_t* s = str_alloc(a->len + b->len);
    memcpy((char*)s->data, a->data, a->len);
    memcpy((char*)s->data + a->len, b->data, b->len);
    return s;
}

tsc_str_t* tsc_str_concat_lit_int(const char* lit, size_t lit_len, int64_t n) {
    char num[21];
    size_t num_len = fast_itoa(num, n);
    tsc_str_t* s = str_alloc(lit_len + num_len);
    memcpy((char*)s->data, lit, lit_len);
    memcpy((char*)s->data + lit_len, num, num_len);
    return s;
}

tsc_str_t* tsc_str_concat_int_lit(int64_t n, const char* lit, size_t lit_len) {
    char num[21];
    size_t num_len = fast_itoa(num, n);
    tsc_str_t* s = str_alloc(num_len + lit_len);
    memcpy((char*)s->data, num, num_len);
    memcpy((char*)s->data + num_len, lit, lit_len);
    return s;
}

tsc_str_t* tsc_str_concat_lit_num(const char* lit, size_t lit_len, double n) {
    if (n == (double)(int64_t)n && n > -1e16 && n < 1e16) {
        return tsc_str_concat_lit_int(lit, lit_len, (int64_t)n);
    }
    return tsc_str_concat(tsc_str_from_lit(lit, lit_len), tsc_str_from_num(n));
}

tsc_str_t* tsc_str_concat_num_lit(double n, const char* lit, size_t lit_len) {
    if (n == (double)(int64_t)n && n > -1e16 && n < 1e16) {
        return tsc_str_concat_int_lit((int64_t)n, lit, lit_len);
    }
    return tsc_str_concat(tsc_str_from_num(n), tsc_str_from_lit(lit, lit_len));
}

/* Variadic n-way concat — single str_alloc + n memcpy. Used by the emitter
 * when it folds a chain of `+` over strings (e.g. `s + "x" + j`) into one
 * call, dropping N-1 intermediate allocations + their byte copies. */
tsc_str_t* tsc_str_concat_n(size_t n, ...) {
    va_list ap;
    size_t total = 0;
    va_start(ap, n);
    /* Two-pass would need a heap copy of pointers; use an inline cap of 16
     * args (covers nearly all source-level chains) with a heap fallback. */
    enum { INLINE_CAP = 16 };
    const tsc_str_t* inline_parts[INLINE_CAP];
    const tsc_str_t** parts = inline_parts;
    if (n > INLINE_CAP) parts = (const tsc_str_t**)TSC_GC_MALLOC(n * sizeof(*parts));
    for (size_t i = 0; i < n; i++) {
        const tsc_str_t* p = va_arg(ap, const tsc_str_t*);
        parts[i] = p;
        total += p->len;
    }
    va_end(ap);
    tsc_str_t* s = str_alloc(total);
    char* dst = (char*)s->data;
    for (size_t i = 0; i < n; i++) {
        memcpy(dst, parts[i]->data, parts[i]->len);
        dst += parts[i]->len;
    }
    return s;
}

/* Inline integer to decimal: faster than snprintf("%lld") in hot string,
 * JSON, and array-index paths. Returns chars written. */
static inline size_t fast_itoa(char* dst, int64_t n) {
    char tmp[21];
    size_t i = sizeof tmp;
    bool neg = n < 0;
    uint64_t u = neg ? (uint64_t)-(n + 1) + 1 : (uint64_t)n;
    do {
        tmp[--i] = (char)('0' + (u % 10));
        u /= 10;
    } while (u > 0);
    if (neg) tmp[--i] = '-';
    size_t k = sizeof tmp - i;
    memcpy(dst, tmp + i, k);
    return k;
}

tsc_str_t* tsc_str_from_num(double n) {
    char buf[64];
    int len;
    if (isnan(n)) {
        return tsc_str_from_lit("NaN", 3);
    }
    if (isinf(n)) {
        return n < 0 ? tsc_str_from_lit("-Infinity", 9) : tsc_str_from_lit("Infinity", 8);
    }
    if (n == 0.0) {
        return tsc_str_from_lit("0", 1);
    }
    if (n == (double)(int64_t)n && n > -1e16 && n < 1e16) {
        size_t int_len = fast_itoa(buf, (int64_t)n);
        tsc_str_t* s = str_alloc(int_len);
        memcpy((char*)s->data, buf, int_len);
        return s;
    }
    /* Shortest round-trip: try 1..17 significant digits. */
    for (int prec = 1; prec <= 17; prec++) {
        snprintf(buf, sizeof buf, "%.*g", prec, n);
        double rt = strtod(buf, NULL);
        if (rt == n) break;
    }
    len = (int)strlen(buf);
    tsc_str_t* s = str_alloc((size_t)len);
    memcpy((char*)s->data, buf, (size_t)len);
    return s;
}

tsc_str_t* tsc_str_from_int(int64_t n) {
    char buf[21];
    size_t len = fast_itoa(buf, n);
    tsc_str_t* s = str_alloc(len);
    memcpy((char*)s->data, buf, len);
    return s;
}

tsc_str_t* tsc_str_from_num_radix(double n, double radix) {
    static const char digits[] = "0123456789abcdefghijklmnopqrstuvwxyz";
    int base = (int)radix;
    if (base < 2 || base > 36) tsc_panic("Number.toString: radix must be 2..36");
    if (base == 10 || isnan(n) || isinf(n)) return tsc_str_from_num(n);
    if (n == 0.0) return tsc_str_from_lit("0", 1);

    double whole;
    double frac = modf(fabs(n), &whole);
    char rev[256];
    size_t rev_len = 0;
    while (whole >= 1.0 && rev_len < sizeof rev) {
        int digit = (int)fmod(whole, (double)base);
        if (digit < 0) digit = 0;
        if (digit >= base) digit = base - 1;
        rev[rev_len++] = digits[digit];
        whole = floor(whole / (double)base);
    }
    if (whole >= 1.0) tsc_panic("Number.toString: magnitude too large for radix conversion");

    char out[512];
    size_t pos = 0;
    if (n < 0) out[pos++] = '-';
    if (rev_len == 0) {
        out[pos++] = '0';
    } else {
        while (rev_len > 0) out[pos++] = rev[--rev_len];
    }

    if (frac > 0.0) {
        out[pos++] = '.';
        size_t frac_start = pos;
        for (int i = 0; i < 64 && frac > 0.0 && pos + 1 < sizeof out; i++) {
            frac *= (double)base;
            int digit = (int)floor(frac);
            if (digit < 0) digit = 0;
            if (digit >= base) digit = base - 1;
            out[pos++] = digits[digit];
            frac -= (double)digit;
        }
        while (pos > frac_start && out[pos - 1] == '0') pos--;
        if (pos == frac_start) pos--;
    }
    out[pos] = '\0';
    return tsc_str_from_cstr(out);
}

static int number_fraction_digits(double value) {
    if (isnan(value)) return 0;
    if (isinf(value)) tsc_panic("Number.toFixed: digits must be finite");
    int digits = (int)(value < 0 ? ceil(value) : floor(value));
    if (digits < 0 || digits > 100) tsc_panic("Number.toFixed: digits must be 0..100");
    return digits;
}

static int number_exponential_fraction_digits(double value) {
    if (isnan(value)) return 0;
    if (isinf(value)) tsc_panic("Number.toExponential: digits must be finite");
    int digits = (int)(value < 0 ? ceil(value) : floor(value));
    if (digits < 0 || digits > 100) tsc_panic("Number.toExponential: digits must be 0..100");
    return digits;
}

static int number_precision_digits(double value) {
    if (isnan(value) || isinf(value)) tsc_panic("Number.toPrecision: precision must be finite");
    int digits = (int)(value < 0 ? ceil(value) : floor(value));
    if (digits < 1 || digits > 100) tsc_panic("Number.toPrecision: precision must be 1..100");
    return digits;
}

tsc_str_t* tsc_str_from_num_fixed(double n, double fraction_digits) {
    int digits = number_fraction_digits(fraction_digits);
    if (isnan(n) || isinf(n)) return tsc_str_from_num(n);
    if (fabs(n) >= 1e21) return tsc_str_from_num(n);
    if (n == 0.0) n = 0.0;

    char buf[160];
    int len = snprintf(buf, sizeof buf, "%.*f", digits, n);
    if (len < 0 || (size_t)len >= sizeof buf) tsc_panic("Number.toFixed: formatted output too large");
    tsc_str_t* s = str_alloc((size_t)len);
    memcpy((char*)s->data, buf, (size_t)len);
    return s;
}

tsc_str_t* tsc_str_from_num_exponential(double n, double fraction_digits, bool has_digits) {
    if (isnan(n) || isinf(n)) return tsc_str_from_num(n);
    if (n == 0.0) n = 0.0;

    int digits = has_digits ? number_exponential_fraction_digits(fraction_digits) : 15;
    char raw[192];
    int raw_len = snprintf(raw, sizeof raw, "%.*e", has_digits ? digits + 1 : digits, n);
    if (raw_len < 0 || (size_t)raw_len >= sizeof raw) tsc_panic("Number.toExponential: formatted output too large");

    char* e = strchr(raw, 'e');
    if (!e) tsc_panic("Number.toExponential: formatted output missing exponent");
    *e = '\0';
    int exp_value = atoi(e + 1);

    char mantissa[128];
    size_t mantissa_len = 0;
    if (has_digits) {
        const char* p = raw;
        bool negative = false;
        if (*p == '-') {
            negative = true;
            p++;
        }

        char significant[128];
        int sig_len = 0;
        for (; *p; p++) {
            if (isdigit((unsigned char)*p)) {
                if (sig_len + 1 >= (int)sizeof significant) tsc_panic("Number.toExponential: mantissa too large");
                significant[sig_len++] = *p;
            }
        }

        int keep = digits + 1;
        while (sig_len <= keep) significant[sig_len++] = '0';
        if (significant[keep] >= '5') {
            bool carry = true;
            for (int i = keep - 1; i >= 0; i--) {
                if (significant[i] != '9') {
                    significant[i]++;
                    carry = false;
                    break;
                }
                significant[i] = '0';
            }
            if (carry) {
                significant[0] = '1';
                for (int i = 1; i < keep; i++) significant[i] = '0';
                exp_value++;
            }
        }

        if (negative) mantissa[mantissa_len++] = '-';
        mantissa[mantissa_len++] = significant[0];
        if (digits > 0) {
            mantissa[mantissa_len++] = '.';
            for (int i = 1; i < keep; i++) mantissa[mantissa_len++] = significant[i];
        }
        mantissa[mantissa_len] = '\0';
    } else {
        mantissa_len = strlen(raw);
        while (mantissa_len > 0 && raw[mantissa_len - 1] == '0') mantissa_len--;
        if (mantissa_len > 0 && raw[mantissa_len - 1] == '.') mantissa_len--;
        if (mantissa_len >= sizeof mantissa) tsc_panic("Number.toExponential: mantissa too large");
        memcpy(mantissa, raw, mantissa_len);
        mantissa[mantissa_len] = '\0';
    }

    char out[192];
    int len = snprintf(out, sizeof out, "%se%+d", mantissa, exp_value);
    if (len < 0 || (size_t)len >= sizeof out) tsc_panic("Number.toExponential: formatted output too large");
    tsc_str_t* s = str_alloc((size_t)len);
    memcpy((char*)s->data, out, (size_t)len);
    return s;
}

tsc_str_t* tsc_str_from_num_precision(double n, double precision, bool has_precision) {
    if (!has_precision) return tsc_str_from_num(n);
    int digits = number_precision_digits(precision);
    if (isnan(n) || isinf(n)) return tsc_str_from_num(n);
    if (n == 0.0) n = 0.0;

    char raw[192];
    int raw_len = snprintf(raw, sizeof raw, "%.*e", digits, n);
    if (raw_len < 0 || (size_t)raw_len >= sizeof raw) tsc_panic("Number.toPrecision: formatted output too large");

    char* e = strchr(raw, 'e');
    if (!e) tsc_panic("Number.toPrecision: formatted output missing exponent");
    *e = '\0';
    int exp_value = atoi(e + 1);

    const char* p = raw;
    bool negative = false;
    if (*p == '-') {
        negative = true;
        p++;
    }

    char significant[128];
    int sig_len = 0;
    for (; *p; p++) {
        if (isdigit((unsigned char)*p)) {
            if (sig_len + 1 >= (int)sizeof significant) tsc_panic("Number.toPrecision: mantissa too large");
            significant[sig_len++] = *p;
        }
    }
    while (sig_len <= digits) significant[sig_len++] = '0';

    if (significant[digits] >= '5') {
        bool carry = true;
        for (int i = digits - 1; i >= 0; i--) {
            if (significant[i] != '9') {
                significant[i]++;
                carry = false;
                break;
            }
            significant[i] = '0';
        }
        if (carry) {
            significant[0] = '1';
            for (int i = 1; i < digits; i++) significant[i] = '0';
            exp_value++;
        }
    }

    char out[192];
    size_t pos = 0;
    if (negative) out[pos++] = '-';

    if (exp_value < -6 || exp_value >= digits) {
        out[pos++] = significant[0];
        if (digits > 1) {
            out[pos++] = '.';
            for (int i = 1; i < digits; i++) out[pos++] = significant[i];
        }
        int len = snprintf(out + pos, sizeof out - pos, "e%+d", exp_value);
        if (len < 0 || pos + (size_t)len >= sizeof out) tsc_panic("Number.toPrecision: formatted output too large");
        pos += (size_t)len;
    } else if (exp_value >= 0) {
        int before_dot = exp_value + 1;
        for (int i = 0; i < before_dot; i++) out[pos++] = i < digits ? significant[i] : '0';
        if (before_dot < digits) {
            out[pos++] = '.';
            for (int i = before_dot; i < digits; i++) out[pos++] = significant[i];
        }
    } else {
        out[pos++] = '0';
        out[pos++] = '.';
        for (int i = 0; i < -exp_value - 1; i++) out[pos++] = '0';
        for (int i = 0; i < digits; i++) out[pos++] = significant[i];
    }

    if (pos >= sizeof out) tsc_panic("Number.toPrecision: formatted output too large");
    out[pos] = '\0';
    tsc_str_t* s = str_alloc(pos);
    memcpy((char*)s->data, out, pos);
    return s;
}

tsc_str_t* tsc_str_from_bool(bool b) {
    static const char T[] = "true";
    static const char F[] = "false";
    return b ? tsc_str_from_lit(T, 4) : tsc_str_from_lit(F, 5);
}

static uint16_t to_uint16_code_unit(double n) {
    if (isnan(n) || isinf(n)) return 0;
    int64_t i = (int64_t)n;
    return (uint16_t)(i & 0xffff);
}

static size_t utf8_len_for_code_point(uint32_t cp) {
    if (cp <= 0x7f) return 1;
    if (cp <= 0x7ff) return 2;
    if (cp <= 0xffff) return 3;
    return 4;
}

static size_t write_utf8_code_point(char* out, uint32_t cp) {
    if (cp <= 0x7f) {
        out[0] = (char)cp;
        return 1;
    }
    if (cp <= 0x7ff) {
        out[0] = (char)(0xc0 | (cp >> 6));
        out[1] = (char)(0x80 | (cp & 0x3f));
        return 2;
    }
    if (cp <= 0xffff) {
        out[0] = (char)(0xe0 | (cp >> 12));
        out[1] = (char)(0x80 | ((cp >> 6) & 0x3f));
        out[2] = (char)(0x80 | (cp & 0x3f));
        return 3;
    }
    out[0] = (char)(0xf0 | (cp >> 18));
    out[1] = (char)(0x80 | ((cp >> 12) & 0x3f));
    out[2] = (char)(0x80 | ((cp >> 6) & 0x3f));
    out[3] = (char)(0x80 | (cp & 0x3f));
    return 4;
}

static bool decode_utf8_at(const tsc_str_t* s, size_t pos, uint32_t* cp, size_t* adv) {
    if (pos >= s->len) return false;
    const unsigned char* p = (const unsigned char*)s->data + pos;
    unsigned char b0 = p[0];
    if (b0 < 0x80) {
        *cp = b0;
        *adv = 1;
        return true;
    }
    if ((b0 & 0xe0) == 0xc0 && pos + 1 < s->len) {
        *cp = ((uint32_t)(b0 & 0x1f) << 6) | (uint32_t)(p[1] & 0x3f);
        *adv = 2;
        return true;
    }
    if ((b0 & 0xf0) == 0xe0 && pos + 2 < s->len) {
        *cp =
            ((uint32_t)(b0 & 0x0f) << 12) |
            ((uint32_t)(p[1] & 0x3f) << 6) |
            (uint32_t)(p[2] & 0x3f);
        *adv = 3;
        return true;
    }
    if ((b0 & 0xf8) == 0xf0 && pos + 3 < s->len) {
        *cp =
            ((uint32_t)(b0 & 0x07) << 18) |
            ((uint32_t)(p[1] & 0x3f) << 12) |
            ((uint32_t)(p[2] & 0x3f) << 6) |
            (uint32_t)(p[3] & 0x3f);
        *adv = 4;
        return true;
    }
    *cp = 0xfffd;
    *adv = 1;
    return true;
}

static bool is_high_surrogate(uint16_t u) { return u >= 0xd800 && u <= 0xdbff; }
static bool is_low_surrogate(uint16_t u) { return u >= 0xdc00 && u <= 0xdfff; }

static uint32_t surrogate_pair_to_code_point(uint16_t hi, uint16_t lo) {
    return 0x10000u + ((((uint32_t)hi - 0xd800u) << 10) | ((uint32_t)lo - 0xdc00u));
}

tsc_str_t* tsc_str_from_char_code_n(size_t n, ...) {
    uint16_t* units = (uint16_t*)TSC_GC_MALLOC_ATOMIC(sizeof(uint16_t) * (n ? n : 1));
    va_list ap;
    va_start(ap, n);
    for (size_t i = 0; i < n; i++) {
        units[i] = to_uint16_code_unit(va_arg(ap, double));
    }
    va_end(ap);

    size_t len = 0;
    for (size_t i = 0; i < n; i++) {
        uint32_t cp = units[i];
        if (is_high_surrogate(units[i]) && i + 1 < n && is_low_surrogate(units[i + 1])) {
            cp = surrogate_pair_to_code_point(units[i], units[i + 1]);
            i++;
        } else if (is_high_surrogate(units[i]) || is_low_surrogate(units[i])) {
            cp = 0xfffd;
        }
        len += utf8_len_for_code_point(cp);
    }

    tsc_str_t* s = str_alloc(len);
    char* out = (char*)s->data;
    size_t pos = 0;
    for (size_t i = 0; i < n; i++) {
        uint32_t cp = units[i];
        if (is_high_surrogate(units[i]) && i + 1 < n && is_low_surrogate(units[i + 1])) {
            cp = surrogate_pair_to_code_point(units[i], units[i + 1]);
            i++;
        } else if (is_high_surrogate(units[i]) || is_low_surrogate(units[i])) {
            cp = 0xfffd;
        }
        pos += write_utf8_code_point(out + pos, cp);
    }
    return s;
}

static uint32_t to_valid_code_point(double n) {
    if (!isfinite(n) || floor(n) != n || n < 0.0 || n > 0x10ffff) {
        tsc_panic("String.fromCodePoint: invalid code point");
    }
    return (uint32_t)n;
}

tsc_str_t* tsc_str_from_code_point_n(size_t n, ...) {
    uint32_t* cps = (uint32_t*)TSC_GC_MALLOC_ATOMIC(sizeof(uint32_t) * (n ? n : 1));
    va_list ap;
    va_start(ap, n);
    for (size_t i = 0; i < n; i++) {
        cps[i] = to_valid_code_point(va_arg(ap, double));
    }
    va_end(ap);

    size_t len = 0;
    for (size_t i = 0; i < n; i++) {
        len += utf8_len_for_code_point(cps[i]);
    }

    tsc_str_t* s = str_alloc(len);
    char* out = (char*)s->data;
    size_t pos = 0;
    for (size_t i = 0; i < n; i++) {
        pos += write_utf8_code_point(out + pos, cps[i]);
    }
    return s;
}

bool tsc_str_eq(const tsc_str_t* a, const tsc_str_t* b) {
    if (a == b) return true;
    if (a->len != b->len) return false;
    return memcmp(a->data, b->data, a->len) == 0;
}

int tsc_str_cmp(const tsc_str_t* a, const tsc_str_t* b) {
    size_t m = a->len < b->len ? a->len : b->len;
    int r = memcmp(a->data, b->data, m);
    if (r != 0) return r;
    if (a->len < b->len) return -1;
    if (a->len > b->len) return 1;
    return 0;
}

double tsc_str_locale_compare(const tsc_str_t* a, const tsc_str_t* b) {
    int c = tsc_str_cmp(a, b);
    return c < 0 ? -1.0 : c > 0 ? 1.0 : 0.0;
}

double tsc_str_length(const tsc_str_t* s) { return (double)s->len; }

tsc_str_t* tsc_str_char_at(const tsc_str_t* s, double idx) {
    size_t i = (size_t)idx;
    if (idx < 0 || i >= s->len) return tsc_str_from_lit("", 0);
    tsc_str_t* out = str_alloc(1);
    ((char*)out->data)[0] = s->data[i];
    return out;
}

tsc_str_t* tsc_str_at(const tsc_str_t* s, double idx) {
    if (isnan(idx)) idx = 0.0;
    if (idx < 0) idx = (double)s->len + idx;
    if (isinf(idx) || idx < 0 || idx >= (double)s->len) return tsc_str_from_lit("", 0);
    return tsc_str_char_at(s, idx);
}

double tsc_str_char_code_at(const tsc_str_t* s, double idx) {
    if (idx < 0 || isnan(idx) || isinf(idx)) return NAN;
    size_t target = (size_t)idx;
    size_t code_unit_index = 0;
    size_t pos = 0;
    while (pos < s->len) {
        uint32_t cp = 0xfffd;
        size_t adv = 1;
        decode_utf8_at(s, pos, &cp, &adv);
        if (cp > 0xffff) {
            uint32_t shifted = cp - 0x10000u;
            uint16_t hi = (uint16_t)(0xd800u + (shifted >> 10));
            uint16_t lo = (uint16_t)(0xdc00u + (shifted & 0x3ffu));
            if (code_unit_index == target) return (double)hi;
            if (code_unit_index + 1 == target) return (double)lo;
            code_unit_index += 2;
        } else {
            if (code_unit_index == target) return (double)cp;
            code_unit_index++;
        }
        pos += adv;
    }
    return NAN;
}

double tsc_str_code_point_at(const tsc_str_t* s, double idx) {
    if (idx < 0 || isnan(idx) || isinf(idx)) return NAN;
    size_t target = (size_t)idx;
    size_t code_unit_index = 0;
    size_t pos = 0;
    while (pos < s->len) {
        uint32_t cp = 0xfffd;
        size_t adv = 1;
        decode_utf8_at(s, pos, &cp, &adv);
        if (cp > 0xffff) {
            uint32_t shifted = cp - 0x10000u;
            uint16_t lo = (uint16_t)(0xdc00u + (shifted & 0x3ffu));
            if (code_unit_index == target) return (double)cp;
            if (code_unit_index + 1 == target) return (double)lo;
            code_unit_index += 2;
        } else {
            if (code_unit_index == target) return (double)cp;
            code_unit_index++;
        }
        pos += adv;
    }
    return NAN;
}

static int64_t string_clamped_position(double value, int64_t len) {
    if (isnan(value)) return 0;
    if (isinf(value)) return value < 0 ? 0 : len;
    double truncated = value < 0 ? ceil(value) : floor(value);
    if (truncated < 0) return 0;
    if (truncated > (double)len) return len;
    return (int64_t)truncated;
}

double tsc_str_index_of(const tsc_str_t* h, const tsc_str_t* n, double position) {
    int64_t start_i = string_clamped_position(position, (int64_t)h->len);
    size_t start = (size_t)start_i;
    if (n->len == 0) return (double)start;
    if (n->len > h->len) return -1.0;
    for (size_t i = start; i + n->len <= h->len; i++) {
        if (memcmp(h->data + i, n->data, n->len) == 0) return (double)i;
    }
    return -1.0;
}

double tsc_str_last_index_of(const tsc_str_t* h, const tsc_str_t* n, double position) {
    int64_t pos_i = string_clamped_position(position, (int64_t)h->len);
    size_t pos = (size_t)pos_i;
    if (n->len == 0) return (double)pos;
    if (n->len > h->len) return -1.0;
    size_t max_start = h->len - n->len;
    size_t i = (pos > max_start ? max_start : pos) + 1;
    while (i > 0) {
        i--;
        if (memcmp(h->data + i, n->data, n->len) == 0) return (double)i;
    }
    return -1.0;
}

bool tsc_str_includes(const tsc_str_t* h, const tsc_str_t* n, double position) {
    return tsc_str_index_of(h, n, position) >= 0;
}

bool tsc_str_starts_with(const tsc_str_t* s, const tsc_str_t* p, double position) {
    int64_t start_i = string_clamped_position(position, (int64_t)s->len);
    size_t start = (size_t)start_i;
    if (p->len > s->len - start) return false;
    return memcmp(s->data + start, p->data, p->len) == 0;
}

bool tsc_str_ends_with(const tsc_str_t* s, const tsc_str_t* p, double end_position) {
    int64_t end_i = string_clamped_position(end_position, (int64_t)s->len);
    size_t end = (size_t)end_i;
    if (p->len > end) return false;
    return memcmp(s->data + (end - p->len), p->data, p->len) == 0;
}

tsc_str_t* tsc_str_slice(const tsc_str_t* s, double start, double end) {
    int64_t slen = (int64_t)s->len;
    int64_t i0 = (int64_t)start;
    int64_t i1 = (int64_t)end;
    if (i0 < 0) i0 = slen + i0;
    if (i1 < 0) i1 = slen + i1;
    if (i0 < 0) i0 = 0;
    if (i1 > slen) i1 = slen;
    if (i0 > i1) i0 = i1;
    size_t n = (size_t)(i1 - i0);
    tsc_str_t* r = str_alloc(n);
    memcpy((char*)r->data, s->data + i0, n);
    return r;
}

static int64_t substring_index(double value, int64_t len) {
    if (isnan(value) || value < 0) return 0;
    if (isinf(value)) return value < 0 ? 0 : len;
    if (value >= (double)len) return len;
    int64_t i = (int64_t)value;
    if (i < 0) return 0;
    return i;
}

tsc_str_t* tsc_str_substring(const tsc_str_t* s, double start, double end) {
    int64_t slen = (int64_t)s->len;
    int64_t i0 = substring_index(start, slen);
    int64_t i1 = substring_index(end, slen);
    if (i0 > i1) {
        int64_t t = i0;
        i0 = i1;
        i1 = t;
    }
    size_t n = (size_t)(i1 - i0);
    tsc_str_t* r = str_alloc(n);
    memcpy((char*)r->data, s->data + i0, n);
    return r;
}

static int64_t substr_start_index(double value, int64_t len) {
    if (isnan(value)) return 0;
    if (isinf(value)) return value < 0 ? 0 : len;
    int64_t i = (int64_t)(value < 0 ? ceil(value) : floor(value));
    if (i < 0) i = len + i;
    if (i < 0) return 0;
    if (i > len) return len;
    return i;
}

static int64_t substr_count(double value, int64_t remaining) {
    if (isnan(value) || value <= 0) return 0;
    if (isinf(value)) return value < 0 ? 0 : remaining;
    int64_t n = (int64_t)(value < 0 ? ceil(value) : floor(value));
    if (n < 0) return 0;
    if (n > remaining) return remaining;
    return n;
}

tsc_str_t* tsc_str_substr(const tsc_str_t* s, double start, double length) {
    int64_t slen = (int64_t)s->len;
    int64_t i0 = substr_start_index(start, slen);
    int64_t n = substr_count(length, slen - i0);
    tsc_str_t* r = str_alloc((size_t)n);
    memcpy((char*)r->data, s->data + i0, (size_t)n);
    return r;
}

tsc_str_t* tsc_str_to_upper(const tsc_str_t* s) {
    tsc_str_t* r = str_alloc(s->len);
    for (size_t i = 0; i < s->len; i++) {
        unsigned char c = (unsigned char)s->data[i];
        ((char*)r->data)[i] = (c < 0x80) ? (char)toupper(c) : (char)c;
    }
    return r;
}

tsc_str_t* tsc_str_to_lower(const tsc_str_t* s) {
    tsc_str_t* r = str_alloc(s->len);
    for (size_t i = 0; i < s->len; i++) {
        unsigned char c = (unsigned char)s->data[i];
        ((char*)r->data)[i] = (c < 0x80) ? (char)tolower(c) : (char)c;
    }
    return r;
}

tsc_str_t* tsc_str_normalize(const tsc_str_t* s, const tsc_str_t* form) {
    const UNormalizer2* normalizer = NULL;
    UErrorCode status = U_ZERO_ERROR;
    if (!form || str_lit_eq(form, "NFC")) {
        normalizer = unorm2_getNFCInstance(&status);
    } else if (str_lit_eq(form, "NFD")) {
        normalizer = unorm2_getNFDInstance(&status);
    } else if (str_lit_eq(form, "NFKC")) {
        normalizer = unorm2_getNFKCInstance(&status);
    } else if (str_lit_eq(form, "NFKD")) {
        normalizer = unorm2_getNFKDInstance(&status);
    } else {
        tsc_panic("String.normalize: form must be NFC, NFD, NFKC, or NFKD");
    }
    if (U_FAILURE(status) || !normalizer) {
        tsc_panic("String.normalize: ICU normalizer unavailable");
    }
    if (s->len > INT32_MAX) {
        tsc_panic("String.normalize: input too large");
    }

    int32_t ulen = 0;
    status = U_ZERO_ERROR;
    u_strFromUTF8(NULL, 0, &ulen, s->data, (int32_t)s->len, &status);
    if (status != U_BUFFER_OVERFLOW_ERROR && U_FAILURE(status)) {
        tsc_panic("String.normalize: invalid UTF-8 input");
    }

    UChar* ubuf = (UChar*)TSC_GC_MALLOC_ATOMIC(sizeof(UChar) * ((size_t)ulen + 1));
    status = U_ZERO_ERROR;
    u_strFromUTF8(ubuf, ulen + 1, NULL, s->data, (int32_t)s->len, &status);
    if (U_FAILURE(status)) {
        tsc_panic("String.normalize: UTF-8 conversion failed");
    }

    int32_t norm_len = 0;
    status = U_ZERO_ERROR;
    norm_len = unorm2_normalize(normalizer, ubuf, ulen, NULL, 0, &status);
    if (status != U_BUFFER_OVERFLOW_ERROR && U_FAILURE(status)) {
        tsc_panic("String.normalize: normalization sizing failed");
    }

    UChar* nbuf = (UChar*)TSC_GC_MALLOC_ATOMIC(sizeof(UChar) * ((size_t)norm_len + 1));
    status = U_ZERO_ERROR;
    norm_len = unorm2_normalize(normalizer, ubuf, ulen, nbuf, norm_len + 1, &status);
    if (U_FAILURE(status)) {
        tsc_panic("String.normalize: normalization failed");
    }

    int32_t out_len = 0;
    status = U_ZERO_ERROR;
    u_strToUTF8(NULL, 0, &out_len, nbuf, norm_len, &status);
    if (status != U_BUFFER_OVERFLOW_ERROR && U_FAILURE(status)) {
        tsc_panic("String.normalize: UTF-8 output sizing failed");
    }

    tsc_str_t* out = str_alloc((size_t)out_len);
    status = U_ZERO_ERROR;
    u_strToUTF8((char*)out->data, out_len + 1, NULL, nbuf, norm_len, &status);
    if (U_FAILURE(status)) {
        tsc_panic("String.normalize: UTF-8 output conversion failed");
    }
    return out;
}

tsc_str_t* tsc_str_trim(const tsc_str_t* s) {
    size_t i = 0, j = s->len;
    while (i < j && isspace((unsigned char)s->data[i])) i++;
    while (j > i && isspace((unsigned char)s->data[j - 1])) j--;
    tsc_str_t* r = str_alloc(j - i);
    memcpy((char*)r->data, s->data + i, j - i);
    return r;
}

tsc_str_t* tsc_str_trim_start(const tsc_str_t* s) {
    size_t i = 0;
    while (i < s->len && isspace((unsigned char)s->data[i])) i++;
    tsc_str_t* r = str_alloc(s->len - i);
    memcpy((char*)r->data, s->data + i, s->len - i);
    return r;
}

tsc_str_t* tsc_str_trim_end(const tsc_str_t* s) {
    size_t j = s->len;
    while (j > 0 && isspace((unsigned char)s->data[j - 1])) j--;
    tsc_str_t* r = str_alloc(j);
    memcpy((char*)r->data, s->data, j);
    return r;
}

tsc_str_t* tsc_str_repeat(const tsc_str_t* s, double n) {
    if (n <= 0 || isnan(n) || isinf(n)) return tsc_str_from_lit("", 0);
    size_t count = (size_t)n;
    tsc_str_t* r = str_alloc(s->len * count);
    for (size_t i = 0; i < count; i++) {
        memcpy((char*)r->data + i * s->len, s->data, s->len);
    }
    return r;
}

tsc_str_t* tsc_str_pad_start(const tsc_str_t* s, double target, const tsc_str_t* pad) {
    if (target <= (double)s->len || pad->len == 0) return (tsc_str_t*)s;
    size_t t = (size_t)target;
    size_t need = t - s->len;
    tsc_str_t* r = str_alloc(t);
    char* dst = (char*)r->data;
    size_t filled = 0;
    while (filled < need) {
        size_t chunk = (need - filled) < pad->len ? (need - filled) : pad->len;
        memcpy(dst + filled, pad->data, chunk);
        filled += chunk;
    }
    memcpy(dst + need, s->data, s->len);
    return r;
}

tsc_str_t* tsc_str_pad_end(const tsc_str_t* s, double target, const tsc_str_t* pad) {
    if (target <= (double)s->len || pad->len == 0) return (tsc_str_t*)s;
    size_t t = (size_t)target;
    size_t need = t - s->len;
    tsc_str_t* r = str_alloc(t);
    char* dst = (char*)r->data;
    memcpy(dst, s->data, s->len);
    size_t filled = 0;
    while (filled < need) {
        size_t chunk = (need - filled) < pad->len ? (need - filled) : pad->len;
        memcpy(dst + s->len + filled, pad->data, chunk);
        filled += chunk;
    }
    return r;
}

tsc_str_t* tsc_str_replace(const tsc_str_t* s, const tsc_str_t* search, const tsc_str_t* repl) {
    if (search->len == 0 || search->len > s->len) return (tsc_str_t*)s;
    for (size_t i = 0; i + search->len <= s->len; i++) {
        if (memcmp(s->data + i, search->data, search->len) == 0) {
            size_t cap = s->len + repl->len + 64;
            char* out = (char*)malloc(cap);
            size_t pos = 0;
            replace_append(&out, &pos, &cap, s->data, i);
            replace_append_string_expanded(&out, &pos, &cap, s, repl, i, i + search->len);
            replace_append(&out, &pos, &cap, s->data + i + search->len, s->len - i - search->len);
            tsc_str_t* r = str_alloc(pos);
            memcpy((char*)r->data, out, pos);
            free(out);
            return r;
        }
    }
    return (tsc_str_t*)s;
}

tsc_str_t* tsc_str_replace_all(const tsc_str_t* s, const tsc_str_t* search, const tsc_str_t* repl) {
    if (search->len == 0) return (tsc_str_t*)s;
    size_t cap = s->len + 64;
    char* out = (char*)malloc(cap);
    size_t src = 0;
    size_t pos = 0;
    bool changed = false;
    while (src < s->len) {
        if (src + search->len <= s->len &&
            memcmp(s->data + src, search->data, search->len) == 0) {
            changed = true;
            replace_append_string_expanded(&out, &pos, &cap, s, repl, src, src + search->len);
            src += search->len;
        } else {
            replace_append(&out, &pos, &cap, s->data + src, 1);
            src++;
        }
    }
    if (!changed) {
        free(out);
        return (tsc_str_t*)s;
    }
    tsc_str_t* r = str_alloc(pos);
    memcpy((char*)r->data, out, pos);
    free(out);
    return r;
}

static uint32_t split_limit_from_num(double limit) {
    if (isnan(limit) || limit == 0.0 || isinf(limit)) return 0;
    double integral = limit < 0.0 ? ceil(limit) : floor(limit);
    double mod = fmod(integral, 4294967296.0);
    if (mod < 0.0) mod += 4294967296.0;
    if (mod >= 4294967295.0) return UINT32_MAX;
    return (uint32_t)mod;
}

tsc_array_t* tsc_str_split_limit(const tsc_str_t* s, const tsc_str_t* sep, uint32_t limit) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 4);
    if (limit == 0) return a;
    if (sep->len == 0) {
        for (size_t i = 0; i < s->len && a->len < limit; i++) {
            tsc_str_t* c = str_alloc(1);
            ((char*)c->data)[0] = s->data[i];
            tsc_array_push_raw(a, &c);
        }
        return a;
    }
    size_t i = 0;
    while (i <= s->len && a->len < limit) {
        size_t found = s->len;
        for (size_t j = i; j + sep->len <= s->len; j++) {
            if (memcmp(s->data + j, sep->data, sep->len) == 0) {
                found = j;
                break;
            }
        }
        tsc_str_t* part = str_alloc(found - i);
        memcpy((char*)part->data, s->data + i, found - i);
        tsc_array_push_raw(a, &part);
        if (found == s->len) break;
        i = found + sep->len;
    }
    return a;
}

tsc_array_t* tsc_str_split(const tsc_str_t* s, const tsc_str_t* sep) {
    return tsc_str_split_limit(s, sep, UINT32_MAX);
}

tsc_array_t* tsc_str_split_limit_num(const tsc_str_t* s, const tsc_str_t* sep, double limit) {
    return tsc_str_split_limit(s, sep, split_limit_from_num(limit));
}

tsc_array_t* tsc_str_chars(const tsc_str_t* s) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), s->len ? s->len : 1);
    size_t pos = 0;
    while (pos < s->len) {
        uint32_t cp = 0xfffd;
        size_t adv = 1;
        decode_utf8_at(s, pos, &cp, &adv);
        size_t len = utf8_len_for_code_point(cp);
        tsc_str_t* ch = str_alloc(len);
        write_utf8_code_point((char*)ch->data, cp);
        tsc_array_push_raw(a, &ch);
        pos += adv ? adv : 1;
    }
    return a;
}

/* ---------------- Symbol ---------------- */

typedef struct tsc_symbol_registry_entry {
    tsc_str_t* key;
    tsc_symbol_t* sym;
    struct tsc_symbol_registry_entry* next;
} tsc_symbol_registry_entry_t;

static uint64_t tsc_next_symbol_id = 1;
static tsc_symbol_registry_entry_t* tsc_symbol_registry = NULL;
static tsc_symbol_t* tsc_symbol_iterator_singleton = NULL;
static tsc_symbol_t* tsc_symbol_async_iterator_singleton = NULL;

tsc_symbol_t* tsc_symbol_new(const tsc_str_t* description) {
    tsc_symbol_t* sym = (tsc_symbol_t*)TSC_GC_MALLOC(sizeof(tsc_symbol_t));
    sym->id = tsc_next_symbol_id++;
    sym->description = (tsc_str_t*)description;
    sym->global_key = NULL;
    return sym;
}

tsc_symbol_t* tsc_symbol_for(const tsc_str_t* key) {
    for (tsc_symbol_registry_entry_t* e = tsc_symbol_registry; e; e = e->next) {
        if (tsc_str_eq(e->key, key)) return e->sym;
    }
    tsc_symbol_t* sym = tsc_symbol_new(key);
    sym->global_key = (tsc_str_t*)key;
    tsc_symbol_registry_entry_t* entry =
        (tsc_symbol_registry_entry_t*)TSC_GC_MALLOC(sizeof(tsc_symbol_registry_entry_t));
    entry->key = (tsc_str_t*)key;
    entry->sym = sym;
    entry->next = tsc_symbol_registry;
    tsc_symbol_registry = entry;
    return sym;
}

tsc_str_t* tsc_symbol_key_for(const tsc_symbol_t* sym) {
    return sym ? sym->global_key : NULL;
}

tsc_symbol_t* tsc_symbol_iterator(void) {
    if (!tsc_symbol_iterator_singleton) {
        tsc_symbol_iterator_singleton =
            tsc_symbol_new(tsc_str_from_lit("Symbol.iterator", 15));
    }
    return tsc_symbol_iterator_singleton;
}

tsc_symbol_t* tsc_symbol_async_iterator(void) {
    if (!tsc_symbol_async_iterator_singleton) {
        tsc_symbol_async_iterator_singleton =
            tsc_symbol_new(tsc_str_from_lit("Symbol.asyncIterator", 20));
    }
    return tsc_symbol_async_iterator_singleton;
}

tsc_str_t* tsc_symbol_description(const tsc_symbol_t* sym) {
    return sym ? sym->description : NULL;
}

tsc_str_t* tsc_symbol_to_string(const tsc_symbol_t* sym) {
    if (!sym || !sym->description) return tsc_str_from_lit("Symbol()", 8);
    return tsc_str_concat(
        tsc_str_concat(tsc_str_from_lit("Symbol(", 7), sym->description),
        tsc_str_from_lit(")", 1)
    );
}

/* ---------------- WeakRef ---------------- */

tsc_weakref_t* tsc_weakref_new(void* target) {
    tsc_weakref_t* ref = (tsc_weakref_t*)TSC_GC_MALLOC(sizeof(tsc_weakref_t));
    ref->target = target;
    return ref;
}

void* tsc_weakref_deref(const tsc_weakref_t* ref) {
    return ref ? ref->target : NULL;
}

/* ---------------- FinalizationRegistry ---------------- */

tsc_finregistry_t* tsc_finregistry_new(void) {
    return (tsc_finregistry_t*)TSC_GC_MALLOC(sizeof(tsc_finregistry_t));
}

void tsc_finregistry_register(tsc_finregistry_t* r, void* token) {
    if (!r) return;
    if (r->len == r->cap) {
        size_t ncap = r->cap ? r->cap * 2 : 4;
        r->entries = (tsc_finregistry_entry_t*)TSC_GC_REALLOC(
            r->entries, ncap * sizeof(tsc_finregistry_entry_t));
        r->cap = ncap;
    }
    r->entries[r->len++].unregister_token = token;
}

bool tsc_finregistry_unregister(tsc_finregistry_t* r, void* token) {
    if (!r || !token) return false;
    bool found = false;
    size_t w = 0;
    for (size_t i = 0; i < r->len; i++) {
        if (r->entries[i].unregister_token == token) {
            found = true;
        } else {
            r->entries[w++] = r->entries[i];
        }
    }
    r->len = w;
    return found;
}

/* ---------------- numbers ---------------- */
/* tsc_num_mod is defined as `static inline` in tsc_runtime.h. */

double tsc_parse_float(const tsc_str_t* s) {
    if (!s || s->len == 0) return NAN;
    char buf[64];
    size_t n = s->len < 63 ? s->len : 63;
    memcpy(buf, s->data, n);
    buf[n] = '\0';
    char* end;
    double v = strtod(buf, &end);
    if (end == buf) return NAN;
    return v;
}

double tsc_parse_int(const tsc_str_t* s, double radix) {
    if (!s || s->len == 0) return NAN;
    char buf[64];
    size_t n = s->len < 63 ? s->len : 63;
    memcpy(buf, s->data, n);
    buf[n] = '\0';
    int base = (isfinite(radix) ? (int)radix : 0);
    if (base != 0 && (base < 2 || base > 36)) return NAN;
    if (base == 0) {
        const char* p = buf;
        while (isspace((unsigned char)*p)) p++;
        if (*p == '+' || *p == '-') p++;
        base = (p[0] == '0' && (p[1] == 'x' || p[1] == 'X')) ? 16 : 10;
    }
    char* end;
    long v = strtol(buf, &end, base);
    if (end == buf) return NAN;
    return (double)v;
}

double tsc_math_random(void) {
    return (double)rand() / ((double)RAND_MAX + 1.0);
}

double tsc_math_round(double x) {
    if (isnan(x) || isinf(x) || x == 0.0) return x;
    if (x >= -0.5 && x < 0.0) return -0.0;
    return floor(x + 0.5);
}

double tsc_math_sign(double x) {
    if (isnan(x) || x == 0.0) return x;
    return x > 0.0 ? 1.0 : -1.0;
}

static uint32_t tsc_to_uint32(double n) {
    if (!isfinite(n) || n == 0.0) return 0;
    double i = n < 0.0 ? ceil(n) : floor(n);
    double mod = fmod(i, 4294967296.0);
    if (mod < 0.0) mod += 4294967296.0;
    return (uint32_t)mod;
}

static int32_t tsc_to_int32(double n) {
    uint32_t u = tsc_to_uint32(n);
    return u >= 0x80000000u ? (int32_t)((int64_t)u - 4294967296LL) : (int32_t)u;
}

static int32_t tsc_int32_from_uint32(uint32_t u) {
    return u >= 0x80000000u ? (int32_t)((int64_t)u - 4294967296LL) : (int32_t)u;
}

static int32_t tsc_shift_right_int32(int32_t value, uint32_t shift) {
    if (shift == 0) return value;
    uint32_t u = (uint32_t)value;
    uint32_t shifted = u >> shift;
    if (value < 0) shifted |= ~(UINT32_MAX >> shift);
    return tsc_int32_from_uint32(shifted);
}

double tsc_math_imul(double a, double b) {
    uint32_t ua = (uint32_t)tsc_to_int32(a);
    uint32_t ub = (uint32_t)tsc_to_int32(b);
    uint32_t product = (uint32_t)((uint64_t)ua * (uint64_t)ub);
    int32_t signed_product =
        product >= 0x80000000u ? (int32_t)((int64_t)product - 4294967296LL) : (int32_t)product;
    return (double)signed_product;
}

double tsc_math_clz32(double x) {
    uint32_t u = tsc_to_uint32(x);
    if (u == 0) return 32.0;
    double count = 0.0;
    for (int bit = 31; bit >= 0; bit--) {
        if ((u & (1u << bit)) != 0) break;
        count += 1.0;
    }
    return count;
}

double tsc_math_fround(double x) {
    return (double)(float)x;
}

/* ---------------- BigInt (GMP-backed) ---------------- */

static tsc_bigint_t* bigint_alloc(void) {
    tsc_bigint_t* b = (tsc_bigint_t*)TSC_GC_MALLOC(sizeof(tsc_bigint_t));
    mpz_init(b->value);
    return b;
}

static const char* bigint_digits_for(const char* s, int* base) {
    if (!s) {
        *base = 10;
        return "";
    }
    const char* p = s;
    char sign = '\0';
    if (*p == '-' || *p == '+') {
        sign = *p;
        p++;
    }
    if (p[0] == '0' && (p[1] == 'x' || p[1] == 'X' || p[1] == 'o' || p[1] == 'O' || p[1] == 'b' || p[1] == 'B')) {
        *base = (p[1] == 'x' || p[1] == 'X') ? 16 : (p[1] == 'o' || p[1] == 'O') ? 8 : 2;
        p += 2;
        size_t len = strlen(p);
        char* out = (char*)TSC_GC_MALLOC_ATOMIC(len + (sign ? 2 : 1));
        size_t pos = 0;
        if (sign) out[pos++] = sign;
        memcpy(out + pos, p, len);
        out[pos + len] = '\0';
        return out;
    }
    *base = 10;
    return s;
}

tsc_bigint_t* tsc_bigint_from_lit(const char* lit) {
    tsc_bigint_t* b = bigint_alloc();
    int base = 10;
    const char* digits = bigint_digits_for(lit, &base);
    if (mpz_set_str(b->value, digits, base) != 0) {
        tsc_panic("BigInt: invalid literal");
    }
    return b;
}

tsc_bigint_t* tsc_bigint_from_str(const tsc_str_t* s) {
    char* c = cstr_dup(s);
    tsc_bigint_t* b = bigint_alloc();
    int base = 10;
    const char* digits = bigint_digits_for(c, &base);
    if (mpz_set_str(b->value, digits, base) != 0) {
        tsc_panic("BigInt: invalid string");
    }
    return b;
}

tsc_bigint_t* tsc_bigint_from_num(double n) {
    if (isnan(n) || isinf(n) || floor(n) != n) {
        tsc_panic("BigInt: number must be a finite integer");
    }
    tsc_bigint_t* b = bigint_alloc();
    mpz_set_d(b->value, n);
    return b;
}

tsc_bigint_t* tsc_bigint_from_bool(bool v) {
    tsc_bigint_t* b = bigint_alloc();
    mpz_set_ui(b->value, v ? 1u : 0u);
    return b;
}

tsc_bigint_t* tsc_bigint_neg(const tsc_bigint_t* a) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_neg(r->value, a->value);
    return r;
}

tsc_bigint_t* tsc_bigint_add(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_add(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_sub(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_sub(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_mul(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_mul(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_div(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    if (mpz_sgn(b->value) == 0) tsc_panic("BigInt: division by zero");
    tsc_bigint_t* r = bigint_alloc();
    mpz_tdiv_q(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_mod(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    if (mpz_sgn(b->value) == 0) tsc_panic("BigInt: modulo by zero");
    tsc_bigint_t* r = bigint_alloc();
    mpz_tdiv_r(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_pow(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    if (mpz_sgn(b->value) < 0) tsc_panic("BigInt: negative exponent");
    if (!mpz_fits_ulong_p(b->value)) tsc_panic("BigInt: exponent too large");
    tsc_bigint_t* r = bigint_alloc();
    mpz_pow_ui(r->value, a->value, mpz_get_ui(b->value));
    return r;
}

int tsc_bigint_cmp(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    return mpz_cmp(a->value, b->value);
}

bool tsc_bigint_eq(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    return mpz_cmp(a->value, b->value) == 0;
}

tsc_str_t* tsc_bigint_to_string(const tsc_bigint_t* a, double radix) {
    int base = isnan(radix) || radix == 0.0 ? 10 : (int)radix;
    if (base < 2 || base > 36) tsc_panic("BigInt.toString: radix must be 2..36");
    char* raw = mpz_get_str(NULL, base, a->value);
    tsc_str_t* out = tsc_str_from_cstr(raw);
    free(raw);
    return out;
}

tsc_bigint_t* tsc_process_hrtime_bigint(void) {
    struct timespec now;
    if (clock_gettime(CLOCK_MONOTONIC, &now) != 0) {
        now.tv_sec = 0;
        now.tv_nsec = 0;
    }
    tsc_bigint_t* out = bigint_alloc();
    mpz_set_ui(out->value, (unsigned long)now.tv_sec);
    mpz_mul_ui(out->value, out->value, 1000000000ul);
    mpz_add_ui(out->value, out->value, (unsigned long)now.tv_nsec);
    return out;
}

/* ---------------- RegExp (PCRE2-backed) ---------------- */

tsc_regexp_t* tsc_regexp_new(const tsc_str_t* pattern, const tsc_str_t* flags) {
    tsc_regexp_t* r = (tsc_regexp_t*)TSC_GC_MALLOC(sizeof(tsc_regexp_t));
    r->source = (tsc_str_t*)pattern;
    r->flags = (tsc_str_t*)flags;
    r->global = false;
    r->has_indices = false;
    r->ignore_case = false;
    r->multiline = false;
    r->dot_all = false;
    r->sticky = false;
    r->unicode = false;
    r->compiled = false;
    r->jit = false;
    r->cached_md = NULL;
    r->capture_count = 0;
    if (flags) {
        for (size_t i = 0; i < flags->len; i++) {
            switch (flags->data[i]) {
                case 'd': r->has_indices = true; break;
                case 'g': r->global = true; break;
                case 'i': r->ignore_case = true; break;
                case 'm': r->multiline = true; break;
                case 's': r->dot_all = true; break;
                case 'y': r->sticky = true; break;
                case 'u': r->unicode = true; break;
            }
        }
    }
    uint32_t opts = PCRE2_UTF | PCRE2_UCP;
    if (r->ignore_case) opts |= PCRE2_CASELESS;
    if (r->multiline) opts |= PCRE2_MULTILINE;
    if (r->dot_all) opts |= PCRE2_DOTALL;
    int error = 0;
    PCRE2_SIZE error_offset = 0;
    r->re = pcre2_compile((PCRE2_SPTR)pattern->data, pattern->len, opts, &error, &error_offset, NULL);
    if (r->re) {
        r->compiled = true;
        uint32_t captures = 0;
        if (pcre2_pattern_info(r->re, PCRE2_INFO_CAPTURECOUNT, &captures) == 0) {
            r->capture_count = captures;
        }
        /* JIT-compile if available; failure is non-fatal — we fall back to interpreter. */
        if (pcre2_jit_compile(r->re, PCRE2_JIT_COMPLETE) == 0) {
            r->jit = true;
        }
    }
    return r;
}

tsc_str_t* tsc_regexp_escape(const tsc_str_t* input) {
    static const char* hex = "0123456789abcdef";
    tsc_str_t* out = str_alloc(input->len * 4);
    char* dst = (char*)out->data;
    size_t pos = 0;
    for (size_t i = 0; i < input->len; i++) {
        unsigned char c = (unsigned char)input->data[i];
        bool leading_alnum = i == 0 && ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z'));
        if (leading_alnum) {
            dst[pos++] = '\\';
            dst[pos++] = 'x';
            dst[pos++] = hex[c >> 4];
            dst[pos++] = hex[c & 0x0f];
            continue;
        }
        switch (c) {
            case '^':
            case '$':
            case '\\':
            case '.':
            case '*':
            case '+':
            case '?':
            case '(':
            case ')':
            case '[':
            case ']':
            case '{':
            case '}':
            case '|':
            case '/':
                dst[pos++] = '\\';
                dst[pos++] = (char)c;
                break;
            case '\n':
                dst[pos++] = '\\';
                dst[pos++] = 'n';
                break;
            case '\r':
                dst[pos++] = '\\';
                dst[pos++] = 'r';
                break;
            case '\t':
                dst[pos++] = '\\';
                dst[pos++] = 't';
                break;
            case '\f':
                dst[pos++] = '\\';
                dst[pos++] = 'f';
                break;
            case '\v':
                dst[pos++] = '\\';
                dst[pos++] = 'v';
                break;
            case '-':
            case ' ':
            case ',':
            case '=':
            case '<':
            case '>':
            case '#':
            case '&':
            case '!':
            case '%':
            case ':':
            case ';':
            case '@':
            case '~':
            case '\'':
            case '`':
            case '"':
                dst[pos++] = '\\';
                dst[pos++] = 'x';
                dst[pos++] = hex[c >> 4];
                dst[pos++] = hex[c & 0x0f];
                break;
            default:
                if (c < 0x20 || c == 0x7f) {
                    dst[pos++] = '\\';
                    dst[pos++] = 'x';
                    dst[pos++] = hex[c >> 4];
                    dst[pos++] = hex[c & 0x0f];
                } else {
                    dst[pos++] = (char)c;
                }
                break;
        }
    }
    dst[pos] = '\0';
    out->len = pos;
    return out;
}

/* Helper: get or lazily allocate the regex's cached match_data buffer. */
static pcre2_match_data* re_md(const tsc_regexp_t* re) {
    if (!re->cached_md) {
        ((tsc_regexp_t*)re)->cached_md =
            pcre2_match_data_create_from_pattern(re->re, NULL);
    }
    return re->cached_md;
}

static inline int re_match(
    const tsc_regexp_t* re,
    const tsc_str_t* s,
    size_t offset,
    uint32_t options,
    pcre2_match_data* md
) {
    if (re->jit) {
        return pcre2_jit_match(re->re, (PCRE2_SPTR)s->data, s->len, offset, options, md, NULL);
    }
    return pcre2_match(re->re, (PCRE2_SPTR)s->data, s->len, offset, options, md, NULL);
}

/* tsc_regexp_test is now `static inline` in tsc_runtime.h. */

tsc_array_t* tsc_regexp_exec(const tsc_regexp_t* re, const tsc_str_t* s) {
    if (!re->compiled) return NULL;
    pcre2_match_data* md = re_md(re);
    int rc = re_match(re, s, 0, 0, md);
    if (rc < 0) return NULL;
    PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
    if (ovec[0] == PCRE2_UNSET) return NULL;
    size_t nmatch = (size_t)rc;
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), nmatch ? nmatch : 1);
    for (size_t i = 0; i < nmatch; i++) {
        tsc_str_t* part;
        if (ovec[2 * i] == PCRE2_UNSET) {
            part = tsc_str_from_lit("", 0);
        } else {
            size_t n = (size_t)(ovec[2 * i + 1] - ovec[2 * i]);
            part = str_alloc(n);
            memcpy((char*)part->data, s->data + ovec[2 * i], n);
        }
        tsc_array_push_raw(a, &part);
    }
    return a;
}

tsc_str_t* tsc_regexp_to_string(const tsc_regexp_t* re) {
    tsc_str_t* head = tsc_str_concat(tsc_str_from_lit("/", 1), re->source);
    tsc_str_t* tail = tsc_str_concat(tsc_str_from_lit("/", 1), re->flags);
    return tsc_str_concat(head, tail);
}

tsc_array_t* tsc_str_match_regex(const tsc_str_t* s, const tsc_regexp_t* re) {
    if (!re->compiled) return NULL;
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 4);
    pcre2_match_data* md = re_md(re);
    size_t offset = 0;
    while (offset <= s->len) {
        int rc = re_match(re, s, offset, offset == 0 ? 0 : PCRE2_NOTBOL, md);
        if (rc < 0) break;
        PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
        if (ovec[0] == PCRE2_UNSET) break;
        if (!re->global) {
            size_t nmatch = (size_t)rc;
            for (size_t i = 0; i < nmatch; i++) {
                tsc_str_t* part;
                if (ovec[2 * i] == PCRE2_UNSET) {
                    part = tsc_str_from_lit("", 0);
                } else {
                    size_t n = (size_t)(ovec[2 * i + 1] - ovec[2 * i]);
                    part = str_alloc(n);
                    memcpy((char*)part->data, s->data + ovec[2 * i], n);
                }
                tsc_array_push_raw(a, &part);
            }
            break;
        }
        size_t n = (size_t)(ovec[1] - ovec[0]);
        tsc_str_t* match = str_alloc(n);
        memcpy((char*)match->data, s->data + ovec[0], n);
        tsc_array_push_raw(a, &match);
        if (ovec[1] == ovec[0]) {
            if (offset < s->len) offset = (size_t)ovec[1] + 1;
            else break;
        } else {
            offset = (size_t)ovec[1];
        }
    }
    return a->len > 0 ? a : NULL;
}

tsc_array_t* tsc_str_match_all_regex(const tsc_str_t* s, const tsc_regexp_t* re) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_array_t*), 4);
    if (!re->compiled) return out;
    pcre2_match_data* md = re_md(re);
    size_t offset = 0;
    while (offset <= s->len) {
        int rc = re_match(re, s, offset, offset == 0 ? 0 : PCRE2_NOTBOL, md);
        if (rc < 0) break;
        PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
        if (ovec[0] == PCRE2_UNSET) break;
        size_t nmatch = (size_t)rc;
        tsc_array_t* group = tsc_array_new(sizeof(tsc_str_t*), nmatch);
        for (size_t i = 0; i < nmatch; i++) {
            tsc_str_t* part;
            if (ovec[2 * i] == PCRE2_UNSET) {
                part = tsc_str_from_lit("", 0);
            } else {
                size_t n = (size_t)(ovec[2 * i + 1] - ovec[2 * i]);
                part = str_alloc(n);
                memcpy((char*)part->data, s->data + ovec[2 * i], n);
            }
            tsc_array_push_raw(group, &part);
        }
        tsc_array_push_raw(out, &group);
        if (ovec[1] == ovec[0]) {
            if (offset < s->len) offset = (size_t)ovec[1] + 1;
            else break;
        } else {
            offset = (size_t)ovec[1];
        }
    }
    return out;
}

double tsc_str_search_regex(const tsc_str_t* s, const tsc_regexp_t* re) {
    if (!re->compiled) return -1.0;
    pcre2_match_data* md = re_md(re);
    int rc = re_match(re, s, 0, 0, md);
    if (rc < 0) return -1.0;
    PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
    if (ovec[0] == PCRE2_UNSET) return -1.0;
    return (double)ovec[0];
}

static void replace_append(char** out, size_t* pos, size_t* cap, const char* data, size_t len) {
    if (len == 0) return;
    if (*pos + len >= *cap) {
        *cap = *pos + len + 64;
        *out = (char*)realloc(*out, *cap);
    }
    memcpy(*out + *pos, data, len);
    *pos += len;
}

static void replace_append_string_expanded(
    char** out,
    size_t* pos,
    size_t* cap,
    const tsc_str_t* source,
    const tsc_str_t* repl,
    size_t start,
    size_t end
) {
    for (size_t i = 0; i < repl->len; i++) {
        char ch = repl->data[i];
        if (ch != '$' || i + 1 >= repl->len) {
            replace_append(out, pos, cap, &ch, 1);
            continue;
        }
        char next = repl->data[++i];
        if (next == '$') {
            replace_append(out, pos, cap, "$", 1);
        } else if (next == '&') {
            replace_append(out, pos, cap, source->data + start, end - start);
        } else if (next == '`') {
            replace_append(out, pos, cap, source->data, start);
        } else if (next == '\'') {
            replace_append(out, pos, cap, source->data + end, source->len - end);
        } else {
            replace_append(out, pos, cap, "$", 1);
            replace_append(out, pos, cap, &next, 1);
        }
    }
}

static void replace_append_expanded(
    char** out,
    size_t* pos,
    size_t* cap,
    const tsc_str_t* source,
    const tsc_str_t* repl,
    const PCRE2_SIZE* ovec,
    int rc
) {
    for (size_t i = 0; i < repl->len; i++) {
        char ch = repl->data[i];
        if (ch != '$' || i + 1 >= repl->len) {
            replace_append(out, pos, cap, &ch, 1);
            continue;
        }
        char next = repl->data[++i];
        if (next == '$') {
            replace_append(out, pos, cap, "$", 1);
        } else if (next == '&') {
            replace_append(out, pos, cap, source->data + ovec[0], (size_t)(ovec[1] - ovec[0]));
        } else if (next == '`') {
            replace_append(out, pos, cap, source->data, (size_t)ovec[0]);
        } else if (next == '\'') {
            replace_append(out, pos, cap, source->data + ovec[1], source->len - (size_t)ovec[1]);
        } else if (next >= '1' && next <= '9') {
            int group = next - '0';
            if (group < rc) {
                PCRE2_SIZE start = ovec[(size_t)group * 2];
                PCRE2_SIZE end = ovec[(size_t)group * 2 + 1];
                if (start != PCRE2_UNSET && end != PCRE2_UNSET) {
                    replace_append(out, pos, cap, source->data + start, (size_t)(end - start));
                }
            } else {
                replace_append(out, pos, cap, "$", 1);
                replace_append(out, pos, cap, &next, 1);
            }
        } else {
            replace_append(out, pos, cap, "$", 1);
            replace_append(out, pos, cap, &next, 1);
        }
    }
}

tsc_str_t* tsc_str_replace_regex(const tsc_str_t* s, const tsc_regexp_t* re, const tsc_str_t* repl) {
    if (!re->compiled) return (tsc_str_t*)s;
    size_t cap = s->len + 64;
    char* out = (char*)malloc(cap);
    size_t pos = 0;
    size_t offset = 0;
    pcre2_match_data* md = re_md(re);
    while (offset <= s->len) {
        int rc = re_match(re, s, offset, offset == 0 ? 0 : PCRE2_NOTBOL, md);
        if (rc < 0) {
            size_t n = s->len - offset;
            if (pos + n >= cap) { cap = pos + n + 32; out = (char*)realloc(out, cap); }
            memcpy(out + pos, s->data + offset, n);
            pos += n;
            break;
        }
        PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
        if (ovec[0] == PCRE2_UNSET) break;
        size_t pre = (size_t)ovec[0] - offset;
        replace_append(&out, &pos, &cap, s->data + offset, pre);
        replace_append_expanded(&out, &pos, &cap, s, repl, ovec, rc);
        if (ovec[1] == ovec[0]) {
            if (ovec[1] < s->len) {
                replace_append(&out, &pos, &cap, s->data + ovec[1], 1);
                offset = (size_t)ovec[1] + 1;
            } else {
                break;
            }
        } else {
            offset = (size_t)ovec[1];
        }
        if (!re->global) {
            size_t n = s->len - offset;
            if (pos + n >= cap) { cap = pos + n + 32; out = (char*)realloc(out, cap); }
            memcpy(out + pos, s->data + offset, n);
            pos += n;
            break;
        }
    }
    tsc_str_t* r = str_alloc(pos);
    memcpy((char*)r->data, out, pos);
    free(out);
    return r;
}

tsc_array_t* tsc_str_split_regex_limit(const tsc_str_t* s, const tsc_regexp_t* re, uint32_t limit) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 4);
    if (limit == 0) return a;
    if (!re->compiled) {
        tsc_str_t* copy = str_alloc(s->len);
        memcpy((char*)copy->data, s->data, s->len);
        tsc_array_push_raw(a, &copy);
        return a;
    }
    size_t offset = 0;
    pcre2_match_data* md = re_md(re);
    while (offset <= s->len && a->len < limit) {
        int rc = re_match(re, s, offset, offset == 0 ? 0 : PCRE2_NOTBOL, md);
        if (rc < 0) break;
        PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
        if (ovec[0] == PCRE2_UNSET) break;
        size_t pre = (size_t)ovec[0] - offset;
        tsc_str_t* part = str_alloc(pre);
        if (pre > 0) memcpy((char*)part->data, s->data + offset, pre);
        tsc_array_push_raw(a, &part);
        if (a->len >= limit) return a;
        for (int group = 1; group < rc && a->len < limit; group++) {
            PCRE2_SIZE start = ovec[group * 2];
            PCRE2_SIZE end = ovec[group * 2 + 1];
            if (start == PCRE2_UNSET || end == PCRE2_UNSET) continue;
            size_t cap_len = (size_t)(end - start);
            tsc_str_t* captured = str_alloc(cap_len);
            if (cap_len > 0) memcpy((char*)captured->data, s->data + start, cap_len);
            tsc_array_push_raw(a, &captured);
        }
        if (a->len >= limit) return a;
        if (ovec[1] == ovec[0]) {
            if (ovec[1] < s->len) offset = (size_t)ovec[1] + 1;
            else break;
        } else {
            offset = (size_t)ovec[1];
        }
    }
    if (a->len < limit) {
        size_t n = s->len - offset;
        tsc_str_t* tail = str_alloc(n);
        if (n > 0) memcpy((char*)tail->data, s->data + offset, n);
        tsc_array_push_raw(a, &tail);
    }
    return a;
}

tsc_array_t* tsc_str_split_regex(const tsc_str_t* s, const tsc_regexp_t* re) {
    return tsc_str_split_regex_limit(s, re, UINT32_MAX);
}

tsc_array_t* tsc_str_split_regex_limit_num(const tsc_str_t* s, const tsc_regexp_t* re, double limit) {
    return tsc_str_split_regex_limit(s, re, split_limit_from_num(limit));
}

/* ---------------- crypto ---------------- */

struct tsc_hash {
    const EVP_MD* md;
    EVP_MD_CTX* ctx;
    bool finalized;
    size_t digest_len;
    unsigned char digest[EVP_MAX_MD_SIZE];
};

tsc_hash_t* tsc_crypto_create_hash(const tsc_str_t* algorithm) {
    const EVP_MD* md = NULL;
    if (str_lit_eq(algorithm, "sha1")) {
        md = EVP_sha1();
    } else if (str_lit_eq(algorithm, "sha256")) {
        md = EVP_sha256();
    } else if (str_lit_eq(algorithm, "sha512")) {
        md = EVP_sha512();
    } else {
        tsc_panic("crypto.createHash: only sha1, sha256, and sha512 are supported");
    }

    tsc_hash_t* h = (tsc_hash_t*)TSC_GC_MALLOC(sizeof(tsc_hash_t));
    h->md = md;
    h->ctx = EVP_MD_CTX_new();
    h->finalized = false;
    memset(h->digest, 0, sizeof h->digest);
    int digest_size = EVP_MD_size(md);
    if (!h->ctx || digest_size <= 0 || (size_t)digest_size > sizeof h->digest) {
        tsc_panic("crypto.createHash: could not initialize digest");
    }
    h->digest_len = (size_t)digest_size;
    if (EVP_DigestInit_ex(h->ctx, h->md, NULL) != 1) {
        EVP_MD_CTX_free(h->ctx);
        h->ctx = NULL;
        tsc_panic("crypto.createHash: could not initialize digest");
    }
    return h;
}

tsc_buffer_t* tsc_crypto_random_bytes(double size) {
    if (isnan(size) || isinf(size) || size < 0) {
        tsc_panic("crypto.randomBytes size must be a non-negative finite number");
    }
    tsc_buffer_t* out = tsc_buffer_alloc(size, 0);
    if (out->len == 0) return out;
    if (RAND_bytes(out->data, (int)out->len) != 1) {
        for (size_t i = 0; i < out->len; i++) {
            out->data[i] = (uint8_t)(rand() & 0xff);
        }
    }
    return out;
}

tsc_str_t* tsc_crypto_random_uuid(void) {
    tsc_buffer_t* bytes = tsc_crypto_random_bytes(16.0);
    bytes->data[6] = (uint8_t)((bytes->data[6] & 0x0fu) | 0x40u);
    bytes->data[8] = (uint8_t)((bytes->data[8] & 0x3fu) | 0x80u);
    static const char hex[] = "0123456789abcdef";
    tsc_str_t* out = str_alloc(36);
    char* p = (char*)out->data;
    size_t pos = 0;
    for (size_t i = 0; i < 16; i++) {
        if (i == 4 || i == 6 || i == 8 || i == 10) p[pos++] = '-';
        p[pos++] = hex[bytes->data[i] >> 4];
        p[pos++] = hex[bytes->data[i] & 0x0f];
    }
    return out;
}

static void hash_update_bytes(tsc_hash_t* h, const void* data, size_t len) {
    if (h->finalized) return;
    if (len == 0) return;
    if (!h->ctx || EVP_DigestUpdate(h->ctx, data, len) != 1) {
        tsc_panic("Hash.update: could not update digest");
    }
}

tsc_hash_t* tsc_hash_update(tsc_hash_t* h, const tsc_str_t* data) {
    hash_update_bytes(h, data->data, data->len);
    return h;
}

tsc_hash_t* tsc_hash_update_buffer(tsc_hash_t* h, const tsc_buffer_t* data) {
    if (data) hash_update_bytes(h, data->data, data->len);
    return h;
}

tsc_str_t* tsc_hash_digest(tsc_hash_t* h, const tsc_str_t* encoding) {
    bool use_hex = str_lit_eq(encoding, "hex");
    bool use_base64 = str_lit_eq(encoding, "base64");
    if (!use_hex && !use_base64) {
        tsc_panic("Hash.digest: only hex and base64 encodings are supported");
    }
    if (!h->finalized) {
        unsigned int digest_len = 0;
        if (!h->ctx || EVP_DigestFinal_ex(h->ctx, h->digest, &digest_len) != 1) {
            tsc_panic("Hash.digest: could not finalize digest");
        }
        h->digest_len = (size_t)digest_len;
        EVP_MD_CTX_free(h->ctx);
        h->ctx = NULL;
        h->finalized = true;
    }
    if (use_base64) {
        return str_from_base64_bytes(h->digest, h->digest_len);
    }
    static const char hex[] = "0123456789abcdef";
    tsc_str_t* out = str_alloc(h->digest_len * 2);
    char* p = (char*)out->data;
    for (size_t i = 0; i < h->digest_len; i++) {
        p[i * 2] = hex[h->digest[i] >> 4];
        p[i * 2 + 1] = hex[h->digest[i] & 0x0f];
    }
    return out;
}

tsc_buffer_t* tsc_child_process_exec_sync(const tsc_str_t* command, const tsc_str_t* cwd, const tsc_str_t* input, const tsc_array_t* env, const tsc_str_t* shell, double uid, double gid, double max_buffer, double timeout_ms, int timeout_signal) {
    if (!command) tsc_panic("child_process.execSync command required");
    tsc_array_t* args = tsc_array_new(sizeof(tsc_str_t*), 2);
    tsc_str_t* flag = tsc_str_from_lit("-c", 2);
    tsc_str_t* cmd = (tsc_str_t*)command;
    tsc_array_push_raw(args, &flag);
    tsc_array_push_raw(args, &cmd);
    return tsc_child_process_exec_file_sync(shell ? shell : tsc_str_from_lit("/bin/sh", 7), args, cwd, input, env, NULL, NULL, uid, gid, max_buffer, timeout_ms, timeout_signal);
}

static tsc_array_t* child_shell_args(const tsc_str_t* command, const tsc_array_t* args);
static void child_capture_append(uint8_t** data, size_t* len, size_t* cap, const uint8_t* chunk, size_t n);
static void child_capture_append_limited(uint8_t** data, size_t* len, size_t* cap, const uint8_t* chunk, size_t n, size_t max_len, bool* exceeded);

static double child_now_millis(void) {
    struct timespec ts;
    if (clock_gettime(CLOCK_MONOTONIC, &ts) != 0) return 0.0;
    return (double)ts.tv_sec * 1000.0 + (double)ts.tv_nsec / 1000000.0;
}

static void child_apply_env(const tsc_array_t* env) {
    if (!env) return;
    for (size_t i = 0; i < env->len; i++) {
        tsc_str_t* pair = TSC_ARR(tsc_str_t*, env, i);
        if (!pair) continue;
        char* raw = cstr_dup(pair);
        (void)putenv(raw);
    }
}

static bool child_has_id_option(double value) {
    return !isnan(value) && !isinf(value) && value >= 0.0;
}

static int child_apply_ids(double uid, double gid) {
    if (child_has_id_option(gid) && setgid((gid_t)gid) != 0) return errno;
    if (child_has_id_option(uid) && setuid((uid_t)uid) != 0) return errno;
    return 0;
}

static size_t child_max_buffer_limit(double max_buffer) {
    if (isnan(max_buffer) || isinf(max_buffer) || max_buffer < 0.0) return SIZE_MAX;
    if (max_buffer >= (double)SIZE_MAX) return SIZE_MAX;
    return (size_t)floor(max_buffer);
}

tsc_buffer_t* tsc_child_process_exec_file_sync(const tsc_str_t* file, const tsc_array_t* args, const tsc_str_t* cwd, const tsc_str_t* input, const tsc_array_t* env, const tsc_str_t* shell, const tsc_str_t* argv0, double uid, double gid, double max_buffer, double timeout_ms, int timeout_signal) {
    if (!file) tsc_panic("child_process.execFileSync file required");
    const tsc_str_t* actual_file = file;
    const tsc_array_t* actual_args = args;
    if (shell) {
        actual_file = shell;
        actual_args = child_shell_args(file, args);
    }
    int out_pipe[2];
    int err_pipe[2];
    int in_pipe[2] = { -1, -1 };
    if (pipe(out_pipe) != 0) tsc_panic("child_process.execFileSync pipe failed");
    if (pipe(err_pipe) != 0) {
        close(out_pipe[0]);
        close(out_pipe[1]);
        tsc_panic("child_process.execFileSync stderr pipe failed");
    }
    if (input && pipe(in_pipe) != 0) {
        close(out_pipe[0]);
        close(out_pipe[1]);
        close(err_pipe[0]);
        close(err_pipe[1]);
        tsc_panic("child_process.execFileSync stdin pipe failed");
    }

    pid_t pid = fork();
    if (pid < 0) {
        close(out_pipe[0]);
        close(out_pipe[1]);
        close(err_pipe[0]);
        close(err_pipe[1]);
        if (input) {
            close(in_pipe[0]);
            close(in_pipe[1]);
        }
        tsc_panic("child_process.execFileSync fork failed");
    }
    if (pid == 0) {
        close(out_pipe[0]);
        close(err_pipe[0]);
        if (input) close(in_pipe[1]);
        if (dup2(out_pipe[1], STDOUT_FILENO) < 0) _exit(127);
        if (dup2(err_pipe[1], STDERR_FILENO) < 0) _exit(127);
        if (input && dup2(in_pipe[0], STDIN_FILENO) < 0) _exit(127);
        close(out_pipe[1]);
        close(err_pipe[1]);
        if (input) close(in_pipe[0]);
        if (cwd) {
            char* cwd_cstr = cstr_dup(cwd);
            if (chdir(cwd_cstr) != 0) _exit(127);
            free(cwd_cstr);
        }
        child_apply_env(env);
        if (child_apply_ids(uid, gid) != 0) _exit(127);

        size_t argc = 1 + (actual_args ? actual_args->len : 0);
        char** argv = (char**)calloc(argc + 1, sizeof(char*));
        if (!argv) _exit(127);
        argv[0] = cstr_dup(argv0 ? argv0 : actual_file);
        for (size_t i = 1; i < argc; i++) {
            tsc_str_t* arg = TSC_ARR(tsc_str_t*, actual_args, i - 1);
            argv[i] = cstr_dup(arg ? arg : tsc_str_from_lit("", 0));
        }
        argv[argc] = NULL;
        char* exec_file = cstr_dup(actual_file);
        execvp(exec_file, argv);
        _exit(127);
    }

    close(out_pipe[1]);
    close(err_pipe[1]);
    if (input) {
        close(in_pipe[0]);
        size_t written = 0;
        while (written < input->len) {
            ssize_t n = write(in_pipe[1], input->data + written, input->len - written);
            if (n > 0) {
                written += (size_t)n;
            } else if (n < 0 && errno == EINTR) {
                continue;
            } else {
                break;
            }
        }
        close(in_pipe[1]);
    }

    size_t len = 0;
    size_t cap = 256;
    size_t stderr_len = 0;
    size_t stderr_cap = 256;
    uint8_t* data = (uint8_t*)malloc(cap);
    uint8_t* stderr_data = (uint8_t*)malloc(stderr_cap);
    if (!data || !stderr_data) tsc_panic("child_process.execFileSync out of memory");

    struct pollfd fds[2];
    fds[0].fd = out_pipe[0];
    fds[0].events = POLLIN;
    fds[1].fd = err_pipe[0];
    fds[1].events = POLLIN;
    int open_fds = 2;
    bool timed_out = false;
    bool max_buffer_exceeded = false;
    bool killed_for_max_buffer = false;
    size_t max_buffer_len = child_max_buffer_limit(max_buffer);
    int kill_signal = timeout_signal > 0 ? timeout_signal : SIGTERM;
    double deadline = (!isnan(timeout_ms) && !isinf(timeout_ms) && timeout_ms >= 0.0)
        ? child_now_millis() + timeout_ms
        : -1.0;
    while (open_fds > 0) {
        int poll_timeout = -1;
        if (!timed_out && deadline >= 0.0) {
            double remaining = deadline - child_now_millis();
            if (remaining <= 0.0) {
                (void)kill(pid, kill_signal);
                timed_out = true;
            } else if (remaining > (double)INT_MAX) {
                poll_timeout = INT_MAX;
            } else {
                poll_timeout = (int)ceil(remaining);
                if (poll_timeout < 1) poll_timeout = 1;
            }
        }
        int rc = poll(fds, 2, poll_timeout);
        if (rc < 0) {
            if (errno == EINTR) continue;
            free(data);
            free(stderr_data);
            tsc_panic("child_process.execFileSync poll failed");
        }
        if (rc == 0 && !timed_out && deadline >= 0.0) {
            (void)kill(pid, kill_signal);
            timed_out = true;
            continue;
        }
        for (int i = 0; i < 2; i++) {
            if (fds[i].fd < 0) continue;
            if ((fds[i].revents & (POLLIN | POLLHUP | POLLERR)) == 0) continue;
            uint8_t chunk[256];
            ssize_t n = read(fds[i].fd, chunk, sizeof(chunk));
            if (n > 0) {
                if (i == 0) {
                    child_capture_append_limited(&data, &len, &cap, chunk, (size_t)n, max_buffer_len, &max_buffer_exceeded);
                } else {
                    child_capture_append_limited(&stderr_data, &stderr_len, &stderr_cap, chunk, (size_t)n, max_buffer_len, &max_buffer_exceeded);
                }
                if (max_buffer_exceeded && !killed_for_max_buffer && !timed_out) {
                    (void)kill(pid, SIGTERM);
                    killed_for_max_buffer = true;
                }
            } else if (n == 0) {
                close(fds[i].fd);
                fds[i].fd = -1;
                open_fds--;
            } else if (errno != EINTR) {
                free(data);
                free(stderr_data);
                tsc_panic("child_process.execFileSync failed while reading output");
            }
        }
    }

    int status = 0;
    while (waitpid(pid, &status, 0) < 0) {
        if (errno != EINTR) {
            free(data);
            free(stderr_data);
            tsc_panic("child_process.execFileSync wait failed");
        }
    }
    if (timed_out) {
        free(data);
        free(stderr_data);
        tsc_panic("child_process.execFileSync command timed out");
    }
    if (max_buffer_exceeded) {
        free(data);
        free(stderr_data);
        tsc_panic("child_process.execFileSync maxBuffer exceeded");
    }
    if (!WIFEXITED(status) || WEXITSTATUS(status) != 0) {
        free(data);
        free(stderr_data);
        tsc_panic("child_process.execFileSync command failed");
    }

    tsc_buffer_t* out = tsc_buffer_alloc((double)len, 0);
    if (len > 0) memcpy(out->data, data, len);
    free(data);
    free(stderr_data);
    return out;
}

static void child_capture_append(uint8_t** data, size_t* len, size_t* cap, const uint8_t* chunk, size_t n) {
    if (*len + n > *cap) {
        while (*len + n > *cap) *cap *= 2;
        *data = (uint8_t*)realloc(*data, *cap);
        if (!*data) tsc_panic("child_process.spawnSync out of memory");
    }
    memcpy(*data + *len, chunk, n);
    *len += n;
}

static void child_capture_append_limited(uint8_t** data, size_t* len, size_t* cap, const uint8_t* chunk, size_t n, size_t max_len, bool* exceeded) {
    size_t remaining = *len < max_len ? max_len - *len : 0;
    size_t take = n < remaining ? n : remaining;
    if (take > 0) child_capture_append(data, len, cap, chunk, take);
    if (take < n) *exceeded = true;
}

static tsc_str_t* child_capture_string(const uint8_t* data, size_t len) {
    tsc_str_t* out = str_alloc(len);
    if (len > 0) memcpy((char*)out->data, data, len);
    return out;
}

static tsc_str_t* child_signal_name(int sig) {
    switch (sig) {
#ifdef SIGHUP
        case SIGHUP: return tsc_str_from_lit("SIGHUP", 6);
#endif
#ifdef SIGINT
        case SIGINT: return tsc_str_from_lit("SIGINT", 6);
#endif
#ifdef SIGQUIT
        case SIGQUIT: return tsc_str_from_lit("SIGQUIT", 7);
#endif
#ifdef SIGILL
        case SIGILL: return tsc_str_from_lit("SIGILL", 6);
#endif
#ifdef SIGTRAP
        case SIGTRAP: return tsc_str_from_lit("SIGTRAP", 7);
#endif
#ifdef SIGABRT
        case SIGABRT: return tsc_str_from_lit("SIGABRT", 7);
#endif
#ifdef SIGBUS
        case SIGBUS: return tsc_str_from_lit("SIGBUS", 6);
#endif
#ifdef SIGFPE
        case SIGFPE: return tsc_str_from_lit("SIGFPE", 6);
#endif
#ifdef SIGKILL
        case SIGKILL: return tsc_str_from_lit("SIGKILL", 7);
#endif
#ifdef SIGUSR1
        case SIGUSR1: return tsc_str_from_lit("SIGUSR1", 7);
#endif
#ifdef SIGSEGV
        case SIGSEGV: return tsc_str_from_lit("SIGSEGV", 7);
#endif
#ifdef SIGUSR2
        case SIGUSR2: return tsc_str_from_lit("SIGUSR2", 7);
#endif
#ifdef SIGPIPE
        case SIGPIPE: return tsc_str_from_lit("SIGPIPE", 7);
#endif
#ifdef SIGALRM
        case SIGALRM: return tsc_str_from_lit("SIGALRM", 7);
#endif
#ifdef SIGTERM
        case SIGTERM: return tsc_str_from_lit("SIGTERM", 7);
#endif
        default: return tsc_str_from_lit("SIGUNKNOWN", 10);
    }
}

static tsc_str_t* child_errno_name(int err) {
    switch (err) {
#ifdef EACCES
        case EACCES: return tsc_str_from_lit("EACCES", 6);
#endif
#ifdef ELOOP
        case ELOOP: return tsc_str_from_lit("ELOOP", 5);
#endif
#ifdef ENAMETOOLONG
        case ENAMETOOLONG: return tsc_str_from_lit("ENAMETOOLONG", 12);
#endif
#ifdef ENOENT
        case ENOENT: return tsc_str_from_lit("ENOENT", 6);
#endif
#ifdef ENOEXEC
        case ENOEXEC: return tsc_str_from_lit("ENOEXEC", 7);
#endif
#ifdef ENOMEM
        case ENOMEM: return tsc_str_from_lit("ENOMEM", 6);
#endif
#ifdef ENOTDIR
        case ENOTDIR: return tsc_str_from_lit("ENOTDIR", 7);
#endif
        default: return tsc_str_from_lit("EUNKNOWN", 8);
    }
}

static tsc_str_t* child_shell_quote_arg(const tsc_str_t* arg) {
    if (!arg) return tsc_str_from_lit("''", 2);
    size_t extra = 2;
    for (size_t i = 0; i < arg->len; i++) {
        extra += arg->data[i] == '\'' ? 4 : 1;
    }
    tsc_str_t* out = str_alloc(extra);
    char* p = (char*)out->data;
    size_t pos = 0;
    p[pos++] = '\'';
    for (size_t i = 0; i < arg->len; i++) {
        if (arg->data[i] == '\'') {
            p[pos++] = '\'';
            p[pos++] = '\\';
            p[pos++] = '\'';
            p[pos++] = '\'';
        } else {
            p[pos++] = arg->data[i];
        }
    }
    p[pos++] = '\'';
    return out;
}

static tsc_array_t* child_shell_args(const tsc_str_t* command, const tsc_array_t* args) {
    tsc_str_t* joined = (tsc_str_t*)command;
    if (!joined) joined = tsc_str_from_lit("", 0);
    for (size_t i = 0; args && i < args->len; i++) {
        tsc_str_t* arg = TSC_ARR(tsc_str_t*, args, i);
        joined = tsc_str_concat_n(3, joined, tsc_str_from_lit(" ", 1), child_shell_quote_arg(arg));
    }
    tsc_array_t* out = tsc_array_new(sizeof(tsc_str_t*), 2);
    tsc_str_t* flag = tsc_str_from_lit("-c", 2);
    tsc_array_push_raw(out, &flag);
    tsc_array_push_raw(out, &joined);
    return out;
}

tsc_value_t tsc_child_process_spawn_sync(const tsc_str_t* file, const tsc_array_t* args, const tsc_str_t* cwd, const tsc_str_t* input, const tsc_array_t* env, const tsc_str_t* shell, const tsc_str_t* argv0, bool pipe_stdin, bool ignore_stdin, bool capture_stdout, bool capture_stderr, bool inherit_stdout, bool inherit_stderr, bool detached, double uid, double gid, double max_buffer, double timeout_ms, int timeout_signal) {
    if (!file) tsc_panic("child_process.spawnSync file required");
    const tsc_str_t* actual_file = file;
    const tsc_array_t* actual_args = args;
    if (shell) {
        actual_file = shell;
        actual_args = child_shell_args(file, args);
    }
    int out_pipe[2];
    int err_pipe[2];
    int exec_err_pipe[2];
    int in_pipe[2] = { -1, -1 };
    if (pipe(out_pipe) != 0 || pipe(err_pipe) != 0) {
        tsc_panic("child_process.spawnSync pipe failed");
    }
    if (pipe(exec_err_pipe) != 0) {
        close(out_pipe[0]);
        close(out_pipe[1]);
        close(err_pipe[0]);
        close(err_pipe[1]);
        tsc_panic("child_process.spawnSync exec-error pipe failed");
    }
    int flags = fcntl(exec_err_pipe[1], F_GETFD);
    if (flags >= 0) (void)fcntl(exec_err_pipe[1], F_SETFD, flags | FD_CLOEXEC);
    if (pipe_stdin && pipe(in_pipe) != 0) {
        close(exec_err_pipe[0]);
        close(exec_err_pipe[1]);
        tsc_panic("child_process.spawnSync stdin pipe failed");
    }

    pid_t pid = fork();
    if (pid < 0) {
        close(out_pipe[0]);
        close(out_pipe[1]);
        close(err_pipe[0]);
        close(err_pipe[1]);
        close(exec_err_pipe[0]);
        close(exec_err_pipe[1]);
        if (pipe_stdin) {
            close(in_pipe[0]);
            close(in_pipe[1]);
        }
        tsc_panic("child_process.spawnSync fork failed");
    }
    if (pid == 0) {
        close(out_pipe[0]);
        close(err_pipe[0]);
        close(exec_err_pipe[0]);
        if (pipe_stdin) close(in_pipe[1]);
        if (ignore_stdin) {
            int null_fd = open("/dev/null", O_RDONLY);
            if (null_fd < 0) _exit(127);
            if (dup2(null_fd, STDIN_FILENO) < 0) _exit(127);
            close(null_fd);
        }
        if (!inherit_stdout && dup2(out_pipe[1], STDOUT_FILENO) < 0) _exit(127);
        if (!inherit_stderr && dup2(err_pipe[1], STDERR_FILENO) < 0) _exit(127);
        if (pipe_stdin && dup2(in_pipe[0], STDIN_FILENO) < 0) _exit(127);
        close(out_pipe[1]);
        close(err_pipe[1]);
        if (pipe_stdin) close(in_pipe[0]);
        if (detached && setsid() < 0) {
            int err = errno;
            (void)write(exec_err_pipe[1], &err, sizeof(err));
            _exit(127);
        }
        if (cwd) {
            char* cwd_cstr = cstr_dup(cwd);
            if (chdir(cwd_cstr) != 0) {
                int err = errno;
                (void)write(exec_err_pipe[1], &err, sizeof(err));
                _exit(127);
            }
            free(cwd_cstr);
        }
        child_apply_env(env);
        int id_err = child_apply_ids(uid, gid);
        if (id_err != 0) {
            (void)write(exec_err_pipe[1], &id_err, sizeof(id_err));
            _exit(127);
        }

        size_t argc = 1 + (actual_args ? actual_args->len : 0);
        char** argv = (char**)calloc(argc + 1, sizeof(char*));
        if (!argv) _exit(127);
        argv[0] = cstr_dup(argv0 ? argv0 : actual_file);
        for (size_t i = 1; i < argc; i++) {
            tsc_str_t* arg = TSC_ARR(tsc_str_t*, actual_args, i - 1);
            argv[i] = cstr_dup(arg ? arg : tsc_str_from_lit("", 0));
        }
        argv[argc] = NULL;
        char* exec_file = cstr_dup(actual_file);
        execvp(exec_file, argv);
        int err = errno;
        (void)write(exec_err_pipe[1], &err, sizeof(err));
        _exit(127);
    }

    close(out_pipe[1]);
    close(err_pipe[1]);
    close(exec_err_pipe[1]);
    if (pipe_stdin) {
        close(in_pipe[0]);
        size_t written = 0;
        while (input && written < input->len) {
            ssize_t n = write(in_pipe[1], input->data + written, input->len - written);
            if (n > 0) {
                written += (size_t)n;
            } else if (n < 0 && errno == EINTR) {
                continue;
            } else {
                break;
            }
        }
        close(in_pipe[1]);
    }
    size_t stdout_len = 0;
    size_t stderr_len = 0;
    size_t stdout_cap = 256;
    size_t stderr_cap = 256;
    uint8_t* stdout_data = (uint8_t*)malloc(stdout_cap);
    uint8_t* stderr_data = (uint8_t*)malloc(stderr_cap);
    if (!stdout_data || !stderr_data) tsc_panic("child_process.spawnSync out of memory");

    struct pollfd fds[2];
    fds[0].fd = out_pipe[0];
    fds[0].events = POLLIN;
    fds[1].fd = err_pipe[0];
    fds[1].events = POLLIN;
    int open_fds = 2;
    bool timed_out = false;
    bool max_buffer_exceeded = false;
    bool killed_for_max_buffer = false;
    size_t max_buffer_len = child_max_buffer_limit(max_buffer);
    int kill_signal = timeout_signal > 0 ? timeout_signal : SIGTERM;
    double deadline = (!isnan(timeout_ms) && !isinf(timeout_ms) && timeout_ms >= 0.0)
        ? child_now_millis() + timeout_ms
        : -1.0;
    while (open_fds > 0) {
        int poll_timeout = -1;
        if (!timed_out && deadline >= 0.0) {
            double remaining = deadline - child_now_millis();
            if (remaining <= 0.0) {
                (void)kill(pid, kill_signal);
                timed_out = true;
            } else if (remaining > (double)INT_MAX) {
                poll_timeout = INT_MAX;
            } else {
                poll_timeout = (int)ceil(remaining);
                if (poll_timeout < 1) poll_timeout = 1;
            }
        }
        int rc = poll(fds, 2, poll_timeout);
        if (rc < 0) {
            if (errno == EINTR) continue;
            free(stdout_data);
            free(stderr_data);
            tsc_panic("child_process.spawnSync poll failed");
        }
        if (rc == 0 && !timed_out && deadline >= 0.0) {
            (void)kill(pid, kill_signal);
            timed_out = true;
            continue;
        }
        for (int i = 0; i < 2; i++) {
            if (fds[i].fd < 0) continue;
            if ((fds[i].revents & (POLLIN | POLLHUP | POLLERR)) == 0) continue;
            uint8_t chunk[256];
            ssize_t n = read(fds[i].fd, chunk, sizeof(chunk));
            if (n > 0) {
                if (i == 0) {
                    if (capture_stdout) {
                        child_capture_append_limited(&stdout_data, &stdout_len, &stdout_cap, chunk, (size_t)n, max_buffer_len, &max_buffer_exceeded);
                    }
                } else {
                    if (capture_stderr) {
                        child_capture_append_limited(&stderr_data, &stderr_len, &stderr_cap, chunk, (size_t)n, max_buffer_len, &max_buffer_exceeded);
                    }
                }
                if (max_buffer_exceeded && !killed_for_max_buffer && !timed_out) {
                    (void)kill(pid, SIGTERM);
                    killed_for_max_buffer = true;
                }
            } else if (n == 0) {
                close(fds[i].fd);
                fds[i].fd = -1;
                open_fds--;
            } else if (errno != EINTR) {
                free(stdout_data);
                free(stderr_data);
                tsc_panic("child_process.spawnSync failed while reading output");
            }
        }
    }

    int status = 0;
    while (waitpid(pid, &status, 0) < 0) {
        if (errno != EINTR) {
            free(stdout_data);
            free(stderr_data);
            close(exec_err_pipe[0]);
            tsc_panic("child_process.spawnSync wait failed");
        }
    }

    int exec_error = 0;
    for (;;) {
        ssize_t n = read(exec_err_pipe[0], &exec_error, sizeof(exec_error));
        if (n >= 0 || errno != EINTR) break;
    }
    close(exec_err_pipe[0]);

    tsc_value_t status_value = (exec_error || timed_out || max_buffer_exceeded)
        ? tsc_value_null()
        : (WIFEXITED(status) ? tsc_value_num((double)WEXITSTATUS(status)) : tsc_value_null());
    tsc_value_t signal_value = (!exec_error && WIFSIGNALED(status))
        ? tsc_value_string(child_signal_name(WTERMSIG(status)))
        : tsc_value_null();
    tsc_value_t error_value = timed_out
        ? tsc_value_string(tsc_str_from_lit("ETIMEDOUT", 9))
        : (max_buffer_exceeded
            ? tsc_value_string(tsc_str_from_lit("ENOBUFS", 7))
        : (exec_error
            ? tsc_value_string(child_errno_name(exec_error))
            : tsc_value_undefined()));
    tsc_value_t stdin_value = tsc_value_null();
    tsc_value_t stdout_value = capture_stdout
        ? tsc_value_string(child_capture_string(stdout_data, stdout_len))
        : tsc_value_null();
    tsc_value_t stderr_value = capture_stderr
        ? tsc_value_string(child_capture_string(stderr_data, stderr_len))
        : tsc_value_null();
    tsc_array_t* output = tsc_array_new(sizeof(tsc_value_t), 3);
    tsc_array_push_raw(output, &stdin_value);
    tsc_array_push_raw(output, &stdout_value);
    tsc_array_push_raw(output, &stderr_value);

    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("status", 6), status_value);
    tsc_object_set(out, tsc_str_from_lit("stdout", 6), stdout_value);
    tsc_object_set(out, tsc_str_from_lit("stderr", 6), stderr_value);
    tsc_object_set(out, tsc_str_from_lit("output", 6), tsc_value_array(output));
    tsc_object_set(out, tsc_str_from_lit("pid", 3), tsc_value_num((double)pid));
    tsc_object_set(out, tsc_str_from_lit("signal", 6), signal_value);
    tsc_object_set(out, tsc_str_from_lit("error", 5), error_value);
    free(stdout_data);
    free(stderr_data);
    return tsc_value_object(out);
}

tsc_value_t tsc_child_process_exec_utf8(const tsc_str_t* command, const tsc_str_t* cwd, const tsc_array_t* env, const tsc_str_t* shell, double uid, double gid, double max_buffer, double timeout_ms, int timeout_signal) {
    tsc_array_t* args = tsc_array_new(sizeof(tsc_str_t*), 2);
    tsc_str_t* flag = tsc_str_from_lit("-c", 2);
    tsc_str_t* cmd = (tsc_str_t*)command;
    tsc_array_push_raw(args, &flag);
    tsc_array_push_raw(args, &cmd);
    return tsc_child_process_spawn_sync(shell ? shell : tsc_str_from_lit("/bin/sh", 7), args, cwd, NULL, env, NULL, NULL, true, false, true, true, false, false, false, uid, gid, max_buffer, timeout_ms, timeout_signal);
}

/* ---------------- URL ---------------- */

static tsc_str_t* str_from_range(const char* data, size_t start, size_t end) {
    if (end < start) end = start;
    tsc_str_t* out = str_alloc(end - start);
    if (end > start) memcpy((char*)out->data, data + start, end - start);
    return out;
}

static size_t find_byte(const char* data, size_t start, size_t end, char needle) {
    for (size_t i = start; i < end; i++) {
        if (data[i] == needle) return i;
    }
    return (size_t)-1;
}

static size_t first_of_url_tail(const char* data, size_t start, size_t end) {
    for (size_t i = start; i < end; i++) {
        if (data[i] == '/' || data[i] == '?' || data[i] == '#') return i;
    }
    return end;
}

bool tsc_url_can_parse(const tsc_str_t* input) {
    const char* d = input->data;
    size_t n = input->len;
    size_t scheme_colon = find_byte(d, 0, n, ':');
    return scheme_colon != (size_t)-1 &&
        scheme_colon + 2 < n &&
        d[scheme_colon + 1] == '/' &&
        d[scheme_colon + 2] == '/';
}

static tsc_str_t* tsc_url_resolve_base(const tsc_str_t* input, const tsc_str_t* base) {
    if (tsc_url_can_parse(input)) return (tsc_str_t*)input;
    if (!base || !tsc_url_can_parse(base)) return NULL;

    tsc_url_t* b = tsc_url_new(base);
    if (input->len >= 2 && input->data[0] == '/' && input->data[1] == '/') {
        return tsc_str_concat(b->protocol, input);
    }
    if (input->len > 0 && input->data[0] == '/') {
        return tsc_str_concat(b->origin, input);
    }
    if (input->len > 0 && input->data[0] == '?') {
        return tsc_str_concat(tsc_str_concat(b->origin, b->pathname), input);
    }
    if (input->len > 0 && input->data[0] == '#') {
        return tsc_str_concat(tsc_str_concat(tsc_str_concat(b->origin, b->pathname), b->search), input);
    }

    size_t slash = b->pathname->len;
    while (slash > 0 && b->pathname->data[slash - 1] != '/') slash--;
    tsc_str_t* dir = str_from_range(b->pathname->data, 0, slash);
    tsc_str_t* path = tsc_str_concat(dir, input);
    if (path->len == 0 || path->data[0] != '/') {
        path = tsc_str_concat(tsc_str_from_lit("/", 1), path);
    }
    return tsc_str_concat(b->origin, path);
}

bool tsc_url_can_parse_base(const tsc_str_t* input, const tsc_str_t* base) {
    tsc_str_t* resolved = tsc_url_resolve_base(input, base);
    return resolved && tsc_url_can_parse(resolved);
}

tsc_url_t* tsc_url_new(const tsc_str_t* input) {
    const char* d = input->data;
    size_t n = input->len;
    tsc_url_t* u = (tsc_url_t*)TSC_GC_MALLOC(sizeof(tsc_url_t));
    u->href = (tsc_str_t*)input;
    u->protocol = tsc_str_from_lit("", 0);
    u->host = tsc_str_from_lit("", 0);
    u->hostname = tsc_str_from_lit("", 0);
    u->port = tsc_str_from_lit("", 0);
    u->pathname = tsc_str_from_lit("/", 1);
    u->search = tsc_str_from_lit("", 0);
    u->hash = tsc_str_from_lit("", 0);
    u->origin = tsc_str_from_lit("", 0);

    size_t scheme_colon = find_byte(d, 0, n, ':');
    if (!tsc_url_can_parse(input)) {
        tsc_panic("URL: only absolute URLs with // authority are supported");
    }
    u->protocol = str_from_range(d, 0, scheme_colon + 1);

    size_t authority_start = scheme_colon + 3;
    size_t authority_end = first_of_url_tail(d, authority_start, n);
    u->host = str_from_range(d, authority_start, authority_end);

    size_t port_colon = find_byte(d, authority_start, authority_end, ':');
    if (port_colon == (size_t)-1) {
        u->hostname = str_from_range(d, authority_start, authority_end);
    } else {
        u->hostname = str_from_range(d, authority_start, port_colon);
        u->port = str_from_range(d, port_colon + 1, authority_end);
    }

    size_t hash_pos = find_byte(d, authority_end, n, '#');
    size_t query_pos = find_byte(d, authority_end, hash_pos == (size_t)-1 ? n : hash_pos, '?');
    size_t path_end = n;
    if (query_pos != (size_t)-1) path_end = query_pos;
    if (hash_pos != (size_t)-1 && hash_pos < path_end) path_end = hash_pos;
    if (authority_end < n && d[authority_end] == '/') {
        u->pathname = str_from_range(d, authority_end, path_end);
    }
    if (query_pos != (size_t)-1) {
        size_t search_end = hash_pos != (size_t)-1 && hash_pos > query_pos ? hash_pos : n;
        u->search = str_from_range(d, query_pos, search_end);
    }
    if (hash_pos != (size_t)-1) {
        u->hash = str_from_range(d, hash_pos, n);
    }
    tsc_str_t* slash = tsc_str_from_lit("//", 2);
    u->origin = tsc_str_concat(tsc_str_concat(u->protocol, slash), u->host);
    return u;
}

tsc_url_t* tsc_url_new_base(const tsc_str_t* input, const tsc_str_t* base) {
    tsc_str_t* resolved = tsc_url_resolve_base(input, base);
    if (!resolved) {
        tsc_panic("URL: base URL must be absolute when resolving relative input");
    }
    return tsc_url_new(resolved);
}

tsc_str_t* tsc_url_file_path(const tsc_url_t* url) {
    if (!url || !tsc_str_eq(url->protocol, tsc_str_from_lit("file:", 5))) {
        tsc_panic("URL: filesystem paths only support file: URLs");
    }
    if (url->host->len != 0 && !tsc_str_eq(url->host, tsc_str_from_lit("localhost", 9))) {
        tsc_panic("URL: filesystem file: URLs must not have a remote host");
    }
    return url->pathname;
}

/* ---------------- JSON helpers ---------------- */

tsc_str_t* tsc_json_escape_string(const tsc_str_t* s) {
    /* Upper bound: 6x expansion for \uXXXX of every byte. */
    size_t cap = s->len * 6 + 3;
    tsc_str_t* out = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    char* buf = (char*)TSC_GC_MALLOC_ATOMIC(cap);
    size_t pos = 0;
    buf[pos++] = '"';
    for (size_t i = 0; i < s->len; i++) {
        unsigned char c = (unsigned char)s->data[i];
        switch (c) {
            case '"':  buf[pos++] = '\\'; buf[pos++] = '"'; break;
            case '\\': buf[pos++] = '\\'; buf[pos++] = '\\'; break;
            case '\n': buf[pos++] = '\\'; buf[pos++] = 'n'; break;
            case '\r': buf[pos++] = '\\'; buf[pos++] = 'r'; break;
            case '\t': buf[pos++] = '\\'; buf[pos++] = 't'; break;
            case '\b': buf[pos++] = '\\'; buf[pos++] = 'b'; break;
            case '\f': buf[pos++] = '\\'; buf[pos++] = 'f'; break;
            default:
                if (c < 0x20) {
                    pos += (size_t)snprintf(buf + pos, cap - pos, "\\u%04x", c);
                } else {
                    buf[pos++] = (char)c;
                }
        }
    }
    buf[pos++] = '"';
    buf[pos] = '\0';
    out->data = buf;
    out->len = pos;
    return out;
}

tsc_str_t* tsc_json_num(double n) {
    /* NaN and Infinity are invalid in JSON — emit "null" (matches JS). */
    if (isnan(n) || isinf(n)) return tsc_str_from_lit("null", 4);
    return tsc_str_from_num(n);
}

/* ---------------- JSON build buffer ---------------- */

void tsc_jsonbuf_init(tsc_jsonbuf_t* b) {
    /* Larger initial cap saves reallocations on the typical "stringify a
     * small object" case (where the result is hundreds of bytes). */
    b->cap = 1024;
    b->len = 0;
    b->data = (char*)TSC_GC_MALLOC_ATOMIC(b->cap);
}

void tsc_jsonbuf_reserve(tsc_jsonbuf_t* b, size_t need) {
    if (b->len + need <= b->cap) return;
    size_t cap = b->cap ? b->cap : 64;
    while (cap < b->len + need) cap *= 2;
    char* nd = (char*)TSC_GC_MALLOC_ATOMIC(cap);
    if (b->len > 0) memcpy(nd, b->data, b->len);
    b->data = nd;
    b->cap = cap;
}

void tsc_jsonbuf_append(tsc_jsonbuf_t* b, const char* p, size_t n) {
    tsc_jsonbuf_reserve(b, n);
    memcpy(b->data + b->len, p, n);
    b->len += n;
}

void tsc_jsonbuf_byte(tsc_jsonbuf_t* b, char c) {
    tsc_jsonbuf_reserve(b, 1);
    b->data[b->len++] = c;
}

void tsc_jsonbuf_int(tsc_jsonbuf_t* b, int64_t n) {
    tsc_jsonbuf_reserve(b, 21);
    b->len += fast_itoa(b->data + b->len, n);
}

void tsc_jsonbuf_num(tsc_jsonbuf_t* b, double n) {
    if (isnan(n) || isinf(n)) { tsc_jsonbuf_append(b, "null", 4); return; }
    if (n == 0.0) { tsc_jsonbuf_byte(b, '0'); return; }
    if (n == (double)(int64_t)n && n > -1e16 && n < 1e16) {
        tsc_jsonbuf_int(b, (int64_t)n);
        return;
    }
    if (n > -4503599627370495.0 && n < 4503599627370495.0) {
        double twice_d = n * 2.0;
        int64_t twice = (int64_t)twice_d;
        if ((double)twice == twice_d && (twice & 1) != 0) {
            if (twice < 0) {
                tsc_jsonbuf_byte(b, '-');
                twice = -twice;
            }
            tsc_jsonbuf_int(b, twice / 2);
            tsc_jsonbuf_append(b, ".5", 2);
            return;
        }
    }
    char buf[64];
    for (int prec = 1; prec <= 17; prec++) {
        snprintf(buf, sizeof buf, "%.*g", prec, n);
        double rt = strtod(buf, NULL);
        if (rt == n) break;
    }
    tsc_jsonbuf_append(b, buf, strlen(buf));
}

void tsc_jsonbuf_bool(tsc_jsonbuf_t* b, bool v) {
    if (v) tsc_jsonbuf_append(b, "true", 4);
    else   tsc_jsonbuf_append(b, "false", 5);
}

void tsc_jsonbuf_str(tsc_jsonbuf_t* b, const tsc_str_t* s) {
    bool needs_escape = false;
    for (size_t i = 0; i < s->len; i++) {
        unsigned char c = (unsigned char)s->data[i];
        if (c < 0x20 || c == '"' || c == '\\') {
            needs_escape = true;
            break;
        }
    }
    if (!needs_escape) {
        tsc_jsonbuf_reserve(b, s->len + 2);
        b->data[b->len++] = '"';
        if (s->len > 0) memcpy(b->data + b->len, s->data, s->len);
        b->len += s->len;
        b->data[b->len++] = '"';
        return;
    }
    /* Upper bound: open quote + 6x expansion + close quote. */
    tsc_jsonbuf_reserve(b, s->len * 6 + 2);
    b->data[b->len++] = '"';
    for (size_t i = 0; i < s->len; i++) {
        unsigned char c = (unsigned char)s->data[i];
        switch (c) {
            case '"':  b->data[b->len++] = '\\'; b->data[b->len++] = '"'; break;
            case '\\': b->data[b->len++] = '\\'; b->data[b->len++] = '\\'; break;
            case '\n': b->data[b->len++] = '\\'; b->data[b->len++] = 'n'; break;
            case '\r': b->data[b->len++] = '\\'; b->data[b->len++] = 'r'; break;
            case '\t': b->data[b->len++] = '\\'; b->data[b->len++] = 't'; break;
            case '\b': b->data[b->len++] = '\\'; b->data[b->len++] = 'b'; break;
            case '\f': b->data[b->len++] = '\\'; b->data[b->len++] = 'f'; break;
            default:
                if (c < 0x20) {
                    int n = snprintf(b->data + b->len, b->cap - b->len, "\\u%04x", c);
                    b->len += (size_t)n;
                } else {
                    b->data[b->len++] = (char)c;
                }
        }
    }
    b->data[b->len++] = '"';
}

tsc_str_t* tsc_jsonbuf_finish(tsc_jsonbuf_t* b) {
    tsc_jsonbuf_reserve(b, 1);
    b->data[b->len] = '\0';
    tsc_str_t* s = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    s->len = b->len;
    s->data = b->data;
    s->hash = 0;
    return s;
}

/* ---------------- arrays ---------------- */

tsc_array_t* tsc_array_new(size_t elem_size, size_t initial_cap) {
    tsc_array_t* a = (tsc_array_t*)TSC_GC_MALLOC(sizeof(tsc_array_t));
    a->len = 0;
    a->cap = initial_cap;
    a->es = elem_size;
    a->extensible = true;
    a->sealed = false;
    a->frozen = false;
    a->iter_pos = 0;
    a->data = initial_cap ? TSC_GC_MALLOC(initial_cap * elem_size) : NULL;
    return a;
}

tsc_array_t* tsc_array_new_atomic(size_t elem_size, size_t initial_cap) {
    tsc_array_t* a = (tsc_array_t*)TSC_GC_MALLOC(sizeof(tsc_array_t));
    a->len = 0;
    a->cap = initial_cap;
    a->es = elem_size;
    a->extensible = true;
    a->sealed = false;
    a->frozen = false;
    a->iter_pos = 0;
    a->data = initial_cap ? TSC_GC_MALLOC_ATOMIC(initial_cap * elem_size) : NULL;
    return a;
}

tsc_array_t* tsc_array_from_buf(size_t elem_size, const void* src, size_t n) {
    tsc_array_t* a = tsc_array_new(elem_size, n > 0 ? n : 1);
    if (n > 0) memcpy(a->data, src, n * elem_size);
    a->len = n;
    return a;
}

static bool tsc_str_is_length_key(const tsc_str_t* key) {
    return key && key->len == 6 && memcmp(key->data, "length", 6) == 0;
}

static bool tsc_str_array_index(const tsc_str_t* key, size_t* out) {
    if (!key || key->len == 0) return false;
    if (key->len > 1 && key->data[0] == '0') return false;
    size_t value = 0;
    for (size_t i = 0; i < key->len; i++) {
        unsigned char ch = (unsigned char)key->data[i];
        if (ch < '0' || ch > '9') return false;
        size_t digit = (size_t)(ch - '0');
        if (value > (SIZE_MAX - digit) / 10) return false;
        value = value * 10 + digit;
    }
    *out = value;
    return true;
}

bool tsc_array_has_own_key(const tsc_array_t* a, const tsc_str_t* key) {
    if (!a) return false;
    if (tsc_str_is_length_key(key)) return true;
    size_t idx = 0;
    return tsc_str_array_index(key, &idx) && idx < a->len;
}

bool tsc_array_property_is_enumerable_key(const tsc_array_t* a, const tsc_str_t* key) {
    if (!a || tsc_str_is_length_key(key)) return false;
    size_t idx = 0;
    return tsc_str_array_index(key, &idx) && idx < a->len;
}

void tsc_array_reserve(tsc_array_t* a, size_t new_cap) {
    if (new_cap <= a->cap) return;
    /* Start growth at 8 so a fresh `[]` followed by N pushes amortizes well. */
    size_t cap = a->cap ? a->cap : 8;
    while (cap < new_cap) cap *= 2;
    void* nd = a->data ? TSC_GC_REALLOC(a->data, cap * a->es) : TSC_GC_MALLOC(cap * a->es);
    a->data = nd;
    a->cap = cap;
}

void tsc_array_push_raw(tsc_array_t* a, const void* elem) {
    if (a->len + 1 > a->cap) tsc_array_reserve(a, a->len + 1);
    memcpy((char*)a->data + a->len * a->es, elem, a->es);
    a->len++;
}

void tsc_array_pop_raw(tsc_array_t* a) {
    if (a->len > 0) a->len--;
}

void tsc_array_shift_raw(tsc_array_t* a) {
    if (a->len == 0) return;
    memmove(a->data, (char*)a->data + a->es, (a->len - 1) * a->es);
    a->len--;
}

void tsc_array_unshift_raw(tsc_array_t* a, const void* elem) {
    if (a->len + 1 > a->cap) tsc_array_reserve(a, a->len + 1);
    memmove((char*)a->data + a->es, a->data, a->len * a->es);
    memcpy(a->data, elem, a->es);
    a->len++;
}

tsc_array_t* tsc_array_reverse(tsc_array_t* a) {
    if (a->len < 2) return a;
    char* lo = (char*)a->data;
    char* hi = lo + (a->len - 1) * a->es;
    char tmp[256]; /* element size limit for stack swap; larger uses heap */
    char* swap = a->es <= sizeof(tmp) ? tmp : (char*)TSC_GC_MALLOC(a->es);
    while (lo < hi) {
        memcpy(swap, lo, a->es);
        memcpy(lo, hi, a->es);
        memcpy(hi, swap, a->es);
        lo += a->es;
        hi -= a->es;
    }
    return a;
}

tsc_array_t* tsc_array_to_reversed(const tsc_array_t* a) {
    return tsc_array_reverse(tsc_array_slice(a, 0.0, (double)a->len));
}

static int64_t array_strict_index(double value, int64_t len) {
    if (isnan(value)) value = 0.0;
    if (isinf(value)) tsc_panic("Array.with index out of range");
    if (value < 0) value = (double)len + value;
    if (value < 0 || value >= (double)len) {
        tsc_panic("Array.with index out of range");
    }
    return (int64_t)value;
}

tsc_array_t* tsc_array_with(const tsc_array_t* a, double index, const void* elem) {
    int64_t at = array_strict_index(index, (int64_t)a->len);
    tsc_array_t* copy = tsc_array_slice(a, 0.0, (double)a->len);
    memcpy((char*)copy->data + (size_t)at * copy->es, elem, copy->es);
    return copy;
}

static int64_t array_range_index(double value, int64_t len, double fallback) {
    double n = isnan(value) ? fallback : value;
    if (isnan(n)) n = 0.0;
    if (isinf(n)) return n < 0 ? 0 : len;
    if (n < 0) n = (double)len + n;
    if (n < 0) return 0;
    if (n >= (double)len) return len;
    return (int64_t)n;
}

tsc_array_t* tsc_array_to_spliced(const tsc_array_t* a, double start, double delete_count, int argc, const tsc_array_t* items) {
    int64_t len = (int64_t)a->len;
    int64_t at = argc <= 0 ? 0 : array_range_index(start, len, 0.0);
    int64_t del = 0;
    if (argc == 1) {
        del = len - at;
    } else if (argc >= 2) {
        double raw = isnan(delete_count) || delete_count < 0 ? 0.0 : delete_count;
        if (isinf(raw)) raw = raw < 0 ? 0.0 : (double)(len - at);
        del = (int64_t)raw;
        if (del > len - at) del = len - at;
    }

    size_t insert_len = items ? items->len : 0;
    size_t new_len = a->len - (size_t)del + insert_len;
    tsc_array_t* out = tsc_array_new(a->es, new_len > 0 ? new_len : 1);
    if (at > 0) {
        memcpy(out->data, a->data, (size_t)at * a->es);
        out->len = (size_t)at;
    }
    if (insert_len > 0) {
        memcpy((char*)out->data + out->len * out->es, items->data, insert_len * out->es);
        out->len += insert_len;
    }
    size_t tail_start = (size_t)(at + del);
    size_t tail_len = a->len - tail_start;
    if (tail_len > 0) {
        memcpy((char*)out->data + out->len * out->es, (char*)a->data + tail_start * a->es, tail_len * a->es);
        out->len += tail_len;
    }
    return out;
}

tsc_array_t* tsc_array_fill(tsc_array_t* a, const void* elem, double start, double end) {
    int64_t len = (int64_t)a->len;
    int64_t i0 = array_range_index(start, len, 0.0);
    int64_t i1 = array_range_index(end, len, (double)len);
    if (i1 < i0) i1 = i0;
    for (int64_t i = i0; i < i1; i++) {
        memcpy((char*)a->data + (size_t)i * a->es, elem, a->es);
    }
    return a;
}

tsc_array_t* tsc_array_copy_within(tsc_array_t* a, double target, double start, double end) {
    int64_t len = (int64_t)a->len;
    int64_t to = array_range_index(target, len, 0.0);
    int64_t from = array_range_index(start, len, 0.0);
    int64_t final = array_range_index(end, len, (double)len);
    int64_t count = final - from;
    int64_t room = len - to;
    if (count > room) count = room;
    if (count > 0) {
        memmove(
            (char*)a->data + (size_t)to * a->es,
            (char*)a->data + (size_t)from * a->es,
            (size_t)count * a->es
        );
    }
    return a;
}

tsc_array_t* tsc_array_slice(const tsc_array_t* a, double start, double end) {
    int64_t slen = (int64_t)a->len;
    int64_t i0 = (int64_t)start;
    int64_t i1 = (int64_t)end;
    if (i0 < 0) i0 = slen + i0;
    if (i1 < 0) i1 = slen + i1;
    if (i0 < 0) i0 = 0;
    if (i1 > slen) i1 = slen;
    if (i0 > i1) i0 = i1;
    size_t n = (size_t)(i1 - i0);
    tsc_array_t* r = tsc_array_new(a->es, n > 0 ? n : 1);
    if (n > 0) memcpy(r->data, (char*)a->data + (size_t)i0 * a->es, n * a->es);
    r->len = n;
    return r;
}

tsc_array_t* tsc_array_append(tsc_array_t* dst, const tsc_array_t* src) {
    if (src->len == 0) return dst;
    tsc_array_reserve(dst, dst->len + src->len);
    memcpy((char*)dst->data + dst->len * dst->es, src->data, src->len * src->es);
    dst->len += src->len;
    return dst;
}

tsc_array_t* tsc_array_flat_once(const tsc_array_t* outer, size_t elem_size) {
    tsc_array_t* dst = tsc_array_new(elem_size, outer->len);
    for (size_t i = 0; i < outer->len; i++) {
        tsc_array_t* inner = TSC_ARR(tsc_array_t*, outer, i);
        if (inner) tsc_array_append(dst, inner);
    }
    return dst;
}

double tsc_array_length(const tsc_array_t* a) { return (double)a->len; }

void tsc_array_oob(const tsc_array_t* a, double i) { (void)a; (void)i; }

/* ---------------- Buffer ---------------- */

static uint8_t byte_from_double(double n) {
    if (isnan(n) || isinf(n)) return 0;
    int64_t i = (int64_t)n;
    return (uint8_t)(i & 0xff);
}

static tsc_buffer_t* buffer_alloc_len(size_t len) {
    tsc_buffer_t* b = (tsc_buffer_t*)TSC_GC_MALLOC(sizeof(tsc_buffer_t));
    b->len = len;
    b->data = (uint8_t*)TSC_GC_MALLOC_ATOMIC(len ? len : 1);
    if (len == 0) b->data[0] = 0;
    return b;
}

static int hex_value(unsigned char c) {
    if (c >= '0' && c <= '9') return (int)(c - '0');
    if (c >= 'a' && c <= 'f') return 10 + (int)(c - 'a');
    if (c >= 'A' && c <= 'F') return 10 + (int)(c - 'A');
    return -1;
}

static bool buffer_encoding_is_utf8(const tsc_str_t* encoding) {
    return !encoding || str_lit_eq(encoding, "utf8") || str_lit_eq(encoding, "utf-8");
}

static bool buffer_encoding_is_base64(const tsc_str_t* encoding) {
    return str_lit_eq(encoding, "base64");
}

static size_t buffer_index(double raw, size_t len) {
    int64_t i = (int64_t)raw;
    if (i < 0) i = (int64_t)len + i;
    if (i < 0) i = 0;
    if ((size_t)i > len) i = (int64_t)len;
    return (size_t)i;
}

static int base64_value(unsigned char c) {
    if (c >= 'A' && c <= 'Z') return (int)(c - 'A');
    if (c >= 'a' && c <= 'z') return 26 + (int)(c - 'a');
    if (c >= '0' && c <= '9') return 52 + (int)(c - '0');
    if (c == '+') return 62;
    if (c == '/') return 63;
    return -1;
}

static void base64_decode_group(tsc_buffer_t* out, size_t* pos, const int* q, int qlen) {
    if (qlen < 2 || q[0] < 0 || q[1] < 0) return;
    out->data[(*pos)++] = (uint8_t)(((uint32_t)q[0] << 2) | ((uint32_t)q[1] >> 4));
    if (qlen >= 3 && q[2] >= 0) {
        out->data[(*pos)++] = (uint8_t)((((uint32_t)q[1] & 0x0fu) << 4) | ((uint32_t)q[2] >> 2));
    }
    if (qlen >= 4 && q[2] >= 0 && q[3] >= 0) {
        out->data[(*pos)++] = (uint8_t)((((uint32_t)q[2] & 0x03u) << 6) | (uint32_t)q[3]);
    }
}

static tsc_buffer_t* buffer_from_base64(const tsc_str_t* input) {
    tsc_buffer_t* out = buffer_alloc_len((input->len / 4) * 3 + 3);
    size_t pos = 0;
    int q[4];
    int qlen = 0;
    for (size_t i = 0; i < input->len; i++) {
        unsigned char ch = (unsigned char)input->data[i];
        if (isspace(ch)) continue;
        int v = ch == '=' ? -2 : base64_value(ch);
        if (v < 0 && v != -2) tsc_panic("Buffer.from base64 input contains non-base64 digit");
        q[qlen++] = v;
        if (qlen == 4) {
            base64_decode_group(out, &pos, q, qlen);
            qlen = 0;
        }
    }
    if (qlen > 0) base64_decode_group(out, &pos, q, qlen);
    out->len = pos;
    return out;
}

static tsc_str_t* str_from_base64_bytes(const uint8_t* data, size_t len) {
    static const char alphabet[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    tsc_str_t* out = str_alloc(4 * ((len + 2) / 3));
    char* p = (char*)out->data;
    size_t pos = 0;
    for (size_t i = 0; i < len; i += 3) {
        uint32_t a = data[i];
        uint32_t b = i + 1 < len ? data[i + 1] : 0;
        uint32_t c = i + 2 < len ? data[i + 2] : 0;
        p[pos++] = alphabet[a >> 2];
        p[pos++] = alphabet[((a & 0x03u) << 4) | (b >> 4)];
        p[pos++] = i + 1 < len ? alphabet[((b & 0x0fu) << 2) | (c >> 6)] : '=';
        p[pos++] = i + 2 < len ? alphabet[c & 0x3fu] : '=';
    }
    return out;
}

tsc_buffer_t* tsc_buffer_from_str(const tsc_str_t* input, const tsc_str_t* encoding) {
    if (buffer_encoding_is_utf8(encoding)) {
        tsc_buffer_t* b = buffer_alloc_len(input->len);
        if (input->len > 0) memcpy(b->data, input->data, input->len);
        return b;
    }
    if (str_lit_eq(encoding, "hex")) {
        if ((input->len % 2) != 0) tsc_panic("Buffer.from hex input must have even length");
        tsc_buffer_t* b = buffer_alloc_len(input->len / 2);
        for (size_t i = 0; i < b->len; i++) {
            int hi = hex_value((unsigned char)input->data[i * 2]);
            int lo = hex_value((unsigned char)input->data[i * 2 + 1]);
            if (hi < 0 || lo < 0) tsc_panic("Buffer.from hex input contains non-hex digit");
            b->data[i] = (uint8_t)((hi << 4) | lo);
        }
        return b;
    }
    if (buffer_encoding_is_base64(encoding)) {
        return buffer_from_base64(input);
    }
    tsc_panic("Buffer.from: only utf8, hex, and base64 encodings are supported");
    return NULL;
}

tsc_buffer_t* tsc_buffer_from_array(const tsc_array_t* input) {
    tsc_buffer_t* b = buffer_alloc_len(input->len);
    for (size_t i = 0; i < input->len; i++) {
        double n = TSC_ARR(double, input, i);
        b->data[i] = byte_from_double(n);
    }
    return b;
}

tsc_buffer_t* tsc_buffer_from_buffer(const tsc_buffer_t* input) {
    tsc_buffer_t* b = buffer_alloc_len(input ? input->len : 0);
    if (input && input->len > 0) memcpy(b->data, input->data, input->len);
    return b;
}

tsc_buffer_t* tsc_buffer_alloc(double size, double fill) {
    if (isnan(size) || isinf(size) || size < 0) {
        tsc_panic("Buffer.alloc size must be a non-negative finite number");
    }
    size_t len = (size_t)size;
    uint8_t byte = byte_from_double(fill);
    tsc_buffer_t* b = buffer_alloc_len(len);
    if (len > 0) memset(b->data, byte, len);
    return b;
}

tsc_buffer_t* tsc_buffer_concat(const tsc_array_t* list) {
    size_t total = 0;
    for (size_t i = 0; i < list->len; i++) {
        tsc_buffer_t* part = TSC_ARR(tsc_buffer_t*, list, i);
        if (part) total += part->len;
    }
    tsc_buffer_t* out = buffer_alloc_len(total);
    size_t pos = 0;
    for (size_t i = 0; i < list->len; i++) {
        tsc_buffer_t* part = TSC_ARR(tsc_buffer_t*, list, i);
        if (!part || part->len == 0) continue;
        memcpy(out->data + pos, part->data, part->len);
        pos += part->len;
    }
    return out;
}

tsc_buffer_t* tsc_buffer_concat_len(const tsc_array_t* list, double total_length) {
    if (isnan(total_length) || isinf(total_length) || total_length < 0) {
        tsc_panic("Buffer.concat totalLength must be a non-negative finite number");
    }
    size_t total = (size_t)total_length;
    tsc_buffer_t* out = buffer_alloc_len(total);
    if (total > 0) memset(out->data, 0, total);
    size_t pos = 0;
    for (size_t i = 0; i < list->len && pos < total; i++) {
        tsc_buffer_t* part = TSC_ARR(tsc_buffer_t*, list, i);
        if (!part || part->len == 0) continue;
        size_t n = part->len;
        if (n > total - pos) n = total - pos;
        memcpy(out->data + pos, part->data, n);
        pos += n;
    }
    return out;
}

tsc_str_t* tsc_buffer_to_string(const tsc_buffer_t* b, const tsc_str_t* encoding) {
    if (buffer_encoding_is_utf8(encoding)) {
        tsc_str_t* out = str_alloc(b->len);
        if (b->len > 0) memcpy((char*)out->data, b->data, b->len);
        return out;
    }
    if (str_lit_eq(encoding, "hex")) {
        static const char hex[] = "0123456789abcdef";
        tsc_str_t* out = str_alloc(b->len * 2);
        char* p = (char*)out->data;
        for (size_t i = 0; i < b->len; i++) {
            p[i * 2] = hex[b->data[i] >> 4];
            p[i * 2 + 1] = hex[b->data[i] & 0x0f];
        }
        return out;
    }
    if (buffer_encoding_is_base64(encoding)) {
        return str_from_base64_bytes(b->data, b->len);
    }
    tsc_panic("Buffer.toString: only utf8, hex, and base64 encodings are supported");
    return NULL;
}

tsc_value_t tsc_buffer_to_json(const tsc_buffer_t* b) {
    tsc_object_t* out = tsc_object_new();
    tsc_array_t* data = tsc_array_new(sizeof(tsc_value_t), b->len);
    for (size_t i = 0; i < b->len; i++) {
        tsc_value_t value = tsc_value_num((double)b->data[i]);
        tsc_array_push_raw(data, &value);
    }
    tsc_object_set(out, tsc_str_from_lit("type", 4), tsc_value_string(tsc_str_from_lit("Buffer", 6)));
    tsc_object_set(out, tsc_str_from_lit("data", 4), tsc_value_array(data));
    return tsc_value_object(out);
}

tsc_str_t* tsc_btoa(const tsc_str_t* input) {
    return str_from_base64_bytes((const uint8_t*)input->data, input->len);
}

tsc_str_t* tsc_atob(const tsc_str_t* input) {
    tsc_buffer_t* decoded = buffer_from_base64(input);
    return tsc_buffer_to_string(decoded, tsc_str_from_lit("utf8", 4));
}

tsc_buffer_t* tsc_buffer_slice(const tsc_buffer_t* b, double start, double end) {
    size_t i0 = buffer_index(start, b->len);
    size_t i1 = buffer_index(end, b->len);
    if (i0 > i1) i0 = i1;
    size_t n = i1 - i0;
    tsc_buffer_t* out = buffer_alloc_len(n);
    if (n > 0) memcpy(out->data, b->data + i0, n);
    return out;
}

tsc_buffer_t* tsc_buffer_fill(tsc_buffer_t* b, double value, double start, double end) {
    size_t i0 = buffer_index(start, b->len);
    size_t i1 = buffer_index(end, b->len);
    if (i0 > i1) i0 = i1;
    if (i1 > i0) memset(b->data + i0, byte_from_double(value), i1 - i0);
    return b;
}

double tsc_buffer_write(tsc_buffer_t* b, const tsc_str_t* input, double offset, double length, const tsc_str_t* encoding) {
    size_t start = buffer_index(offset, b->len);
    if (start >= b->len) return 0.0;
    size_t max = b->len - start;
    if (!isnan(length)) {
        if (isinf(length) || length <= 0) return 0.0;
        size_t requested = (size_t)length;
        if (requested < max) max = requested;
    }
    tsc_buffer_t* source = tsc_buffer_from_str(input, encoding);
    size_t n = source->len < max ? source->len : max;
    if (n > 0) memcpy(b->data + start, source->data, n);
    return (double)n;
}

double tsc_buffer_copy(const tsc_buffer_t* source, tsc_buffer_t* target, double target_start, double source_start, double source_end) {
    size_t t0 = buffer_index(target_start, target->len);
    size_t s0 = buffer_index(source_start, source->len);
    size_t s1 = buffer_index(source_end, source->len);
    if (s0 > s1) s0 = s1;
    size_t n = s1 - s0;
    if (n > target->len - t0) n = target->len - t0;
    if (n > 0) memmove(target->data + t0, source->data + s0, n);
    return (double)n;
}

double tsc_buffer_index_of_byte(const tsc_buffer_t* b, double value, double offset) {
    int64_t start = (int64_t)offset;
    if (start < 0) start = (int64_t)b->len + start;
    if (start < 0) start = 0;
    if ((size_t)start >= b->len) return -1.0;
    uint8_t needle = byte_from_double(value);
    for (size_t i = (size_t)start; i < b->len; i++) {
        if (b->data[i] == needle) return (double)i;
    }
    return -1.0;
}

double tsc_buffer_last_index_of_byte(const tsc_buffer_t* b, double value, double offset) {
    if (b->len == 0) return -1.0;
    int64_t start;
    if (isnan(offset)) {
        start = (int64_t)b->len - 1;
    } else {
        start = (int64_t)offset;
        if (start < 0) start = (int64_t)b->len + start;
        if (start >= (int64_t)b->len) start = (int64_t)b->len - 1;
    }
    if (start < 0) return -1.0;
    uint8_t needle = byte_from_double(value);
    for (int64_t i = start; i >= 0; i--) {
        if (b->data[i] == needle) return (double)i;
    }
    return -1.0;
}

static double buffer_index_of_bytes(const tsc_buffer_t* b, const uint8_t* needle, size_t needle_len, double offset) {
    int64_t start = (int64_t)offset;
    if (start < 0) start = (int64_t)b->len + start;
    if (start < 0) start = 0;
    if ((size_t)start > b->len) start = (int64_t)b->len;
    if (needle_len == 0) return (double)start;
    if (needle_len > b->len || (size_t)start > b->len - needle_len) return -1.0;
    for (size_t i = (size_t)start; i <= b->len - needle_len; i++) {
        if (memcmp(b->data + i, needle, needle_len) == 0) return (double)i;
    }
    return -1.0;
}

static double buffer_last_index_of_bytes(const tsc_buffer_t* b, const uint8_t* needle, size_t needle_len, double offset) {
    int64_t start;
    if (isnan(offset)) {
        start = (int64_t)b->len;
    } else {
        start = (int64_t)offset;
        if (start < 0) start = (int64_t)b->len + start;
    }
    if (start < 0) return -1.0;
    if (needle_len == 0) {
        if (start > (int64_t)b->len) start = (int64_t)b->len;
        return (double)start;
    }
    if (needle_len > b->len) return -1.0;
    int64_t max_start = (int64_t)(b->len - needle_len);
    if (start > max_start) start = max_start;
    for (int64_t i = start; i >= 0; i--) {
        if (memcmp(b->data + i, needle, needle_len) == 0) return (double)i;
    }
    return -1.0;
}

double tsc_buffer_index_of_str(const tsc_buffer_t* b, const tsc_str_t* value, double offset) {
    return buffer_index_of_bytes(b, (const uint8_t*)value->data, value->len, offset);
}

double tsc_buffer_last_index_of_str(const tsc_buffer_t* b, const tsc_str_t* value, double offset) {
    return buffer_last_index_of_bytes(b, (const uint8_t*)value->data, value->len, offset);
}

double tsc_buffer_index_of_buffer(const tsc_buffer_t* b, const tsc_buffer_t* value, double offset) {
    if (!value) return -1.0;
    return buffer_index_of_bytes(b, value->data, value->len, offset);
}

double tsc_buffer_last_index_of_buffer(const tsc_buffer_t* b, const tsc_buffer_t* value, double offset) {
    if (!value) return -1.0;
    return buffer_last_index_of_bytes(b, value->data, value->len, offset);
}

bool tsc_buffer_equals(const tsc_buffer_t* a, const tsc_buffer_t* b) {
    if (a == b) return true;
    if (!a || !b || a->len != b->len) return false;
    return a->len == 0 || memcmp(a->data, b->data, a->len) == 0;
}

double tsc_buffer_compare(const tsc_buffer_t* a, const tsc_buffer_t* b) {
    if (a == b) return 0.0;
    if (!a) return b && b->len > 0 ? -1.0 : 0.0;
    if (!b) return a->len > 0 ? 1.0 : 0.0;
    size_t n = a->len < b->len ? a->len : b->len;
    int cmp = n > 0 ? memcmp(a->data, b->data, n) : 0;
    if (cmp < 0) return -1.0;
    if (cmp > 0) return 1.0;
    if (a->len < b->len) return -1.0;
    if (a->len > b->len) return 1.0;
    return 0.0;
}

double tsc_buffer_byte_length_str(const tsc_str_t* input, const tsc_str_t* encoding) {
    if (buffer_encoding_is_utf8(encoding)) return (double)input->len;
    if (str_lit_eq(encoding, "hex")) return floor((double)input->len / 2.0);
    if (buffer_encoding_is_base64(encoding)) return (double)buffer_from_base64(input)->len;
    tsc_panic("Buffer.byteLength: only utf8, hex, and base64 encodings are supported");
    return 0.0;
}

bool tsc_buffer_is_encoding(const tsc_str_t* encoding) {
    return buffer_encoding_is_utf8(encoding) || str_lit_eq(encoding, "hex") || buffer_encoding_is_base64(encoding);
}

double tsc_buffer_length(const tsc_buffer_t* b) { return (double)b->len; }

double tsc_buffer_get(const tsc_buffer_t* b, double idx) {
    if (isnan(idx) || isinf(idx) || idx < 0 || (size_t)idx >= b->len) return NAN;
    return (double)b->data[(size_t)idx];
}

double tsc_buffer_read_uint8(const tsc_buffer_t* b, double offset) {
    if (isnan(offset) || isinf(offset) || offset < 0 || (size_t)offset >= b->len) {
        tsc_panic("Buffer.readUInt8 offset out of range");
    }
    return (double)b->data[(size_t)offset];
}

double tsc_buffer_write_uint8(tsc_buffer_t* b, double value, double offset) {
    if (isnan(offset) || isinf(offset) || offset < 0 || (size_t)offset >= b->len) {
        tsc_panic("Buffer.writeUInt8 offset out of range");
    }
    size_t i = (size_t)offset;
    b->data[i] = byte_from_double(value);
    return (double)(i + 1);
}

double tsc_buffer_read_int8(const tsc_buffer_t* b, double offset) {
    if (isnan(offset) || isinf(offset) || offset < 0 || (size_t)offset >= b->len) {
        tsc_panic("Buffer.readInt8 offset out of range");
    }
    uint8_t n = b->data[(size_t)offset];
    return n >= 0x80u ? (double)n - 256.0 : (double)n;
}

double tsc_buffer_write_int8(tsc_buffer_t* b, double value, double offset) {
    if (isnan(offset) || isinf(offset) || offset < 0 || (size_t)offset >= b->len) {
        tsc_panic("Buffer.writeInt8 offset out of range");
    }
    size_t i = (size_t)offset;
    b->data[i] = byte_from_double(value);
    return (double)(i + 1);
}

static size_t buffer_checked_offset(const tsc_buffer_t* b, double offset, size_t width, const char* label) {
    if (isnan(offset) || isinf(offset) || offset < 0 || (size_t)offset > b->len || width > b->len - (size_t)offset) {
        tsc_panic(label);
    }
    return (size_t)offset;
}

static uint32_t uint_from_double(double value) {
    if (isnan(value) || isinf(value) || value <= 0) return 0;
    return (uint32_t)value;
}

double tsc_buffer_read_uint16_le(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.readUInt16LE offset out of range");
    return (double)((uint16_t)b->data[i] | ((uint16_t)b->data[i + 1] << 8));
}

double tsc_buffer_read_uint16_be(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.readUInt16BE offset out of range");
    return (double)(((uint16_t)b->data[i] << 8) | (uint16_t)b->data[i + 1]);
}

double tsc_buffer_write_uint16_le(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.writeUInt16LE offset out of range");
    uint32_t n = uint_from_double(value);
    b->data[i] = (uint8_t)(n & 0xffu);
    b->data[i + 1] = (uint8_t)((n >> 8) & 0xffu);
    return (double)(i + 2);
}

double tsc_buffer_write_uint16_be(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.writeUInt16BE offset out of range");
    uint32_t n = uint_from_double(value);
    b->data[i] = (uint8_t)((n >> 8) & 0xffu);
    b->data[i + 1] = (uint8_t)(n & 0xffu);
    return (double)(i + 2);
}

double tsc_buffer_read_int16_le(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.readInt16LE offset out of range");
    uint16_t n = (uint16_t)b->data[i] | ((uint16_t)b->data[i + 1] << 8);
    return n >= 0x8000u ? (double)n - 65536.0 : (double)n;
}

double tsc_buffer_read_int16_be(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.readInt16BE offset out of range");
    uint16_t n = ((uint16_t)b->data[i] << 8) | (uint16_t)b->data[i + 1];
    return n >= 0x8000u ? (double)n - 65536.0 : (double)n;
}

double tsc_buffer_write_int16_le(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.writeInt16LE offset out of range");
    uint16_t n = (uint16_t)(int32_t)((isnan(value) || isinf(value)) ? 0 : value);
    b->data[i] = (uint8_t)(n & 0xffu);
    b->data[i + 1] = (uint8_t)((n >> 8) & 0xffu);
    return (double)(i + 2);
}

double tsc_buffer_write_int16_be(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 2, "Buffer.writeInt16BE offset out of range");
    uint16_t n = (uint16_t)(int32_t)((isnan(value) || isinf(value)) ? 0 : value);
    b->data[i] = (uint8_t)((n >> 8) & 0xffu);
    b->data[i + 1] = (uint8_t)(n & 0xffu);
    return (double)(i + 2);
}

double tsc_buffer_read_uint32_le(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.readUInt32LE offset out of range");
    uint32_t n = (uint32_t)b->data[i] |
        ((uint32_t)b->data[i + 1] << 8) |
        ((uint32_t)b->data[i + 2] << 16) |
        ((uint32_t)b->data[i + 3] << 24);
    return (double)n;
}

double tsc_buffer_read_uint32_be(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.readUInt32BE offset out of range");
    uint32_t n = ((uint32_t)b->data[i] << 24) |
        ((uint32_t)b->data[i + 1] << 16) |
        ((uint32_t)b->data[i + 2] << 8) |
        (uint32_t)b->data[i + 3];
    return (double)n;
}

double tsc_buffer_write_uint32_le(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.writeUInt32LE offset out of range");
    uint32_t n = uint_from_double(value);
    b->data[i] = (uint8_t)(n & 0xffu);
    b->data[i + 1] = (uint8_t)((n >> 8) & 0xffu);
    b->data[i + 2] = (uint8_t)((n >> 16) & 0xffu);
    b->data[i + 3] = (uint8_t)((n >> 24) & 0xffu);
    return (double)(i + 4);
}

double tsc_buffer_write_uint32_be(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.writeUInt32BE offset out of range");
    uint32_t n = uint_from_double(value);
    b->data[i] = (uint8_t)((n >> 24) & 0xffu);
    b->data[i + 1] = (uint8_t)((n >> 16) & 0xffu);
    b->data[i + 2] = (uint8_t)((n >> 8) & 0xffu);
    b->data[i + 3] = (uint8_t)(n & 0xffu);
    return (double)(i + 4);
}

double tsc_buffer_read_int32_le(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.readInt32LE offset out of range");
    uint32_t n = (uint32_t)b->data[i] |
        ((uint32_t)b->data[i + 1] << 8) |
        ((uint32_t)b->data[i + 2] << 16) |
        ((uint32_t)b->data[i + 3] << 24);
    return n >= 0x80000000u ? (double)(uint64_t)n - 4294967296.0 : (double)n;
}

double tsc_buffer_read_int32_be(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.readInt32BE offset out of range");
    uint32_t n = ((uint32_t)b->data[i] << 24) |
        ((uint32_t)b->data[i + 1] << 16) |
        ((uint32_t)b->data[i + 2] << 8) |
        (uint32_t)b->data[i + 3];
    return n >= 0x80000000u ? (double)(uint64_t)n - 4294967296.0 : (double)n;
}

double tsc_buffer_write_int32_le(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.writeInt32LE offset out of range");
    uint32_t n = (uint32_t)(int32_t)((isnan(value) || isinf(value)) ? 0 : value);
    b->data[i] = (uint8_t)(n & 0xffu);
    b->data[i + 1] = (uint8_t)((n >> 8) & 0xffu);
    b->data[i + 2] = (uint8_t)((n >> 16) & 0xffu);
    b->data[i + 3] = (uint8_t)((n >> 24) & 0xffu);
    return (double)(i + 4);
}

double tsc_buffer_write_int32_be(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.writeInt32BE offset out of range");
    uint32_t n = (uint32_t)(int32_t)((isnan(value) || isinf(value)) ? 0 : value);
    b->data[i] = (uint8_t)((n >> 24) & 0xffu);
    b->data[i + 1] = (uint8_t)((n >> 16) & 0xffu);
    b->data[i + 2] = (uint8_t)((n >> 8) & 0xffu);
    b->data[i + 3] = (uint8_t)(n & 0xffu);
    return (double)(i + 4);
}

static double double_from_float_bits(uint32_t bits) {
    float value;
    memcpy(&value, &bits, sizeof value);
    return (double)value;
}

static uint32_t float_bits_from_double(double value) {
    float narrowed = (float)value;
    uint32_t bits;
    memcpy(&bits, &narrowed, sizeof bits);
    return bits;
}

static double double_from_bits(uint64_t bits) {
    double value;
    memcpy(&value, &bits, sizeof value);
    return value;
}

static uint64_t double_bits_from_double(double value) {
    uint64_t bits;
    memcpy(&bits, &value, sizeof bits);
    return bits;
}

double tsc_buffer_read_float_le(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.readFloatLE offset out of range");
    uint32_t bits = (uint32_t)b->data[i] |
        ((uint32_t)b->data[i + 1] << 8) |
        ((uint32_t)b->data[i + 2] << 16) |
        ((uint32_t)b->data[i + 3] << 24);
    return double_from_float_bits(bits);
}

double tsc_buffer_read_float_be(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.readFloatBE offset out of range");
    uint32_t bits = ((uint32_t)b->data[i] << 24) |
        ((uint32_t)b->data[i + 1] << 16) |
        ((uint32_t)b->data[i + 2] << 8) |
        (uint32_t)b->data[i + 3];
    return double_from_float_bits(bits);
}

double tsc_buffer_write_float_le(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.writeFloatLE offset out of range");
    uint32_t bits = float_bits_from_double(value);
    b->data[i] = (uint8_t)(bits & 0xffu);
    b->data[i + 1] = (uint8_t)((bits >> 8) & 0xffu);
    b->data[i + 2] = (uint8_t)((bits >> 16) & 0xffu);
    b->data[i + 3] = (uint8_t)((bits >> 24) & 0xffu);
    return (double)(i + 4);
}

double tsc_buffer_write_float_be(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 4, "Buffer.writeFloatBE offset out of range");
    uint32_t bits = float_bits_from_double(value);
    b->data[i] = (uint8_t)((bits >> 24) & 0xffu);
    b->data[i + 1] = (uint8_t)((bits >> 16) & 0xffu);
    b->data[i + 2] = (uint8_t)((bits >> 8) & 0xffu);
    b->data[i + 3] = (uint8_t)(bits & 0xffu);
    return (double)(i + 4);
}

double tsc_buffer_read_double_le(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 8, "Buffer.readDoubleLE offset out of range");
    uint64_t bits = (uint64_t)b->data[i] |
        ((uint64_t)b->data[i + 1] << 8) |
        ((uint64_t)b->data[i + 2] << 16) |
        ((uint64_t)b->data[i + 3] << 24) |
        ((uint64_t)b->data[i + 4] << 32) |
        ((uint64_t)b->data[i + 5] << 40) |
        ((uint64_t)b->data[i + 6] << 48) |
        ((uint64_t)b->data[i + 7] << 56);
    return double_from_bits(bits);
}

double tsc_buffer_read_double_be(const tsc_buffer_t* b, double offset) {
    size_t i = buffer_checked_offset(b, offset, 8, "Buffer.readDoubleBE offset out of range");
    uint64_t bits = ((uint64_t)b->data[i] << 56) |
        ((uint64_t)b->data[i + 1] << 48) |
        ((uint64_t)b->data[i + 2] << 40) |
        ((uint64_t)b->data[i + 3] << 32) |
        ((uint64_t)b->data[i + 4] << 24) |
        ((uint64_t)b->data[i + 5] << 16) |
        ((uint64_t)b->data[i + 6] << 8) |
        (uint64_t)b->data[i + 7];
    return double_from_bits(bits);
}

double tsc_buffer_write_double_le(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 8, "Buffer.writeDoubleLE offset out of range");
    uint64_t bits = double_bits_from_double(value);
    for (size_t j = 0; j < 8; j++) {
        b->data[i + j] = (uint8_t)((bits >> (8 * j)) & 0xffu);
    }
    return (double)(i + 8);
}

double tsc_buffer_write_double_be(tsc_buffer_t* b, double value, double offset) {
    size_t i = buffer_checked_offset(b, offset, 8, "Buffer.writeDoubleBE offset out of range");
    uint64_t bits = double_bits_from_double(value);
    for (size_t j = 0; j < 8; j++) {
        b->data[i + j] = (uint8_t)((bits >> (8 * (7 - j))) & 0xffu);
    }
    return (double)(i + 8);
}

tsc_buffer_t* tsc_buffer_swap(tsc_buffer_t* b, size_t width) {
    if (width == 0 || (b->len % width) != 0) {
        tsc_panic("Buffer.swap length must be a multiple of the element size");
    }
    for (size_t i = 0; i < b->len; i += width) {
        for (size_t j = 0; j < width / 2; j++) {
            uint8_t tmp = b->data[i + j];
            b->data[i + j] = b->data[i + width - 1 - j];
            b->data[i + width - 1 - j] = tmp;
        }
    }
    return b;
}

/* ---------------- dynamic values (NaN-boxed) ---------------- */

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
} tsc_function_identity_kind_t;

typedef struct tsc_function_identity {
    tsc_function_identity_kind_t kind;
    union {
        tsc_accessor_getter_t getter;
        tsc_accessor_setter_t setter;
        void* event_identity;
        struct {
            void* identity;
            uint64_t order;
        } event_raw_identity;
    } code;
    void* env;
    struct tsc_function_identity* next;
} tsc_function_identity_t;

static tsc_function_identity_t* g_function_identities = NULL;

struct tsc_object {
    size_t len;
    size_t cap;
    bool extensible;
    tsc_value_t prototype;
    tsc_object_prop_t* props;
};

typedef enum {
    TSC_PROMISE_PENDING,
    TSC_PROMISE_FULFILLED,
    TSC_PROMISE_REJECTED,
} tsc_promise_state_t;

struct tsc_promise {
    tsc_promise_state_t state;
    tsc_value_t result;
    void* ptr_result;
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

static double g_event_emitter_default_max_listeners = 10.0;

typedef struct tsc_event_once_promise_env {
    tsc_event_emitter_t* emitter;
    tsc_str_t* event;
    tsc_promise_t* promise;
} tsc_event_once_promise_env_t;

static tsc_value_t value_box(tsc_value_tag_t tag, uintptr_t payload) {
    return TSC_VALUE_BOX_MASK | ((uint64_t)payload & TSC_VALUE_PAYLOAD_MASK) | (uint64_t)tag;
}

static bool value_is_box(tsc_value_t v) {
    return (v & TSC_VALUE_BOX_MASK) == TSC_VALUE_BOX_MASK;
}

static tsc_value_tag_t value_tag(tsc_value_t v) {
    return (tsc_value_tag_t)(v & 0x7);
}

static void* value_ptr(tsc_value_t v) {
    return (void*)(uintptr_t)((v & TSC_VALUE_PAYLOAD_MASK) & ~UINT64_C(0x7));
}

static bool value_is_null_value(tsc_value_t v) {
    return value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_NULL;
}

static bool value_is_object_value(tsc_value_t v) {
    return value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT;
}

static bool value_is_valid_prototype(tsc_value_t v) {
    return value_is_null_value(v) || value_is_object_value(v);
}

tsc_value_t tsc_value_undefined(void) { return value_box(TSC_VALUE_TAG_UNDEFINED, 0); }
tsc_value_t tsc_value_null(void) { return value_box(TSC_VALUE_TAG_NULL, 0); }
tsc_value_t tsc_value_bool(bool b) { return value_box(b ? TSC_VALUE_TAG_TRUE : TSC_VALUE_TAG_FALSE, 0); }

tsc_value_t tsc_value_num(double n) {
    tsc_value_t v;
    memcpy(&v, &n, sizeof v);
    return v;
}

tsc_value_t tsc_value_string(tsc_str_t* s) { return value_box(TSC_VALUE_TAG_STRING, (uintptr_t)s); }
tsc_value_t tsc_value_array(tsc_array_t* a) { return value_box(TSC_VALUE_TAG_ARRAY, (uintptr_t)a); }
tsc_value_t tsc_value_object(tsc_object_t* o) { return value_box(TSC_VALUE_TAG_OBJECT, (uintptr_t)o); }

static tsc_value_t value_event_listener_identity(void* identity) {
    if (!identity) return tsc_value_undefined();
    for (tsc_function_identity_t* cur = g_function_identities; cur; cur = cur->next) {
        if (cur->kind == TSC_FUNCTION_IDENTITY_EVENT_LISTENER && cur->code.event_identity == identity) {
            return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)cur);
        }
    }
    tsc_function_identity_t* entry = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
    entry->kind = TSC_FUNCTION_IDENTITY_EVENT_LISTENER;
    entry->code.event_identity = identity;
    entry->env = NULL;
    entry->next = g_function_identities;
    g_function_identities = entry;
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)entry);
}

static tsc_value_t value_event_raw_listener_identity(void* identity, uint64_t order, bool once) {
    if (!once) return value_event_listener_identity(identity);
    if (!identity) return tsc_value_undefined();
    for (tsc_function_identity_t* cur = g_function_identities; cur; cur = cur->next) {
        if (
            cur->kind == TSC_FUNCTION_IDENTITY_EVENT_RAW_LISTENER &&
            cur->code.event_raw_identity.identity == identity &&
            cur->code.event_raw_identity.order == order
        ) {
            return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)cur);
        }
    }
    tsc_function_identity_t* entry = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
    entry->kind = TSC_FUNCTION_IDENTITY_EVENT_RAW_LISTENER;
    entry->code.event_raw_identity.identity = identity;
    entry->code.event_raw_identity.order = order;
    entry->env = NULL;
    entry->next = g_function_identities;
    g_function_identities = entry;
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)entry);
}

tsc_promise_t* tsc_promise_resolve(tsc_value_t value) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_FULFILLED;
    p->result = value;
    p->ptr_result = NULL;
    return p;
}

tsc_promise_t* tsc_promise_resolve_fs_stats(tsc_fs_stats_t* value) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_FULFILLED;
    p->result = tsc_value_undefined();
    p->ptr_result = value;
    return p;
}

tsc_promise_t* tsc_promise_resolve_buffer(tsc_buffer_t* value) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_FULFILLED;
    p->result = tsc_value_undefined();
    p->ptr_result = value;
    return p;
}

tsc_promise_t* tsc_promise_reject(tsc_value_t reason) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_REJECTED;
    p->result = reason;
    p->ptr_result = NULL;
    return p;
}

tsc_promise_t* tsc_promise_pending(void) {
    tsc_promise_t* p = (tsc_promise_t*)TSC_GC_MALLOC(sizeof(tsc_promise_t));
    p->state = TSC_PROMISE_PENDING;
    p->result = tsc_value_undefined();
    p->ptr_result = NULL;
    return p;
}

tsc_promise_t* tsc_promise_adopt(tsc_promise_t* promise) {
    return promise ? promise : tsc_promise_resolve(tsc_value_undefined());
}

void tsc_promise_fulfill_in_place(tsc_promise_t* p, tsc_value_t value) {
    if (!p || p->state != TSC_PROMISE_PENDING) return;
    p->state = TSC_PROMISE_FULFILLED;
    p->result = value;
    p->ptr_result = NULL;
}

void tsc_promise_reject_in_place(tsc_promise_t* p, tsc_value_t reason) {
    if (!p || p->state != TSC_PROMISE_PENDING) return;
    p->state = TSC_PROMISE_REJECTED;
    p->result = reason;
    p->ptr_result = NULL;
}

bool tsc_promise_is_fulfilled(const tsc_promise_t* p) {
    return p && p->state == TSC_PROMISE_FULFILLED;
}

bool tsc_promise_is_rejected(const tsc_promise_t* p) {
    return p && p->state == TSC_PROMISE_REJECTED;
}

bool tsc_promise_is_pending(const tsc_promise_t* p) {
    return p && p->state == TSC_PROMISE_PENDING;
}

tsc_value_t tsc_promise_value(const tsc_promise_t* p) {
    return p ? p->result : tsc_value_undefined();
}

tsc_fs_stats_t* tsc_promise_fs_stats_value(const tsc_promise_t* p) {
    return p ? (tsc_fs_stats_t*)p->ptr_result : NULL;
}

tsc_buffer_t* tsc_promise_buffer_value(const tsc_promise_t* p) {
    return p ? (tsc_buffer_t*)p->ptr_result : NULL;
}

tsc_value_t tsc_promise_reason(const tsc_promise_t* p) {
    return p ? p->result : tsc_value_undefined();
}

tsc_event_emitter_t* tsc_event_emitter_new(void) {
    tsc_event_emitter_t* ee = (tsc_event_emitter_t*)TSC_GC_MALLOC(sizeof(tsc_event_emitter_t));
    ee->len = 0;
    ee->cap = 0;
    ee->next_order = 1;
    ee->max_listeners = 0.0;
    ee->has_own_max_listeners = false;
    ee->listeners = NULL;
    return ee;
}

static void event_emitter_reserve(tsc_event_emitter_t* ee, size_t cap) {
    if (!ee || ee->cap >= cap) return;
    size_t next = ee->cap ? ee->cap * 2 : 4;
    if (next < cap) next = cap;
    tsc_event_listener_t* items = (tsc_event_listener_t*)TSC_GC_MALLOC(sizeof(tsc_event_listener_t) * next);
    if (ee->listeners && ee->len > 0) {
        memcpy(items, ee->listeners, sizeof(tsc_event_listener_t) * ee->len);
    }
    ee->listeners = items;
    ee->cap = next;
}

void tsc_event_emitter_on(tsc_event_emitter_t* ee, tsc_str_t* event, tsc_event_listener_fn_t fn, void* env, void* identity, bool once, bool prepend) {
    if (!ee || !event || !fn) return;
    event_emitter_reserve(ee, ee->len + 1);
    size_t idx = ee->len;
    if (prepend) {
        for (size_t i = 0; i < ee->len; i++) {
            if (tsc_str_eq(ee->listeners[i].event, event)) {
                idx = i;
                break;
            }
        }
        for (size_t i = ee->len; i > idx; i--) {
            ee->listeners[i] = ee->listeners[i - 1];
        }
    }
    ee->listeners[idx].event = event;
    ee->listeners[idx].fn = fn;
    ee->listeners[idx].env = env;
    ee->listeners[idx].identity = identity ? identity : env;
    ee->listeners[idx].order = ee->next_order++;
    ee->listeners[idx].once = once;
    ee->len++;
}

void tsc_event_emitter_off(tsc_event_emitter_t* ee, const tsc_str_t* event, tsc_event_listener_fn_t fn, void* identity) {
    if (!ee || !event || !fn) return;
    size_t found = SIZE_MAX;
    uint64_t found_order = 0;
    for (size_t i = 0; i < ee->len; i++) {
        if (!tsc_str_eq(ee->listeners[i].event, event)) continue;
        if (ee->listeners[i].fn != fn || ee->listeners[i].identity != identity) continue;
        if (found == SIZE_MAX || ee->listeners[i].order > found_order) {
            found = i;
            found_order = ee->listeners[i].order;
        }
    }
    if (found != SIZE_MAX) {
        for (size_t j = found + 1; j < ee->len; j++) ee->listeners[j - 1] = ee->listeners[j];
        ee->len--;
    }
}

void tsc_event_emitter_remove_all(tsc_event_emitter_t* ee, const tsc_str_t* event) {
    if (!ee) return;
    if (!event) {
        ee->len = 0;
        return;
    }
    size_t out = 0;
    for (size_t i = 0; i < ee->len; i++) {
        if (tsc_str_eq(ee->listeners[i].event, event)) continue;
        if (out != i) ee->listeners[out] = ee->listeners[i];
        out++;
    }
    ee->len = out;
}

static tsc_array_t* event_args_copy_as_values(tsc_array_t* args) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), args && args->len ? args->len : 1);
    if (!args) return out;
    for (size_t i = 0; i < args->len; i++) {
        tsc_value_t value = TSC_ARR(tsc_value_t, args, i);
        tsc_array_push_raw(out, &value);
    }
    return out;
}

static void event_once_promise_resolve_listener(void* env, tsc_array_t* args);
static void event_once_promise_reject_listener(void* env, tsc_array_t* args);

static void event_once_promise_resolve_listener(void* env, tsc_array_t* args) {
    tsc_event_once_promise_env_t* state = (tsc_event_once_promise_env_t*)env;
    if (!state || !state->promise) return;
    tsc_event_emitter_off(state->emitter, tsc_str_from_lit("error", 5), event_once_promise_reject_listener, state);
    tsc_promise_fulfill_in_place(state->promise, tsc_value_array(event_args_copy_as_values(args)));
}

static void event_once_promise_reject_listener(void* env, tsc_array_t* args) {
    tsc_event_once_promise_env_t* state = (tsc_event_once_promise_env_t*)env;
    if (!state || !state->promise) return;
    tsc_event_emitter_off(state->emitter, state->event, event_once_promise_resolve_listener, state);
    tsc_value_t reason = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_string(tsc_str_from_lit("Unhandled error event", 21));
    tsc_promise_reject_in_place(state->promise, reason);
}

tsc_promise_t* tsc_event_emitter_once_promise(tsc_event_emitter_t* ee, tsc_str_t* event) {
    tsc_promise_t* promise = tsc_promise_pending();
    if (!ee || !event) return promise;
    tsc_event_once_promise_env_t* env = (tsc_event_once_promise_env_t*)TSC_GC_MALLOC(sizeof(tsc_event_once_promise_env_t));
    env->emitter = ee;
    env->event = event;
    env->promise = promise;
    tsc_event_emitter_on(ee, event, event_once_promise_resolve_listener, env, env, true, false);
    if (!str_lit_eq(event, "error")) {
        tsc_event_emitter_on(ee, tsc_str_from_lit("error", 5), event_once_promise_reject_listener, env, env, true, false);
    }
    return promise;
}

static int tsc_dns_lookup_ai_flags(double hints) {
    if (isnan(hints) || isinf(hints)) return 0;
    int flags = (int)hints;
    int out = 0;
#ifdef AI_V4MAPPED
    if ((flags & 8) != 0) out |= AI_V4MAPPED;
#endif
#ifdef AI_ALL
    if ((flags & 16) != 0) out |= AI_ALL;
#endif
#ifdef AI_ADDRCONFIG
    if ((flags & 32) != 0) out |= AI_ADDRCONFIG;
#endif
    return out;
}

tsc_dns_lookup_result_t tsc_dns_lookup(tsc_str_t* hostname, double family, double hints_value) {
    tsc_dns_lookup_result_t out;
    out.error = NULL;
    out.address = NULL;
    out.family = 0.0;
    if (!hostname) {
        out.error = tsc_str_from_lit("dns.lookup: hostname required", 29);
        return out;
    }
    int ai_family = AF_UNSPEC;
    if (family == 4.0) {
        ai_family = AF_INET;
    } else if (family == 6.0) {
        ai_family = AF_INET6;
    } else if (family != 0.0) {
        out.error = tsc_str_from_lit("dns.lookup: unsupported family", 30);
        return out;
    }
    char* host = cstr_dup(hostname);
    struct addrinfo hints;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = ai_family;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_flags = tsc_dns_lookup_ai_flags(hints_value);
    struct addrinfo* result = NULL;
    int rc = getaddrinfo(host, NULL, &hints, &result);
    free(host);
    if (rc != 0) {
        out.error = tsc_str_from_cstr(gai_strerror(rc));
        return out;
    }
    char buf[INET6_ADDRSTRLEN];
    for (struct addrinfo* cur = result; cur; cur = cur->ai_next) {
        void* src = NULL;
        if (cur->ai_family == AF_INET) {
            src = &((struct sockaddr_in*)cur->ai_addr)->sin_addr;
            out.family = 4.0;
        } else if (cur->ai_family == AF_INET6) {
            src = &((struct sockaddr_in6*)cur->ai_addr)->sin6_addr;
            out.family = 6.0;
        }
        if (src && inet_ntop(cur->ai_family, src, buf, sizeof(buf))) {
            out.address = tsc_str_from_cstr(buf);
            break;
        }
    }
    freeaddrinfo(result);
    if (!out.address) {
        out.error = tsc_str_from_lit("dns.lookup: no address found", 28);
    }
    return out;
}

tsc_dns_lookup_all_result_t tsc_dns_lookup_all(tsc_str_t* hostname, double family, double hints_value) {
    tsc_dns_lookup_all_result_t out;
    out.error = NULL;
    out.addresses = NULL;
    if (!hostname) {
        out.error = tsc_str_from_lit("dns.lookup: hostname required", 29);
        return out;
    }
    int ai_family = AF_UNSPEC;
    if (family == 4.0) {
        ai_family = AF_INET;
    } else if (family == 6.0) {
        ai_family = AF_INET6;
    } else if (family != 0.0) {
        out.error = tsc_str_from_lit("dns.lookup: unsupported family", 30);
        return out;
    }
    char* host = cstr_dup(hostname);
    struct addrinfo hints;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = ai_family;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_flags = tsc_dns_lookup_ai_flags(hints_value);
    struct addrinfo* result = NULL;
    int rc = getaddrinfo(host, NULL, &hints, &result);
    free(host);
    if (rc != 0) {
        out.error = tsc_str_from_cstr(gai_strerror(rc));
        return out;
    }
    out.addresses = tsc_array_new(sizeof(tsc_value_t), 4);
    char buf[INET6_ADDRSTRLEN];
    for (struct addrinfo* cur = result; cur; cur = cur->ai_next) {
        void* src = NULL;
        double resolved_family = 0.0;
        if (cur->ai_family == AF_INET) {
            src = &((struct sockaddr_in*)cur->ai_addr)->sin_addr;
            resolved_family = 4.0;
        } else if (cur->ai_family == AF_INET6) {
            src = &((struct sockaddr_in6*)cur->ai_addr)->sin6_addr;
            resolved_family = 6.0;
        }
        if (src && inet_ntop(cur->ai_family, src, buf, sizeof(buf))) {
            tsc_object_t* entry = tsc_object_new();
            tsc_object_set(entry, tsc_str_from_lit("address", 7), tsc_value_string(tsc_str_from_cstr(buf)));
            tsc_object_set(entry, tsc_str_from_lit("family", 6), tsc_value_num(resolved_family));
            tsc_value_t boxed = tsc_value_object(entry);
            tsc_array_push_raw(out.addresses, &boxed);
        }
    }
    freeaddrinfo(result);
    if (out.addresses->len == 0) {
        out.error = tsc_str_from_lit("dns.lookup: no address found", 28);
    }
    return out;
}

bool tsc_net_is_ipv4(tsc_str_t* input) {
    if (!input) return false;
    char* cstr = cstr_dup(input);
    struct in_addr addr4;
    int ok = inet_pton(AF_INET, cstr, &addr4) == 1;
    free(cstr);
    return ok;
}

bool tsc_net_is_ipv6(tsc_str_t* input) {
    if (!input) return false;
    char* cstr = cstr_dup(input);
    struct in6_addr addr6;
    int ok = inet_pton(AF_INET6, cstr, &addr6) == 1;
    free(cstr);
    return ok;
}

double tsc_net_is_ip(tsc_str_t* input) {
    if (tsc_net_is_ipv4(input)) return 4.0;
    if (tsc_net_is_ipv6(input)) return 6.0;
    return 0.0;
}

double tsc_event_emitter_get_default_max_listeners(void) {
    return g_event_emitter_default_max_listeners;
}

void tsc_event_emitter_set_default_max_listeners(double n) {
    if (isnan(n) || n < 0.0) {
        tsc_throw_str(tsc_str_from_cstr("EventEmitter.defaultMaxListeners: invalid listener count"));
        return;
    }
    g_event_emitter_default_max_listeners = n;
}

bool tsc_event_emitter_emit(tsc_event_emitter_t* ee, const tsc_str_t* event, tsc_array_t* args) {
    if (!ee || !event) return false;
    bool called = false;
    for (size_t i = 0; i < ee->len; ) {
        tsc_event_listener_t listener = ee->listeners[i];
        if (!tsc_str_eq(listener.event, event)) {
            i++;
            continue;
        }
        called = true;
        if (listener.once) {
            for (size_t j = i + 1; j < ee->len; j++) ee->listeners[j - 1] = ee->listeners[j];
            ee->len--;
            listener.fn(listener.env, args);
        } else {
            listener.fn(listener.env, args);
            i++;
        }
    }
    if (!called && str_lit_eq(event, "error")) {
        tsc_str_t* message = tsc_str_from_cstr("Unhandled error event");
        if (args && args->len > 0) {
            message = tsc_value_to_string(TSC_ARR(tsc_value_t, args, 0));
        }
        tsc_throw_str(message);
    }
    return called;
}

double tsc_event_emitter_listener_count(const tsc_event_emitter_t* ee, const tsc_str_t* event) {
    if (!ee || !event) return 0.0;
    size_t count = 0;
    for (size_t i = 0; i < ee->len; i++) {
        if (tsc_str_eq(ee->listeners[i].event, event)) count++;
    }
    return (double)count;
}

double tsc_event_emitter_listener_count_identity(const tsc_event_emitter_t* ee, const tsc_str_t* event, void* identity) {
    if (!ee || !event || !identity) return 0.0;
    size_t count = 0;
    for (size_t i = 0; i < ee->len; i++) {
        if (tsc_str_eq(ee->listeners[i].event, event) && ee->listeners[i].identity == identity) count++;
    }
    return (double)count;
}

tsc_array_t* tsc_event_emitter_listeners(const tsc_event_emitter_t* ee, const tsc_str_t* event) {
    tsc_array_t* listeners = tsc_array_new(sizeof(tsc_value_t), ee ? ee->len : 0);
    if (!ee || !event) return listeners;
    for (size_t i = 0; i < ee->len; i++) {
        if (!tsc_str_eq(ee->listeners[i].event, event)) continue;
        tsc_value_t listener = value_event_listener_identity(ee->listeners[i].identity);
        tsc_array_push_raw(listeners, &listener);
    }
    return listeners;
}

tsc_array_t* tsc_event_emitter_raw_listeners(const tsc_event_emitter_t* ee, const tsc_str_t* event) {
    tsc_array_t* listeners = tsc_array_new(sizeof(tsc_value_t), ee ? ee->len : 0);
    if (!ee || !event) return listeners;
    for (size_t i = 0; i < ee->len; i++) {
        if (!tsc_str_eq(ee->listeners[i].event, event)) continue;
        tsc_value_t listener = value_event_raw_listener_identity(ee->listeners[i].identity, ee->listeners[i].order, ee->listeners[i].once);
        tsc_array_push_raw(listeners, &listener);
    }
    return listeners;
}

tsc_array_t* tsc_event_emitter_event_names(const tsc_event_emitter_t* ee) {
    tsc_array_t* names = tsc_array_new(sizeof(tsc_str_t*), ee ? ee->len : 0);
    if (!ee) return names;
    for (size_t i = 0; i < ee->len; i++) {
        bool seen = false;
        for (size_t j = 0; j < i; j++) {
            if (tsc_str_eq(ee->listeners[j].event, ee->listeners[i].event)) {
                seen = true;
                break;
            }
        }
        if (!seen) {
            tsc_str_t* event = ee->listeners[i].event;
            tsc_array_push_raw(names, &event);
        }
    }
    return names;
}

void tsc_event_emitter_set_max_listeners(tsc_event_emitter_t* ee, double n) {
    if (!ee) return;
    if (isnan(n) || n < 0.0) {
        tsc_throw_str(tsc_str_from_cstr("EventEmitter.setMaxListeners: invalid listener count"));
        return;
    }
    ee->max_listeners = n;
    ee->has_own_max_listeners = true;
}

double tsc_event_emitter_get_max_listeners(const tsc_event_emitter_t* ee) {
    return ee ? (ee->has_own_max_listeners ? ee->max_listeners : g_event_emitter_default_max_listeners) : 0.0;
}

tsc_event_t* tsc_event_new(tsc_str_t* type, bool cancelable) {
    tsc_event_t* event = (tsc_event_t*)TSC_GC_MALLOC(sizeof(tsc_event_t));
    event->type = type ? type : tsc_str_from_lit("", 0);
    event->target = NULL;
    event->current_target = NULL;
    event->default_prevented = false;
    event->cancelable = cancelable;
    return event;
}

tsc_str_t* tsc_event_type(const tsc_event_t* event) {
    return event && event->type ? event->type : tsc_str_from_lit("", 0);
}

tsc_event_target_t* tsc_event_target(const tsc_event_t* event) {
    return event ? event->target : NULL;
}

tsc_event_target_t* tsc_event_current_target(const tsc_event_t* event) {
    return event ? event->current_target : NULL;
}

bool tsc_event_default_prevented(const tsc_event_t* event) {
    return event ? event->default_prevented : false;
}

bool tsc_event_cancelable(const tsc_event_t* event) {
    return event ? event->cancelable : false;
}

void tsc_event_prevent_default(tsc_event_t* event) {
    if (event && event->cancelable) event->default_prevented = true;
}

tsc_event_target_t* tsc_event_target_new(void) {
    tsc_event_target_t* target = (tsc_event_target_t*)TSC_GC_MALLOC(sizeof(tsc_event_target_t));
    target->len = 0;
    target->cap = 0;
    target->listeners = NULL;
    return target;
}

static void event_target_reserve(tsc_event_target_t* target, size_t cap) {
    if (!target || target->cap >= cap) return;
    size_t next = target->cap ? target->cap * 2 : 4;
    if (next < cap) next = cap;
    tsc_dom_event_listener_t* items = (tsc_dom_event_listener_t*)TSC_GC_MALLOC(sizeof(tsc_dom_event_listener_t) * next);
    if (target->listeners && target->len > 0) {
        memcpy(items, target->listeners, sizeof(tsc_dom_event_listener_t) * target->len);
    }
    target->listeners = items;
    target->cap = next;
}

void tsc_event_target_add(tsc_event_target_t* target, tsc_str_t* type, tsc_event_target_listener_fn_t fn, void* env, void* identity, bool once) {
    if (!target || !type || !fn) return;
    void* actual_identity = identity ? identity : env;
    for (size_t i = 0; i < target->len; i++) {
        if (tsc_str_eq(target->listeners[i].type, type) && target->listeners[i].fn == fn && target->listeners[i].identity == actual_identity) {
            return;
        }
    }
    event_target_reserve(target, target->len + 1);
    target->listeners[target->len++] = (tsc_dom_event_listener_t){ type, fn, env, actual_identity, once };
}

void tsc_event_target_remove(tsc_event_target_t* target, const tsc_str_t* type, tsc_event_target_listener_fn_t fn, void* identity) {
    if (!target || !type || !fn) return;
    for (size_t i = 0; i < target->len; i++) {
        if (!tsc_str_eq(target->listeners[i].type, type)) continue;
        if (target->listeners[i].fn != fn || target->listeners[i].identity != identity) continue;
        for (size_t j = i + 1; j < target->len; j++) target->listeners[j - 1] = target->listeners[j];
        target->len--;
        return;
    }
}

bool tsc_event_target_dispatch(tsc_event_target_t* target, tsc_event_t* event) {
    if (!target || !event) return true;
    if (!event->target) event->target = target;
    event->current_target = target;
    size_t snapshot_len = target->len;
    tsc_dom_event_listener_t* snapshot = NULL;
    if (snapshot_len > 0) {
        snapshot = (tsc_dom_event_listener_t*)TSC_GC_MALLOC(sizeof(tsc_dom_event_listener_t) * snapshot_len);
        memcpy(snapshot, target->listeners, sizeof(tsc_dom_event_listener_t) * snapshot_len);
    }
    for (size_t i = 0; i < snapshot_len; i++) {
        if (!tsc_str_eq(snapshot[i].type, event->type)) continue;
        bool still_registered = false;
        for (size_t j = 0; j < target->len; j++) {
            if (
                tsc_str_eq(target->listeners[j].type, snapshot[i].type) &&
                target->listeners[j].fn == snapshot[i].fn &&
                target->listeners[j].identity == snapshot[i].identity
            ) {
                still_registered = true;
                break;
            }
        }
        if (still_registered) {
            if (snapshot[i].once) {
                tsc_event_target_remove(target, snapshot[i].type, snapshot[i].fn, snapshot[i].identity);
            }
            snapshot[i].fn(snapshot[i].env, event);
        }
    }
    event->current_target = NULL;
    return !(event->cancelable && event->default_prevented);
}

static tsc_value_t value_accessor_getter_identity(tsc_accessor_getter_t getter, void* env) {
    if (!getter) return tsc_value_undefined();
    for (tsc_function_identity_t* cur = g_function_identities; cur; cur = cur->next) {
        if (cur->kind == TSC_FUNCTION_IDENTITY_GETTER && cur->code.getter == getter && cur->env == env) {
            return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)cur);
        }
    }
    tsc_function_identity_t* entry = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
    entry->kind = TSC_FUNCTION_IDENTITY_GETTER;
    entry->code.getter = getter;
    entry->env = env;
    entry->next = g_function_identities;
    g_function_identities = entry;
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)entry);
}

static tsc_value_t value_accessor_setter_identity(tsc_accessor_setter_t setter, void* env) {
    if (!setter) return tsc_value_undefined();
    for (tsc_function_identity_t* cur = g_function_identities; cur; cur = cur->next) {
        if (cur->kind == TSC_FUNCTION_IDENTITY_SETTER && cur->code.setter == setter && cur->env == env) {
            return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)cur);
        }
    }
    tsc_function_identity_t* entry = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
    entry->kind = TSC_FUNCTION_IDENTITY_SETTER;
    entry->code.setter = setter;
    entry->env = env;
    entry->next = g_function_identities;
    g_function_identities = entry;
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)entry);
}

static double value_as_num(tsc_value_t v) {
    double n;
    memcpy(&n, &v, sizeof n);
    return n;
}

bool tsc_value_is_truthy(tsc_value_t v) {
    if (!value_is_box(v)) {
        double n = value_as_num(v);
        return n != 0.0 && !isnan(n);
    }
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_UNDEFINED:
        case TSC_VALUE_TAG_NULL:
        case TSC_VALUE_TAG_FALSE:
            return false;
        case TSC_VALUE_TAG_STRING: {
            tsc_str_t* s = (tsc_str_t*)value_ptr(v);
            return s && s->len > 0;
        }
        default:
            return true;
    }
}

bool tsc_value_number_is_integer(tsc_value_t v) {
    if (value_is_box(v)) return false;
    double n = value_as_num(v);
    return !isnan(n) && !isinf(n) && n == floor(n);
}

bool tsc_value_number_is_finite(tsc_value_t v) {
    return !value_is_box(v) && isfinite(value_as_num(v));
}

bool tsc_value_number_is_nan(tsc_value_t v) {
    return !value_is_box(v) && isnan(value_as_num(v));
}

bool tsc_value_number_is_safe_integer(tsc_value_t v) {
    if (value_is_box(v)) return false;
    double n = value_as_num(v);
    return !isnan(n) && !isinf(n) && n == floor(n) && fabs(n) <= 9007199254740991.0;
}

double tsc_value_as_num(tsc_value_t v) {
    if (!value_is_box(v)) return value_as_num(v);
    if (value_tag(v) == TSC_VALUE_TAG_TRUE) return 1.0;
    if (value_tag(v) == TSC_VALUE_TAG_FALSE || value_tag(v) == TSC_VALUE_TAG_NULL) return 0.0;
    if (value_tag(v) == TSC_VALUE_TAG_STRING) {
        tsc_str_t* s = (tsc_str_t*)value_ptr(v);
        char* text = cstr_dup(s);
        char* p = text;
        while (isspace((unsigned char)*p)) p++;
        if (*p == '\0') {
            free(text);
            return 0.0;
        }
        char* end = NULL;
        double n = strtod(p, &end);
        while (end && isspace((unsigned char)*end)) end++;
        if (!end || end == p || *end != '\0') n = NAN;
        free(text);
        return n;
    }
    return NAN;
}

bool tsc_value_as_bool(tsc_value_t v) {
    if (value_is_box(v)) {
        if (value_tag(v) == TSC_VALUE_TAG_TRUE) return true;
        if (value_tag(v) == TSC_VALUE_TAG_FALSE) return false;
    }
    return tsc_value_is_truthy(v);
}

tsc_str_t* tsc_value_as_string(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return (tsc_str_t*)value_ptr(v);
    }
    return tsc_value_to_string(v);
}

tsc_array_t* tsc_value_as_array(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return (tsc_array_t*)value_ptr(v);
    }
    return tsc_array_new(sizeof(tsc_value_t), 1);
}

tsc_str_t* tsc_value_typeof(tsc_value_t v) {
    if (!value_is_box(v)) return tsc_str_from_lit("number", 6);
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_FUNCTION: return tsc_str_from_lit("function", 8);
        case TSC_VALUE_TAG_UNDEFINED: return tsc_str_from_lit("undefined", 9);
        case TSC_VALUE_TAG_NULL: return tsc_str_from_lit("object", 6);
        case TSC_VALUE_TAG_FALSE:
        case TSC_VALUE_TAG_TRUE: return tsc_str_from_lit("boolean", 7);
        case TSC_VALUE_TAG_STRING: return tsc_str_from_lit("string", 6);
        case TSC_VALUE_TAG_ARRAY:
        case TSC_VALUE_TAG_OBJECT: return tsc_str_from_lit("object", 6);
    }
    return tsc_str_from_lit("undefined", 9);
}

tsc_str_t* tsc_value_to_string(tsc_value_t v) {
    if (!value_is_box(v)) return tsc_str_from_num(value_as_num(v));
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_FUNCTION: return tsc_str_from_lit("[function]", 10);
        case TSC_VALUE_TAG_UNDEFINED: return tsc_str_from_lit("undefined", 9);
        case TSC_VALUE_TAG_NULL: return tsc_str_from_lit("null", 4);
        case TSC_VALUE_TAG_FALSE: return tsc_str_from_lit("false", 5);
        case TSC_VALUE_TAG_TRUE: return tsc_str_from_lit("true", 4);
        case TSC_VALUE_TAG_STRING: return (tsc_str_t*)value_ptr(v);
        case TSC_VALUE_TAG_ARRAY: {
            tsc_value_t joined = tsc_value_method_join(v, tsc_value_undefined());
            return tsc_value_as_string(joined);
        }
        case TSC_VALUE_TAG_OBJECT: return tsc_str_from_lit("[object Object]", 15);
    }
    return tsc_str_from_lit("undefined", 9);
}

bool tsc_value_is_nullish(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    tsc_value_tag_t tag = value_tag(v);
    return tag == TSC_VALUE_TAG_UNDEFINED || tag == TSC_VALUE_TAG_NULL;
}

bool tsc_value_is_undefined(tsc_value_t v) {
    return value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_UNDEFINED;
}

bool tsc_value_is_array(tsc_value_t v) {
    return value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY;
}

tsc_value_t tsc_value_apply_function(tsc_value_t fn, tsc_value_t this_arg, tsc_value_t args) {
    if (!value_is_box(fn) || value_tag(fn) != TSC_VALUE_TAG_FUNCTION) {
        tsc_panic("Reflect.apply target is not a function");
    }
    if (!value_is_box(args) || value_tag(args) != TSC_VALUE_TAG_ARRAY) {
        tsc_panic("Reflect.apply argumentsList must be an array");
    }
    tsc_function_identity_t* ident = (tsc_function_identity_t*)value_ptr(fn);
    tsc_array_t* list = (tsc_array_t*)value_ptr(args);
    if (ident->kind == TSC_FUNCTION_IDENTITY_GETTER) {
        return ident->code.getter(ident->env, this_arg);
    }
    if (ident->kind != TSC_FUNCTION_IDENTITY_SETTER) {
        tsc_panic("Reflect.apply target is not a callable function identity");
    }
    tsc_value_t value = list->len > 0 ? TSC_ARR(tsc_value_t, list, 0) : tsc_value_undefined();
    ident->code.setter(ident->env, this_arg, value);
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

static bool tsc_value_array_set_length(tsc_array_t* a, tsc_value_t value) {
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

static tsc_array_t* value_array_keys(const tsc_array_t* src, bool include_length) {
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

static tsc_array_t* value_array_values(const tsc_array_t* src) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), src ? src->len : 1);
    if (!src || src->es != sizeof(tsc_value_t)) return out;
    for (size_t i = 0; i < src->len; i++) {
        tsc_value_t value = TSC_ARR(tsc_value_t, src, i);
        tsc_array_push_raw(out, &value);
    }
    return out;
}

static tsc_array_t* value_array_entries(const tsc_array_t* src) {
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

static tsc_array_t* value_string_keys(const tsc_str_t* src, bool include_length) {
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

static tsc_array_t* value_string_values(const tsc_str_t* src) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), src ? src->len : 1);
    if (!src) return out;
    for (size_t i = 0; i < src->len; i++) {
        tsc_value_t value = tsc_value_string(tsc_str_char_at(src, (double)i));
        tsc_array_push_raw(out, &value);
    }
    return out;
}

static tsc_array_t* value_string_entries(const tsc_str_t* src) {
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

static tsc_value_t value_descriptor_from_array_index(const tsc_array_t* src, size_t idx) {
    tsc_object_t* desc = tsc_object_new();
    tsc_value_t value = TSC_ARR(tsc_value_t, src, idx);
    tsc_object_set(desc, tsc_str_from_lit("value", 5), value);
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(!src->frozen));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(true));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(!src->sealed && !src->frozen));
    return tsc_value_object(desc);
}

static tsc_value_t value_descriptor_from_array_length(const tsc_array_t* src) {
    tsc_object_t* desc = tsc_object_new();
    tsc_object_set(desc, tsc_str_from_lit("value", 5), tsc_value_num((double)(src ? src->len : 0)));
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(src ? !src->frozen : true));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(false));
    return tsc_value_object(desc);
}

static tsc_value_t value_descriptor_from_array_key(const tsc_array_t* src, const tsc_str_t* key) {
    if (!src) return tsc_value_undefined();
    if (tsc_str_is_length_key(key)) return value_descriptor_from_array_length(src);
    size_t idx = 0;
    if (src->es == sizeof(tsc_value_t) && tsc_str_array_index(key, &idx) && idx < src->len) {
        return value_descriptor_from_array_index(src, idx);
    }
    return tsc_value_undefined();
}

static tsc_value_t value_descriptor_from_string_index(const tsc_str_t* src, size_t idx) {
    tsc_object_t* desc = tsc_object_new();
    tsc_object_set(desc, tsc_str_from_lit("value", 5), tsc_value_string(tsc_str_char_at(src, (double)idx)));
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(true));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(false));
    return tsc_value_object(desc);
}

static tsc_value_t value_descriptor_from_string_length(const tsc_str_t* src) {
    tsc_object_t* desc = tsc_object_new();
    tsc_object_set(desc, tsc_str_from_lit("value", 5), tsc_value_num((double)(src ? src->len : 0)));
    tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(false));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(false));
    return tsc_value_object(desc);
}

static tsc_value_t value_descriptor_from_string_key(const tsc_str_t* src, const tsc_str_t* key) {
    if (!src) return tsc_value_undefined();
    if (tsc_str_is_length_key(key)) return value_descriptor_from_string_length(src);
    size_t idx = 0;
    if (tsc_str_array_index(key, &idx) && idx < src->len) {
        return value_descriptor_from_string_index(src, idx);
    }
    return tsc_value_undefined();
}

static tsc_value_t value_descriptors_from_array(const tsc_array_t* src) {
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

static tsc_value_t value_descriptors_from_string(const tsc_str_t* src) {
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

static tsc_value_t value_descriptor_from_prop(const tsc_object_prop_t* prop) {
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
    for (size_t i = 0; i < o->len; i++) {
        if (!tsc_str_eq(o->props[i].key, key)) continue;
        return value_descriptor_from_prop(&o->props[i]);
    }
    return tsc_value_undefined();
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

static bool tsc_value_same_value_zero(tsc_value_t a, tsc_value_t b) {
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

static double value_slice_arg(tsc_value_t v, double fallback) {
    if (tsc_value_is_nullish(v)) return fallback;
    double n = tsc_value_as_num(v);
    return isnan(n) ? 0.0 : n;
}

static size_t value_array_forward_start(size_t len, double from_index) {
    if (isnan(from_index) || from_index == -INFINITY) return 0;
    if (from_index == INFINITY) return len;
    int64_t idx = (int64_t)(from_index < 0 ? ceil(from_index) : floor(from_index));
    if (idx < 0) idx = (int64_t)len + idx;
    if (idx < 0) return 0;
    if (idx > (int64_t)len) return len;
    return (size_t)idx;
}

static bool value_array_last_start(size_t len, double from_index, size_t* out) {
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

static tsc_str_t* value_join_part(tsc_value_t v) {
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

static void value_flat_push(tsc_array_t* out, tsc_value_t value, int depth) {
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

static uint32_t split_limit_from_value(tsc_value_t limit) {
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

static tsc_array_t* value_array_from_string_array(const tsc_array_t* strings) {
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

tsc_object_t* tsc_object_new(void) {
    tsc_object_t* o = (tsc_object_t*)TSC_GC_MALLOC(sizeof(tsc_object_t));
    o->len = 0;
    o->cap = 4;
    o->extensible = true;
    o->prototype = tsc_value_null();
    o->props = (tsc_object_prop_t*)TSC_GC_MALLOC(sizeof(tsc_object_prop_t) * o->cap);
    return o;
}

static void object_reserve(tsc_object_t* o, size_t cap) {
    if (cap <= o->cap) return;
    size_t next = o->cap ? o->cap : 4;
    while (next < cap) next *= 2;
    tsc_object_prop_t* props = (tsc_object_prop_t*)TSC_GC_MALLOC(sizeof(tsc_object_prop_t) * next);
    if (o->props && o->len > 0) memcpy(props, o->props, sizeof(tsc_object_prop_t) * o->len);
    o->props = props;
    o->cap = next;
}

static ssize_t object_find(const tsc_object_t* o, const tsc_str_t* key) {
    if (!o) return -1;
    for (size_t i = 0; i < o->len; i++) {
        if (tsc_str_eq(o->props[i].key, key)) return (ssize_t)i;
    }
    return -1;
}

static const tsc_object_t* object_prototype_object(const tsc_object_t* o) {
    if (!o || !value_is_object_value(o->prototype)) return NULL;
    return (const tsc_object_t*)value_ptr(o->prototype);
}

static const tsc_object_prop_t* object_find_chain_prop(const tsc_object_t* o, const tsc_str_t* key) {
    const tsc_object_t* cur = o;
    while (cur) {
        ssize_t found = object_find(cur, key);
        if (found >= 0) return &cur->props[(size_t)found];
        cur = object_prototype_object(cur);
    }
    return NULL;
}

static bool object_chain_contains(tsc_value_t prototype, const tsc_object_t* needle) {
    while (value_is_object_value(prototype)) {
        const tsc_object_t* cur = (const tsc_object_t*)value_ptr(prototype);
        if (cur == needle) return true;
        prototype = cur->prototype;
    }
    return false;
}

bool tsc_object_is_prototype_of(const tsc_object_t* prototype, const tsc_object_t* object) {
    if (!prototype || !object) return false;
    return object_chain_contains(object->prototype, prototype);
}

static bool object_set_own_data(tsc_object_t* o, tsc_str_t* key, tsc_value_t value) {
    ssize_t found = object_find(o, key);
    if (found >= 0) {
        tsc_object_prop_t* prop = &o->props[(size_t)found];
        if (prop->accessor || !prop->writable) return false;
        prop->value = value;
        return true;
    }
    if (!o->extensible) return false;
    object_reserve(o, o->len + 1);
    o->props[o->len].key = key;
    o->props[o->len].value = value;
    o->props[o->len].accessor = false;
    o->props[o->len].getter = NULL;
    o->props[o->len].getter_env = NULL;
    o->props[o->len].getter_value = tsc_value_undefined();
    o->props[o->len].setter = NULL;
    o->props[o->len].setter_env = NULL;
    o->props[o->len].setter_value = tsc_value_undefined();
    o->props[o->len].writable = true;
    o->props[o->len].enumerable = true;
    o->props[o->len].configurable = true;
    o->len++;
    return true;
}

static bool value_set_receiver_own_data(tsc_value_t receiver, tsc_str_t* key, tsc_value_t value) {
    if (value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_OBJECT) {
        return object_set_own_data((tsc_object_t*)value_ptr(receiver), key, value);
    }
    if (value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_ARRAY) {
        return tsc_value_set_prop(receiver, key, value);
    }
    return false;
}

bool tsc_object_set_receiver(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, tsc_value_t receiver) {
    const tsc_object_prop_t* prop = object_find_chain_prop(o, key);
    if (prop) {
        if (prop->accessor) {
            return prop->setter ? prop->setter(prop->setter_env, receiver, value) : false;
        }
        if (!prop->writable) return false;
        return value_set_receiver_own_data(receiver, key, value);
    }
    return value_set_receiver_own_data(receiver, key, value);
}

bool tsc_object_set(tsc_object_t* o, tsc_str_t* key, tsc_value_t value) {
    return tsc_object_set_receiver(o, key, value, tsc_value_object(o));
}

bool tsc_object_define_desc(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    ssize_t found = object_find(o, key);
    if (found >= 0) {
        tsc_object_prop_t* prop = &o->props[(size_t)found];
        tsc_value_t next_value = has_value ? value : prop->value;
        bool next_writable = has_writable ? writable : prop->writable;
        bool next_enumerable = has_enumerable ? enumerable : prop->enumerable;
        bool next_configurable = has_configurable ? configurable : prop->configurable;
        if (!prop->configurable) {
            if (prop->accessor) return false;
            if (next_configurable || next_enumerable != prop->enumerable) return false;
            if (!prop->writable) {
                if (next_writable) return false;
                if (!tsc_value_object_is(prop->value, next_value)) return false;
            }
            prop->value = next_value;
            prop->writable = next_writable;
            return true;
        }
        prop->value = next_value;
        prop->accessor = false;
        prop->getter = NULL;
        prop->getter_env = NULL;
        prop->getter_value = tsc_value_undefined();
        prop->setter = NULL;
        prop->setter_env = NULL;
        prop->setter_value = tsc_value_undefined();
        prop->writable = next_writable;
        prop->enumerable = next_enumerable;
        prop->configurable = next_configurable;
        return true;
    }
    if (!o->extensible) return false;
    object_reserve(o, o->len + 1);
    o->props[o->len].key = key;
    o->props[o->len].value = has_value ? value : tsc_value_undefined();
    o->props[o->len].accessor = false;
    o->props[o->len].getter = NULL;
    o->props[o->len].getter_env = NULL;
    o->props[o->len].getter_value = tsc_value_undefined();
    o->props[o->len].setter = NULL;
    o->props[o->len].setter_env = NULL;
    o->props[o->len].setter_value = tsc_value_undefined();
    o->props[o->len].writable = has_writable ? writable : false;
    o->props[o->len].enumerable = has_enumerable ? enumerable : false;
    o->props[o->len].configurable = has_configurable ? configurable : false;
    o->len++;
    return true;
}

bool tsc_object_define(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, bool writable, bool enumerable, bool configurable) {
    return tsc_object_define_desc(o, key, value, true, writable, true, enumerable, true, configurable, true);
}

bool tsc_object_define_accessor(tsc_object_t* o, tsc_str_t* key, tsc_accessor_getter_t getter, void* getter_env, bool has_getter, tsc_accessor_setter_t setter, void* setter_env, bool has_setter, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable) {
    ssize_t found = object_find(o, key);
    if (found >= 0) {
        tsc_object_prop_t* prop = &o->props[(size_t)found];
        if (!prop->configurable) {
            if (!prop->accessor) return false;
            if (has_configurable && configurable) return false;
            if (has_enumerable && enumerable != prop->enumerable) return false;
            if (
                (has_getter && (getter != prop->getter || getter_env != prop->getter_env)) ||
                (has_setter && (setter != prop->setter || setter_env != prop->setter_env))
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
        prop->value = tsc_value_undefined();
        prop->accessor = true;
        prop->getter = next_getter;
        prop->getter_env = next_getter_env;
        prop->getter_value = value_accessor_getter_identity(next_getter, next_getter_env);
        prop->setter = next_setter;
        prop->setter_env = next_setter_env;
        prop->setter_value = value_accessor_setter_identity(next_setter, next_setter_env);
        prop->writable = false;
        prop->enumerable = next_enumerable;
        prop->configurable = next_configurable;
        return true;
    }
    if (!o->extensible) return false;
    object_reserve(o, o->len + 1);
    o->props[o->len].key = key;
    o->props[o->len].value = tsc_value_undefined();
    o->props[o->len].accessor = true;
    o->props[o->len].getter = has_getter ? getter : NULL;
    o->props[o->len].getter_env = has_getter ? getter_env : NULL;
    o->props[o->len].getter_value = value_accessor_getter_identity(o->props[o->len].getter, o->props[o->len].getter_env);
    o->props[o->len].setter = has_setter ? setter : NULL;
    o->props[o->len].setter_env = has_setter ? setter_env : NULL;
    o->props[o->len].setter_value = value_accessor_setter_identity(o->props[o->len].setter, o->props[o->len].setter_env);
    o->props[o->len].writable = false;
    o->props[o->len].enumerable = has_enumerable ? enumerable : false;
    o->props[o->len].configurable = has_configurable ? configurable : false;
    o->len++;
    return true;
}

tsc_value_t tsc_object_get_prototype_of(const tsc_object_t* o) {
    return o ? o->prototype : tsc_value_undefined();
}

bool tsc_object_set_prototype_of(tsc_object_t* o, tsc_value_t prototype) {
    if (!o || !value_is_valid_prototype(prototype)) return false;
    if (o->prototype == prototype) return true;
    if (!o->extensible) return false;
    if (object_chain_contains(prototype, o)) return false;
    o->prototype = prototype;
    return true;
}

tsc_value_t tsc_object_get_receiver(const tsc_object_t* o, const tsc_str_t* key, tsc_value_t receiver) {
    const tsc_object_prop_t* prop = object_find_chain_prop(o, key);
    if (prop) {
        if (prop->accessor) return prop->getter ? prop->getter(prop->getter_env, receiver) : tsc_value_undefined();
        return prop->value;
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_object_get(const tsc_object_t* o, const tsc_str_t* key) {
    return tsc_object_get_receiver(o, key, tsc_value_object((tsc_object_t*)o));
}

bool tsc_object_has_own(const tsc_object_t* o, const tsc_str_t* key) {
    return object_find(o, key) >= 0;
}

bool tsc_object_property_is_enumerable(const tsc_object_t* o, const tsc_str_t* key) {
    ssize_t found = object_find(o, key);
    return found >= 0 && o->props[(size_t)found].enumerable;
}

bool tsc_object_has(const tsc_object_t* o, const tsc_str_t* key) {
    return object_find_chain_prop(o, key) != NULL;
}

bool tsc_object_delete(tsc_object_t* o, const tsc_str_t* key) {
    ssize_t found = object_find(o, key);
    if (found < 0) return true;
    size_t idx = (size_t)found;
    if (!o->props[idx].configurable) return false;
    for (size_t i = idx + 1; i < o->len; i++) {
        o->props[i - 1] = o->props[i];
    }
    o->len--;
    return true;
}

bool tsc_object_is_extensible(const tsc_object_t* o) {
    return o && o->extensible;
}

bool tsc_object_prevent_extensions(tsc_object_t* o) {
    if (!o) return false;
    o->extensible = false;
    return true;
}

bool tsc_object_seal(tsc_object_t* o) {
    if (!o) return false;
    o->extensible = false;
    for (size_t i = 0; i < o->len; i++) {
        o->props[i].configurable = false;
    }
    return true;
}

bool tsc_object_freeze(tsc_object_t* o) {
    if (!tsc_object_seal(o)) return false;
    for (size_t i = 0; i < o->len; i++) {
        o->props[i].writable = false;
    }
    return true;
}

bool tsc_object_is_sealed(const tsc_object_t* o) {
    if (!o || o->extensible) return false;
    for (size_t i = 0; i < o->len; i++) {
        if (o->props[i].configurable) return false;
    }
    return true;
}

bool tsc_object_is_frozen(const tsc_object_t* o) {
    if (!tsc_object_is_sealed(o)) return false;
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].accessor && o->props[i].writable) return false;
    }
    return true;
}

tsc_array_t* tsc_object_keys_dyn(const tsc_object_t* o) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), o ? o->len : 1);
    if (!o) return a;
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].enumerable) continue;
        tsc_str_t* key = o->props[i].key;
        tsc_array_push_raw(a, &key);
    }
    return a;
}

tsc_array_t* tsc_object_own_keys_dyn(const tsc_object_t* o) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), o ? o->len : 1);
    if (!o) return a;
    for (size_t i = 0; i < o->len; i++) {
        tsc_str_t* key = o->props[i].key;
        tsc_array_push_raw(a, &key);
    }
    return a;
}

tsc_array_t* tsc_object_values_dyn(const tsc_object_t* o) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_value_t), o ? o->len : 1);
    if (!o) return a;
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

static bool value_json_omits_object_property(tsc_value_t v) {
    return value_is_box(v) && (value_tag(v) == TSC_VALUE_TAG_UNDEFINED || value_tag(v) == TSC_VALUE_TAG_FUNCTION);
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
            tsc_str_t* out = tsc_str_from_lit("{", 1);
            bool first = true;
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

typedef struct json_parser {
    const char* s;
    size_t len;
    size_t pos;
} json_parser_t;

static void jp_ws(json_parser_t* p) {
    while (p->pos < p->len && isspace((unsigned char)p->s[p->pos])) p->pos++;
}

static bool jp_lit(json_parser_t* p, const char* lit) {
    size_t n = strlen(lit);
    if (p->pos + n <= p->len && memcmp(p->s + p->pos, lit, n) == 0) {
        p->pos += n;
        return true;
    }
    return false;
}

static tsc_value_t jp_value(json_parser_t* p);

static tsc_str_t* jp_string(json_parser_t* p) {
    if (p->pos >= p->len || p->s[p->pos] != '"') tsc_panic("JSON.parse expected string");
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
            if (p->pos >= p->len) tsc_panic("JSON.parse bad escape");
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
                default: tsc_panic("JSON.parse unsupported escape");
            }
        } else {
            buf[out++] = (char)c;
        }
    }
    tsc_panic("JSON.parse unterminated string");
    return tsc_str_from_lit("", 0);
}

static tsc_value_t jp_array(json_parser_t* p) {
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
        tsc_panic("JSON.parse expected array separator");
    }
    tsc_panic("JSON.parse unterminated array");
    return tsc_value_array(a);
}

static tsc_value_t jp_object(json_parser_t* p) {
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
        if (p->pos >= p->len || p->s[p->pos] != ':') tsc_panic("JSON.parse expected ':'");
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
        tsc_panic("JSON.parse expected object separator");
    }
    tsc_panic("JSON.parse unterminated object");
    return tsc_value_object(o);
}

static tsc_value_t jp_number(json_parser_t* p) {
    const char* start = p->s + p->pos;
    char* end = NULL;
    double n = strtod(start, &end);
    if (end == start) tsc_panic("JSON.parse expected number");
    p->pos += (size_t)(end - start);
    return tsc_value_num(n);
}

static tsc_value_t jp_value(json_parser_t* p) {
    jp_ws(p);
    if (p->pos >= p->len) tsc_panic("JSON.parse unexpected end");
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
    if (p.pos != p.len) tsc_panic("JSON.parse trailing input");
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

#define TSC_BKT_EMPTY     ((size_t)-1)
#define TSC_BKT_TOMBSTONE ((size_t)-2)

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

static inline uint64_t tsc_str_cached_hash(const tsc_str_t* s) {
    uint64_t h = s->hash;
    if (h != 0) return h;
    h = fnv1a64((const unsigned char*)s->data, s->len);
    if (h == 0) h = 1;
    ((tsc_str_t*)s)->hash = h;
    return h;
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

static uint64_t key_hash(tsc_key_kind_t kk, const void* k) {
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
    }
    return 0;
}

static void map_rebuild_buckets(tsc_map_t* m, size_t new_bucket_cap) {
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

static void map_grow_ordered(tsc_map_t* m, size_t want) {
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
static size_t map_lookup(const tsc_map_t* m, const void* k, size_t* slot_out) {
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

static size_t map_lookup_str(const tsc_map_t* m, const tsc_str_t* k, size_t* slot_out) {
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

tsc_map_t* tsc_map_new(size_t ks, size_t vs, int kk, size_t initial_cap) {
    tsc_map_t* m = (tsc_map_t*)TSC_GC_MALLOC(sizeof(tsc_map_t));
    m->ks = ks; m->vs = vs; m->kk = (tsc_key_kind_t)kk;
    m->len = 0; m->cap = 0; m->keys = NULL; m->values = NULL;
    m->buckets = NULL; m->bucket_cap = 0;
    if (initial_cap > 0) map_grow_ordered(m, initial_cap);
    return m;
}

void tsc_map_set_raw(tsc_map_t* m, const void* k, const void* v) {
    /* Ensure bucket table is at most 75% full *after* the insert. */
    if (m->bucket_cap == 0 || (m->len + 1) * 4 > m->bucket_cap * 3) {
        /* Bigger initial bucket cap saves rebucketings on the common
         * "fill map with N entries" pattern. 1024 buckets = 8KB of size_t
         * per fresh map — fine for short-lived hot-path collections. */
        size_t bc = m->bucket_cap ? m->bucket_cap * 2 : 1024;
        while ((m->len + 1) * 4 > bc * 3) bc *= 2;
        map_rebuild_buckets(m, bc);
    }
    size_t slot;
    size_t e = map_lookup(m, k, &slot);
    if (e != TSC_BKT_EMPTY) {
        memcpy((char*)m->values + e * m->vs, v, m->vs);
        return;
    }
    map_grow_ordered(m, m->len + 1);
    memcpy((char*)m->keys + m->len * m->ks, k, m->ks);
    memcpy((char*)m->values + m->len * m->vs, v, m->vs);
    m->buckets[slot] = m->len;
    m->len++;
}

void tsc_map_set_str_num(tsc_map_t* m, tsc_str_t* k, double v) {
    if (m->bucket_cap == 0 || (m->len + 1) * 4 > m->bucket_cap * 3) {
        size_t bc = m->bucket_cap ? m->bucket_cap * 2 : 512;
        while ((m->len + 1) * 4 > bc * 3) bc *= 2;
        map_rebuild_buckets(m, bc);
    }
    size_t slot;
    size_t e = map_lookup_str(m, k, &slot);
    if (e != TSC_BKT_EMPTY) {
        ((double*)m->values)[e] = v;
        return;
    }
    map_grow_ordered(m, m->len + 1);
    ((tsc_str_t**)m->keys)[m->len] = k;
    ((double*)m->values)[m->len] = v;
    m->buckets[slot] = m->len;
    m->len++;
}

bool tsc_map_get_raw(const tsc_map_t* m, const void* k, void* out) {
    size_t e = map_lookup(m, k, NULL);
    if (e == TSC_BKT_EMPTY) return false;
    memcpy(out, (const char*)m->values + e * m->vs, m->vs);
    return true;
}

double tsc_map_get_str_num(const tsc_map_t* m, tsc_str_t* k, double fallback) {
    size_t e = map_lookup_str(m, k, NULL);
    return e == TSC_BKT_EMPTY ? fallback : ((double*)m->values)[e];
}

bool tsc_map_has_raw(const tsc_map_t* m, const void* k) {
    return map_lookup(m, k, NULL) != TSC_BKT_EMPTY;
}

bool tsc_map_has_str(const tsc_map_t* m, tsc_str_t* k) {
    return map_lookup_str(m, k, NULL) != TSC_BKT_EMPTY;
}

bool tsc_map_delete_raw(tsc_map_t* m, const void* k) {
    size_t slot;
    size_t e = map_lookup(m, k, &slot);
    if (e == TSC_BKT_EMPTY) return false;
    m->buckets[slot] = TSC_BKT_TOMBSTONE;
    size_t tail = m->len - e - 1;
    if (tail > 0) {
        memmove((char*)m->keys + e * m->ks, (const char*)m->keys + (e + 1) * m->ks, tail * m->ks);
        memmove((char*)m->values + e * m->vs, (const char*)m->values + (e + 1) * m->vs, tail * m->vs);
    }
    m->len--;
    if (m->bucket_cap > 0) map_rebuild_buckets(m, m->bucket_cap);
    return true;
}

void tsc_map_clear(tsc_map_t* m) {
    m->len = 0;
    if (m->bucket_cap > 0) {
        for (size_t i = 0; i < m->bucket_cap; i++) m->buckets[i] = TSC_BKT_EMPTY;
    }
}
double tsc_map_size(const tsc_map_t* m) { return (double)m->len; }

tsc_array_t* tsc_map_keys(const tsc_map_t* m) {
    tsc_array_t* a = tsc_array_new(m->ks, m->len ? m->len : 1);
    if (m->len) memcpy(a->data, m->keys, m->len * m->ks);
    a->len = m->len;
    return a;
}

tsc_array_t* tsc_map_values(const tsc_map_t* m) {
    tsc_array_t* a = tsc_array_new(m->vs, m->len ? m->len : 1);
    if (m->len) memcpy(a->data, m->values, m->len * m->vs);
    a->len = m->len;
    return a;
}

/* Set ------------ — same architecture, single data array. */

static void set_rebuild_buckets(tsc_set_t* s, size_t new_bucket_cap) {
    size_t* nb = (size_t*)TSC_GC_MALLOC_ATOMIC(new_bucket_cap * sizeof(size_t));
    for (size_t i = 0; i < new_bucket_cap; i++) nb[i] = TSC_BKT_EMPTY;
    size_t mask = new_bucket_cap - 1;
    for (size_t i = 0; i < s->len; i++) {
        const void* v = (const char*)s->data + i * s->es;
        size_t slot = (size_t)(key_hash(s->kk, v) & mask);
        while (nb[slot] != TSC_BKT_EMPTY) slot = (slot + 1) & mask;
        nb[slot] = i;
    }
    s->buckets = nb;
    s->bucket_cap = new_bucket_cap;
}

static void set_grow_ordered(tsc_set_t* s, size_t want) {
    if (want <= s->cap) return;
    size_t cap = s->cap ? s->cap : 512;
    while (cap < want) cap *= 2;
    void* nd = s->data ? TSC_GC_REALLOC(s->data, cap * s->es) : TSC_GC_MALLOC(cap * s->es);
    s->data = nd; s->cap = cap;
}

static void set_grow_ordered_atomic(tsc_set_t* s, size_t want) {
    if (want <= s->cap) return;
    size_t cap = s->cap ? s->cap : 512;
    while (cap < want) cap *= 2;
    void* nd = s->data ? TSC_GC_REALLOC(s->data, cap * s->es) : TSC_GC_MALLOC_ATOMIC(cap * s->es);
    s->data = nd; s->cap = cap;
}

static size_t set_lookup(const tsc_set_t* s, const void* v, size_t* slot_out) {
    if (s->bucket_cap == 0) {
        if (slot_out) *slot_out = TSC_BKT_EMPTY;
        return TSC_BKT_EMPTY;
    }
    size_t mask = s->bucket_cap - 1;
    size_t slot = (size_t)(key_hash(s->kk, v) & mask);
    size_t first_tomb = TSC_BKT_EMPTY;
    while (1) {
        size_t e = s->buckets[slot];
        if (e == TSC_BKT_EMPTY) {
            if (slot_out) *slot_out = (first_tomb != TSC_BKT_EMPTY) ? first_tomb : slot;
            return TSC_BKT_EMPTY;
        }
        if (e == TSC_BKT_TOMBSTONE) {
            if (first_tomb == TSC_BKT_EMPTY) first_tomb = slot;
        } else if (key_eq(s->kk, s->es, (const char*)s->data + e * s->es, v)) {
            if (slot_out) *slot_out = slot;
            return e;
        }
        slot = (slot + 1) & mask;
    }
}

static size_t set_lookup_num(const tsc_set_t* s, double v, size_t* slot_out) {
    if (s->bucket_cap == 0) {
        if (slot_out) *slot_out = TSC_BKT_EMPTY;
        return TSC_BKT_EMPTY;
    }
    size_t mask = s->bucket_cap - 1;
    size_t slot = (size_t)(num_hash(v) & mask);
    size_t first_tomb = TSC_BKT_EMPTY;
    double* data = (double*)s->data;
    while (1) {
        size_t e = s->buckets[slot];
        if (e == TSC_BKT_EMPTY) {
            if (slot_out) *slot_out = (first_tomb != TSC_BKT_EMPTY) ? first_tomb : slot;
            return TSC_BKT_EMPTY;
        }
        if (e == TSC_BKT_TOMBSTONE) {
            if (first_tomb == TSC_BKT_EMPTY) first_tomb = slot;
        } else if (num_eq(data[e], v)) {
            if (slot_out) *slot_out = slot;
            return e;
        }
        slot = (slot + 1) & mask;
    }
}

static size_t set_lookup_int(const tsc_set_t* s, int64_t v, size_t* slot_out) {
    if (s->bucket_cap == 0) {
        if (slot_out) *slot_out = TSC_BKT_EMPTY;
        return TSC_BKT_EMPTY;
    }
    size_t mask = s->bucket_cap - 1;
    size_t slot = (size_t)(((uint64_t)v * 11400714819323198485ULL) & mask);
    size_t first_tomb = TSC_BKT_EMPTY;
    double dv = (double)v;
    double* data = (double*)s->data;
    while (1) {
        size_t e = s->buckets[slot];
        if (e == TSC_BKT_EMPTY) {
            if (slot_out) *slot_out = (first_tomb != TSC_BKT_EMPTY) ? first_tomb : slot;
            return TSC_BKT_EMPTY;
        }
        if (e == TSC_BKT_TOMBSTONE) {
            if (first_tomb == TSC_BKT_EMPTY) first_tomb = slot;
        } else if (data[e] == dv) {
            if (slot_out) *slot_out = slot;
            return e;
        }
        slot = (slot + 1) & mask;
    }
}

tsc_set_t* tsc_set_new(size_t es, int kk, size_t initial_cap) {
    tsc_set_t* s = (tsc_set_t*)TSC_GC_MALLOC(sizeof(tsc_set_t));
    s->es = es; s->kk = (tsc_key_kind_t)kk;
    s->len = 0; s->cap = 0; s->data = NULL;
    s->buckets = NULL; s->bucket_cap = 0;
    if (initial_cap > 0) set_grow_ordered(s, initial_cap);
    return s;
}

void tsc_set_add_raw(tsc_set_t* s, const void* v) {
    if (s->bucket_cap == 0 || (s->len + 1) * 4 > s->bucket_cap * 3) {
        size_t bc = s->bucket_cap ? s->bucket_cap * 2 : 1024;
        while ((s->len + 1) * 4 > bc * 3) bc *= 2;
        set_rebuild_buckets(s, bc);
    }
    size_t slot;
    size_t e = set_lookup(s, v, &slot);
    if (e != TSC_BKT_EMPTY) return;
    set_grow_ordered_atomic(s, s->len + 1);
    memcpy((char*)s->data + s->len * s->es, v, s->es);
    s->buckets[slot] = s->len;
    s->len++;
}

void tsc_set_add_int(tsc_set_t* s, int64_t v) {
    if (s->bucket_cap == 0 || (s->len + 1) * 4 > s->bucket_cap * 3) {
        size_t bc = s->bucket_cap ? s->bucket_cap * 2 : 1024;
        while ((s->len + 1) * 4 > bc * 3) bc *= 2;
        set_rebuild_buckets(s, bc);
    }
    size_t slot;
    size_t e = set_lookup_int(s, v, &slot);
    if (e != TSC_BKT_EMPTY) return;
    set_grow_ordered_atomic(s, s->len + 1);
    ((double*)s->data)[s->len] = (double)v;
    s->buckets[slot] = s->len;
    s->len++;
}

void tsc_set_add_num(tsc_set_t* s, double v) {
    if (s->bucket_cap == 0 || (s->len + 1) * 4 > s->bucket_cap * 3) {
        size_t bc = s->bucket_cap ? s->bucket_cap * 2 : 1024;
        while ((s->len + 1) * 4 > bc * 3) bc *= 2;
        set_rebuild_buckets(s, bc);
    }
    size_t slot;
    size_t e = set_lookup_num(s, v, &slot);
    if (e != TSC_BKT_EMPTY) return;
    set_grow_ordered(s, s->len + 1);
    ((double*)s->data)[s->len] = v;
    s->buckets[slot] = s->len;
    s->len++;
}

bool tsc_set_has_raw(const tsc_set_t* s, const void* v) {
    return set_lookup(s, v, NULL) != TSC_BKT_EMPTY;
}

bool tsc_set_has_int(const tsc_set_t* s, int64_t v) {
    return set_lookup_int(s, v, NULL) != TSC_BKT_EMPTY;
}

bool tsc_set_has_num(const tsc_set_t* s, double v) {
    return set_lookup_num(s, v, NULL) != TSC_BKT_EMPTY;
}

bool tsc_set_delete_raw(tsc_set_t* s, const void* v) {
    size_t slot;
    size_t e = set_lookup(s, v, &slot);
    if (e == TSC_BKT_EMPTY) return false;
    s->buckets[slot] = TSC_BKT_TOMBSTONE;
    size_t tail = s->len - e - 1;
    if (tail > 0) {
        memmove((char*)s->data + e * s->es, (const char*)s->data + (e + 1) * s->es, tail * s->es);
    }
    s->len--;
    if (s->bucket_cap > 0) set_rebuild_buckets(s, s->bucket_cap);
    return true;
}

void tsc_set_clear(tsc_set_t* s) {
    s->len = 0;
    if (s->bucket_cap > 0) {
        for (size_t i = 0; i < s->bucket_cap; i++) s->buckets[i] = TSC_BKT_EMPTY;
    }
}
double tsc_set_size(const tsc_set_t* s) { return (double)s->len; }

tsc_array_t* tsc_set_values(const tsc_set_t* s) {
    tsc_array_t* a = tsc_array_new(s->es, s->len ? s->len : 1);
    if (s->len) memcpy(a->data, s->data, s->len * s->es);
    a->len = s->len;
    return a;
}

static void set_copy_into(tsc_set_t* dst, const tsc_set_t* src) {
    for (size_t i = 0; i < src->len; i++) {
        tsc_set_add_raw(dst, (const char*)src->data + i * src->es);
    }
}

tsc_set_t* tsc_set_union(const tsc_set_t* a, const tsc_set_t* b) {
    tsc_set_t* out = tsc_set_new(a->es, (int)a->kk, a->len + b->len);
    set_copy_into(out, a);
    set_copy_into(out, b);
    return out;
}

tsc_set_t* tsc_set_intersection(const tsc_set_t* a, const tsc_set_t* b) {
    /* Iterate the smaller set to keep this O(min(|a|,|b|)). */
    const tsc_set_t* small = a->len <= b->len ? a : b;
    const tsc_set_t* large = small == a ? b : a;
    tsc_set_t* out = tsc_set_new(a->es, (int)a->kk, small->len);
    for (size_t i = 0; i < small->len; i++) {
        const void* v = (const char*)small->data + i * small->es;
        if (tsc_set_has_raw(large, v)) tsc_set_add_raw(out, v);
    }
    return out;
}

tsc_set_t* tsc_set_difference(const tsc_set_t* a, const tsc_set_t* b) {
    tsc_set_t* out = tsc_set_new(a->es, (int)a->kk, a->len);
    for (size_t i = 0; i < a->len; i++) {
        const void* v = (const char*)a->data + i * a->es;
        if (!tsc_set_has_raw(b, v)) tsc_set_add_raw(out, v);
    }
    return out;
}

tsc_set_t* tsc_set_symmetric_difference(const tsc_set_t* a, const tsc_set_t* b) {
    tsc_set_t* out = tsc_set_new(a->es, (int)a->kk, a->len + b->len);
    for (size_t i = 0; i < a->len; i++) {
        const void* v = (const char*)a->data + i * a->es;
        if (!tsc_set_has_raw(b, v)) tsc_set_add_raw(out, v);
    }
    for (size_t i = 0; i < b->len; i++) {
        const void* v = (const char*)b->data + i * b->es;
        if (!tsc_set_has_raw(a, v)) tsc_set_add_raw(out, v);
    }
    return out;
}

bool tsc_set_is_subset_of(const tsc_set_t* a, const tsc_set_t* b) {
    if (a->len > b->len) return false;
    for (size_t i = 0; i < a->len; i++) {
        const void* v = (const char*)a->data + i * a->es;
        if (!tsc_set_has_raw(b, v)) return false;
    }
    return true;
}

bool tsc_set_is_superset_of(const tsc_set_t* a, const tsc_set_t* b) {
    return tsc_set_is_subset_of(b, a);
}

bool tsc_set_is_disjoint_from(const tsc_set_t* a, const tsc_set_t* b) {
    const tsc_set_t* small = a->len <= b->len ? a : b;
    const tsc_set_t* large = small == a ? b : a;
    for (size_t i = 0; i < small->len; i++) {
        const void* v = (const char*)small->data + i * small->es;
        if (tsc_set_has_raw(large, v)) return false;
    }
    return true;
}

/* ---------------- console ---------------- */

static void console_write_str(FILE* f, const tsc_str_t* s) {
    if (s && s->len > 0) fwrite(s->data, 1, s->len, f);
}

static void console_write(FILE* f, size_t n, va_list ap) {
    if (n == 0) {
        fputc('\n', f);
        return;
    }
    tsc_str_t** args = (tsc_str_t**)calloc(n, sizeof(tsc_str_t*));
    for (size_t i = 0; i < n; i++) args[i] = va_arg(ap, tsc_str_t*);

    const tsc_str_t* fmt = args[0];
    size_t next = 1;
    if (fmt) {
        for (size_t i = 0; i < fmt->len; i++) {
            char ch = fmt->data[i];
            if (ch != '%' || i + 1 >= fmt->len) {
                fputc(ch, f);
                continue;
            }
            char spec = fmt->data[++i];
            if (spec == '%') {
                fputc('%', f);
            } else if (
                spec == 's' || spec == 'd' || spec == 'i' ||
                spec == 'f' || spec == 'o' || spec == 'O'
            ) {
                if (next < n) {
                    console_write_str(f, args[next++]);
                } else {
                    fputc('%', f);
                    fputc(spec, f);
                }
            } else if (spec == 'c') {
                if (next < n) next++;
            } else {
                fputc('%', f);
                fputc(spec, f);
            }
        }
    }
    for (size_t i = next; i < n; i++) {
        fputc(' ', f);
        console_write_str(f, args[i]);
    }
    free(args);
    fputc('\n', f);
}

void tsc_console_log_n(size_t n, ...) {
    va_list ap; va_start(ap, n);
    console_write(stdout, n, ap);
    va_end(ap);
}

void tsc_console_error_n(size_t n, ...) {
    va_list ap; va_start(ap, n);
    console_write(stderr, n, ap);
    va_end(ap);
}

bool tsc_instanceof(const char* type_chain, const char* class_name) {
    if (!type_chain || !class_name) return false;
    size_t n = strlen(class_name);
    for (const char* p = type_chain; (p = strstr(p, class_name)) != NULL; p += n) {
        if ((p == type_chain || p[-1] == '|') && p[n] == '|') return true;
    }
    return false;
}

/* ---------------- fs (sync) ---------------- */

static char* cstr_dup(const tsc_str_t* s) {
    char* c = (char*)malloc(s->len + 1);
    memcpy(c, s->data, s->len);
    c[s->len] = '\0';
    return c;
}

struct tsc_fs_stats {
    double dev;
    double ino;
    double size;
    double mode;
    double nlink;
    double uid;
    double gid;
    double rdev;
    double blksize;
    double blocks;
    double atime_ms;
    double mtime_ms;
    double ctime_ms;
    double birthtime_ms;
    bool is_file;
    bool is_directory;
    bool is_symbolic_link;
    bool is_block_device;
    bool is_character_device;
    bool is_fifo;
    bool is_socket;
};

struct tsc_fs_dirent {
    tsc_str_t* name;
    bool is_file;
    bool is_directory;
    bool is_symbolic_link;
    bool is_block_device;
    bool is_character_device;
    bool is_fifo;
    bool is_socket;
};

static void fs_kind_from_mode(mode_t mode, bool* is_file, bool* is_directory, bool* is_symbolic_link, bool* is_block_device, bool* is_character_device, bool* is_fifo, bool* is_socket) {
    *is_file = S_ISREG(mode);
    *is_directory = S_ISDIR(mode);
    *is_symbolic_link = S_ISLNK(mode);
    *is_block_device = S_ISBLK(mode);
    *is_character_device = S_ISCHR(mode);
    *is_fifo = S_ISFIFO(mode);
    *is_socket = S_ISSOCK(mode);
}

static double fs_timespec_to_ms(time_t sec, long nsec) {
    return ((double)sec * 1000.0) + ((double)nsec / 1000000.0);
}

static double fs_stat_atime_ms(const struct stat* st) {
#if defined(__APPLE__) && defined(__MACH__)
    return fs_timespec_to_ms(st->st_atimespec.tv_sec, st->st_atimespec.tv_nsec);
#else
    return fs_timespec_to_ms(st->st_atim.tv_sec, st->st_atim.tv_nsec);
#endif
}

static double fs_stat_mtime_ms(const struct stat* st) {
#if defined(__APPLE__) && defined(__MACH__)
    return fs_timespec_to_ms(st->st_mtimespec.tv_sec, st->st_mtimespec.tv_nsec);
#else
    return fs_timespec_to_ms(st->st_mtim.tv_sec, st->st_mtim.tv_nsec);
#endif
}

static double fs_stat_ctime_ms(const struct stat* st) {
#if defined(__APPLE__) && defined(__MACH__)
    return fs_timespec_to_ms(st->st_ctimespec.tv_sec, st->st_ctimespec.tv_nsec);
#else
    return fs_timespec_to_ms(st->st_ctim.tv_sec, st->st_ctim.tv_nsec);
#endif
}

static double fs_stat_birthtime_ms(const struct stat* st) {
#if defined(__APPLE__) && defined(__MACH__)
    return fs_timespec_to_ms(st->st_birthtimespec.tv_sec, st->st_birthtimespec.tv_nsec);
#else
    return fs_stat_ctime_ms(st);
#endif
}

static void fs_stats_fill(tsc_fs_stats_t* out, const struct stat* st) {
    out->dev = (double)st->st_dev;
    out->ino = (double)st->st_ino;
    out->size = (double)st->st_size;
    out->mode = (double)st->st_mode;
    out->nlink = (double)st->st_nlink;
    out->uid = (double)st->st_uid;
    out->gid = (double)st->st_gid;
    out->rdev = (double)st->st_rdev;
    out->blksize = (double)st->st_blksize;
    out->blocks = (double)st->st_blocks;
    out->atime_ms = fs_stat_atime_ms(st);
    out->mtime_ms = fs_stat_mtime_ms(st);
    out->ctime_ms = fs_stat_ctime_ms(st);
    out->birthtime_ms = fs_stat_birthtime_ms(st);
    fs_kind_from_mode(
        st->st_mode,
        &out->is_file,
        &out->is_directory,
        &out->is_symbolic_link,
        &out->is_block_device,
        &out->is_character_device,
        &out->is_fifo,
        &out->is_socket
    );
}

static tsc_fs_dirent_t* fs_dirent_from_path(const char* dir_path, const char* name) {
    tsc_fs_dirent_t* out = (tsc_fs_dirent_t*)TSC_GC_MALLOC(sizeof(tsc_fs_dirent_t));
    out->name = tsc_str_from_cstr(name);
    out->is_file = false;
    out->is_directory = false;
    out->is_symbolic_link = false;
    out->is_block_device = false;
    out->is_character_device = false;
    out->is_fifo = false;
    out->is_socket = false;

    size_t dir_len = strlen(dir_path);
    size_t name_len = strlen(name);
    bool need_slash = dir_len > 0 && dir_path[dir_len - 1] != '/';
    char* full = (char*)malloc(dir_len + (need_slash ? 1 : 0) + name_len + 1);
    memcpy(full, dir_path, dir_len);
    size_t pos = dir_len;
    if (need_slash) full[pos++] = '/';
    memcpy(full + pos, name, name_len);
    full[pos + name_len] = '\0';

    struct stat st;
    if (lstat(full, &st) == 0) {
        fs_kind_from_mode(
            st.st_mode,
            &out->is_file,
            &out->is_directory,
            &out->is_symbolic_link,
            &out->is_block_device,
            &out->is_character_device,
            &out->is_fifo,
            &out->is_socket
        );
    }
    free(full);
    return out;
}

static char* fs_join_path(const char* left, const char* right) {
    size_t left_len = strlen(left);
    size_t right_len = strlen(right);
    bool need_slash = left_len > 0 && left[left_len - 1] != '/';
    char* out = (char*)malloc(left_len + (need_slash ? 1 : 0) + right_len + 1);
    memcpy(out, left, left_len);
    size_t pos = left_len;
    if (need_slash) out[pos++] = '/';
    memcpy(out + pos, right, right_len);
    out[pos + right_len] = '\0';
    return out;
}

tsc_str_t* tsc_fs_read_file_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    FILE* f = fopen(p, "rb");
    free(p);
    if (!f) {
        tsc_throw_str(tsc_str_from_cstr("fs.readFileSync: could not open file"));
        return NULL;
    }
    fseek(f, 0, SEEK_END);
    long n = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (n < 0) { fclose(f); tsc_throw_str(tsc_str_from_cstr("fs.readFileSync: seek")); return NULL; }
    tsc_str_t* s = str_alloc((size_t)n);
    size_t rd = fread((char*)s->data, 1, (size_t)n, f);
    fclose(f);
    s->len = rd;
    ((char*)s->data)[rd] = '\0';
    return s;
}

tsc_buffer_t* tsc_fs_read_file_buffer_sync(const tsc_str_t* path) {
    return tsc_buffer_from_str(tsc_fs_read_file_sync(path), NULL);
}

static void fs_write_bytes_opts_mode(const tsc_str_t* path, const uint8_t* data, size_t len, bool append, bool exclusive, bool update, double file_mode, const char* label) {
    char* p = cstr_dup(path);
    bool existed = access(p, F_OK) == 0;
    if (exclusive && existed) {
        free(p);
        tsc_throw_str(tsc_str_from_cstr("fs.writeFileSync: file already exists"));
        return;
    }
    const char* open_mode = update ? "rb+" : (append ? "ab" : "wb");
    FILE* f = fopen(p, open_mode);
    if (!f) { free(p); tsc_throw_str(tsc_str_from_cstr(label)); return; }
    fwrite(data, 1, len, f);
    fclose(f);
    if (file_mode >= 0.0 && !existed) {
        if (chmod(p, (mode_t)file_mode) != 0) {
            free(p);
            tsc_throw_str(tsc_str_from_cstr("fs.writeFileSync: could not set mode"));
            return;
        }
    }
    free(p);
}

static void fs_write_bytes_opts(const tsc_str_t* path, const uint8_t* data, size_t len, bool append, bool exclusive, const char* label) {
    fs_write_bytes_opts_mode(path, data, len, append, exclusive, false, -1.0, label);
}

static void fs_write_bytes(const tsc_str_t* path, const uint8_t* data, size_t len, const char* mode, const char* label) {
    fs_write_bytes_opts(path, data, len, mode[0] == 'a', false, label);
}

void tsc_fs_write_file_sync(const tsc_str_t* path, const tsc_str_t* data) {
    fs_write_bytes(path, (const uint8_t*)data->data, data->len, "wb", "fs.writeFileSync: could not open");
}

void tsc_fs_write_file_buffer_sync(const tsc_str_t* path, const tsc_buffer_t* data) {
    fs_write_bytes(path, data->data, data->len, "wb", "fs.writeFileSync: could not open");
}

void tsc_fs_write_file_sync_opts(const tsc_str_t* path, const tsc_str_t* data, bool append, bool exclusive) {
    fs_write_bytes_opts(path, (const uint8_t*)data->data, data->len, append, exclusive, "fs.writeFileSync: could not open");
}

void tsc_fs_write_file_buffer_sync_opts(const tsc_str_t* path, const tsc_buffer_t* data, bool append, bool exclusive) {
    fs_write_bytes_opts(path, data->data, data->len, append, exclusive, "fs.writeFileSync: could not open");
}

void tsc_fs_write_file_sync_opts_mode(const tsc_str_t* path, const tsc_str_t* data, bool append, bool exclusive, bool update, double mode) {
    fs_write_bytes_opts_mode(path, (const uint8_t*)data->data, data->len, append, exclusive, update, mode, "fs.writeFileSync: could not open");
}

void tsc_fs_write_file_buffer_sync_opts_mode(const tsc_str_t* path, const tsc_buffer_t* data, bool append, bool exclusive, bool update, double mode) {
    fs_write_bytes_opts_mode(path, data->data, data->len, append, exclusive, update, mode, "fs.writeFileSync: could not open");
}

void tsc_fs_append_file_sync(const tsc_str_t* path, const tsc_str_t* data) {
    fs_write_bytes(path, (const uint8_t*)data->data, data->len, "ab", "fs.appendFileSync: could not open");
}

void tsc_fs_append_file_buffer_sync(const tsc_str_t* path, const tsc_buffer_t* data) {
    fs_write_bytes(path, data->data, data->len, "ab", "fs.appendFileSync: could not open");
}

bool tsc_fs_exists_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    struct stat st;
    int r = stat(p, &st);
    free(p);
    return r == 0;
}

tsc_fs_stats_t* tsc_fs_stat_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    struct stat st;
    int r = stat(p, &st);
    free(p);
    if (r != 0) {
        tsc_throw_str(tsc_str_from_cstr("fs.statSync: could not stat path"));
        return NULL;
    }
    tsc_fs_stats_t* out = (tsc_fs_stats_t*)TSC_GC_MALLOC(sizeof(tsc_fs_stats_t));
    fs_stats_fill(out, &st);
    return out;
}

tsc_fs_stats_t* tsc_fs_lstat_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    struct stat st;
    int r = lstat(p, &st);
    free(p);
    if (r != 0) {
        tsc_throw_str(tsc_str_from_cstr("fs.lstatSync: could not stat path"));
        return NULL;
    }
    tsc_fs_stats_t* out = (tsc_fs_stats_t*)TSC_GC_MALLOC(sizeof(tsc_fs_stats_t));
    fs_stats_fill(out, &st);
    return out;
}

tsc_str_t* tsc_fs_realpath_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    char* resolved = realpath(p, NULL);
    free(p);
    if (!resolved) {
        tsc_throw_str(tsc_str_from_cstr("fs.realpathSync: could not resolve path"));
        return NULL;
    }
    tsc_str_t* out = tsc_str_from_cstr(resolved);
    free(resolved);
    return out;
}

tsc_str_t* tsc_fs_readlink_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    size_t cap = PATH_MAX > 0 ? (size_t)PATH_MAX : 4096;
    for (;;) {
        char* buf = (char*)malloc(cap);
        ssize_t n = readlink(p, buf, cap);
        if (n < 0) {
            free(buf);
            free(p);
            tsc_throw_str(tsc_str_from_cstr("fs.readlinkSync: could not read link"));
            return NULL;
        }
        if ((size_t)n < cap) {
            tsc_str_t* out = str_alloc((size_t)n);
            memcpy((char*)out->data, buf, (size_t)n);
            free(buf);
            free(p);
            return out;
        }
        free(buf);
        if (cap >= (1u << 20)) {
            free(p);
            tsc_throw_str(tsc_str_from_cstr("fs.readlinkSync: link target too long"));
            return NULL;
        }
        cap *= 2;
    }
}

void tsc_fs_symlink_sync(const tsc_str_t* target, const tsc_str_t* path) {
    char* t = cstr_dup(target);
    char* p = cstr_dup(path);
    int r = symlink(t, p);
    free(t);
    free(p);
    if (r != 0) {
        tsc_throw_str(tsc_str_from_cstr("fs.symlinkSync: could not create link"));
    }
}

void tsc_fs_link_sync(const tsc_str_t* existing_path, const tsc_str_t* new_path) {
    char* oldp = cstr_dup(existing_path);
    char* newp = cstr_dup(new_path);
    int r = link(oldp, newp);
    free(oldp);
    free(newp);
    if (r != 0) {
        tsc_throw_str(tsc_str_from_cstr("fs.linkSync: could not create link"));
    }
}

tsc_str_t* tsc_fs_mkdtemp_sync(const tsc_str_t* prefix) {
    char* p = cstr_dup(prefix);
    size_t len = strlen(p);
    char* tmpl = (char*)malloc(len + 7);
    memcpy(tmpl, p, len);
    memcpy(tmpl + len, "XXXXXX", 7);
    free(p);
    char* made = mkdtemp(tmpl);
    if (!made) {
        free(tmpl);
        tsc_throw_str(tsc_str_from_cstr("fs.mkdtempSync: could not create directory"));
        return NULL;
    }
    tsc_str_t* out = tsc_str_from_cstr(made);
    free(tmpl);
    return out;
}

void tsc_fs_truncate_sync(const tsc_str_t* path, double len) {
    char* p = cstr_dup(path);
    off_t n = len < 0 ? 0 : (off_t)len;
    int r = truncate(p, n);
    free(p);
    if (r != 0) {
        tsc_throw_str(tsc_str_from_cstr("fs.truncateSync: could not truncate path"));
    }
}

static struct timespec fs_seconds_to_timespec(double seconds) {
    if (isnan(seconds) || isinf(seconds)) seconds = 0.0;
    double whole = floor(seconds);
    double fraction = seconds - whole;
    long nsec = (long)floor((fraction * 1000000000.0) + 0.5);
    time_t sec = (time_t)whole;
    if (nsec >= 1000000000L) {
        sec += 1;
        nsec -= 1000000000L;
    }
    if (nsec < 0) {
        sec -= 1;
        nsec += 1000000000L;
    }
    struct timespec out;
    out.tv_sec = sec;
    out.tv_nsec = nsec;
    return out;
}

static void fs_utimes_path_sync(const tsc_str_t* path, double atime, double mtime, int flags, const char* message) {
    char* p = cstr_dup(path);
    struct timespec times[2];
    times[0] = fs_seconds_to_timespec(atime);
    times[1] = fs_seconds_to_timespec(mtime);
    int r = utimensat(AT_FDCWD, p, times, flags);
    free(p);
    if (r != 0) {
        tsc_throw_str(tsc_str_from_cstr(message));
    }
}

void tsc_fs_utimes_sync(const tsc_str_t* path, double atime, double mtime) {
    fs_utimes_path_sync(path, atime, mtime, 0, "fs.utimesSync: could not update timestamps");
}

void tsc_fs_lutimes_sync(const tsc_str_t* path, double atime, double mtime) {
    fs_utimes_path_sync(path, atime, mtime, AT_SYMLINK_NOFOLLOW, "fs.lutimesSync: could not update symlink timestamps");
}

void tsc_fs_chown_sync(const tsc_str_t* path, double uid, double gid) {
    char* p = cstr_dup(path);
    int r = chown(p, (uid_t)uid, (gid_t)gid);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.chownSync: could not change ownership"));
}

void tsc_fs_lchown_sync(const tsc_str_t* path, double uid, double gid) {
    char* p = cstr_dup(path);
    int r = lchown(p, (uid_t)uid, (gid_t)gid);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.lchownSync: could not change ownership"));
}

double tsc_fs_stats_dev(const tsc_fs_stats_t* st) {
    return st ? st->dev : 0.0;
}

double tsc_fs_stats_ino(const tsc_fs_stats_t* st) {
    return st ? st->ino : 0.0;
}

double tsc_fs_stats_size(const tsc_fs_stats_t* st) {
    return st ? st->size : 0.0;
}

double tsc_fs_stats_mode(const tsc_fs_stats_t* st) {
    return st ? st->mode : 0.0;
}

double tsc_fs_stats_nlink(const tsc_fs_stats_t* st) {
    return st ? st->nlink : 0.0;
}

double tsc_fs_stats_uid(const tsc_fs_stats_t* st) {
    return st ? st->uid : 0.0;
}

double tsc_fs_stats_gid(const tsc_fs_stats_t* st) {
    return st ? st->gid : 0.0;
}

double tsc_fs_stats_rdev(const tsc_fs_stats_t* st) {
    return st ? st->rdev : 0.0;
}

double tsc_fs_stats_blksize(const tsc_fs_stats_t* st) {
    return st ? st->blksize : 0.0;
}

double tsc_fs_stats_blocks(const tsc_fs_stats_t* st) {
    return st ? st->blocks : 0.0;
}

double tsc_fs_stats_atime_ms(const tsc_fs_stats_t* st) {
    return st ? st->atime_ms : 0.0;
}

double tsc_fs_stats_mtime_ms(const tsc_fs_stats_t* st) {
    return st ? st->mtime_ms : 0.0;
}

double tsc_fs_stats_ctime_ms(const tsc_fs_stats_t* st) {
    return st ? st->ctime_ms : 0.0;
}

double tsc_fs_stats_birthtime_ms(const tsc_fs_stats_t* st) {
    return st ? st->birthtime_ms : 0.0;
}

bool tsc_fs_stats_is_file(const tsc_fs_stats_t* st) {
    return st ? st->is_file : false;
}

bool tsc_fs_stats_is_directory(const tsc_fs_stats_t* st) {
    return st ? st->is_directory : false;
}

bool tsc_fs_stats_is_symbolic_link(const tsc_fs_stats_t* st) {
    return st ? st->is_symbolic_link : false;
}

bool tsc_fs_stats_is_block_device(const tsc_fs_stats_t* st) {
    return st ? st->is_block_device : false;
}

bool tsc_fs_stats_is_character_device(const tsc_fs_stats_t* st) {
    return st ? st->is_character_device : false;
}

bool tsc_fs_stats_is_fifo(const tsc_fs_stats_t* st) {
    return st ? st->is_fifo : false;
}

bool tsc_fs_stats_is_socket(const tsc_fs_stats_t* st) {
    return st ? st->is_socket : false;
}

tsc_str_t* tsc_fs_dirent_name(const tsc_fs_dirent_t* ent) {
    return ent ? ent->name : tsc_str_from_lit("", 0);
}

bool tsc_fs_dirent_is_file(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_file : false;
}

bool tsc_fs_dirent_is_directory(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_directory : false;
}

bool tsc_fs_dirent_is_symbolic_link(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_symbolic_link : false;
}

bool tsc_fs_dirent_is_block_device(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_block_device : false;
}

bool tsc_fs_dirent_is_character_device(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_character_device : false;
}

bool tsc_fs_dirent_is_fifo(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_fifo : false;
}

bool tsc_fs_dirent_is_socket(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_socket : false;
}

void tsc_fs_access_sync(const tsc_str_t* path) {
    tsc_fs_access_sync_mode(path, (double)F_OK);
}

void tsc_fs_access_sync_mode(const tsc_str_t* path, double mode) {
    char* p = cstr_dup(path);
    int m = isnan(mode) ? F_OK : (int)mode;
    int r = access(p, m);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.access: path is not accessible"));
}

void tsc_fs_chmod_sync(const tsc_str_t* path, double mode) {
    char* p = cstr_dup(path);
    mode_t m = mode < 0 ? 0 : (mode_t)mode;
    int r = chmod(p, m);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.chmodSync: could not change mode"));
}

static mode_t fs_mode_from_double(double mode) {
    if (isnan(mode) || isinf(mode) || mode < 0) return 0777;
    return (mode_t)mode;
}

void tsc_fs_mkdir_sync(const tsc_str_t* path) {
    tsc_fs_mkdir_sync_opts(path, false, 0777.0);
}

static void fs_mkdir_one_sync(const tsc_str_t* path, mode_t mode, const char* message) {
    char* p = cstr_dup(path);
    int r = mkdir(p, mode);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr(message));
}

static int mkdir_recursive_cstr(const char* path, mode_t mode) {
    if (!path || path[0] == '\0') return -1;
    char* tmp = strdup(path);
    if (!tmp) return -1;
    size_t len = strlen(tmp);
    while (len > 1 && tmp[len - 1] == '/') {
        tmp[--len] = '\0';
    }
    for (char* p = tmp + 1; *p; p++) {
        if (*p != '/') continue;
        *p = '\0';
        if (tmp[0] != '\0' && mkdir(tmp, mode) != 0 && errno != EEXIST) {
            int saved = errno;
            free(tmp);
            errno = saved;
            return -1;
        }
        *p = '/';
    }
    if (mkdir(tmp, mode) != 0 && errno != EEXIST) {
        int saved = errno;
        free(tmp);
        errno = saved;
        return -1;
    }
    free(tmp);
    return 0;
}

void tsc_fs_mkdir_sync_opts(const tsc_str_t* path, bool recursive, double mode) {
    mode_t m = fs_mode_from_double(mode);
    if (!recursive) {
        fs_mkdir_one_sync(path, m, "fs.mkdirSync: could not create directory");
        return;
    }
    char* p = cstr_dup(path);
    int r = mkdir_recursive_cstr(p, m);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.mkdirSync: could not create directory recursively"));
}

void tsc_fs_unlink_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    int r = unlink(p);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.unlinkSync: could not remove file"));
}

void tsc_fs_rm_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    int r = remove(p);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.rmSync: could not remove path"));
}

static int rm_recursive_cstr(const char* path, bool force) {
    struct stat st;
    if (lstat(path, &st) != 0) {
        return (force && errno == ENOENT) ? 0 : -1;
    }
    if (!S_ISDIR(st.st_mode)) {
        return unlink(path);
    }
    DIR* d = opendir(path);
    if (!d) return -1;
    struct dirent* ent;
    while ((ent = readdir(d))) {
        if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
        size_t base_len = strlen(path);
        size_t name_len = strlen(ent->d_name);
        bool needs_slash = base_len > 0 && path[base_len - 1] != '/';
        char* child = (char*)malloc(base_len + (needs_slash ? 1 : 0) + name_len + 1);
        if (!child) {
            closedir(d);
            errno = ENOMEM;
            return -1;
        }
        memcpy(child, path, base_len);
        size_t pos = base_len;
        if (needs_slash) child[pos++] = '/';
        memcpy(child + pos, ent->d_name, name_len + 1);
        if (rm_recursive_cstr(child, force) != 0) {
            int saved = errno;
            free(child);
            closedir(d);
            errno = saved;
            return -1;
        }
        free(child);
    }
    closedir(d);
    return rmdir(path);
}

void tsc_fs_rm_sync_opts(const tsc_str_t* path, bool recursive, bool force) {
    char* p = cstr_dup(path);
    int r;
    if (recursive) {
        r = rm_recursive_cstr(p, force);
    } else {
        r = remove(p);
        if (r != 0 && force && errno == ENOENT) r = 0;
    }
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.rmSync: could not remove path"));
}

void tsc_fs_rmdir_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    int r = rmdir(p);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.rmdirSync: could not remove directory"));
}

void tsc_fs_rmdir_sync_opts(const tsc_str_t* path, bool recursive) {
    char* p = cstr_dup(path);
    int r = recursive ? rm_recursive_cstr(p, false) : rmdir(p);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.rmdirSync: could not remove directory"));
}

static char* fs_join_path_cstr(const char* base, const char* name) {
    size_t base_len = strlen(base);
    size_t name_len = strlen(name);
    bool needs_slash = base_len > 0 && base[base_len - 1] != '/';
    char* out = (char*)malloc(base_len + (needs_slash ? 1 : 0) + name_len + 1);
    if (!out) return NULL;
    memcpy(out, base, base_len);
    size_t pos = base_len;
    if (needs_slash) out[pos++] = '/';
    memcpy(out + pos, name, name_len + 1);
    return out;
}

static int fs_copy_file_bytes_cstr(const char* src, const char* dest, bool force, bool error_on_exist, int copy_flags, bool preserve_timestamps) {
    struct stat src_st;
    bool have_src_stat = preserve_timestamps && stat(src, &src_st) == 0;
    if (access(dest, F_OK) == 0) {
        if (copy_flags & 1) {
            errno = EEXIST;
            return -1;
        }
        if (!force && error_on_exist) {
            errno = EEXIST;
            return -1;
        }
        if (!force) return 0;
    }
    FILE* in = fopen(src, "rb");
    if (!in) return -1;
    FILE* out = fopen(dest, "wb");
    if (!out) {
        int saved = errno;
        fclose(in);
        errno = saved;
        return -1;
    }
    char buf[8192];
    int result = 0;
    for (;;) {
        size_t n = fread(buf, 1, sizeof(buf), in);
        if (n > 0 && fwrite(buf, 1, n, out) != n) {
            result = -1;
            break;
        }
        if (n < sizeof(buf)) {
            if (ferror(in)) result = -1;
            break;
        }
    }
    int saved = errno;
    if (fclose(out) != 0 && result == 0) {
        result = -1;
        saved = errno;
    }
    fclose(in);
    if (result == 0 && have_src_stat) {
        struct timespec times[2];
#if defined(__APPLE__)
        times[0] = src_st.st_atimespec;
        times[1] = src_st.st_mtimespec;
#else
        times[0] = src_st.st_atim;
        times[1] = src_st.st_mtim;
#endif
        if (utimensat(AT_FDCWD, dest, times, 0) != 0) {
            result = -1;
            saved = errno;
        }
    }
    if (result != 0) errno = saved;
    return result;
}

static char* fs_readlink_alloc_cstr(const char* path) {
    size_t cap = PATH_MAX > 0 ? (size_t)PATH_MAX : 4096;
    for (;;) {
        char* buf = (char*)malloc(cap + 1);
        if (!buf) {
            errno = ENOMEM;
            return NULL;
        }
        ssize_t n = readlink(path, buf, cap);
        if (n < 0) {
            int saved = errno;
            free(buf);
            errno = saved;
            return NULL;
        }
        if ((size_t)n < cap) {
            buf[n] = '\0';
            return buf;
        }
        free(buf);
        if (cap >= (1u << 20)) {
            errno = ENAMETOOLONG;
            return NULL;
        }
        cap *= 2;
    }
}

static int fs_copy_symlink_cstr(const char* src, const char* dest, bool force, bool error_on_exist, bool verbatim_symlinks) {
    struct stat dest_st;
    if (lstat(dest, &dest_st) == 0) {
        if (!force && error_on_exist) {
            errno = EEXIST;
            return -1;
        }
        if (!force) return 0;
        if (unlink(dest) != 0) return -1;
    } else if (errno != ENOENT) {
        return -1;
    }
    char* target = verbatim_symlinks ? fs_readlink_alloc_cstr(src) : realpath(src, NULL);
    if (!target) return -1;
    int r = symlink(target, dest);
    int saved = errno;
    free(target);
    if (r != 0) errno = saved;
    return r;
}

static int fs_cp_recursive_cstr(const char* src, const char* dest, bool recursive, bool force, bool error_on_exist, bool dereference, bool verbatim_symlinks, int copy_flags, bool preserve_timestamps) {
    struct stat st;
    if ((dereference ? stat(src, &st) : lstat(src, &st)) != 0) return -1;
    if (!dereference && S_ISLNK(st.st_mode)) {
        return fs_copy_symlink_cstr(src, dest, force, error_on_exist, verbatim_symlinks);
    }
    if (S_ISDIR(st.st_mode)) {
        if (!recursive) {
            errno = EISDIR;
            return -1;
        }
        struct stat dest_st;
        if (lstat(dest, &dest_st) == 0) {
            if (!S_ISDIR(dest_st.st_mode)) {
                errno = ENOTDIR;
                return -1;
            }
        } else if (errno == ENOENT) {
            if (mkdir(dest, st.st_mode & 0777) != 0) return -1;
        } else {
            return -1;
        }
        DIR* d = opendir(src);
        if (!d) return -1;
        struct dirent* ent;
        while ((ent = readdir(d)) != NULL) {
            if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
            char* child_src = fs_join_path_cstr(src, ent->d_name);
            char* child_dest = fs_join_path_cstr(dest, ent->d_name);
            if (!child_src || !child_dest) {
                free(child_src);
                free(child_dest);
                closedir(d);
                errno = ENOMEM;
                return -1;
            }
            if (fs_cp_recursive_cstr(child_src, child_dest, recursive, force, error_on_exist, dereference, verbatim_symlinks, copy_flags, preserve_timestamps) != 0) {
                int saved = errno;
                free(child_src);
                free(child_dest);
                closedir(d);
                errno = saved;
                return -1;
            }
            free(child_src);
            free(child_dest);
        }
        closedir(d);
        return 0;
    }
    if (S_ISREG(st.st_mode)) {
        return fs_copy_file_bytes_cstr(src, dest, force, error_on_exist, copy_flags, preserve_timestamps);
    }
    errno = EINVAL;
    return -1;
}

void tsc_fs_cp_sync_opts(const tsc_str_t* src, const tsc_str_t* dest, bool recursive, bool force, bool error_on_exist, bool dereference, bool verbatim_symlinks, double mode, bool preserve_timestamps) {
    char* s = cstr_dup(src);
    char* d = cstr_dup(dest);
    int flags = (isnan(mode) || isinf(mode)) ? 0 : (int)mode;
    int r = fs_cp_recursive_cstr(s, d, recursive, force, error_on_exist, dereference, verbatim_symlinks, flags, preserve_timestamps);
    free(s);
    free(d);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.cpSync: could not copy path"));
}

void tsc_fs_copy_file_sync_mode(const tsc_str_t* src, const tsc_str_t* dest, double mode) {
    char* dest_path = cstr_dup(dest);
    int flags = (isnan(mode) || isinf(mode)) ? 0 : (int)mode;
    if ((flags & 1) && access(dest_path, F_OK) == 0) {
        free(dest_path);
        tsc_throw_str(tsc_str_from_cstr("fs.copyFileSync: destination already exists"));
    }
    free(dest_path);
    tsc_str_t* data = tsc_fs_read_file_sync(src);
    if (!data) return;
    tsc_fs_write_file_sync(dest, data);
}

void tsc_fs_copy_file_sync(const tsc_str_t* src, const tsc_str_t* dest) {
    tsc_fs_copy_file_sync_mode(src, dest, 0.0);
}

void tsc_fs_rename_sync(const tsc_str_t* old_path, const tsc_str_t* new_path) {
    char* oldp = cstr_dup(old_path);
    char* newp = cstr_dup(new_path);
    int r = rename(oldp, newp);
    free(oldp);
    free(newp);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.renameSync: could not rename path"));
}

tsc_array_t* tsc_fs_readdir_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    DIR* d = opendir(p);
    free(p);
    if (!d) {
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return NULL;
    }
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 16);
    struct dirent* ent;
    while ((ent = readdir(d))) {
        if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
        tsc_str_t* s = tsc_str_from_cstr(ent->d_name);
        tsc_array_push_raw(a, &s);
    }
    closedir(d);
    return a;
}

tsc_array_t* tsc_fs_readdir_buffer_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    DIR* d = opendir(p);
    free(p);
    if (!d) {
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return NULL;
    }
    tsc_array_t* a = tsc_array_new(sizeof(tsc_buffer_t*), 16);
    struct dirent* ent;
    while ((ent = readdir(d))) {
        if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
        tsc_str_t* s = tsc_str_from_cstr(ent->d_name);
        tsc_buffer_t* b = tsc_buffer_from_str(s, NULL);
        tsc_array_push_raw(a, &b);
    }
    closedir(d);
    return a;
}

static void fs_readdir_recursive_into(const char* root, const char* rel, tsc_array_t* out) {
    char* dir_path = rel[0] == '\0' ? strdup(root) : fs_join_path(root, rel);
    DIR* d = opendir(dir_path);
    if (!d) {
        free(dir_path);
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return;
    }
    struct dirent* ent;
    while ((ent = readdir(d))) {
        if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
        char* child_rel = rel[0] == '\0' ? strdup(ent->d_name) : fs_join_path(rel, ent->d_name);
        tsc_str_t* child_name = tsc_str_from_cstr(child_rel);
        tsc_array_push_raw(out, &child_name);

        char* child_path = fs_join_path(root, child_rel);
        struct stat st;
        bool descend = lstat(child_path, &st) == 0 && S_ISDIR(st.st_mode);
        free(child_path);
        if (descend) fs_readdir_recursive_into(root, child_rel, out);
        free(child_rel);
    }
    closedir(d);
    free(dir_path);
}

static void fs_readdir_recursive_buffer_into(const char* root, const char* rel, tsc_array_t* out) {
    char* dir_path = rel[0] == '\0' ? strdup(root) : fs_join_path(root, rel);
    DIR* d = opendir(dir_path);
    if (!d) {
        free(dir_path);
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return;
    }
    struct dirent* ent;
    while ((ent = readdir(d))) {
        if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
        char* child_rel = rel[0] == '\0' ? strdup(ent->d_name) : fs_join_path(rel, ent->d_name);
        tsc_str_t* child_name = tsc_str_from_cstr(child_rel);
        tsc_buffer_t* child_buf = tsc_buffer_from_str(child_name, NULL);
        tsc_array_push_raw(out, &child_buf);

        char* child_path = fs_join_path(root, child_rel);
        struct stat st;
        bool descend = lstat(child_path, &st) == 0 && S_ISDIR(st.st_mode);
        free(child_path);
        if (descend) fs_readdir_recursive_buffer_into(root, child_rel, out);
        free(child_rel);
    }
    closedir(d);
    free(dir_path);
}

tsc_array_t* tsc_fs_readdir_recursive_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    DIR* d = opendir(p);
    if (!d) {
        free(p);
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return NULL;
    }
    closedir(d);
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 16);
    fs_readdir_recursive_into(p, "", a);
    free(p);
    return a;
}

tsc_array_t* tsc_fs_readdir_recursive_buffer_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    DIR* d = opendir(p);
    if (!d) {
        free(p);
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return NULL;
    }
    closedir(d);
    tsc_array_t* a = tsc_array_new(sizeof(tsc_buffer_t*), 16);
    fs_readdir_recursive_buffer_into(p, "", a);
    free(p);
    return a;
}

tsc_array_t* tsc_fs_readdir_dirents_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    DIR* d = opendir(p);
    if (!d) {
        free(p);
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return NULL;
    }
    tsc_array_t* a = tsc_array_new(sizeof(tsc_fs_dirent_t*), 16);
    struct dirent* ent;
    while ((ent = readdir(d))) {
        if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
        tsc_fs_dirent_t* dirent = fs_dirent_from_path(p, ent->d_name);
        tsc_array_push_raw(a, &dirent);
    }
    closedir(d);
    free(p);
    return a;
}

/* ---------------- path ---------------- */

static tsc_str_t* path_join_impl(size_t n, va_list ap, bool resolve) {
    /* Simple POSIX join: concatenate with '/' separators, collapse duplicates. */
    char buf[4096];
    size_t pos = 0;
    if (resolve) {
        char cwd[PATH_MAX];
        if (getcwd(cwd, sizeof cwd)) {
            size_t l = strlen(cwd);
            if (l < sizeof buf) { memcpy(buf, cwd, l); pos = l; }
        }
    }
    for (size_t i = 0; i < n; i++) {
        tsc_str_t* s = va_arg(ap, tsc_str_t*);
        if (!s || s->len == 0) continue;
        bool s_abs = s->data[0] == '/';
        if (resolve && s_abs) { pos = 0; }
        if (pos > 0 && buf[pos - 1] != '/' && (!s_abs || !resolve)) {
            if (pos + 1 >= sizeof buf) break;
            buf[pos++] = '/';
        }
        size_t start = (pos > 0 && s->data[0] == '/') ? 1 : 0;
        if (pos + (s->len - start) >= sizeof buf) break;
        memcpy(buf + pos, s->data + start, s->len - start);
        pos += s->len - start;
    }
    if (pos == 0) { buf[0] = '.'; pos = 1; }
    tsc_str_t* r = str_alloc(pos);
    memcpy((char*)r->data, buf, pos);
    return r;
}

tsc_str_t* tsc_path_join(size_t n, ...) {
    va_list ap; va_start(ap, n);
    tsc_str_t* r = path_join_impl(n, ap, false);
    va_end(ap);
    return r;
}

tsc_str_t* tsc_path_resolve(size_t n, ...) {
    va_list ap; va_start(ap, n);
    tsc_str_t* r = path_join_impl(n, ap, true);
    va_end(ap);
    return r;
}

bool tsc_path_is_absolute(const tsc_str_t* p) {
    return p && p->len > 0 && p->data[0] == '/';
}

tsc_str_t* tsc_path_normalize(const tsc_str_t* p) {
    if (!p || p->len == 0) return tsc_str_from_lit(".", 1);
    bool absolute = tsc_path_is_absolute(p);
    bool trailing_slash = p->len > 1 && p->data[p->len - 1] == '/';
    char buf[4096];
    size_t pos = absolute ? 1 : 0;
    if (absolute) buf[0] = '/';
    size_t starts[256];
    bool parents[256];
    size_t top = 0;
    bool last_normal = false;

    for (size_t i = 0; i <= p->len;) {
        while (i < p->len && p->data[i] == '/') i++;
        size_t start = i;
        while (i < p->len && p->data[i] != '/') i++;
        size_t len = i - start;
        if (len == 0) break;
        if (len == 1 && p->data[start] == '.') {
            last_normal = false;
            continue;
        }
        if (len == 2 && p->data[start] == '.' && p->data[start + 1] == '.') {
            if (top > 0 && !parents[top - 1]) {
                pos = starts[--top];
            } else if (!absolute) {
                size_t prev = pos;
                if (pos > 0) {
                    if (pos + 1 >= sizeof buf) break;
                    buf[pos++] = '/';
                }
                if (pos + 2 >= sizeof buf) break;
                starts[top] = prev;
                parents[top] = true;
                top++;
                memcpy(buf + pos, "..", 2);
                pos += 2;
            }
            last_normal = false;
            continue;
        }

        if (top >= 256) break;
        size_t prev = pos;
        if (pos > 0 && !(absolute && pos == 1)) {
            if (pos + 1 >= sizeof buf) break;
            buf[pos++] = '/';
        }
        if (pos + len >= sizeof buf) break;
        starts[top] = prev;
        parents[top] = false;
        top++;
        memcpy(buf + pos, p->data + start, len);
        pos += len;
        last_normal = true;
    }

    if (pos == 0) {
        buf[pos++] = '.';
    }
    if (trailing_slash && last_normal && !(absolute && pos == 1)) {
        if (pos + 1 < sizeof buf && buf[pos - 1] != '/') buf[pos++] = '/';
    }
    tsc_str_t* r = str_alloc(pos);
    memcpy((char*)r->data, buf, pos);
    return r;
}

static size_t path_split_components(const tsc_str_t* p, size_t starts[256], size_t lens[256]) {
    size_t count = 0;
    for (size_t i = 0; i < p->len && count < 256;) {
        while (i < p->len && p->data[i] == '/') i++;
        size_t start = i;
        while (i < p->len && p->data[i] != '/') i++;
        size_t len = i - start;
        if (len == 0) break;
        if (len == 1 && p->data[start] == '.') continue;
        starts[count] = start;
        lens[count] = len;
        count++;
    }
    return count;
}

tsc_str_t* tsc_path_relative(const tsc_str_t* from, const tsc_str_t* to) {
    tsc_str_t* from_norm = tsc_path_normalize(from);
    tsc_str_t* to_norm = tsc_path_normalize(to);
    if (from_norm->len == to_norm->len && memcmp(from_norm->data, to_norm->data, from_norm->len) == 0) {
        return tsc_str_from_lit("", 0);
    }
    if (tsc_path_is_absolute(from_norm) != tsc_path_is_absolute(to_norm)) {
        return to_norm;
    }

    size_t from_starts[256], from_lens[256], to_starts[256], to_lens[256];
    size_t from_count = path_split_components(from_norm, from_starts, from_lens);
    size_t to_count = path_split_components(to_norm, to_starts, to_lens);
    size_t common = 0;
    while (
        common < from_count &&
        common < to_count &&
        from_lens[common] == to_lens[common] &&
        memcmp(from_norm->data + from_starts[common], to_norm->data + to_starts[common], from_lens[common]) == 0
    ) {
        common++;
    }

    char buf[4096];
    size_t pos = 0;
    for (size_t i = common; i < from_count; i++) {
        if (pos > 0) {
            if (pos + 1 >= sizeof buf) break;
            buf[pos++] = '/';
        }
        if (pos + 2 >= sizeof buf) break;
        memcpy(buf + pos, "..", 2);
        pos += 2;
    }
    for (size_t i = common; i < to_count; i++) {
        if (pos > 0) {
            if (pos + 1 >= sizeof buf) break;
            buf[pos++] = '/';
        }
        if (pos + to_lens[i] >= sizeof buf) break;
        memcpy(buf + pos, to_norm->data + to_starts[i], to_lens[i]);
        pos += to_lens[i];
    }
    tsc_str_t* r = str_alloc(pos);
    memcpy((char*)r->data, buf, pos);
    return r;
}

tsc_str_t* tsc_path_basename(const tsc_str_t* p) {
    if (p->len == 0) return tsc_str_from_lit("", 0);
    size_t end = p->len;
    while (end > 0 && p->data[end - 1] == '/') end--;
    size_t start = end;
    while (start > 0 && p->data[start - 1] != '/') start--;
    tsc_str_t* r = str_alloc(end - start);
    memcpy((char*)r->data, p->data + start, end - start);
    return r;
}

tsc_str_t* tsc_path_basename_suffix(const tsc_str_t* p, const tsc_str_t* suffix) {
    tsc_str_t* base = tsc_path_basename(p);
    if (!suffix || suffix->len == 0 || suffix->len > base->len) return base;
    size_t start = base->len - suffix->len;
    if (memcmp(base->data + start, suffix->data, suffix->len) != 0) return base;
    tsc_str_t* r = str_alloc(start);
    memcpy((char*)r->data, base->data, start);
    return r;
}

tsc_str_t* tsc_path_dirname(const tsc_str_t* p) {
    if (p->len == 0) return tsc_str_from_lit(".", 1);
    size_t end = p->len;
    while (end > 1 && p->data[end - 1] == '/') end--;
    size_t slash = end;
    while (slash > 0 && p->data[slash - 1] != '/') slash--;
    if (slash == 0) return tsc_str_from_lit(".", 1);
    while (slash > 1 && p->data[slash - 1] == '/') slash--;
    tsc_str_t* r = str_alloc(slash);
    memcpy((char*)r->data, p->data, slash);
    return r;
}

/* ---------------- os ---------------- */

tsc_str_t* tsc_os_platform(void) {
#if defined(__linux__)
    return tsc_str_from_lit("linux", 5);
#elif defined(__APPLE__)
    return tsc_str_from_lit("darwin", 6);
#elif defined(_WIN32)
    return tsc_str_from_lit("win32", 5);
#else
    return tsc_str_from_lit("unknown", 7);
#endif
}

tsc_str_t* tsc_os_type(void) {
#if defined(__linux__)
    return tsc_str_from_lit("Linux", 5);
#elif defined(__APPLE__)
    return tsc_str_from_lit("Darwin", 6);
#elif defined(_WIN32)
    return tsc_str_from_lit("Windows_NT", 10);
#else
    return tsc_str_from_lit("Unknown", 7);
#endif
}

tsc_str_t* tsc_os_release(void) {
    struct utsname u;
    if (uname(&u) == 0) {
        return tsc_str_from_cstr(u.release);
    }
    return tsc_str_from_lit("unknown", 7);
}

tsc_str_t* tsc_os_version(void) {
    struct utsname u;
    if (uname(&u) == 0) {
        return tsc_str_from_cstr(u.version);
    }
    return tsc_str_from_lit("unknown", 7);
}

tsc_str_t* tsc_os_endianness(void) {
    uint16_t value = 1;
    return (*(uint8_t*)&value) == 1 ? tsc_str_from_lit("LE", 2) : tsc_str_from_lit("BE", 2);
}

tsc_str_t* tsc_os_machine(void) {
    struct utsname u;
    if (uname(&u) == 0) {
        return tsc_str_from_cstr(u.machine);
    }
    return tsc_os_arch();
}

tsc_str_t* tsc_os_arch(void) {
#if defined(__x86_64__) || defined(_M_X64)
    return tsc_str_from_lit("x64", 3);
#elif defined(__aarch64__) || defined(_M_ARM64)
    return tsc_str_from_lit("arm64", 5);
#elif defined(__i386__) || defined(_M_IX86)
    return tsc_str_from_lit("ia32", 4);
#elif defined(__arm__)
    return tsc_str_from_lit("arm", 3);
#else
    return tsc_str_from_lit("unknown", 7);
#endif
}

tsc_str_t* tsc_os_hostname(void) {
    char buf[256];
    if (gethostname(buf, sizeof buf) == 0) {
        buf[sizeof buf - 1] = '\0';
        return tsc_str_from_cstr(buf);
    }
    return tsc_str_from_lit("unknown", 7);
}

tsc_str_t* tsc_os_tmpdir(void) {
    const char* t = getenv("TMPDIR");
    if (!t) t = "/tmp";
    return tsc_str_from_cstr(t);
}

tsc_str_t* tsc_os_homedir(void) {
    const char* h = getenv("HOME");
    if (!h) h = "/";
    return tsc_str_from_cstr(h);
}

double tsc_os_cpu_count(void) {
#if defined(_SC_NPROCESSORS_ONLN)
    long n = sysconf(_SC_NPROCESSORS_ONLN);
    if (n > 0) return (double)n;
#endif
    return 1.0;
}

double tsc_os_available_parallelism(void) {
    return tsc_os_cpu_count();
}

double tsc_os_totalmem(void) {
#if defined(__linux__)
    struct sysinfo info;
    if (sysinfo(&info) == 0) {
        return (double)info.totalram * (double)info.mem_unit;
    }
#elif defined(_SC_PHYS_PAGES) && defined(_SC_PAGESIZE)
    long pages = sysconf(_SC_PHYS_PAGES);
    long page_size = sysconf(_SC_PAGESIZE);
    if (pages > 0 && page_size > 0) {
        return (double)pages * (double)page_size;
    }
#endif
    return 0.0;
}

double tsc_os_freemem(void) {
#if defined(__linux__)
    struct sysinfo info;
    if (sysinfo(&info) == 0) {
        return (double)info.freeram * (double)info.mem_unit;
    }
#elif defined(_SC_AVPHYS_PAGES) && defined(_SC_PAGESIZE)
    long pages = sysconf(_SC_AVPHYS_PAGES);
    long page_size = sysconf(_SC_PAGESIZE);
    if (pages > 0 && page_size > 0) {
        return (double)pages * (double)page_size;
    }
#endif
    return 0.0;
}

double tsc_os_uptime(void) {
#if defined(__linux__)
    struct sysinfo info;
    if (sysinfo(&info) == 0) {
        return (double)info.uptime;
    }
#endif
    return 0.0;
}

tsc_array_t* tsc_os_loadavg(void) {
    double values[3] = { 0.0, 0.0, 0.0 };
#if defined(__linux__)
    struct sysinfo info;
    if (sysinfo(&info) == 0) {
        values[0] = (double)info.loads[0] / 65536.0;
        values[1] = (double)info.loads[1] / 65536.0;
        values[2] = (double)info.loads[2] / 65536.0;
    }
#endif
    tsc_array_t* a = tsc_array_new(sizeof(double), 3);
    for (size_t i = 0; i < 3; i++) {
        tsc_array_push_raw(a, &values[i]);
    }
    return a;
}

tsc_value_t tsc_os_user_info(void) {
    uid_t uid = getuid();
    gid_t gid = getgid();
    struct passwd* pw = getpwuid(uid);
    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("uid", 3), tsc_value_num((double)uid));
    tsc_object_set(out, tsc_str_from_lit("gid", 3), tsc_value_num((double)gid));
    tsc_object_set(out, tsc_str_from_lit("username", 8), tsc_value_string(tsc_str_from_cstr(pw && pw->pw_name ? pw->pw_name : "")));
    tsc_object_set(out, tsc_str_from_lit("homedir", 7), tsc_value_string(pw && pw->pw_dir ? tsc_str_from_cstr(pw->pw_dir) : tsc_os_homedir()));
    tsc_object_set(out, tsc_str_from_lit("shell", 5), tsc_value_string(tsc_str_from_cstr(pw && pw->pw_shell ? pw->pw_shell : "")));
    return tsc_value_object(out);
}

double tsc_date_now(void) {
    struct timespec ts;
    if (clock_gettime(CLOCK_REALTIME, &ts) == 0) {
        return (double)ts.tv_sec * 1000.0 + (double)ts.tv_nsec / 1e6;
    }
    return 0.0;
}

tsc_date_t* tsc_date_new_now(void) {
    return tsc_date_from_ms(tsc_date_now());
}

tsc_date_t* tsc_date_from_ms(double ms) {
    tsc_date_t* d = (tsc_date_t*)TSC_GC_MALLOC(sizeof(tsc_date_t));
    d->ms = ms;
    return d;
}

double tsc_date_get_time(const tsc_date_t* d) {
    return d ? d->ms : NAN;
}

double tsc_date_set_time(tsc_date_t* d, double ms) {
    if (!d) return NAN;
    d->ms = ms;
    return ms;
}

double tsc_date_set_utc_part(tsc_date_t* d, int part, double a, double b, double c, double e, int arg_count) {
    if (!d || isnan(d->ms)) return NAN;
    double provided[] = { a, b, c, e };
    for (int i = 0; i < arg_count && i < 4; i++) {
        if (isnan(provided[i])) {
            d->ms = NAN;
            return NAN;
        }
    }
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!gmtime_r(&seconds, &tm)) {
        d->ms = NAN;
        return NAN;
    }
    double rem = fmod(d->ms, 1000.0);
    if (rem < 0) rem += 1000.0;
    int millis = (int)floor(rem);

    switch (part) {
        case 0:
            tm.tm_year = (int)a - 1900;
            if (arg_count > 1) tm.tm_mon = (int)b;
            if (arg_count > 2) tm.tm_mday = (int)c;
            break;
        case 1:
            tm.tm_mon = (int)a;
            if (arg_count > 1) tm.tm_mday = (int)b;
            break;
        case 2:
            tm.tm_mday = (int)a;
            break;
        case 3:
            tm.tm_hour = (int)a;
            if (arg_count > 1) tm.tm_min = (int)b;
            if (arg_count > 2) tm.tm_sec = (int)c;
            if (arg_count > 3) millis = (int)e;
            break;
        case 4:
            tm.tm_min = (int)a;
            if (arg_count > 1) tm.tm_sec = (int)b;
            if (arg_count > 2) millis = (int)c;
            break;
        case 5:
            tm.tm_sec = (int)a;
            if (arg_count > 1) millis = (int)b;
            break;
        case 6:
            millis = (int)a;
            break;
        default:
            return NAN;
    }

    time_t t = timegm(&tm);
    d->ms = ((double)t) * 1000.0 + (double)millis;
    return d->ms;
}

double tsc_date_set_local_part(tsc_date_t* d, int part, double a, double b, double c, double e, int arg_count) {
    if (!d || isnan(d->ms)) return NAN;
    double provided[] = { a, b, c, e };
    for (int i = 0; i < arg_count && i < 4; i++) {
        if (isnan(provided[i])) {
            d->ms = NAN;
            return NAN;
        }
    }
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!localtime_r(&seconds, &tm)) {
        d->ms = NAN;
        return NAN;
    }
    double rem = fmod(d->ms, 1000.0);
    if (rem < 0) rem += 1000.0;
    int millis = (int)floor(rem);

    switch (part) {
        case 0:
            tm.tm_year = (int)a - 1900;
            if (arg_count > 1) tm.tm_mon = (int)b;
            if (arg_count > 2) tm.tm_mday = (int)c;
            break;
        case 1:
            tm.tm_mon = (int)a;
            if (arg_count > 1) tm.tm_mday = (int)b;
            break;
        case 2:
            tm.tm_mday = (int)a;
            break;
        case 3:
            tm.tm_hour = (int)a;
            if (arg_count > 1) tm.tm_min = (int)b;
            if (arg_count > 2) tm.tm_sec = (int)c;
            if (arg_count > 3) millis = (int)e;
            break;
        case 4:
            tm.tm_min = (int)a;
            if (arg_count > 1) tm.tm_sec = (int)b;
            if (arg_count > 2) millis = (int)c;
            break;
        case 5:
            tm.tm_sec = (int)a;
            if (arg_count > 1) millis = (int)b;
            break;
        case 6:
            millis = (int)a;
            break;
        default:
            return NAN;
    }

    tm.tm_isdst = -1;
    time_t t = mktime(&tm);
    if (t == (time_t)-1) {
        d->ms = NAN;
        return NAN;
    }
    d->ms = ((double)t) * 1000.0 + (double)millis;
    return d->ms;
}

static bool date_parse_fixed_int(const tsc_str_t* text, size_t* pos, size_t digits, int* out) {
    if (!text || !pos || !out || *pos + digits > text->len) return false;
    int value = 0;
    for (size_t i = 0; i < digits; i++) {
        unsigned char ch = (unsigned char)text->data[*pos + i];
        if (!isdigit(ch)) return false;
        value = value * 10 + (int)(ch - '0');
    }
    *pos += digits;
    *out = value;
    return true;
}

static bool date_parse_char(const tsc_str_t* text, size_t* pos, char ch) {
    if (!text || !pos || *pos >= text->len || text->data[*pos] != ch) return false;
    *pos += 1;
    return true;
}

double tsc_date_parse(const tsc_str_t* text) {
    if (!text || text->len == 0) return NAN;
    size_t pos = 0;
    int year = 0;
    int month = 0;
    int day = 0;
    int hour = 0;
    int minute = 0;
    int second = 0;
    int ms = 0;
    int offset_minutes = 0;

    if (!date_parse_fixed_int(text, &pos, 4, &year)) return NAN;
    if (!date_parse_char(text, &pos, '-')) return NAN;
    if (!date_parse_fixed_int(text, &pos, 2, &month)) return NAN;
    if (!date_parse_char(text, &pos, '-')) return NAN;
    if (!date_parse_fixed_int(text, &pos, 2, &day)) return NAN;
    if (month < 1 || month > 12 || day < 1 || day > 31) return NAN;

    bool has_time = false;
    if (pos < text->len) {
        char sep = text->data[pos];
        if (sep != 'T' && sep != 't') return NAN;
        pos += 1;
        has_time = true;
        if (!date_parse_fixed_int(text, &pos, 2, &hour)) return NAN;
        if (!date_parse_char(text, &pos, ':')) return NAN;
        if (!date_parse_fixed_int(text, &pos, 2, &minute)) return NAN;
        if (!date_parse_char(text, &pos, ':')) return NAN;
        if (!date_parse_fixed_int(text, &pos, 2, &second)) return NAN;
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return NAN;
        if (pos < text->len && text->data[pos] == '.') {
            pos += 1;
            int digits = 0;
            while (pos < text->len && isdigit((unsigned char)text->data[pos])) {
                if (digits < 3) {
                    ms = ms * 10 + (int)(text->data[pos] - '0');
                    digits++;
                }
                pos += 1;
            }
            if (digits == 0) return NAN;
            while (digits < 3) {
                ms *= 10;
                digits++;
            }
        }
        if (pos >= text->len) return NAN;
        if (text->data[pos] == 'Z' || text->data[pos] == 'z') {
            pos += 1;
        } else if (text->data[pos] == '+' || text->data[pos] == '-') {
            int sign = text->data[pos] == '+' ? 1 : -1;
            int tz_hour = 0;
            int tz_minute = 0;
            pos += 1;
            if (!date_parse_fixed_int(text, &pos, 2, &tz_hour)) return NAN;
            if (!date_parse_char(text, &pos, ':')) return NAN;
            if (!date_parse_fixed_int(text, &pos, 2, &tz_minute)) return NAN;
            if (tz_hour > 23 || tz_minute > 59) return NAN;
            offset_minutes = sign * (tz_hour * 60 + tz_minute);
        } else {
            return NAN;
        }
    }
    if (pos != text->len) return NAN;

    struct tm tm;
    memset(&tm, 0, sizeof(tm));
    tm.tm_year = year - 1900;
    tm.tm_mon = month - 1;
    tm.tm_mday = day;
    tm.tm_hour = hour;
    tm.tm_min = minute;
    tm.tm_sec = second;
    time_t t = timegm(&tm);
    struct tm check;
    if (!gmtime_r(&t, &check)) return NAN;
    if (check.tm_year != tm.tm_year || check.tm_mon != tm.tm_mon || check.tm_mday != tm.tm_mday ||
        check.tm_hour != tm.tm_hour || check.tm_min != tm.tm_min || check.tm_sec != tm.tm_sec) {
        return NAN;
    }

    double result = ((double)t) * 1000.0 + (double)ms;
    if (has_time) result -= (double)offset_minutes * 60000.0;
    return result;
}

double tsc_date_utc(double year, double month, double day, double hours, double minutes, double seconds, double ms) {
    if (isnan(year) || isnan(month) || isnan(day) || isnan(hours) || isnan(minutes) || isnan(seconds) || isnan(ms)) {
        return NAN;
    }
    int y = (int)year;
    if (y >= 0 && y <= 99) y += 1900;
    struct tm tm;
    memset(&tm, 0, sizeof(tm));
    tm.tm_year = y - 1900;
    tm.tm_mon = (int)month;
    tm.tm_mday = (int)day;
    tm.tm_hour = (int)hours;
    tm.tm_min = (int)minutes;
    tm.tm_sec = (int)seconds;
    time_t t = timegm(&tm);
    if (t == (time_t)-1) return NAN;
    return ((double)t) * 1000.0 + ms;
}

double tsc_date_local(double year, double month, double day, double hours, double minutes, double seconds, double ms) {
    if (isnan(year) || isnan(month) || isnan(day) || isnan(hours) || isnan(minutes) || isnan(seconds) || isnan(ms)) {
        return NAN;
    }
    int y = (int)year;
    if (y >= 0 && y <= 99) y += 1900;
    struct tm tm;
    memset(&tm, 0, sizeof(tm));
    tm.tm_year = y - 1900;
    tm.tm_mon = (int)month;
    tm.tm_mday = (int)day;
    tm.tm_hour = (int)hours;
    tm.tm_min = (int)minutes;
    tm.tm_sec = (int)seconds;
    tm.tm_isdst = -1;
    time_t t = mktime(&tm);
    if (t == (time_t)-1) return NAN;
    return ((double)t) * 1000.0 + ms;
}

double tsc_date_get_utc_part(const tsc_date_t* d, int part) {
    if (!d || isnan(d->ms)) return NAN;
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!gmtime_r(&seconds, &tm)) return NAN;
    switch (part) {
        case 0: return (double)(tm.tm_year + 1900);
        case 1: return (double)tm.tm_mon;
        case 2: return (double)tm.tm_mday;
        case 3: return (double)tm.tm_wday;
        case 4: return (double)tm.tm_hour;
        case 5: return (double)tm.tm_min;
        case 6: return (double)tm.tm_sec;
        case 7: {
            double rem = fmod(d->ms, 1000.0);
            if (rem < 0) rem += 1000.0;
            return floor(rem);
        }
    }
    return NAN;
}

static double date_millis_part(const tsc_date_t* d) {
    double rem = fmod(d->ms, 1000.0);
    if (rem < 0) rem += 1000.0;
    return floor(rem);
}

double tsc_date_get_local_part(const tsc_date_t* d, int part) {
    if (!d || isnan(d->ms)) return NAN;
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!localtime_r(&seconds, &tm)) return NAN;
    switch (part) {
        case 0: return (double)(tm.tm_year + 1900);
        case 1: return (double)tm.tm_mon;
        case 2: return (double)tm.tm_mday;
        case 3: return (double)tm.tm_wday;
        case 4: return (double)tm.tm_hour;
        case 5: return (double)tm.tm_min;
        case 6: return (double)tm.tm_sec;
        case 7: return date_millis_part(d);
    }
    return NAN;
}

double tsc_date_get_timezone_offset(const tsc_date_t* d) {
    if (!d || isnan(d->ms)) return NAN;
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm local_tm;
    struct tm utc_tm;
    if (!localtime_r(&seconds, &local_tm) || !gmtime_r(&seconds, &utc_tm)) return NAN;
    time_t local_as_utc = timegm(&local_tm);
    time_t utc_as_utc = timegm(&utc_tm);
    return difftime(utc_as_utc, local_as_utc) / 60.0;
}

tsc_str_t* tsc_date_to_iso_string(const tsc_date_t* d) {
    if (!d || isnan(d->ms)) return tsc_str_from_lit("Invalid Date", 12);
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!gmtime_r(&seconds, &tm)) return tsc_str_from_lit("Invalid Date", 12);
    double rem = fmod(d->ms, 1000.0);
    if (rem < 0) rem += 1000.0;
    char buf[32];
    snprintf(
        buf,
        sizeof(buf),
        "%04d-%02d-%02dT%02d:%02d:%02d.%03dZ",
        tm.tm_year + 1900,
        tm.tm_mon + 1,
        tm.tm_mday,
        tm.tm_hour,
        tm.tm_min,
        tm.tm_sec,
        (int)floor(rem)
    );
    return tsc_str_from_cstr(buf);
}

tsc_str_t* tsc_date_to_utc_string(const tsc_date_t* d) {
    if (!d || isnan(d->ms)) return tsc_str_from_lit("Invalid Date", 12);
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!gmtime_r(&seconds, &tm)) return tsc_str_from_lit("Invalid Date", 12);
    static const char* weekdays[] = { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };
    static const char* months[] = { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
    char buf[40];
    snprintf(
        buf,
        sizeof(buf),
        "%s, %02d %s %04d %02d:%02d:%02d GMT",
        weekdays[tm.tm_wday],
        tm.tm_mday,
        months[tm.tm_mon],
        tm.tm_year + 1900,
        tm.tm_hour,
        tm.tm_min,
        tm.tm_sec
    );
    return tsc_str_from_cstr(buf);
}

tsc_str_t* tsc_date_to_string(const tsc_date_t* d) {
    return d ? tsc_str_from_num(d->ms) : tsc_str_from_lit("Invalid Date", 12);
}

tsc_error_t* tsc_error_new(tsc_str_t* message) {
    return tsc_error_new_named(tsc_str_from_lit("Error", 5), message);
}

tsc_error_t* tsc_error_new_named(tsc_str_t* name, tsc_str_t* message) {
    tsc_error_t* e = (tsc_error_t*)TSC_GC_MALLOC(sizeof(tsc_error_t));
    e->name = name ? name : tsc_str_from_lit("Error", 5);
    e->message = message ? message : tsc_str_from_lit("", 0);
    e->errors = NULL;
    return e;
}

tsc_error_t* tsc_aggregate_error_new(tsc_array_t* errors, tsc_str_t* message) {
    tsc_error_t* e = tsc_error_new_named(tsc_str_from_lit("AggregateError", 14), message);
    e->errors = errors ? errors : tsc_array_new(sizeof(tsc_value_t), 1);
    return e;
}

tsc_str_t* tsc_error_to_string(const tsc_error_t* e) {
    if (!e) return tsc_str_from_lit("Error", 5);
    tsc_str_t* name = e->name ? e->name : tsc_str_from_lit("Error", 5);
    tsc_str_t* message = e->message ? e->message : tsc_str_from_lit("", 0);
    if (name->len == 0) return message;
    if (message->len == 0) return name;
    return tsc_str_concat_n(3, name, tsc_str_from_lit(": ", 2), message);
}

tsc_str_t* tsc_path_extname(const tsc_str_t* p) {
    for (size_t i = p->len; i > 0; i--) {
        char c = p->data[i - 1];
        if (c == '/') break;
        if (c == '.') {
            if (i == 1 || p->data[i - 2] == '/') return tsc_str_from_lit("", 0);
            tsc_str_t* r = str_alloc(p->len - (i - 1));
            memcpy((char*)r->data, p->data + (i - 1), p->len - (i - 1));
            return r;
        }
    }
    return tsc_str_from_lit("", 0);
}

static tsc_str_t* path_str_slice(const tsc_str_t* p, size_t start, size_t len) {
    if (!p || start > p->len) return tsc_str_from_lit("", 0);
    if (start + len > p->len) len = p->len - start;
    tsc_str_t* out = str_alloc(len);
    memcpy((char*)out->data, p->data + start, len);
    return out;
}

tsc_value_t tsc_path_parse(const tsc_str_t* p) {
    tsc_object_t* out = tsc_object_new();
    if (!p) p = tsc_str_from_lit("", 0);
    tsc_str_t* root = tsc_path_is_absolute(p) ? tsc_str_from_lit("/", 1) : tsc_str_from_lit("", 0);
    tsc_str_t* dir = tsc_path_dirname(p);
    if (str_lit_eq(dir, ".") && !tsc_path_is_absolute(p)) dir = tsc_str_from_lit("", 0);
    tsc_str_t* base = tsc_path_basename(p);
    tsc_str_t* ext = tsc_path_extname(base);
    size_t name_len = base->len >= ext->len ? base->len - ext->len : base->len;
    tsc_str_t* name = path_str_slice(base, 0, name_len);
    tsc_object_set(out, tsc_str_from_lit("root", 4), tsc_value_string(root));
    tsc_object_set(out, tsc_str_from_lit("dir", 3), tsc_value_string(dir));
    tsc_object_set(out, tsc_str_from_lit("base", 4), tsc_value_string(base));
    tsc_object_set(out, tsc_str_from_lit("ext", 3), tsc_value_string(ext));
    tsc_object_set(out, tsc_str_from_lit("name", 4), tsc_value_string(name));
    return tsc_value_object(out);
}

static tsc_str_t* path_get_string_prop(tsc_value_t object, const char* key, size_t key_len) {
    if (!value_is_box(object) || value_tag(object) != TSC_VALUE_TAG_OBJECT) return NULL;
    tsc_value_t value = tsc_object_get((tsc_object_t*)value_ptr(object), tsc_str_from_lit(key, key_len));
    if (tsc_value_is_nullish(value)) return NULL;
    return tsc_value_to_string(value);
}

tsc_str_t* tsc_path_format(tsc_value_t path_object) {
    tsc_str_t* root = path_get_string_prop(path_object, "root", 4);
    tsc_str_t* dir = path_get_string_prop(path_object, "dir", 3);
    tsc_str_t* base = path_get_string_prop(path_object, "base", 4);
    if (!base) {
        tsc_str_t* name = path_get_string_prop(path_object, "name", 4);
        tsc_str_t* ext = path_get_string_prop(path_object, "ext", 3);
        if (!name) name = tsc_str_from_lit("", 0);
        if (!ext) ext = tsc_str_from_lit("", 0);
        base = tsc_str_concat(name, ext);
    }
    if (!root) root = tsc_str_from_lit("", 0);
    if (!dir) dir = tsc_str_from_lit("", 0);
    if (dir->len > 0) {
        if (base->len == 0) return dir;
        if (dir->data[dir->len - 1] == '/') return tsc_str_concat(dir, base);
        return tsc_str_concat_n(3, dir, tsc_str_from_lit("/", 1), base);
    }
    if (root->len > 0) {
        if (base->len == 0) return root;
        if (root->data[root->len - 1] == '/') return tsc_str_concat(root, base);
        return tsc_str_concat_n(3, root, tsc_str_from_lit("/", 1), base);
    }
    return base;
}

/* ---------------- exceptions ---------------- */

void tsc_try_push(tsc_try_frame_t* f) {
    f->prev = g_try_top;
    g_try_top = f;
}

void tsc_try_pop(void) {
    if (g_try_top) g_try_top = g_try_top->prev;
}

void tsc_throw_str(tsc_str_t* message) {
    g_current_error = message ? message : tsc_str_from_lit("(unknown error)", 15);
    if (g_try_top) {
        tsc_try_frame_t* f = g_try_top;
        g_try_top = f->prev;
        longjmp(f->jb, 1);
    }
    fputs("Uncaught: ", stderr);
    if (g_current_error) fwrite(g_current_error->data, 1, g_current_error->len, stderr);
    fputc('\n', stderr);
    exit(1);
}

void tsc_rethrow(void) {
    if (g_current_error) tsc_throw_str(g_current_error);
    exit(1);
}

tsc_str_t* tsc_current_error(void) {
    return g_current_error ? g_current_error : tsc_str_from_lit("(unknown error)", 15);
}
