import { expect, test } from "bun:test";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile, findDispatchLinkOptions } from "../../src/compile";
import { invokeCc } from "../../src/link/cc";

for (const threaded of [false, true]) {
    const sdk = findDispatchLinkOptions();
    (!threaded || sdk ? test : test.skip)(`dispatch retains actual normal and abrupt completion owners (${threaded})`, async () => {
        const root = await mkdtemp(join(tmpdir(), "tsc2c-dispatch-completion-"));
        try { for (const noGc of [false, true]) {
            const entry = join(root, "main.ts"), buildDir = join(root, `build-${noGc}`);
            await writeFile(entry, "export {}; new DispatchQueue('completion');\n");
            expect((await compile({ entry, output: join(root, "unused"), buildDir, noGc,
                dispatch: threaded ? "threaded" : "serial", emitCOnly: true })).exitCode).toBe(0);
            const driver = join(buildDir, "completion-driver.c");
            await writeFile(driver, String.raw`
#define _GNU_SOURCE
#define main generated_main
#include "main.c"
#undef main
#include "tsc_internal.h"
typedef struct { tsc_value_t value; void* root; bool abrupt; } input_t;
static size_t conversions;
static tsc_value_t convert(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)receiver; (void)args; ++conversions;
    return tsc_value_string(tsc_str_from_cstr("converted"));
}
static tsc_value_t complete(void* env) {
    input_t* input = env;
    if (input->abrupt) tsc_throw_value(input->value);
    return input->value;
}
static tsc_value_t fresh(void* env) {
    tsc_object_t* volatile object = tsc_object_new();
    tsc_object_t* volatile leaf = object;
    for (size_t depth = 0; depth < 1024; depth++) {
        tsc_object_t* child = tsc_object_new();
        tsc_object_define(leaf, tsc_str_from_lit("next", 4), tsc_value_object(child), true, true, true);
        leaf = child;
    }
    tsc_object_define(leaf, tsc_str_from_lit("value", 5), tsc_value_num(41), true, true, true);
    if (env) tsc_throw_value(tsc_value_object(object));
    return tsc_value_object(object);
}
static void verify_sync(tsc_dispatch_queue_t* queue, input_t* input) {
    TSC_TRY_FRAME(frame); tsc_try_push(&frame);
    if (!setjmp(frame.jb)) {
        tsc_value_t result = tsc_dispatch_sync(queue, complete, input);
        if (input->abrupt || result != input->value) abort();
        tsc_try_pop();
    } else {
        if (!input->abrupt || tsc_current_error_value() != input->value) abort();
        tsc_try_pop();
    }
}
static void verify(tsc_dispatch_queue_t* queue, tsc_value_t value, bool abrupt) {
    input_t* input = TSC_GC_MALLOC(sizeof(*input));
    *input = (input_t){ value, tsc_value_gc_root(value), abrupt };
    verify_sync(queue, input);
    tsc_promise_t* pending[] = {
        tsc_dispatch_async(queue, complete, input),
        tsc_dispatch_after(queue, complete, input, 0),
        tsc_dispatch_barrier(queue, complete, input)
    };
#ifndef TSC_NO_GC
    GC_gcollect();
#endif
    tsc_run_event_loop();
    for (size_t index = 0; index < sizeof(pending) / sizeof(*pending); index++)
        if (pending[index]->state != (abrupt ? TSC_PROMISE_REJECTED : TSC_PROMISE_FULFILLED) || pending[index]->result != value) abort();
}
int main(int argc, char** argv) {
    tsc_bootstrap(argc, argv); tsc_realm_current();
    tsc_object_t* volatile object = tsc_object_new();
    tsc_object_define(object, tsc_str_from_lit("toString", 8),
        tsc_value_function_builtin_named(convert, NULL, 0, tsc_str_from_cstr("toString")), true, true, true);
    tsc_dispatch_queue_t* queue = tsc_dispatch_queue_concurrent();
    tsc_value_t values[] = { tsc_value_undefined(), tsc_value_null(), tsc_value_bool(false),
        tsc_value_num(-0.0), tsc_value_num(NAN), tsc_value_string(tsc_str_from_cstr("sentinel")),
        tsc_value_symbol(tsc_symbol_new(NULL)), tsc_value_bigint(tsc_bigint_from_lit("9007199254740993")),
        tsc_value_object(object), tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 0)),
        tsc_value_error(tsc_error_new_named(tsc_str_from_cstr("TypeError"), tsc_str_from_cstr("sentinel"))),
        tsc_value_dispatch_queue(queue) };
    void* volatile roots[sizeof(values) / sizeof(*values)];
    for (size_t index = 0; index < sizeof(values) / sizeof(*values); index++) roots[index] = tsc_value_gc_root(values[index]);
    for (size_t index = 0; index < sizeof(values) / sizeof(*values); index++) for (int abrupt = 0; abrupt < 2; abrupt++) verify(queue, values[index], abrupt);
    for (int abrupt = 0; abrupt < 2; abrupt++) {
        tsc_promise_t* pending = tsc_dispatch_async(queue, fresh, abrupt ? queue : NULL);
        tsc_run_event_loop();
#ifndef TSC_NO_GC
        GC_gcollect();
#endif
        if (pending->state != (abrupt ? TSC_PROMISE_REJECTED : TSC_PROMISE_FULFILLED)) abort();
        tsc_value_t cursor = pending->result;
        for (size_t depth = 0; depth < 1024; depth++) cursor = tsc_value_get_prop(cursor, tsc_str_from_lit("next", 4));
        if (tsc_value_as_num(tsc_value_get_prop(cursor, tsc_str_from_lit("value", 5))) != 41) abort();
    }
    if (conversions) abort();
    (void)roots; puts("dispatch completion owners: true"); return 0;
}
`);
            const sources = (await readdir(buildDir)).filter(name => name.startsWith("tsc_") && name.endsWith(".c"));
            const output = join(root, `native-${noGc}`);
            const result = await invokeCc({ sources: [driver, ...sources.map(name => join(buildDir, name))], output,
                includeDirs: [buildDir, ...(threaded ? [sdk!.includeDir] : [])],
                libs: [...(noGc ? [] : ["gc"]), "m", "resolv", "ssl", "crypto", "icui18n", "icuuc", "icudata", "gmp"],
                extraFlags: [...(noGc ? ["-DTSC_NO_GC"] : []), ...(threaded ? ["-DTSC_THREADS", "-DGC_THREADS=1", "-pthread"] : ["-DTSC_DISPATCH_SERIAL"])],
                linkFlags: threaded ? [`-L${sdk!.libDir}`, "-ldispatch", `-Wl,-rpath,${sdk!.libDir}`] : [] });
            expect({ code: result.exitCode, stderr: result.exitCode ? result.stderr : "" }).toEqual({ code: 0, stderr: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 60_000 });
            expect({ code: native.exitCode, stdout: native.stdout.toString(), stderr: native.stderr.toString() })
                .toEqual({ code: 0, stdout: "dispatch completion owners: true\n", stderr: "" });
        } } finally { await rm(root, { recursive: true, force: true }); }
    }, 600_000);
}
