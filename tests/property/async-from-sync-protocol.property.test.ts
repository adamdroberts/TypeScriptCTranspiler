import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { invokeCc } from "../../src/link/cc";

// Native ABI evidence for the wrapper, which async-generator integration will
// expose to source-language delegation. Expected observations follow the
// protocol's argument presence, completion and receiver contracts.
const driver = String.raw`#include "tsc_internal.h"
typedef struct {
    tsc_value_t iterator, error;
    void *iterator_root, *error_root;
    size_t arguments, calls, closes;
    int mode;
    bool receiver;
} subject_t;
static tsc_value_t result(tsc_value_t value, bool done) {
    void* volatile root = tsc_value_gc_root(value);
    tsc_object_t* object = tsc_object_new();
    tsc_object_set(object, tsc_str_from_lit("value", 5), value);
    tsc_object_set(object, tsc_str_from_lit("done", 4), tsc_value_bool(done));
    (void)root;
    return tsc_value_object(object);
}
static tsc_value_t self(void* env, tsc_value_t receiver, tsc_array_t* args) { return receiver; }
static tsc_value_t next(void* env, tsc_value_t receiver, tsc_array_t* args) {
    subject_t* state = env;
    state->arguments = args->len; state->calls++; state->receiver = receiver == state->iterator;
    if (state->mode == 1) tsc_throw_value(state->error);
    if (state->mode == 2) return result(tsc_value_promise(tsc_promise_reject(state->error)), false);
    return result(args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_num(7), false);
}
static tsc_value_t close_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    subject_t* state = env; state->closes++;
    if (state->mode == 3) tsc_throw_value(state->error);
    if (state->mode == 4) return tsc_value_num(17);
    return result(state->mode == 5 ? tsc_value_promise(tsc_promise_reject(state->error)) : tsc_value_num(9), false);
}
static tsc_iterator_record_t make(subject_t* state) {
    tsc_object_t* object = tsc_object_new();
    state->iterator = tsc_value_object(object); state->iterator_root = object;
    state->error = tsc_value_object(tsc_object_new()); state->error_root = tsc_value_gc_root(state->error);
    tsc_object_set(object, tsc_symbol_property_key(tsc_symbol_iterator()), tsc_value_function_builtin_named(self, NULL, 0, tsc_str_from_lit("self", 4)));
    tsc_object_set(object, tsc_str_from_lit("next", 4), tsc_value_function_builtin_named(next, state, 1, tsc_str_from_lit("next", 4)));
    tsc_object_set(object, tsc_str_from_lit("return", 6), tsc_value_function_builtin_named(close_apply, state, 1, tsc_str_from_lit("return", 6)));
    return tsc_async_iterator_open(state->iterator);
}
static tsc_promise_t* call(tsc_iterator_record_t* wrapper, const char* name, tsc_value_t receiver, size_t count) {
    tsc_value_t method = tsc_value_get_prop(wrapper->iterator, tsc_str_from_cstr(name));
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), count);
    for (size_t index = 0; index < count; ++index) tsc_array_push_value(args, tsc_value_undefined());
    tsc_promise_t* promise = tsc_value_as_promise(tsc_value_apply_function(method, receiver, tsc_value_array(args)));
#ifndef TSC_NO_GC
    GC_gcollect();
#endif
    tsc_drain_microtasks();
    return promise;
}
static bool type_error(tsc_promise_t* promise) {
    return tsc_promise_is_rejected(promise) && tsc_value_instanceof(tsc_promise_reason(promise), tsc_error_constructor_value(TSC_ERROR_TYPE));
}
int main(int argc, char** argv) {
    tsc_bootstrap(argc, argv);
    bool presence = true;
    const size_t argument_lists[] = { 0, 1, 17 }; /* absent, present, surplus */
    for (size_t index = 0; index < sizeof(argument_lists) / sizeof(*argument_lists); ++index) {
        size_t count = argument_lists[index];
        subject_t* state = TSC_GC_MALLOC(sizeof(*state)); *state = (subject_t){0};
        tsc_iterator_record_t wrapper = make(state);
        tsc_value_set_prop(state->iterator, tsc_str_from_lit("next", 4), tsc_value_undefined());
        tsc_promise_t* promise = call(&wrapper, "next", wrapper.iterator, count);
        presence = presence && tsc_promise_is_fulfilled(promise) && state->arguments == (count ? 1 : 0) && state->receiver;
    }
    printf("captured-next-argument-presence:%s\n", presence ? "true" : "false");
    subject_t* state = TSC_GC_MALLOC(sizeof(*state)); *state = (subject_t){0};
    tsc_iterator_record_t wrapper = make(state);
    printf("actual-receiver-brand:%s\n", type_error(call(&wrapper, "next", tsc_value_object(tsc_object_new()), 0)) ? "true" : "false");
    state->mode = 1;
    tsc_promise_t* promise = call(&wrapper, "next", wrapper.iterator, 0);
    printf("call-error-rejects-without-close:%s\n", tsc_promise_is_rejected(promise) && tsc_promise_reason(promise) == state->error && state->closes == 0 ? "true" : "false");
    state->mode = 2;
    promise = call(&wrapper, "next", wrapper.iterator, 0);
    printf("value-rejection-closes:%s\n", tsc_promise_is_rejected(promise) && tsc_promise_reason(promise) == state->error && state->closes == 1 ? "true" : "false");
    state->mode = 5; state->closes = 0;
    promise = call(&wrapper, "return", wrapper.iterator, 0);
    printf("return-rejection-skips-second-close:%s\n", tsc_promise_is_rejected(promise) && tsc_promise_reason(promise) == state->error && state->closes == 1 ? "true" : "false");
    bool missing_throw = true;
    for (int mode = 0; mode <= 4; ++mode) {
        state->mode = mode; state->closes = 0;
        promise = call(&wrapper, "throw", wrapper.iterator, 1);
        missing_throw = missing_throw && state->closes == 1 && (mode == 3
            ? tsc_promise_is_rejected(promise) && tsc_promise_reason(promise) == state->error : type_error(promise));
    }
    printf("missing-throw-close-precedence:%s\n", missing_throw ? "true" : "false");
    tsc_value_set_prop(state->iterator, tsc_str_from_lit("throw", 5), tsc_value_function_builtin_named(next, state, 1, tsc_str_from_lit("throw", 5)));
    state->mode = 2; state->closes = 0;
    promise = call(&wrapper, "throw", wrapper.iterator, 1);
    printf("throw-value-rejection-closes:%s\n", tsc_promise_is_rejected(promise) && tsc_promise_reason(promise) == state->error && state->closes == 1 ? "true" : "false");
    return 0;
}`;

