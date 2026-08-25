#include "tsc_internal.h"

static tsc_jsonbuf_t g_test262_stdout;
static bool g_test262_started = false;

static tsc_value_t test262_host_gc(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
    (void)args;
#ifdef TSC_NO_GC
    tsc_throw_error(TSC_ERROR_ERROR, tsc_str_from_cstr("garbage collection is unavailable in this runtime build"));
#else
    GC_gcollect();
#endif
    return tsc_value_undefined();
}

tsc_value_t tsc_test262_host_object(void) {
    static tsc_object_t* host = NULL;
    if (!host) {
        tsc_value_t global = tsc_global_object();
        tsc_runtime_lock();
        if (!host) {
            tsc_object_t* object = tsc_object_new();
            (void)tsc_object_define_desc(
                object,
                tsc_str_from_lit("global", 6),
                global,
                true,
                true,
                true,
                false,
                true,
                true,
                true
            );
            (void)tsc_object_define_desc(
                object,
                tsc_str_from_lit("gc", 2),
                tsc_value_function_builtin_named(
                    test262_host_gc,
                    NULL,
                    0.0,
                    tsc_str_from_lit("gc", 2)
                ),
                true,
                true,
                true,
                false,
                true,
                true,
                true
            );
            host = object;
        }
        tsc_runtime_unlock();
    }
    return tsc_value_object(host);
}

static void append_literal(tsc_jsonbuf_t* out, const char* value) {
    tsc_jsonbuf_append(out, value, strlen(value));
}

static void append_json_cstr(tsc_jsonbuf_t* out, const char* value) {
    tsc_jsonbuf_str(out, tsc_str_from_cstr(value ? value : ""));
}

static bool string_equals_literal(const tsc_str_t* value, const char* literal) {
    size_t length = strlen(literal);
    return value && value->len == length && memcmp(value->data, literal, length) == 0;
}

static tsc_str_t* error_constructor_name(tsc_value_t error) {
    if (tsc_util_types_is_native_error(error)) {
        tsc_error_t* native_error = tsc_value_as_error(error);
        return native_error ? native_error->name : NULL;
    }
    if (!tsc_value_is_object(error)) return NULL;

    tsc_try_frame_t frame;
    tsc_try_push(&frame);
    if (setjmp(frame.jb) != 0) {
        tsc_try_pop();
        return NULL;
    }
    tsc_value_t constructor = tsc_value_get_prop(error, tsc_str_from_lit("constructor", 11));
    tsc_value_t name = tsc_value_get_prop(constructor, tsc_str_from_lit("name", 4));
    tsc_str_t* type = tsc_value_typeof(name);
    tsc_str_t* result = string_equals_literal(type, "string") ? tsc_value_as_string(name) : NULL;
    tsc_try_pop();
    return result;
}

static void append_stdout_field(tsc_jsonbuf_t* out) {
    if (!g_test262_started || g_test262_stdout.len == 0) return;
    append_literal(out, ",\"stdout\":");
    tsc_str_t value = {
        .len = g_test262_stdout.len,
        .data = g_test262_stdout.data,
        .hash = 0,
    };
    tsc_jsonbuf_str(out, &value);
}

static void write_json(tsc_jsonbuf_t* out) {
    tsc_str_t* json = tsc_jsonbuf_finish(out);
    if (json->len > 0) fwrite(json->data, 1, json->len, stdout);
    fputc('\n', stdout);
}

static void write_throw_with_name(
    const char* scenario_id,
    const char* origin,
    const tsc_str_t* constructor_name
) {
    tsc_jsonbuf_t out;
    tsc_jsonbuf_init(&out);
    append_literal(&out, "{\"protocolVersion\":4,\"scenarioId\":");
    append_json_cstr(&out, scenario_id);
    append_literal(&out, ",\"kind\":\"throw\",\"phase\":\"runtime\",\"origin\":");
    append_json_cstr(&out, origin);
    append_literal(&out, ",\"errorConstructor\":");
    if (constructor_name) tsc_jsonbuf_str(&out, constructor_name);
    else append_literal(&out, "null");
    append_stdout_field(&out);
    tsc_jsonbuf_byte(&out, '}');
    write_json(&out);
}

