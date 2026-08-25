#include "tsc_internal.h"

tsc_function_identity_t* g_function_identities = NULL;

static tsc_realm_t* volatile g_default_realm = NULL;
static TSC_TLS tsc_realm_t* g_current_realm = NULL;

tsc_realm_t* tsc_realm_new(void) {
    return (tsc_realm_t*)TSC_GC_MALLOC(sizeof(tsc_realm_t));
}

tsc_realm_t* tsc_realm_current(void) {
    if (g_current_realm) return g_current_realm;
    tsc_realm_t* realm = g_default_realm;
    if (!realm) {
        tsc_runtime_lock();
        realm = g_default_realm;
        if (!realm) {
            realm = tsc_realm_new();
            g_default_realm = realm;
        }
        tsc_runtime_unlock();
    }
    g_current_realm = realm;
    return realm;
}

tsc_realm_t* tsc_realm_swap(tsc_realm_t* realm) {
    if (!realm) tsc_panic("cannot enter a null Realm");
    tsc_realm_t* previous = tsc_realm_current();
    g_current_realm = realm;
    return previous;
}

void* tsc_realm_state_get(const void* key) {
    if (!key) return NULL;
    for (tsc_realm_state_entry_t* entry = tsc_realm_current()->states;
         entry;
         entry = entry->next) {
        if (entry->key == key) return entry->value;
    }
    return NULL;
}

void tsc_realm_state_set(const void* key, void* value) {
    if (!key) tsc_panic("Realm state key is null");
    tsc_realm_t* realm = tsc_realm_current();
    for (tsc_realm_state_entry_t* entry = realm->states; entry; entry = entry->next) {
        if (entry->key != key) continue;
        entry->value = value;
        return;
    }
    tsc_realm_state_entry_t* entry =
        (tsc_realm_state_entry_t*)TSC_GC_MALLOC(sizeof(tsc_realm_state_entry_t));
    entry->key = key;
    entry->value = value;
    entry->next = realm->states;
    realm->states = entry;
}

tsc_value_t tsc_value_array(tsc_array_t* a) { return value_box(TSC_VALUE_TAG_ARRAY, (uintptr_t)a); }
tsc_value_t tsc_value_object(tsc_object_t* o) { return value_box(TSC_VALUE_TAG_OBJECT, (uintptr_t)o); }

void tsc_function_init_metadata(tsc_function_identity_t* entry, double length, tsc_str_t* name) {
    if (!entry) return;
    if (!name) name = tsc_str_from_lit("", 0);
    entry->is_html_dda = false;
    entry->has_prototype_property =
        entry->kind == TSC_FUNCTION_IDENTITY_GENERIC || entry->construct != NULL;
    entry->construct_allocates_receiver = entry->has_prototype_property;
    entry->length = length;
    entry->name = name;
    entry->props = tsc_object_new();
    tsc_object_define(entry->props, tsc_str_from_lit("length", 6), tsc_value_num(length), false, false, true);
    tsc_object_define(entry->props, tsc_str_from_lit("name", 4), tsc_value_string(name), false, false, true);
}

void tsc_function_identity_set_prototype(tsc_function_identity_t* entry, tsc_value_t prototype) {
    if (!entry) return;
    entry->prototype = prototype;
    entry->prototype_gc_root = tsc_value_gc_root(prototype);
}

void tsc_function_identity_set_own_prototype(tsc_function_identity_t* entry, tsc_value_t prototype) {
    if (!entry) return;
    entry->func_prototype = prototype;
    entry->func_prototype_gc_root = tsc_value_gc_root(prototype);
    entry->func_prototype_initialized = true;
}

typedef struct {
    tsc_function_identity_t* prototype_identity;
    tsc_function_identity_t* constructor_identity;
    int initialization_state;
} tsc_function_intrinsics_t;

static const char function_intrinsics_realm_state_key = 0;

static tsc_function_intrinsics_t* function_intrinsics_for_current_realm(void) {
    tsc_function_intrinsics_t* intrinsics =
        (tsc_function_intrinsics_t*)tsc_realm_state_get(
            &function_intrinsics_realm_state_key
        );
    if (intrinsics) return intrinsics;
    tsc_runtime_lock();
    intrinsics = (tsc_function_intrinsics_t*)tsc_realm_state_get(
        &function_intrinsics_realm_state_key
    );
    if (!intrinsics) {
        intrinsics = (tsc_function_intrinsics_t*)TSC_GC_MALLOC(
            sizeof(tsc_function_intrinsics_t)
        );
        memset(intrinsics, 0, sizeof(*intrinsics));
        tsc_realm_state_set(&function_intrinsics_realm_state_key, intrinsics);
    }
    tsc_runtime_unlock();
    return intrinsics;
}

static tsc_value_t function_prototype_call_body(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    (void)args;
    return tsc_value_undefined();
}

static tsc_value_t function_constructor_empty_body(
    void* env,
    tsc_value_t this_arg,
    tsc_array_t* args
) {
    (void)env;
    (void)this_arg;
    (void)args;
    return tsc_value_undefined();
}

static tsc_value_t function_constructor_body(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    if (!args || args->len == 0) {
        /* The empty source form has no runtime source uncertainty and can be
         * represented directly without a parser or semantic delegation. */
        tsc_value_t result = tsc_value_function_generic_named(
            function_constructor_empty_body,
            NULL,
            0.0,
            tsc_str_from_lit("anonymous", 9)
        );
        if (!tsc_value_is_undefined(tsc_value_current_new_target())) {
            tsc_function_identity_set_prototype(
                (tsc_function_identity_t*)value_ptr(result),
                tsc_value_get_prototype_of(this_arg)
            );
        }
        return result;
    }
#ifdef TSC_UNSAFE_EVAL
    return tsc_builtin_function(NULL, tsc_value_undefined(), args);
#else
    (void)args;
    tsc_throw_error(
        TSC_ERROR_EVAL,
        tsc_str_from_cstr("Function constructor source is unavailable in ahead-of-time execution")
    );
    return tsc_value_undefined();
#endif
}

static tsc_array_t* function_argument_tail(tsc_array_t* args, size_t start) {
    const size_t length = args && args->len > start ? args->len - start : 0;
    tsc_array_t* tail = tsc_array_new(sizeof(tsc_value_t), length ? length : 1);
    for (size_t i = 0; i < length; i++) {
        tsc_array_push_value(tail, TSC_ARR(tsc_value_t, args, start + i));
    }
    return tail;
}

static void function_prototype_require_callable(tsc_value_t value, const char* method) {
    if (tsc_value_is_callable(value)) return;
    tsc_str_t* prefix = tsc_str_from_lit("Function.prototype.", 19);
    tsc_str_t* name = tsc_str_from_cstr(method);
    tsc_throw_error(
        TSC_ERROR_TYPE,
        tsc_str_concat(tsc_str_concat(prefix, name), tsc_str_from_lit(" called on non-callable value", 29))
    );
}

static tsc_value_t function_prototype_call(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    function_prototype_require_callable(this_arg, "call");
    tsc_value_t receiver = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_undefined();
    return tsc_value_apply_function(
        this_arg,
        receiver,
        tsc_value_array(function_argument_tail(args, 1))
    );
}

static tsc_value_t function_prototype_apply(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    function_prototype_require_callable(this_arg, "apply");
    tsc_value_t receiver = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_undefined();
    tsc_value_t argument_list = args && args->len > 1
        ? TSC_ARR(tsc_value_t, args, 1)
        : tsc_value_undefined();
    if (tsc_value_is_nullish(argument_list)) {
        argument_list = tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 1));
    }
    return tsc_value_apply_function(this_arg, receiver, argument_list);
}

