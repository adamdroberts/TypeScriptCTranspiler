#include "tsc_internal.h"

tsc_function_identity_t* g_function_identities = NULL;

tsc_value_t tsc_value_array(tsc_array_t* a) { return value_box(TSC_VALUE_TAG_ARRAY, (uintptr_t)a); }
tsc_value_t tsc_value_object(tsc_object_t* o) { return value_box(TSC_VALUE_TAG_OBJECT, (uintptr_t)o); }

tsc_value_t tsc_function_default_prototype(void) {
    static bool initialized = false;
    static tsc_value_t prototype;
    if (!initialized) {
        prototype = tsc_value_object(tsc_object_new());
        initialized = true;
    }
    return prototype;
}

tsc_value_t value_event_listener_identity(void* identity) {
    if (!identity) return tsc_value_undefined();
    for (tsc_function_identity_t* cur = g_function_identities; cur; cur = cur->next) {
        if (cur->kind == TSC_FUNCTION_IDENTITY_EVENT_LISTENER && cur->code.event_identity == identity) {
            return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)cur);
        }
    }
    tsc_function_identity_t* entry = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
    entry->kind = TSC_FUNCTION_IDENTITY_EVENT_LISTENER;
    entry->extensible = true;
    entry->sealed = false;
    entry->frozen = false;
    entry->length = 0.0;
    entry->name = tsc_str_from_lit("", 0);
    entry->prototype = tsc_function_default_prototype();
    entry->func_prototype = tsc_value_undefined();
    entry->code.event_identity = identity;
    entry->env = NULL;
    entry->next = g_function_identities;
    g_function_identities = entry;
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)entry);
}

tsc_value_t value_event_raw_listener_identity(void* identity, uint64_t order, bool once) {
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
    entry->extensible = true;
    entry->sealed = false;
    entry->frozen = false;
    entry->length = 0.0;
    entry->name = tsc_str_from_lit("", 0);
    entry->prototype = tsc_function_default_prototype();
    entry->func_prototype = tsc_value_undefined();
    entry->code.event_raw_identity.identity = identity;
    entry->code.event_raw_identity.order = order;
    entry->env = NULL;
    entry->next = g_function_identities;
    g_function_identities = entry;
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)entry);
}

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
static bool g_dynamic_stats_enabled = false;
static uint64_t g_dynamic_stats[TSC_DYNAMIC_STAT_COUNT];
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
    double id;
    bool canceled;
} tsc_immediate_entry_t;
static tsc_immediate_entry_t* g_immediate_queue = NULL;
static size_t g_immediate_len = 0;
static size_t g_immediate_cap = 0;
typedef struct {
    tsc_timeout_fn_t fn;
    void* env;
    double id;
    bool canceled;
    bool is_interval;
} tsc_timeout_entry_t;
static tsc_timeout_entry_t* g_timeout_queue = NULL;
static size_t g_timeout_len = 0;
static size_t g_timeout_cap = 0;
static double g_next_timer_id = 1.0;

/* Forward decls for helpers used across sections. */
tsc_str_t* str_alloc(size_t len);
tsc_str_t* str_from_base64_bytes(const uint8_t* data, size_t len);
char* cstr_dup(const tsc_str_t* s);
void replace_append(char** out, size_t* pos, size_t* cap, const char* data, size_t len);
void replace_append_string_expanded(char** out, size_t* pos, size_t* cap, const tsc_str_t* source, const tsc_str_t* repl, size_t start, size_t end);
tsc_array_t* value_array_from_string_array(const tsc_array_t* strings);
bool tsc_object_define_desc(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, bool has_value, bool writable, bool has_writable, bool enumerable, bool has_enumerable, bool configurable, bool has_configurable);

bool str_lit_eq(const tsc_str_t* s, const char* lit) {
    size_t n = strlen(lit);
    return s && s->len == n && memcmp(s->data, lit, n) == 0;
}