static bool line_equals(const char* line, size_t length, const char* expected) {
    size_t expected_length = strlen(expected);
    return length == expected_length && memcmp(line, expected, length) == 0;
}

typedef struct {
    size_t completions;
    size_t failures;
    const char* failure_name;
    size_t failure_name_length;
} async_markers_t;

static async_markers_t scan_async_markers(void) {
    async_markers_t markers = {0};
    if (!g_test262_started) return markers;
    const char* complete = "Test262:AsyncTestComplete";
    const char* failure = "Test262:AsyncTestFailure:";
    size_t failure_prefix_length = strlen(failure);
    size_t offset = 0;
    while (offset < g_test262_stdout.len) {
        size_t end = offset;
        while (end < g_test262_stdout.len && g_test262_stdout.data[end] != '\n') end++;
        const char* line = g_test262_stdout.data + offset;
        size_t length = end - offset;
        if (line_equals(line, length, complete)) {
            markers.completions++;
        } else if (length > failure_prefix_length && memcmp(line, failure, failure_prefix_length) == 0) {
            markers.failures++;
            const char* name = line + failure_prefix_length;
            const char* name_end = memchr(name, ':', length - failure_prefix_length);
            markers.failure_name = name;
            markers.failure_name_length = name_end ? (size_t)(name_end - name) : length - failure_prefix_length;
        }
        offset = end < g_test262_stdout.len ? end + 1 : end;
    }
    return markers;
}

void tsc_test262_begin(void) {
    tsc_jsonbuf_init(&g_test262_stdout);
    g_test262_started = true;
}

void tsc_test262_print_n(size_t n, ...) {
    if (!g_test262_started) tsc_test262_begin();
    va_list args;
    va_start(args, n);
    for (size_t index = 0; index < n; index++) {
        if (index > 0) tsc_jsonbuf_byte(&g_test262_stdout, ' ');
        tsc_value_t value = va_arg(args, tsc_value_t);
        tsc_str_t* text = tsc_value_to_string(value);
        if (text) tsc_jsonbuf_append(&g_test262_stdout, text->data, text->len);
    }
    va_end(args);
    tsc_jsonbuf_byte(&g_test262_stdout, '\n');
}

void tsc_test262_write_normal(const char* scenario_id, bool async_test) {
    async_markers_t markers = scan_async_markers();
    if (async_test && (markers.failures != 0 || markers.completions > 1)) {
        tsc_str_t duplicate = {
            .len = sizeof("Test262Error") - 1,
            .data = "Test262Error",
            .hash = 0,
        };
        tsc_str_t failure_name = {
            .len = markers.failure_name_length,
            .data = markers.failure_name,
            .hash = 0,
        };
        write_throw_with_name(
            scenario_id,
            "async-completion",
            markers.failures == 1 && markers.failure_name_length > 0 ? &failure_name : &duplicate
        );
        return;
    }

    tsc_jsonbuf_t out;
    tsc_jsonbuf_init(&out);
    append_literal(&out, "{\"protocolVersion\":4,\"scenarioId\":");
    append_json_cstr(&out, scenario_id);
    append_literal(&out, ",\"kind\":\"normal\"");
    if (async_test && markers.completions == 1) {
        append_literal(&out, ",\"asyncCompletion\":\"Test262:AsyncTestComplete\"");
    }
    append_stdout_field(&out);
    tsc_jsonbuf_byte(&out, '}');
    write_json(&out);
}

void tsc_test262_write_throw(const char* scenario_id, const char* origin, tsc_value_t error) {
    write_throw_with_name(scenario_id, origin, error_constructor_name(error));
}