static tsc_value_t function_prototype_bind(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    function_prototype_require_callable(this_arg, "bind");
    tsc_value_t receiver = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_undefined();
    return tsc_value_bind_function(this_arg, receiver, function_argument_tail(args, 1));
}

static tsc_value_t function_prototype_to_string(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)args;
    function_prototype_require_callable(this_arg, "toString");
    tsc_value_t name_value = tsc_value_get_prop(this_arg, tsc_str_from_lit("name", 4));
    tsc_str_t* name = value_is_box(name_value) && value_tag(name_value) == TSC_VALUE_TAG_STRING
        ? tsc_value_as_string(name_value)
        : tsc_str_from_lit("", 0);
    tsc_str_t* source = tsc_str_concat(tsc_str_from_lit("function ", 9), name);
    source = tsc_str_concat(source, tsc_str_from_lit("() { [native code] }", 20));
    return tsc_value_string(source);
}

static void function_prototype_define_method(
    tsc_function_identity_t* prototype,
    const char* name,
    size_t name_len,
    double length,
    tsc_generic_function_t body
) {
    tsc_object_define(
        prototype->props,
        tsc_str_from_lit(name, name_len),
        tsc_value_function_builtin_named(body, NULL, length, tsc_str_from_lit(name, name_len)),
        true,
        false,
        true
    );
}

static tsc_function_intrinsics_t* ensure_function_intrinsics(void) {
    tsc_function_intrinsics_t* intrinsics = function_intrinsics_for_current_realm();
    if (intrinsics->initialization_state == 2) return intrinsics;
    tsc_runtime_lock();
    if (intrinsics->initialization_state == 0) {
        intrinsics->initialization_state = 1;

        intrinsics->prototype_identity = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
        intrinsics->constructor_identity = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
        memset(intrinsics->prototype_identity, 0, sizeof(*intrinsics->prototype_identity));
        memset(intrinsics->constructor_identity, 0, sizeof(*intrinsics->constructor_identity));

        intrinsics->prototype_identity->kind = TSC_FUNCTION_IDENTITY_BUILTIN;
        intrinsics->prototype_identity->realm = tsc_realm_current();
        intrinsics->prototype_identity->extensible = true;
        intrinsics->prototype_identity->func_prototype_writable = true;
        tsc_function_identity_set_prototype(intrinsics->prototype_identity, tsc_value_null());
        tsc_function_identity_set_own_prototype(intrinsics->prototype_identity, tsc_value_undefined());
        intrinsics->prototype_identity->code.generic = function_prototype_call_body;

        intrinsics->constructor_identity->kind = TSC_FUNCTION_IDENTITY_BUILTIN;
        intrinsics->constructor_identity->realm = tsc_realm_current();
        intrinsics->constructor_identity->construct_default_prototype =
            TSC_INTRINSIC_DEFAULT_FUNCTION_PROTOTYPE;
        intrinsics->constructor_identity->extensible = true;
        intrinsics->constructor_identity->func_prototype_writable = false;
        tsc_function_identity_set_prototype(intrinsics->constructor_identity, value_box(
            TSC_VALUE_TAG_FUNCTION,
            (uintptr_t)intrinsics->prototype_identity
        ));
        tsc_function_identity_set_own_prototype(
            intrinsics->constructor_identity,
            intrinsics->constructor_identity->prototype
        );
        intrinsics->constructor_identity->code.generic = function_constructor_body;
        intrinsics->constructor_identity->construct = function_constructor_body;

        intrinsics->prototype_identity->next = g_function_identities;
        g_function_identities = intrinsics->prototype_identity;
        intrinsics->constructor_identity->next = g_function_identities;
        g_function_identities = intrinsics->constructor_identity;

        tsc_function_init_metadata(
            intrinsics->prototype_identity,
            0.0,
            tsc_str_from_lit("", 0)
        );
        tsc_function_init_metadata(
            intrinsics->constructor_identity,
            1.0,
            tsc_str_from_lit("Function", 8)
        );

        tsc_function_identity_set_prototype(intrinsics->prototype_identity, tsc_value_object_prototype());
        const tsc_value_t prototype = value_box(
            TSC_VALUE_TAG_FUNCTION,
            (uintptr_t)intrinsics->prototype_identity
        );
        const tsc_value_t constructor = value_box(
            TSC_VALUE_TAG_FUNCTION,
            (uintptr_t)intrinsics->constructor_identity
        );
        tsc_object_define(
            intrinsics->prototype_identity->props,
            tsc_str_from_lit("constructor", 11),
            constructor,
            true,
            false,
            true
        );
        function_prototype_define_method(intrinsics->prototype_identity, "apply", 5, 2.0, function_prototype_apply);
        function_prototype_define_method(intrinsics->prototype_identity, "bind", 4, 1.0, function_prototype_bind);
        function_prototype_define_method(intrinsics->prototype_identity, "call", 4, 1.0, function_prototype_call);
        function_prototype_define_method(intrinsics->prototype_identity, "toString", 8, 0.0, function_prototype_to_string);

        tsc_function_identity_set_prototype(intrinsics->constructor_identity, prototype);
        tsc_function_identity_set_own_prototype(intrinsics->constructor_identity, prototype);
        intrinsics->initialization_state = 2;
    }
    tsc_runtime_unlock();
    return intrinsics;
}

tsc_value_t tsc_function_default_prototype(void) {
    tsc_function_intrinsics_t* intrinsics = ensure_function_intrinsics();
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)intrinsics->prototype_identity);
}

tsc_value_t tsc_function_constructor_value(void) {
    tsc_function_intrinsics_t* intrinsics = ensure_function_intrinsics();
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)intrinsics->constructor_identity);
}

tsc_value_t value_event_listener_identity(tsc_event_listener_fn_t fn, void* env, void* identity) {
    if (!identity) return tsc_value_undefined();
    tsc_realm_t* realm = tsc_realm_current();
    for (tsc_function_identity_t* cur = g_function_identities; cur; cur = cur->next) {
        if (
            cur->kind == TSC_FUNCTION_IDENTITY_EVENT_LISTENER &&
            cur->code.event_listener.fn == fn &&
            cur->code.event_listener.identity == identity &&
            cur->realm == realm &&
            cur->env == env
        ) {
            return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)cur);
        }
    }
    tsc_function_identity_t* entry = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
    entry->kind = TSC_FUNCTION_IDENTITY_EVENT_LISTENER;
    entry->realm = realm;
    entry->extensible = true;
    entry->sealed = false;
    entry->frozen = false;
    entry->func_prototype_writable = true;
    tsc_function_identity_set_prototype(entry, tsc_function_default_prototype());
    tsc_function_identity_set_own_prototype(entry, tsc_value_undefined());
    entry->construct = NULL;
    tsc_function_init_metadata(entry, 0.0, tsc_str_from_lit("", 0));
    entry->code.event_listener.fn = fn;
    entry->code.event_listener.identity = identity;
    entry->env = env;
    entry->next = g_function_identities;
    g_function_identities = entry;
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)entry);
}

