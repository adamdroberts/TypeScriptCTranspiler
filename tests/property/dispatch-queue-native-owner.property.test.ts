import { expect, test } from "bun:test";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile, findDispatchLinkOptions } from "../../src/compile";
import { invokeCc } from "../../src/link/cc";

for (const threaded of [false, true]) {
    const sdk = findDispatchLinkOptions();
    (!threaded || sdk ? test : test.skip)(`native queue owners retain handles through collection and Realm changes (${threaded})`, async () => {
        const root = await mkdtemp(join(tmpdir(), "tsc2c-native-queue-owner-"));
        try { for (const noGc of [false, true]) {
            const entry = join(root, "main.ts"), buildDir = join(root, `build-${noGc}`);
            await writeFile(entry, "export {}; new DispatchQueue('include-dispatch');\n");
            expect((await compile({ entry, output: join(root, "unused"), buildDir, noGc,
                dispatch: threaded ? "threaded" : "serial", emitCOnly: true })).exitCode).toBe(0);
            const driver = join(buildDir, "queue-owner-driver.c");
            await writeFile(driver, String.raw`
#define _GNU_SOURCE
#define main generated_main
#include "main.c"
#undef main
#include "tsc_dispatch.c"
typedef struct { tsc_value_t queue; void* root; size_t index; } item_t;
static size_t observed;
static tsc_value_t inspect(void* env) {
    item_t* item = env;
    tsc_dispatch_queue_t* queue = tsc_value_as_dispatch_queue(item->queue);
    if (!tsc_value_eq(item->queue, tsc_value_dispatch_queue(queue))) abort();
    if (item->index != observed++) abort();
    return tsc_value_num((double)item->index);
}
static void exercise(size_t length) {
    tsc_dispatch_queue_t* queue = tsc_dispatch_queue_serial(tsc_str_from_cstr("retained"));
    tsc_value_t owner = tsc_value_dispatch_queue(queue);
    void* volatile root = tsc_value_gc_root(owner);
    if (!tsc_value_eq(owner, tsc_dispatch_capture(owner))) abort();
    tsc_realm_t* original = tsc_realm_current();
    tsc_realm_swap(tsc_realm_new());
    if (tsc_value_as_dispatch_queue(owner) != queue || !tsc_value_eq(owner, tsc_value_dispatch_queue(queue))) abort();
    tsc_realm_swap(original);
    tsc_array_t* promises = tsc_array_new(sizeof(tsc_promise_t*), 0);
    observed = 0;
    for (size_t index = 0; index < length; index++) {
        item_t* item = TSC_GC_MALLOC(sizeof(*item));
        *item = (item_t){ owner, tsc_value_gc_root(owner), index };
        tsc_promise_t* pending = tsc_dispatch_async(queue, inspect, item);
        tsc_array_push_raw(promises, &pending);
    }
#ifndef TSC_NO_GC
    GC_gcollect();
#endif
    tsc_run_event_loop();
    if (observed != length) abort();
    for (size_t index = 0; index < length; index++) {
        tsc_promise_t* pending = TSC_ARR(tsc_promise_t*, promises, index);
        if (pending->state != TSC_PROMISE_FULFILLED || tsc_value_as_num(pending->result) != (double)index) abort();
    }
    (void)root;
}
int main(int argc, char** argv) {
    tsc_bootstrap(argc, argv); tsc_realm_current();
    exercise(0); exercise(1); exercise(1024);
    puts("native queue ownership: true"); return 0;
}
`);
            const sources = (await readdir(buildDir)).filter(name => name.startsWith("tsc_") && name.endsWith(".c") && name !== "tsc_dispatch.c");
            const output = join(root, `native-${noGc}`);
            const result = await invokeCc({ sources: [driver, ...sources.map(name => join(buildDir, name))], output,
                includeDirs: [buildDir, ...(threaded ? [sdk!.includeDir] : [])],
                libs: [...(noGc ? [] : ["gc"]), "m", "resolv", "ssl", "crypto", "icui18n", "icuuc", "icudata", "gmp"],
                extraFlags: [...(noGc ? ["-DTSC_NO_GC"] : []), ...(threaded ? ["-DTSC_THREADS", "-DGC_THREADS=1", "-pthread"] : ["-DTSC_DISPATCH_SERIAL"])],
                linkFlags: threaded ? [`-L${sdk!.libDir}`, "-ldispatch", `-Wl,-rpath,${sdk!.libDir}`] : [] });
            expect({ code: result.exitCode, stderr: result.exitCode ? result.stderr : "" }).toEqual({ code: 0, stderr: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 60_000 });
            expect({ code: native.exitCode, stdout: native.stdout.toString(), stderr: native.stderr.toString() })
                .toEqual({ code: 0, stdout: "native queue ownership: true\n", stderr: "" });
        } } finally { await rm(root, { recursive: true, force: true }); }
    }, 600_000);
}