static void tsc_dynamic_stats_report(void) {
    if (!g_dynamic_stats_enabled) return;
    fprintf(
        stderr,
        "tsc dynamic stats: get_prop=%" PRIu64 " get_prop_receiver=%" PRIu64 " set_prop=%" PRIu64 " set_prop_receiver=%" PRIu64 " has_prop=%" PRIu64 " delete_prop=%" PRIu64 " own_keys=%" PRIu64 " get_own_property_descriptor=%" PRIu64 " object_shape_updates=%" PRIu64 " prop_cache_hits=%" PRIu64 " prop_cache_misses=%" PRIu64 "\n",
        g_dynamic_stats[TSC_DYNAMIC_STAT_GET_PROP],
        g_dynamic_stats[TSC_DYNAMIC_STAT_GET_PROP_RECEIVER],
        g_dynamic_stats[TSC_DYNAMIC_STAT_SET_PROP],
        g_dynamic_stats[TSC_DYNAMIC_STAT_SET_PROP_RECEIVER],
        g_dynamic_stats[TSC_DYNAMIC_STAT_HAS_PROP],
        g_dynamic_stats[TSC_DYNAMIC_STAT_DELETE_PROP],
        g_dynamic_stats[TSC_DYNAMIC_STAT_OWN_KEYS],
        g_dynamic_stats[TSC_DYNAMIC_STAT_GET_OWN_PROPERTY_DESCRIPTOR],
        g_dynamic_stats[TSC_DYNAMIC_STAT_OBJECT_SHAPE_UPDATE],
        g_dynamic_stats[TSC_DYNAMIC_STAT_PROP_CACHE_HIT],
        g_dynamic_stats[TSC_DYNAMIC_STAT_PROP_CACHE_MISS]
    );
}

void tsc_dynamic_stat_hit(tsc_dynamic_stat_kind_t kind) {
    if (!g_dynamic_stats_enabled || kind < 0 || kind >= TSC_DYNAMIC_STAT_COUNT) return;
    g_dynamic_stats[kind]++;
}

void tsc_bootstrap(int argc, char** argv) {
    TSC_GC_INIT();
    tsc_argc = argc;
    tsc_argv = argv;
    const char* dynamic_stats = getenv("TSC_DYNAMIC_STATS");
    if (dynamic_stats && dynamic_stats[0] != '\0' && strcmp(dynamic_stats, "0") != 0) {
        g_dynamic_stats_enabled = true;
        atexit(tsc_dynamic_stats_report);
    }
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

static tsc_set_t* cached_allowed_flags = NULL;
tsc_set_t* tsc_process_allowed_node_environment_flags(void) {
    if (!cached_allowed_flags) {
        tsc_set_t* s = tsc_set_new(sizeof(tsc_str_t*), TSC_KEY_STR, 5);
        tsc_str_t* f1 = tsc_str_from_lit("--inspect", 9);
        tsc_set_add_raw(s, &f1);
        tsc_str_t* f2 = tsc_str_from_lit("--inspect-brk", 13);
        tsc_set_add_raw(s, &f2);
        tsc_str_t* f3 = tsc_str_from_lit("--require", 9);
        tsc_set_add_raw(s, &f3);
        tsc_str_t* f4 = tsc_str_from_lit("--loader", 8);
        tsc_set_add_raw(s, &f4);
        tsc_str_t* f5 = tsc_str_from_lit("--enable-source-maps", 20);
        tsc_set_add_raw(s, &f5);
        cached_allowed_flags = s;
    }
    return cached_allowed_flags;
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

static double process_memory_usage_rss(void) {
    double rss = 0.0;
    struct rusage usage;
    if (getrusage(RUSAGE_SELF, &usage) == 0) {
#if defined(__APPLE__)
        rss = (double)usage.ru_maxrss;
#else
        rss = (double)usage.ru_maxrss * 1024.0;
#endif
    }
    return rss;
}

double tsc_process_memory_usage_rss(void) {
    return process_memory_usage_rss();
}

tsc_value_t tsc_process_memory_usage(void) {
    double rss = process_memory_usage_rss();
    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("rss", 3), tsc_value_num(rss));
    tsc_object_set(out, tsc_str_from_lit("heapTotal", 9), tsc_value_num(0.0));
    tsc_object_set(out, tsc_str_from_lit("heapUsed", 8), tsc_value_num(0.0));
    tsc_object_set(out, tsc_str_from_lit("external", 8), tsc_value_num(0.0));
    tsc_object_set(out, tsc_str_from_lit("arrayBuffers", 12), tsc_value_num(0.0));
    return tsc_value_object(out);
}

static void process_cpu_usage_raw(double* user, double* system) {
    *user = 0.0;
    *system = 0.0;
    struct rusage usage;
    if (getrusage(RUSAGE_SELF, &usage) == 0) {
        *user = (double)usage.ru_utime.tv_sec * 1000000.0 + (double)usage.ru_utime.tv_usec;
        *system = (double)usage.ru_stime.tv_sec * 1000000.0 + (double)usage.ru_stime.tv_usec;
    }
}

static double process_cpu_previous_field(tsc_value_t previous, const char* key, size_t key_len) {
    if (!value_is_box(previous) || value_tag(previous) != TSC_VALUE_TAG_OBJECT) {
        tsc_throw_str(tsc_str_from_cstr("process.cpuUsage previous value must be an object"));
    }
    tsc_value_t value = tsc_object_get((tsc_object_t*)value_ptr(previous), tsc_str_from_lit(key, key_len));
    if (value_is_box(value)) {
        tsc_throw_str(tsc_str_from_cstr("process.cpuUsage previous value must contain numeric user and system fields"));
    }
    return value_as_num(value);
}

static tsc_value_t process_cpu_usage_object(double user, double system) {
    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("user", 4), tsc_value_num(user));
    tsc_object_set(out, tsc_str_from_lit("system", 6), tsc_value_num(system));
    return tsc_value_object(out);
}