tsc_value_t value_event_raw_listener_identity(tsc_event_listener_fn_t fn, void* env, void* identity, uint64_t order, bool once) {
    if (!once) return value_event_listener_identity(fn, env, identity);
    if (!identity) return tsc_value_undefined();
    tsc_realm_t* realm = tsc_realm_current();
    for (tsc_function_identity_t* cur = g_function_identities; cur; cur = cur->next) {
        if (
            cur->kind == TSC_FUNCTION_IDENTITY_EVENT_RAW_LISTENER &&
            cur->code.event_raw_identity.fn == fn &&
            cur->code.event_raw_identity.identity == identity &&
            cur->code.event_raw_identity.order == order &&
            cur->realm == realm &&
            cur->env == env
        ) {
            return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)cur);
        }
    }
    tsc_function_identity_t* entry = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
    entry->kind = TSC_FUNCTION_IDENTITY_EVENT_RAW_LISTENER;
    entry->realm = realm;
    entry->extensible = true;
    entry->sealed = false;
    entry->frozen = false;
    entry->func_prototype_writable = true;
    tsc_function_identity_set_prototype(entry, tsc_function_default_prototype());
    tsc_function_identity_set_own_prototype(entry, tsc_value_undefined());
    entry->construct = NULL;
    tsc_function_init_metadata(entry, 0.0, tsc_str_from_lit("", 0));
    entry->code.event_raw_identity.fn = fn;
    entry->code.event_raw_identity.identity = identity;
    entry->code.event_raw_identity.order = order;
    entry->env = env;
    entry->next = g_function_identities;
    g_function_identities = entry;
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)entry);
}

int tsc_argc;
char** tsc_argv;

#ifdef TSC_NO_GC
#ifdef TSC_THREADS
#include <pthread.h>
#endif
typedef struct tsc_no_gc_chunk {
    struct tsc_no_gc_chunk* next;
    size_t cap;
    size_t used;
    unsigned char data[];
} tsc_no_gc_chunk_t;

static tsc_no_gc_chunk_t* tsc_no_gc_chunks = NULL;
#ifdef TSC_THREADS
static pthread_mutex_t tsc_no_gc_chunks_mutex = PTHREAD_MUTEX_INITIALIZER;
#endif

void* tsc_no_gc_malloc_uninit(size_t n) {
#ifdef TSC_THREADS
    pthread_mutex_lock(&tsc_no_gc_chunks_mutex);
#endif
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
#ifdef TSC_THREADS
    pthread_mutex_unlock(&tsc_no_gc_chunks_mutex);
#endif
    return p;
}
#endif

#ifdef TSC_THREADS
#include <pthread.h>

static pthread_t g_main_thread;
static bool g_main_thread_set = false;
static pthread_mutex_t g_runtime_mutex;
static pthread_mutex_t g_loop_mutex = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t g_loop_cond = PTHREAD_COND_INITIALIZER;

/* Cross-thread posts from dispatch workers to the main event loop. The entry
 * buffer is GC-allocated and rooted by a static, and boxed values keep a raw
 * `keepalive` pointer copy so the conservative collector can see the payload
 * (NaN-boxed words are not recognized as pointers during scanning). */
typedef enum {
    TSC_CROSS_SETTLE,
    TSC_CROSS_MICROTASK,
    TSC_CROSS_NEXT_TICK,
    TSC_CROSS_IMMEDIATE,
    TSC_CROSS_TIMEOUT,
} tsc_cross_kind_t;
typedef struct {
    tsc_cross_kind_t kind;
    tsc_promise_t* promise;
    tsc_value_t value;
    void* keepalive;
    bool is_error;
    void (*fn)(void*);
    void* env;
    double delay;
} tsc_cross_entry_t;
static tsc_cross_entry_t* g_cross_queue = NULL;
static size_t g_cross_len = 0;
static size_t g_cross_cap = 0;
/* Dispatch tasks scheduled but not yet settled on the main loop. */
static size_t g_dispatch_outstanding = 0;

void tsc_runtime_lock(void) { pthread_mutex_lock(&g_runtime_mutex); }
void tsc_runtime_unlock(void) { pthread_mutex_unlock(&g_runtime_mutex); }

bool tsc_is_main_thread(void) {
    return !g_main_thread_set || pthread_equal(pthread_self(), g_main_thread);
}

static void tsc_cross_post(tsc_cross_entry_t entry) {
    if (value_is_box(entry.value)) entry.keepalive = value_ptr(entry.value);
    pthread_mutex_lock(&g_loop_mutex);
    if (g_cross_len == g_cross_cap) {
        size_t next = g_cross_cap ? g_cross_cap * 2 : 8;
        tsc_cross_entry_t* entries = (tsc_cross_entry_t*)TSC_GC_REALLOC(g_cross_queue, next * sizeof(tsc_cross_entry_t));
        if (!entries) tsc_panic("dispatch: out of memory");
        g_cross_queue = entries;
        g_cross_cap = next;
    }
    g_cross_queue[g_cross_len++] = entry;
    pthread_cond_signal(&g_loop_cond);
    pthread_mutex_unlock(&g_loop_mutex);
}

void tsc_cross_post_settle(tsc_promise_t* p, tsc_value_t value, bool is_error) {
    tsc_cross_entry_t entry = {0};
    entry.kind = TSC_CROSS_SETTLE;
    entry.promise = p;
    entry.value = value;
    entry.is_error = is_error;
    tsc_cross_post(entry);
}

void tsc_dispatch_task_scheduled(void) {
    pthread_mutex_lock(&g_loop_mutex);
    g_dispatch_outstanding++;
    pthread_mutex_unlock(&g_loop_mutex);
}

static bool tsc_dispatch_pending(void) {
    pthread_mutex_lock(&g_loop_mutex);
    bool pending = g_dispatch_outstanding > 0 || g_cross_len > 0;
    pthread_mutex_unlock(&g_loop_mutex);
    return pending;
}

/* Runs on the main thread: move cross-posted work into the regular loop
 * queues and settle dispatch promises. */
static void tsc_drain_cross_queue(void) {
    for (;;) {
        pthread_mutex_lock(&g_loop_mutex);
        if (g_cross_len == 0) {
            pthread_mutex_unlock(&g_loop_mutex);
            return;
        }
        tsc_cross_entry_t entry = g_cross_queue[0];
        memmove(g_cross_queue, g_cross_queue + 1, (g_cross_len - 1) * sizeof(tsc_cross_entry_t));
        g_cross_len--;
        if (entry.kind == TSC_CROSS_SETTLE && g_dispatch_outstanding > 0) g_dispatch_outstanding--;
        pthread_mutex_unlock(&g_loop_mutex);
        switch (entry.kind) {
            case TSC_CROSS_SETTLE:
                if (entry.is_error) tsc_promise_reject_in_place(entry.promise, entry.value);
                else tsc_promise_fulfill_in_place(entry.promise, entry.value);
                break;
            case TSC_CROSS_MICROTASK: tsc_queue_microtask(entry.fn, entry.env); break;
            case TSC_CROSS_NEXT_TICK: tsc_process_next_tick(entry.fn, entry.env); break;
            case TSC_CROSS_IMMEDIATE: tsc_set_immediate(entry.fn, entry.env); break;
            case TSC_CROSS_TIMEOUT: tsc_set_timeout(entry.fn, entry.env, entry.delay); break;
        }
    }
}
#else
void tsc_runtime_lock(void) {}
void tsc_runtime_unlock(void) {}
bool tsc_is_main_thread(void) { return true; }
void tsc_cross_post_settle(tsc_promise_t* p, tsc_value_t value, bool is_error) {
    if (is_error) tsc_promise_reject_in_place(p, value);
    else tsc_promise_fulfill_in_place(p, value);
}
void tsc_dispatch_task_scheduled(void) {}
#endif