test("async-from-sync protocol methods preserve presence, branding and rejection contracts", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-async-from-sync-"));
    const expected = ["captured-next-argument-presence", "actual-receiver-brand", "call-error-rejects-without-close",
        "value-rejection-closes", "return-rejection-skips-second-close", "missing-throw-close-precedence", "throw-value-rejection-closes"]
        .map(label => label + ":true").join("\n") + "\n";
    try {
        const entry = path.join(temporary, "empty.ts"), probe = path.join(temporary, "probe.c");
        await fs.writeFile(entry, ""); await fs.writeFile(probe, driver);
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", buildDir = path.join(temporary, name + "-build"), output = path.join(temporary, name);
            const diagnostics: string[] = [];
            const prepared = await compile({ entry, output, buildDir, noGc, emitCOnly: true, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(prepared.exitCode).toBe(0);
            const sources = (await fs.readdir(buildDir)).filter(file => file.endsWith(".c") && file !== "main.c").sort().map(file => path.join(buildDir, file));
            const linked = await invokeCc({ sources: [probe, ...sources], output, includeDirs: [buildDir],
                libs: [...(noGc ? [] : ["gc"]), "m", "resolv", "ssl", "crypto", "icui18n", "icuuc", "icudata", "gmp"],
                extraFlags: noGc ? ["-DTSC_NO_GC"] : [], stderrWriter: message => diagnostics.push(message) });
            expect({ exitCode: linked.exitCode, diagnostics: diagnostics.join("") }).toEqual({ exitCode: 0, diagnostics: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe(""); expect(native.stdout.toString()).toBe(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);