tsc_value_t tsc_process_cpu_usage(void) {
    double user = 0.0;
    double system = 0.0;
    process_cpu_usage_raw(&user, &system);
    return process_cpu_usage_object(user, system);
}

tsc_value_t tsc_process_cpu_usage_diff(tsc_value_t previous) {
    if (tsc_value_is_nullish(previous)) {
        return tsc_process_cpu_usage();
    }
    double user = 0.0;
    double system = 0.0;
    process_cpu_usage_raw(&user, &system);
    user -= process_cpu_previous_field(previous, "user", 4);
    system -= process_cpu_previous_field(previous, "system", 6);
    return process_cpu_usage_object(user, system);
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

int tsc_posix_signal_number(const tsc_str_t* signal) {
#ifdef SIGHUP
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGHUP", 6))) return SIGHUP;
#endif
#ifdef SIGINT
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGINT", 6))) return SIGINT;
#endif
#ifdef SIGQUIT
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGQUIT", 7))) return SIGQUIT;
#endif
#ifdef SIGILL
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGILL", 6))) return SIGILL;
#endif
#ifdef SIGTRAP
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGTRAP", 7))) return SIGTRAP;
#endif
#ifdef SIGABRT
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGABRT", 7))) return SIGABRT;
#endif
#ifdef SIGBUS
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGBUS", 6))) return SIGBUS;
#endif
#ifdef SIGFPE
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGFPE", 6))) return SIGFPE;
#endif
#ifdef SIGKILL
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGKILL", 7))) return SIGKILL;
#endif
#ifdef SIGUSR1
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGUSR1", 7))) return SIGUSR1;
#endif
#ifdef SIGSEGV
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGSEGV", 7))) return SIGSEGV;
#endif
#ifdef SIGUSR2
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGUSR2", 7))) return SIGUSR2;
#endif
#ifdef SIGPIPE
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGPIPE", 7))) return SIGPIPE;
#endif
#ifdef SIGALRM
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGALRM", 7))) return SIGALRM;
#endif
#ifdef SIGTERM
    if (tsc_str_eq(signal, tsc_str_from_lit("SIGTERM", 7))) return SIGTERM;
#endif
    tsc_throw_str(tsc_str_from_cstr("unsupported POSIX signal"));
    return SIGTERM;
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

bool process_stream_write(FILE* f, const tsc_str_t* data) {
    if (!data || data->len == 0) {
        fflush(f);
        return ferror(f) == 0;
    }
    size_t written = fwrite(data->data, 1, data->len, f);
    fflush(f);
    return written == data->len && ferror(f) == 0;
}

bool process_stream_write_bytes(FILE* f, const uint8_t* data, size_t len) {
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

static bool g_stdout_ended = false;
static bool g_stderr_ended = false;

void tsc_process_stdout_end(void) {
    g_stdout_ended = true;
}

void tsc_process_stderr_end(void) {
    g_stderr_ended = true;
}

bool tsc_process_stdout_writable_ended(void) {
    return g_stdout_ended;
}

bool tsc_process_stderr_writable_ended(void) {
    return g_stderr_ended;
}

bool tsc_process_stdio_is_tty(int fd) {
    return isatty(fd) == 1;
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

double tsc_set_immediate(tsc_immediate_fn_t fn, void* env) {
    if (!fn) return 0.0;
    if (g_immediate_len == g_immediate_cap) {
        size_t next = g_immediate_cap ? g_immediate_cap * 2 : 8;
        tsc_immediate_entry_t* entries = (tsc_immediate_entry_t*)TSC_GC_REALLOC(g_immediate_queue, next * sizeof(tsc_immediate_entry_t));
        if (!entries) tsc_panic("setImmediate: out of memory");
        g_immediate_queue = entries;
        g_immediate_cap = next;
    }
    double id = g_next_timer_id++;
    g_immediate_queue[g_immediate_len++] = (tsc_immediate_entry_t){ fn, env, id, false };
    return id;
}

void tsc_clear_immediate(double id) {
    if (id <= 0.0) return;
    for (size_t i = 0; i < g_immediate_len; i++) {
        if (g_immediate_queue[i].id == id) {
            g_immediate_queue[i].canceled = true;
            return;
        }
    }
}

void tsc_drain_immediates(void) {
    size_t idx = 0;
    while (idx < g_immediate_len) {
        tsc_immediate_entry_t entry = g_immediate_queue[idx++];
        if (!entry.canceled && entry.fn) entry.fn(entry.env);
        tsc_process_drain_next_ticks();
        tsc_drain_microtasks();
    }
    g_immediate_len = 0;
}

double tsc_set_timeout(tsc_timeout_fn_t fn, void* env) {
    if (!fn) return 0.0;
    if (g_timeout_len == g_timeout_cap) {
        size_t next = g_timeout_cap ? g_timeout_cap * 2 : 8;
        tsc_timeout_entry_t* entries = (tsc_timeout_entry_t*)TSC_GC_REALLOC(g_timeout_queue, next * sizeof(tsc_timeout_entry_t));
        if (!entries) tsc_panic("setTimeout: out of memory");
        g_timeout_queue = entries;
        g_timeout_cap = next;
    }
    double id = g_next_timer_id++;
    g_timeout_queue[g_timeout_len++] = (tsc_timeout_entry_t){ fn, env, id, false, false };
    return id;
}

double tsc_set_interval(tsc_timeout_fn_t fn, void* env) {
    if (!fn) return 0.0;
    if (g_timeout_len == g_timeout_cap) {
        size_t next = g_timeout_cap ? g_timeout_cap * 2 : 8;
        tsc_timeout_entry_t* entries = (tsc_timeout_entry_t*)TSC_GC_REALLOC(g_timeout_queue, next * sizeof(tsc_timeout_entry_t));
        if (!entries) tsc_panic("setInterval: out of memory");
        g_timeout_queue = entries;
        g_timeout_cap = next;
    }
    double id = g_next_timer_id++;
    g_timeout_queue[g_timeout_len++] = (tsc_timeout_entry_t){ fn, env, id, false, true };
    return id;
}

void tsc_clear_timeout(double id) {
    if (id <= 0.0) return;
    for (size_t i = 0; i < g_timeout_len; i++) {
        if (g_timeout_queue[i].id == id) {
            g_timeout_queue[i].canceled = true;
        }
    }
}

void tsc_drain_timeouts(void) {
    size_t idx = 0;
    while (idx < g_timeout_len) {
        tsc_timeout_entry_t entry = g_timeout_queue[idx++];
        if (!entry.canceled && entry.fn) {
            entry.fn(entry.env);
            if (entry.is_interval && !g_timeout_queue[idx - 1].canceled) {
                if (g_timeout_len == g_timeout_cap) {
                    size_t next = g_timeout_cap ? g_timeout_cap * 2 : 8;
                    tsc_timeout_entry_t* entries = (tsc_timeout_entry_t*)TSC_GC_REALLOC(g_timeout_queue, next * sizeof(tsc_timeout_entry_t));
                    if (!entries) tsc_panic("setInterval reschedule: out of memory");
                    g_timeout_queue = entries;
                    g_timeout_cap = next;
                }
                g_timeout_queue[g_timeout_len++] = (tsc_timeout_entry_t){ entry.fn, entry.env, entry.id, false, true };
            }
        }
        tsc_process_drain_next_ticks();
        tsc_drain_microtasks();
    }
    g_timeout_len = 0;
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