/* Exception state is thread-local in TSC_THREADS builds so dispatch tasks
 * get independent try/throw stacks; without TSC_THREADS this is a plain
 * static exactly as before. */
static TSC_TLS tsc_try_frame_t* g_try_top = NULL;
static TSC_TLS tsc_call_activation_t* g_call_activation_top = NULL;
static TSC_TLS tsc_str_t* g_current_error = NULL;
static TSC_TLS tsc_value_t g_current_error_value;
static TSC_TLS bool g_current_error_value_set = false;
static struct timespec g_boot_time;
static bool g_boot_time_set = false;
static bool g_dynamic_stats_enabled = false;
bool g_shape_diagnostics_enabled = false;
static uint64_t g_dynamic_stats[TSC_DYNAMIC_STAT_COUNT];
typedef struct {
    tsc_next_tick_fn_t fn;
    void* env;
    int depth;
} tsc_next_tick_entry_t;
static tsc_next_tick_entry_t* g_next_tick_queue = NULL;
static size_t g_next_tick_len = 0;
static size_t g_next_tick_cap = 0;
static int g_executing_next_tick_depth = 0;
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
    bool refed;
    double delay_ms;
    double trigger_ms;
} tsc_timeout_entry_t;
static tsc_timeout_entry_t* g_timeout_queue = NULL;
static size_t g_timeout_len = 0;
static size_t g_timeout_cap = 0;
static double g_next_timer_id = 1.0;

typedef struct {
    tsc_abort_callback_fn_t fn;
    void* env;
} tsc_abort_callback_t;

typedef struct {
    tsc_object_t* signal;
    tsc_object_t* controller;
    bool aborted;
    tsc_abort_callback_t* callbacks;
    size_t callback_len;
    size_t callback_cap;
    tsc_promise_t** promises;
    size_t promise_len;
    size_t promise_cap;
    double* timeout_ids;
    size_t timeout_len;
    size_t timeout_cap;
    double* immediate_ids;
    size_t immediate_len;
    size_t immediate_cap;
    tsc_value_t* listeners;
    size_t listener_len;
    size_t listener_cap;
} tsc_abort_controller_state_t;

static tsc_abort_controller_state_t* abort_signal_state(tsc_value_t signal) {
    if (!value_is_box(signal) || value_tag(signal) != TSC_VALUE_TAG_OBJECT) return NULL;
    tsc_object_t* object = (tsc_object_t*)value_ptr(signal);
    return object && object->class_ptr ? (tsc_abort_controller_state_t*)object->class_ptr : NULL;
}

tsc_value_t tsc_abort_error_value(void) {
    tsc_error_t* error = tsc_error_new_named(
        tsc_str_from_lit("AbortError", 10),
        tsc_str_from_lit("This operation was aborted", 26)
    );
    error->code = tsc_value_num(20.0);
    return tsc_value_error(error);
}

static tsc_value_t abort_controller_abort(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_abort_controller_state_t* state = (tsc_abort_controller_state_t*)env;
    if (!state || state->aborted) return tsc_value_undefined();
    state->aborted = true;
    tsc_value_t reason = args && args->len > 0
        ? TSC_ARR(tsc_value_t, args, 0)
        : tsc_value_undefined();
    if (tsc_value_is_undefined(reason)) reason = tsc_abort_error_value();
    tsc_object_set(state->signal, tsc_str_from_lit("aborted", 7), tsc_value_bool(true));
    tsc_object_set(state->signal, tsc_str_from_lit("reason", 6), reason);
    tsc_object_t* event = tsc_object_new();
    tsc_object_set(event, tsc_str_from_lit("type", 4), tsc_value_string(tsc_str_from_lit("abort", 5)));
    tsc_object_set(event, tsc_str_from_lit("target", 6), tsc_value_object(state->signal));
    tsc_array_t* event_args = tsc_array_new(sizeof(tsc_value_t), 1);
    tsc_value_t event_value = tsc_value_object(event);
    tsc_array_push_raw(event_args, &event_value);
    for (size_t i = 0; i < state->listener_len; i++) {
        if (tsc_value_is_callable(state->listeners[i])) {
            (void)tsc_value_apply_function(
                state->listeners[i],
                tsc_value_object(state->signal),
                tsc_value_array(event_args)
            );
        }
    }
    tsc_value_t onabort = tsc_value_get_prop(
        tsc_value_object(state->signal),
        tsc_str_from_lit("onabort", 7)
    );
    if (tsc_value_is_callable(onabort)) {
        (void)tsc_value_apply_function(
            onabort,
            tsc_value_object(state->signal),
            tsc_value_array(event_args)
        );
    }
    state->listener_len = 0;
    for (size_t i = 0; i < state->callback_len; i++) {
        if (state->callbacks[i].fn) {
            state->callbacks[i].fn(state->callbacks[i].env);
        }
    }
    state->callback_len = 0;
    for (size_t i = 0; i < state->promise_len; i++) {
        tsc_promise_reject_in_place(state->promises[i], reason);
    }
    state->promise_len = 0;
    for (size_t i = 0; i < state->timeout_len; i++) {
        tsc_clear_timeout(state->timeout_ids[i]);
    }
    state->timeout_len = 0;
    for (size_t i = 0; i < state->immediate_len; i++) {
        tsc_clear_immediate(state->immediate_ids[i]);
    }
    state->immediate_len = 0;
    return tsc_value_undefined();
}

static tsc_value_t abort_signal_add_event_listener(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_abort_controller_state_t* state = (tsc_abort_controller_state_t*)env;
    tsc_value_t type = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t listener = args && args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    if (!state || !tsc_str_eq(tsc_value_to_string(type), tsc_str_from_lit("abort", 5)) || !tsc_value_is_callable(listener)) {
        return tsc_value_undefined();
    }
    if (state->aborted) {
        tsc_object_t* event = tsc_object_new();
        tsc_object_set(event, tsc_str_from_lit("type", 4), tsc_value_string(tsc_str_from_lit("abort", 5)));
        tsc_array_t* event_args = tsc_array_new(sizeof(tsc_value_t), 1);
        tsc_value_t event_value = tsc_value_object(event);
        tsc_array_push_raw(event_args, &event_value);
        (void)tsc_value_apply_function(listener, tsc_value_object(state->signal), tsc_value_array(event_args));
        return tsc_value_undefined();
    }
    if (state->listener_len == state->listener_cap) {
        size_t next = state->listener_cap ? state->listener_cap * 2 : 4;
        state->listeners = (tsc_value_t*)TSC_GC_REALLOC(state->listeners, next * sizeof(tsc_value_t));
        state->listener_cap = next;
    }
    state->listeners[state->listener_len++] = listener;
    return tsc_value_undefined();
}

static tsc_value_t abort_signal_remove_event_listener(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    tsc_abort_controller_state_t* state = (tsc_abort_controller_state_t*)env;
    tsc_value_t type = args && args->len > 0 ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    tsc_value_t listener = args && args->len > 1 ? TSC_ARR(tsc_value_t, args, 1) : tsc_value_undefined();
    if (!state || !tsc_str_eq(tsc_value_to_string(type), tsc_str_from_lit("abort", 5))) {
        return tsc_value_undefined();
    }
    for (size_t i = 0; i < state->listener_len; i++) {
        if (tsc_value_object_is(state->listeners[i], listener)) {
            memmove(
                state->listeners + i,
                state->listeners + i + 1,
                (state->listener_len - i - 1) * sizeof(tsc_value_t)
            );
            state->listener_len--;
            break;
        }
    }
    return tsc_value_undefined();
}

