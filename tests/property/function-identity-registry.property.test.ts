import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { invokeCc } from "../../src/link/cc";

// This is native ABI evidence. The independent model identifies callables by
// their semantic key, without sharing the runtime's hash or probing algorithm.
interface Key { kind: number; realm: number; unit: number; code: number; env: number; construct: number; listener: number; order: string; }
function plans(): Key[] {
    const requests: Key[] = [];
    for (let kind = 0; kind < 8; kind++) {
        const base: Key = { kind, realm: 0, unit: 0, code: 0, env: 0, construct: 0, listener: 0, order: "0" };
        requests.push(base);
        for (const field of ["realm", "unit", "code", "env", "construct", "listener"] as const) requests.push({ ...base, [field]: 1 });
        requests.push({ ...base, order: "4294967296" }, { ...base, order: "18446744073709551615" });
    }
    return [...requests, ...requests.slice().reverse(), ...requests];
}
function semanticKey(key: Key): string {
    return [key.kind, key.realm, key.kind < 6 ? key.unit : 0, key.code, key.env, key.kind >= 4 ? key.construct : 0,
        key.kind === 2 || key.kind === 3 ? key.listener : 0, key.kind === 3 ? key.order : "0"].join(":");
}
const driver = String.raw`#include "tsc_internal.h"
#include <inttypes.h>
static tsc_value_t generic_a(void* env, tsc_value_t receiver, tsc_array_t* args) { return tsc_value_undefined(); }
static tsc_value_t generic_b(void* env, tsc_value_t receiver, tsc_array_t* args) { return tsc_value_undefined(); }
static tsc_value_t getter_a(void* env, tsc_value_t receiver) { return tsc_value_undefined(); }
static tsc_value_t getter_b(void* env, tsc_value_t receiver) { return tsc_value_undefined(); }
static bool setter_a(void* env, tsc_value_t receiver, tsc_value_t value) { return true; }
static bool setter_b(void* env, tsc_value_t receiver, tsc_value_t value) { return true; }
static void listener_a(void* env, tsc_event_emitter_t* target, tsc_array_t* args) {}
static void listener_b(void* env, tsc_event_emitter_t* target, tsc_array_t* args) {}
int main(int argc, char** argv) {
    tsc_bootstrap(argc, argv);
    tsc_realm_t* realms[] = { tsc_realm_current(), tsc_realm_new() };
    tsc_parse_unit_t* units[] = { tsc_parse_unit_new(), tsc_parse_unit_new() };
    unsigned char environments[2] = {0}, listeners[2] = {0};
    tsc_array_t* observed = tsc_array_new(sizeof(tsc_value_t), 1);
    unsigned kind, realm, unit, code, environment, construct, listener;
    uint64_t order;
    while (scanf("%u %u %u %u %u %u %u %" SCNu64, &kind, &realm, &unit, &code,
        &environment, &construct, &listener, &order) == 8) {
        if (kind > 7 || realm > 1 || unit > 1 || code > 1 || environment > 1 || construct > 1 || listener > 1) return 2;
        tsc_realm_swap(realms[realm]);
        tsc_parse_unit_swap(units[unit]);
        void* env = &environments[environment];
        tsc_value_t value;
        if (kind == 0) value = value_accessor_getter_identity(code ? getter_b : getter_a, env);
        else if (kind == 1) value = value_accessor_setter_identity(code ? setter_b : setter_a, env);
        else if (kind == 2) value = value_event_listener_identity(code ? listener_b : listener_a, env, &listeners[listener]);
        else if (kind == 3) value = value_event_raw_listener_identity(code ? listener_b : listener_a, env, &listeners[listener], order, true);
        else value = tsc_value_function_named_kind(code ? generic_b : generic_a,
            construct ? generic_b : NULL, env, 0, tsc_str_from_lit("", 0), (tsc_function_identity_kind_t)kind);
        size_t first = 0;
        while (first < observed->len && !tsc_value_object_is(TSC_ARR(tsc_value_t, observed, first), value)) ++first;
        printf("%zu\n", first);
        tsc_array_push_value(observed, value);
#ifndef TSC_NO_GC
        GC_gcollect();
#endif
    }
    return 0;
}`;

test("one native callable registry preserves Realm, parse unit, code, environment, kind and listener identity", async () => {
    const requests = plans(), firstSeen = new Map<string, number>();
    const expected = requests.map((request, index) => {
        const key = semanticKey(request);
        if (!firstSeen.has(key)) firstSeen.set(key, index);
        return String(firstSeen.get(key));
    }).join("\n") + "\n";
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-function-registry-"));
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
            const input = requests.map(key => [key.kind, key.realm, key.unit, key.code, key.env, key.construct, key.listener, key.order].join(" ")).join("\n") + "\n";
            const native = Bun.spawnSync([output], { stdin: Buffer.from(input), stdout: "pipe", stderr: "pipe", timeout: 120_000 });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe(""); expect(native.stdout.toString()).toBe(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);