static tsc_value_t abort_signal_throw_if_aborted(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)this_arg;
    (void)args;
    tsc_abort_controller_state_t* state = (tsc_abort_controller_state_t*)env;
    if (state && state->aborted) {
        tsc_value_t reason = tsc_value_get_prop(
            tsc_value_object(state->signal),
            tsc_str_from_lit("reason", 6)
        );
        tsc_throw_value(reason);
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_abort_controller_new(void) {
    tsc_abort_controller_state_t* state = (tsc_abort_controller_state_t*)TSC_GC_MALLOC(sizeof(tsc_abort_controller_state_t));
    state->signal = tsc_object_new_class(state);
    state->controller = NULL;
    state->aborted = false;
    state->callbacks = NULL;
    state->callback_len = 0;
    state->callback_cap = 0;
    state->promises = NULL;
    state->promise_len = 0;
    state->promise_cap = 0;
    state->timeout_ids = NULL;
    state->timeout_len = 0;
    state->timeout_cap = 0;
    state->immediate_ids = NULL;
    state->immediate_len = 0;
    state->immediate_cap = 0;
    state->listeners = NULL;
    state->listener_len = 0;
    state->listener_cap = 0;
    tsc_object_set(state->signal, tsc_str_from_lit("aborted", 7), tsc_value_bool(false));
    tsc_object_set(state->signal, tsc_str_from_lit("reason", 6), tsc_value_undefined());
    tsc_object_set(state->signal, tsc_str_from_lit("onabort", 7), tsc_value_undefined());
    tsc_object_set(
        state->signal,
        tsc_str_from_lit("throwIfAborted", 14),
        tsc_value_function_builtin_named(
            abort_signal_throw_if_aborted,
            state,
            0.0,
            tsc_str_from_lit("throwIfAborted", 14)
        )
    );
    tsc_object_set(
        state->signal,
        tsc_str_from_lit("addEventListener", 16),
        tsc_value_function_builtin_named(
            abort_signal_add_event_listener,
            state,
            2.0,
            tsc_str_from_lit("addEventListener", 16)
        )
    );
    tsc_object_set(
        state->signal,
        tsc_str_from_lit("removeEventListener", 19),
        tsc_value_function_builtin_named(
            abort_signal_remove_event_listener,
            state,
            2.0,
            tsc_str_from_lit("removeEventListener", 19)
        )
    );

    tsc_object_t* controller = tsc_object_new();
    tsc_object_set(controller, tsc_str_from_lit("signal", 6), tsc_value_object(state->signal));
    tsc_object_set(
        controller,
        tsc_str_from_lit("abort", 5),
        tsc_value_function_builtin_named(
            abort_controller_abort,
            state,
            0.0,
            tsc_str_from_lit("abort", 5)
        )
    );
    state->controller = controller;
    return tsc_value_object(controller);
}

bool tsc_abort_signal_is_aborted(tsc_value_t signal) {
    tsc_abort_controller_state_t* state = abort_signal_state(signal);
    return state ? state->aborted : false;
}

void tsc_abort_signal_add_callback(tsc_value_t signal, tsc_abort_callback_fn_t fn, void* env) {
    if (!fn) return;
    tsc_abort_controller_state_t* state = abort_signal_state(signal);
    if (!state) return;
    if (state->aborted) {
        fn(env);
        return;
    }
    if (state->callback_len == state->callback_cap) {
        size_t next = state->callback_cap ? state->callback_cap * 2 : 4;
        state->callbacks = (tsc_abort_callback_t*)TSC_GC_REALLOC(state->callbacks, next * sizeof(tsc_abort_callback_t));
        state->callback_cap = next;
    }
    state->callbacks[state->callback_len].fn = fn;
    state->callbacks[state->callback_len].env = env;
    state->callback_len++;
}

void tsc_abort_signal_add_promise(tsc_value_t signal, tsc_promise_t* promise) {
    if (!promise) return;
    tsc_abort_controller_state_t* state = abort_signal_state(signal);
    if (!state) return;
    if (state->aborted) {
        tsc_promise_reject_in_place(promise, tsc_value_get_prop(tsc_value_object(state->signal), tsc_str_from_lit("reason", 6)));
        return;
    }
    if (state->promise_len == state->promise_cap) {
        size_t next = state->promise_cap ? state->promise_cap * 2 : 4;
        state->promises = (tsc_promise_t**)TSC_GC_REALLOC(state->promises, next * sizeof(tsc_promise_t*));
        state->promise_cap = next;
    }
    state->promises[state->promise_len++] = promise;
}

void tsc_abort_signal_add_timeout(tsc_value_t signal, double timeout_id) {
    if (timeout_id <= 0.0) return;
    tsc_abort_controller_state_t* state = abort_signal_state(signal);
    if (!state) return;
    if (state->aborted) {
        tsc_clear_timeout(timeout_id);
        return;
    }
    if (state->timeout_len == state->timeout_cap) {
        size_t next = state->timeout_cap ? state->timeout_cap * 2 : 4;
        state->timeout_ids = (double*)TSC_GC_REALLOC(state->timeout_ids, next * sizeof(double));
        state->timeout_cap = next;
    }
    state->timeout_ids[state->timeout_len++] = timeout_id;
}

void tsc_abort_signal_add_immediate(tsc_value_t signal, double immediate_id) {
    if (immediate_id <= 0.0) return;
    tsc_abort_controller_state_t* state = abort_signal_state(signal);
    if (!state) return;
    if (state->aborted) {
        tsc_clear_immediate(immediate_id);
        return;
    }
    if (state->immediate_len == state->immediate_cap) {
        size_t next = state->immediate_cap ? state->immediate_cap * 2 : 4;
        state->immediate_ids = (double*)TSC_GC_REALLOC(state->immediate_ids, next * sizeof(double));
        state->immediate_cap = next;
    }
    state->immediate_ids[state->immediate_len++] = immediate_id;
}

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
    return s && !s->symbol_key && s->len == n && memcmp(s->data, lit, n) == 0;
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
#ifdef TSC_THREADS
#ifndef TSC_NO_GC
    GC_allow_register_threads();
#endif
    g_main_thread = pthread_self();
    g_main_thread_set = true;
    /* Recursive: lazy-singleton init paths re-enter through shape creation. */
    pthread_mutexattr_t attr;
    pthread_mutexattr_init(&attr);
    pthread_mutexattr_settype(&attr, PTHREAD_MUTEX_RECURSIVE);
    pthread_mutex_init(&g_runtime_mutex, &attr);
    pthread_mutexattr_destroy(&attr);
#endif
    tsc_argc = argc;
    tsc_argv = argv;
    const char* dynamic_stats = getenv("TSC_DYNAMIC_STATS");
    if (dynamic_stats && dynamic_stats[0] != '\0' && strcmp(dynamic_stats, "0") != 0) {
        g_dynamic_stats_enabled = true;
        atexit(tsc_dynamic_stats_report);
    }
    const char* shape_diags = getenv("TSC_SHAPE_DIAGNOSTICS");
    if (shape_diags && shape_diags[0] != '\0' && strcmp(shape_diags, "0") != 0) {
        g_shape_diagnostics_enabled = true;
    }
    srand((unsigned)time(NULL));
    if (clock_gettime(CLOCK_MONOTONIC, &g_boot_time) == 0) {
        g_boot_time_set = true;
    }
    (void)tsc_realm_current();
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

static double process_stdio_terminal_size(int fd, bool columns) {
#if defined(TIOCGWINSZ)
    struct winsize size;
    if (isatty(fd) == 1 && ioctl(fd, TIOCGWINSZ, &size) == 0) {
        unsigned short value = columns ? size.ws_col : size.ws_row;
        if (value > 0) return (double)value;
    }
#else
    (void)fd;
#endif
    return columns ? 80.0 : 24.0;
}

double tsc_process_stdio_columns(int fd) {
    return process_stdio_terminal_size(fd, true);
}

double tsc_process_stdio_rows(int fd) {
    return process_stdio_terminal_size(fd, false);
}

void tsc_process_next_tick(tsc_next_tick_fn_t fn, void* env) {
    if (!fn) return;
#ifdef TSC_THREADS
    if (!tsc_is_main_thread()) {
        tsc_cross_entry_t entry = {0};
        entry.kind = TSC_CROSS_NEXT_TICK;
        entry.value = tsc_value_undefined();
        entry.fn = fn;
        entry.env = env;
        tsc_cross_post(entry);
        return;
    }
#endif
    if (g_next_tick_len == g_next_tick_cap) {
        size_t next = g_next_tick_cap ? g_next_tick_cap * 2 : 8;
        tsc_next_tick_entry_t* entries = (tsc_next_tick_entry_t*)TSC_GC_REALLOC(g_next_tick_queue, next * sizeof(tsc_next_tick_entry_t));
        if (!entries) tsc_panic("process.nextTick: out of memory");
        g_next_tick_queue = entries;
        g_next_tick_cap = next;
    }
    int depth = g_executing_next_tick_depth + 1;
    if (depth > 1000) {
        tsc_throw_str(tsc_str_from_cstr("process.nextTick starvation: maximum recursion depth exceeded"));
    }
    g_next_tick_queue[g_next_tick_len++] = (tsc_next_tick_entry_t){ fn, env, depth };
}

void tsc_process_drain_next_ticks(void) {
    size_t idx = 0;
    int old_executing_depth = g_executing_next_tick_depth;
    while (idx < g_next_tick_len) {
        tsc_next_tick_entry_t entry = g_next_tick_queue[idx++];
        if (entry.fn) {
            g_executing_next_tick_depth = entry.depth;
            entry.fn(entry.env);
        }
    }
    g_executing_next_tick_depth = old_executing_depth;
    g_next_tick_len = 0;
}

void tsc_queue_microtask(tsc_microtask_fn_t fn, void* env) {
    if (!fn) return;
#ifdef TSC_THREADS
    if (!tsc_is_main_thread()) {
        tsc_cross_entry_t entry = {0};
        entry.kind = TSC_CROSS_MICROTASK;
        entry.value = tsc_value_undefined();
        entry.fn = fn;
        entry.env = env;
        tsc_cross_post(entry);
        return;
    }
#endif
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

void tsc_drain_microtasks_and_next_ticks(void) {
    while (g_next_tick_len > 0 || g_microtask_len > 0) {
        if (g_next_tick_len > 0) {
            tsc_process_drain_next_ticks();
        } else {
            tsc_drain_microtasks();
        }
    }
}

double tsc_set_immediate(tsc_immediate_fn_t fn, void* env) {
    if (!fn) return 0.0;
#ifdef TSC_THREADS
    if (!tsc_is_main_thread()) {
        tsc_cross_entry_t entry = {0};
        entry.kind = TSC_CROSS_IMMEDIATE;
        entry.value = tsc_value_undefined();
        entry.fn = fn;
        entry.env = env;
        tsc_cross_post(entry);
        return 0.0;
    }
#endif
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
    size_t count = g_immediate_len;
    size_t idx = 0;
    while (idx < count) {
        tsc_immediate_entry_t entry = g_immediate_queue[idx++];
        if (!g_immediate_queue[idx - 1].canceled && entry.fn) {
            entry.fn(entry.env);
        }
        tsc_drain_microtasks_and_next_ticks();
    }
    if (g_immediate_len > count) {
        size_t remaining = g_immediate_len - count;
        memmove(g_immediate_queue, g_immediate_queue + count, remaining * sizeof(tsc_immediate_entry_t));
        g_immediate_len = remaining;
    } else {
        g_immediate_len = 0;
    }
}

static double tsc_now_ms(void) {
    return tsc_process_uptime() * 1000.0;
}

static double tsc_timer_delay_ms(double delay) {
    if (isnan(delay) || delay < 0.0) return 0.0;
    if (isinf(delay) || delay > 2147483647.0) return 1.0;
    return delay;
}

static bool tsc_timeout_ready(const tsc_timeout_entry_t* entry, double now_ms) {
    return entry->trigger_ms <= now_ms;
}

double tsc_set_timeout(tsc_timeout_fn_t fn, void* env, double delay) {
    if (!fn) return 0.0;
#ifdef TSC_THREADS
    if (!tsc_is_main_thread()) {
        tsc_cross_entry_t entry = {0};
        entry.kind = TSC_CROSS_TIMEOUT;
        entry.value = tsc_value_undefined();
        entry.fn = fn;
        entry.env = env;
        entry.delay = delay;
        tsc_cross_post(entry);
        return 0.0;
    }
#endif
    if (g_timeout_len == g_timeout_cap) {
        size_t next = g_timeout_cap ? g_timeout_cap * 2 : 8;
        tsc_timeout_entry_t* entries = (tsc_timeout_entry_t*)TSC_GC_REALLOC(g_timeout_queue, next * sizeof(tsc_timeout_entry_t));
        if (!entries) tsc_panic("setTimeout: out of memory");
        g_timeout_queue = entries;
        g_timeout_cap = next;
    }
    double id = g_next_timer_id++;
    double delay_ms = tsc_timer_delay_ms(delay);
    g_timeout_queue[g_timeout_len++] = (tsc_timeout_entry_t){ fn, env, id, false, false, true, delay_ms, tsc_now_ms() + delay_ms };
    return id;
}

double tsc_set_interval(tsc_timeout_fn_t fn, void* env, double delay) {
    if (!fn) return 0.0;
    if (g_timeout_len == g_timeout_cap) {
        size_t next = g_timeout_cap ? g_timeout_cap * 2 : 8;
        tsc_timeout_entry_t* entries = (tsc_timeout_entry_t*)TSC_GC_REALLOC(g_timeout_queue, next * sizeof(tsc_timeout_entry_t));
        if (!entries) tsc_panic("setInterval: out of memory");
        g_timeout_queue = entries;
        g_timeout_cap = next;
    }
    double id = g_next_timer_id++;
    double delay_ms = tsc_timer_delay_ms(delay);
    g_timeout_queue[g_timeout_len++] = (tsc_timeout_entry_t){ fn, env, id, false, true, true, delay_ms, tsc_now_ms() + delay_ms };
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

static void tsc_set_timeout_refed(double id, bool refed) {
    if (id <= 0.0) return;
    for (size_t i = 0; i < g_timeout_len; i++) {
        if (g_timeout_queue[i].id == id && !g_timeout_queue[i].canceled) {
            g_timeout_queue[i].refed = refed;
        }
    }
}

void tsc_ref_timeout(double id) {
    tsc_set_timeout_refed(id, true);
}

void tsc_unref_timeout(double id) {
    tsc_set_timeout_refed(id, false);
}

static void tsc_append_interval(const tsc_timeout_entry_t* entry) {
    if (g_timeout_len == g_timeout_cap) {
        size_t next = g_timeout_cap ? g_timeout_cap * 2 : 8;
        tsc_timeout_entry_t* entries = (tsc_timeout_entry_t*)TSC_GC_REALLOC(g_timeout_queue, next * sizeof(tsc_timeout_entry_t));
        if (!entries) tsc_panic("setInterval reschedule: out of memory");
        g_timeout_queue = entries;
        g_timeout_cap = next;
    }
    g_timeout_queue[g_timeout_len++] = (tsc_timeout_entry_t){
        entry->fn, entry->env, entry->id, false, true, entry->refed,
        entry->delay_ms, tsc_now_ms() + entry->delay_ms
    };
}

void tsc_drain_timeouts(void) {
    size_t count = g_timeout_len;
    size_t idx = 0;
    double now_ms = tsc_now_ms();
    while (idx < count) {
        tsc_timeout_entry_t entry = g_timeout_queue[idx++];
        if (!g_timeout_queue[idx - 1].canceled && entry.fn && tsc_timeout_ready(&entry, now_ms)) {
            entry.fn(entry.env);
            if (entry.is_interval && !g_timeout_queue[idx - 1].canceled) {
                entry.refed = g_timeout_queue[idx - 1].refed;
                tsc_append_interval(&entry);
            }
            g_timeout_queue[idx - 1].canceled = true;
        }
        tsc_drain_microtasks_and_next_ticks();
    }

    /* Zero-delay intervals that were rescheduled during this phase are due
     * before immediates get a turn. One-shot timers stay deferred so nested
     * setTimeout callbacks retain their existing phase ordering. */
    size_t interval_idx = count;
    while (interval_idx < g_timeout_len) {
        size_t current_idx = interval_idx++;
        tsc_timeout_entry_t entry = g_timeout_queue[current_idx];
        if (g_timeout_queue[current_idx].canceled || !entry.fn || !entry.is_interval ||
            !tsc_timeout_ready(&entry, tsc_now_ms())) {
            continue;
        }
        entry.fn(entry.env);
        if (!g_timeout_queue[current_idx].canceled) {
            entry.refed = g_timeout_queue[current_idx].refed;
            tsc_append_interval(&entry);
        }
        g_timeout_queue[current_idx].canceled = true;
        tsc_drain_microtasks_and_next_ticks();
    }

    size_t live = 0;
    for (size_t i = 0; i < g_timeout_len; i++) {
        if (!g_timeout_queue[i].canceled) {
            g_timeout_queue[live++] = g_timeout_queue[i];
        }
    }
    g_timeout_len = live;
}

static bool tsc_has_ready_timeout(void) {
    double now_ms = tsc_now_ms();
    for (size_t i = 0; i < g_timeout_len; i++) {
        if (!g_timeout_queue[i].canceled && g_timeout_queue[i].fn && tsc_timeout_ready(&g_timeout_queue[i], now_ms)) {
            return true;
        }
    }
    return false;
}

static bool tsc_has_active_timeout(void) {
    for (size_t i = 0; i < g_timeout_len; i++) {
        if (!g_timeout_queue[i].canceled && g_timeout_queue[i].fn && g_timeout_queue[i].refed) {
            return true;
        }
    }
    return false;
}

static double tsc_next_timeout_delay_ms(void) {
    double now_ms = tsc_now_ms();
    double delay = -1.0;
    for (size_t i = 0; i < g_timeout_len; i++) {
        if (g_timeout_queue[i].canceled || !g_timeout_queue[i].fn) continue;
        double candidate = g_timeout_queue[i].trigger_ms - now_ms;
        if (candidate < 0.0) candidate = 0.0;
        if (delay < 0.0 || candidate < delay) delay = candidate;
    }
    return delay;
}

#ifndef TSC_THREADS
static void tsc_sleep_ms(double delay_ms) {
    if (delay_ms <= 0.0) return;
    struct timespec ts;
    ts.tv_sec = (time_t)(delay_ms / 1000.0);
    ts.tv_nsec = (long)((delay_ms - ((double)ts.tv_sec * 1000.0)) * 1000000.0);
    nanosleep(&ts, NULL);
}
#endif

#ifdef TSC_THREADS
/* Wait until a worker posts cross-thread work or the next timer is due. */
static void tsc_loop_idle_wait(double delay_ms) {
    pthread_mutex_lock(&g_loop_mutex);
    if (g_cross_len == 0) {
        if (delay_ms < 0.0) {
            pthread_cond_wait(&g_loop_cond, &g_loop_mutex);
        } else if (delay_ms > 0.0) {
            struct timespec ts;
            clock_gettime(CLOCK_REALTIME, &ts);
            time_t sec = (time_t)(delay_ms / 1000.0);
            long nsec = (long)((delay_ms - (double)sec * 1000.0) * 1000000.0);
            ts.tv_sec += sec;
            ts.tv_nsec += nsec;
            if (ts.tv_nsec >= 1000000000L) { ts.tv_sec++; ts.tv_nsec -= 1000000000L; }
            pthread_cond_timedwait(&g_loop_cond, &g_loop_mutex, &ts);
        }
    }
    pthread_mutex_unlock(&g_loop_mutex);
}
#endif

void tsc_run_event_loop(void) {
    while (g_next_tick_len > 0 || g_microtask_len > 0 || tsc_has_active_timeout() || g_immediate_len > 0
#ifdef TSC_HAS_LIBUV
           || tsc_fs_libuv_pending()
#endif
#ifdef TSC_THREADS
           || tsc_dispatch_pending()
#endif
    ) {
#ifdef TSC_THREADS
        tsc_drain_cross_queue();
#endif
        tsc_drain_microtasks_and_next_ticks();
        if (tsc_has_ready_timeout()) {
            tsc_drain_timeouts();
            tsc_drain_microtasks_and_next_ticks();
        }
#ifdef TSC_HAS_LIBUV
        /* Give libuv filesystem completions a turn before immediates. With no
         * runtime timer pending, UV_RUN_ONCE may wait for the completion; this
         * preserves the existing ordering for a queued read while still
         * allowing a timer to make progress through UV_RUN_NOWAIT. */
        if (tsc_fs_libuv_pending()) {
            if (!tsc_has_active_timeout()) {
                while (tsc_fs_libuv_pending()) {
                    tsc_fs_libuv_run_once(true);
                    tsc_drain_microtasks_and_next_ticks();
                }
            } else {
                tsc_fs_libuv_run_once(false);
                tsc_drain_microtasks_and_next_ticks();
            }
        }
#endif
        if (g_immediate_len > 0) {
            tsc_drain_immediates();
            tsc_drain_microtasks_and_next_ticks();
        }
        if (g_next_tick_len == 0 && g_microtask_len == 0 && g_immediate_len == 0) {
#ifdef TSC_HAS_LIBUV
            if (tsc_fs_libuv_pending()) {
                if (!tsc_has_active_timeout()) {
                    while (tsc_fs_libuv_pending()) {
                        tsc_fs_libuv_run_once(true);
                        tsc_drain_microtasks_and_next_ticks();
                    }
                    continue;
                }
                tsc_fs_libuv_run_once(false);
                tsc_drain_microtasks_and_next_ticks();
                if (tsc_fs_libuv_pending()) {
#ifdef TSC_THREADS
                    tsc_loop_idle_wait(1.0);
#else
                    tsc_sleep_ms(1.0);
#endif
                }
            }
#endif
#ifdef TSC_THREADS
            if (tsc_dispatch_pending() || tsc_has_active_timeout()) {
                tsc_loop_idle_wait(tsc_has_active_timeout() ? tsc_next_timeout_delay_ms() : -1.0);
            }
#else
            if (tsc_has_active_timeout()) {
                tsc_sleep_ms(tsc_next_timeout_delay_ms());
            }
#endif
        }
    }
}

/* ---------------- exceptions ---------------- */

void tsc_call_activation_push(
    tsc_call_activation_t* activation,
    tsc_array_t* arguments,
    tsc_value_t this_arg,
    tsc_value_t callee
) {
    if (!activation) return;
    activation->prev = g_call_activation_top;
    activation->arguments = arguments
        ? arguments
        : tsc_array_new(sizeof(tsc_value_t), 1);
    activation->this_arg = this_arg;
    activation->callee = callee;
    activation->arguments_object = tsc_value_undefined();
    activation->parameter_cells = NULL;
    activation->strict = false;
    activation->arguments_object_initialized = false;
    g_call_activation_top = activation;
}

void tsc_call_activation_pop(tsc_call_activation_t* activation) {
    if (!activation || g_call_activation_top != activation) {
        tsc_panic("ordinary call activation stack mismatch");
    }
    g_call_activation_top = activation->prev;
}

void tsc_call_activation_configure(bool strict, tsc_array_t* parameter_cells) {
    if (!g_call_activation_top) {
        tsc_panic("ordinary function entered without a call activation");
    }
    g_call_activation_top->strict = strict;
    g_call_activation_top->parameter_cells = parameter_cells;
}

static tsc_value_t call_arguments_thrower(void* env, tsc_value_t receiver) {
    (void)env;
    (void)receiver;
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("restricted arguments property"));
}

static bool call_arguments_set_thrower(void* env, tsc_value_t receiver, tsc_value_t value) {
    (void)env;
    (void)receiver;
    (void)value;
    tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("restricted arguments property"));
}

tsc_value_t tsc_call_arguments(void) {
    tsc_call_activation_t* activation = g_call_activation_top;
    if (!activation) {
        tsc_throw_error(TSC_ERROR_REFERENCE, tsc_str_from_cstr("arguments is not defined"));
    }
    if (activation->arguments_object_initialized) return activation->arguments_object;

    tsc_object_t* object = tsc_object_new();
    object->is_arguments = true;
    object->arguments_parameter_cells = activation->strict
        ? NULL
        : activation->parameter_cells;
    tsc_array_t* arguments = activation->arguments;
    if (object->arguments_parameter_cells) {
        for (size_t index = arguments->len; index < object->arguments_parameter_cells->len; index++) {
            TSC_ARR(volatile tsc_value_t*, object->arguments_parameter_cells, index) = NULL;
        }
    }
    for (size_t index = 0; index < arguments->len; index++) {
        tsc_object_define(
            object,
            tsc_str_from_int((int64_t)index),
            TSC_ARR(tsc_value_t, arguments, index),
            true,
            true,
            true
        );
    }
    tsc_object_define(
        object,
        tsc_str_from_lit("length", 6),
        tsc_value_num((double)arguments->len),
        true,
        false,
        true
    );
    if (activation->strict) {
        tsc_object_define_accessor(
            object,
            tsc_str_from_lit("callee", 6),
            call_arguments_thrower,
            NULL,
            true,
            call_arguments_set_thrower,
            NULL,
            true,
            false,
            true,
            false,
            true
        );
    } else {
        tsc_object_define(
            object,
            tsc_str_from_lit("callee", 6),
            activation->callee,
            true,
            false,
            true
        );
    }
    activation->arguments_object = tsc_value_object(object);
    tsc_value_define_symbol_property_desc(
        activation->arguments_object,
        tsc_symbol_iterator(),
        tsc_array_prototype_symbol_value(tsc_symbol_iterator()),
        true,
        true,
        true,
        false,
        true,
        true,
        true
    );
    activation->arguments_object_initialized = true;
    return activation->arguments_object;
}

void tsc_try_push(tsc_try_frame_t* f) {
    f->prev = g_try_top;
    f->realm = tsc_realm_current();
    f->activation_top = g_call_activation_top;
    f->callee_top = tsc_value_callee_checkpoint();
    f->roots = (tsc_try_roots_t*)TSC_GC_MALLOC(sizeof(tsc_try_roots_t));
    f->active = true;
    g_try_top = f;
}

void tsc_try_pop(void) {
    if (!g_try_top) return;
    tsc_try_frame_t* frame = g_try_top;
    g_try_top = frame->prev;
    frame->active = false;
}

void tsc_try_cleanup(tsc_try_frame_t* frame) {
    if (!frame || !frame->active) return;
    if (g_try_top == frame) {
        g_try_top = frame->prev;
        frame->active = false;
        return;
    }
    /* Cleanup normally runs in reverse lexical order. Retain a fail-safe
     * unlink for a non-local C edge so no expired stack frame can remain in
     * the exception chain even if a future emitter violates that ordering. */
    for (tsc_try_frame_t* current = g_try_top; current; current = current->prev) {
        if (current->prev != frame) continue;
        current->prev = frame->prev;
        frame->active = false;
        return;
    }
    frame->active = false;
}

_Noreturn void tsc_throw_str(tsc_str_t* message) {
    g_current_error = message ? message : tsc_str_from_lit("(unknown error)", 15);
    g_current_error_value = tsc_value_string(g_current_error);
    g_current_error_value_set = true;
    if (g_try_top) {
        tsc_try_frame_t* f = g_try_top;
        f->roots->value = tsc_value_gc_root(g_current_error_value);
        f->roots->message = g_current_error;
        /* The setjmp landing path owns the matching tsc_try_pop().  Leaving
         * the frame installed until control lands keeps push/pop balanced;
         * popping here as well makes the handler discard its caller's frame
         * and can leave g_try_top pointing at an expired async stack frame. */
        g_call_activation_top = f->activation_top;
        tsc_value_callee_restore(f->callee_top);
        (void)tsc_realm_swap(f->realm);
        longjmp(f->jb, 1);
    }
    fputs("Uncaught: ", stderr);
    if (g_current_error) fwrite(g_current_error->data, 1, g_current_error->len, stderr);
    fputc('\n', stderr);
    exit(1);
}

_Noreturn void tsc_throw_value(tsc_value_t value) {
    g_current_error_value = value;
    g_current_error_value_set = true;
    g_current_error = tsc_value_to_string(value);
    if (!g_current_error) g_current_error = tsc_str_from_lit("(unknown error)", 15);
    if (g_try_top) {
        tsc_try_frame_t* f = g_try_top;
        f->roots->value = tsc_value_gc_root(g_current_error_value);
        f->roots->message = g_current_error;
        /* The setjmp landing path owns the matching tsc_try_pop(). */
        g_call_activation_top = f->activation_top;
        tsc_value_callee_restore(f->callee_top);
        (void)tsc_realm_swap(f->realm);
        longjmp(f->jb, 1);
    }
    fputs("Uncaught: ", stderr);
    if (g_current_error) fwrite(g_current_error->data, 1, g_current_error->len, stderr);
    fputc('\n', stderr);
    exit(1);
}

_Noreturn void tsc_rethrow(void) {
    if (g_current_error_value_set) tsc_throw_value(g_current_error_value);
    if (g_current_error) tsc_throw_str(g_current_error);
    exit(1);
}

tsc_str_t* tsc_current_error(void) {
    return g_current_error ? g_current_error : tsc_str_from_lit("(unknown error)", 15);
}

tsc_value_t tsc_current_error_value(void) {
    if (g_current_error_value_set) return g_current_error_value;
    return tsc_value_string(tsc_str_from_lit("(unknown error)", 15));
}
