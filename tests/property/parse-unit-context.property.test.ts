import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { invokeCc } from "../../src/link/cc";
import { parseHostObservation } from "../test262/protocol";

// This ABI probe observes internal ownership without adding a product API.
// The oracle below follows fresh ParseText identity and retained source owners;
// it does not depend on token addresses, registry hashing or allocation order.
const probe = String.raw`
#include "tsc_internal.h"
static tsc_array_t* probe_units;
static tsc_value_t deferred_body(void* env, tsc_value_t receiver, tsc_array_t* args) {
    tsc_callable_owner_t* owner = env;
    if (tsc_parse_unit_current() != owner->parse_unit || tsc_realm_current() != owner->realm)
        tsc_panic("deferred source owner lost its creation context");
    return tsc_value_undefined();
}
static void check_deferred_owner(void) {
    tsc_realm_t* original_realm = tsc_realm_current();
    tsc_parse_unit_t* original_unit = tsc_parse_unit_current();
    tsc_callable_owner_t* owner = TSC_GC_MALLOC(sizeof(*owner));
    tsc_realm_swap(tsc_realm_new());
    tsc_parse_unit_swap(tsc_parse_unit_new());
    tsc_callable_owner_capture(owner);
    tsc_realm_t* caller_realm = tsc_realm_new();
    tsc_parse_unit_t* volatile caller_unit = tsc_parse_unit_new();
    tsc_realm_swap(caller_realm);
    tsc_parse_unit_swap(caller_unit);
#ifndef TSC_NO_GC
    GC_gcollect();
#endif
    tsc_value_t fn = tsc_callable_owner_get(owner, deferred_body, owner, 0,
        tsc_str_from_cstr("deferred"), true, tsc_str_from_cstr("function deferred(){}"));
    tsc_function_identity_t* identity = value_ptr(fn);
    if (identity->parse_unit != owner->parse_unit || identity->realm != owner->realm)
        tsc_panic("boxing captured the caller rather than the source owner");
    tsc_array_t* args = tsc_array_new(sizeof(tsc_value_t), 1);
    (void)tsc_value_apply_function(fn, tsc_value_undefined(), tsc_value_array(args));
    (void)tsc_value_construct(fn, tsc_value_array(args));
    if (tsc_parse_unit_current() != caller_unit || tsc_realm_current() != caller_realm)
        tsc_panic("source call failed to restore its caller");
    tsc_parse_unit_swap(original_unit);
    tsc_realm_swap(original_realm);
}
static tsc_value_t probe_unit(void* env, tsc_value_t receiver, tsc_array_t* args) {
    tsc_parse_unit_t* unit = tsc_parse_unit_current();
    if (args && args->len) {
        tsc_value_t fn = TSC_ARR(tsc_value_t, args, 0);
        if (!value_is_box(fn) || value_tag(fn) != TSC_VALUE_TAG_FUNCTION)
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("probe requires a function"));
        unit = ((tsc_function_identity_t*)value_ptr(fn))->parse_unit;
    }
    if (!probe_units) probe_units = tsc_array_new(sizeof(tsc_parse_unit_t*), 1);
    size_t index = 0;
    while (index < probe_units->len && TSC_ARR(tsc_parse_unit_t*, probe_units, index) != unit) ++index;
    if (index == probe_units->len) tsc_array_push_raw(probe_units, &unit);
    return tsc_value_num((double)index);
}
static void install_probe(void) {
    check_deferred_owner();
    tsc_value_set_prop(tsc_global_object(), tsc_str_from_cstr("__parseProbe"),
        tsc_value_function_builtin_named(probe_unit, NULL, 0, tsc_str_from_cstr("probe")));
}
`;

const source = String.raw`
var host = globalThis;
function check(value, label) { if (!value) throw label; host.print(label + ":true"); }
function collect() { if (NATIVE_GC) host.$262.gc(); }
async function main() {
    const initial = host.__parseProbe();
    const first = Function("return globalThis.__parseProbe();");
    const second = Function("return globalThis.__parseProbe();");
    check(first() !== initial && first() === first() && first() !== second() && host.__parseProbe(first) === first() &&
        host.__parseProbe() === initial, "fresh-function-parsing");
    const factory = Function("return function(){return globalThis.__parseProbe();};");
    const escaped = factory(), sibling = factory(); collect();
    check(escaped() === factory().call(null) && escaped() === sibling() && escaped() === host.__parseProbe(factory) &&
        escaped() === escaped.bind(null)(), "retained-source-closures");
    const objectFactory = Function("return {method(){return globalThis.__parseProbe();},get field(){return globalThis.__parseProbe();}};");
    const object = objectFactory(), anotherObject = objectFactory();
    check(object.method() === object.field && object.method.call(null) === anotherObject.field &&
        object.field === host.__parseProbe(objectFactory), "method-and-accessor-context");
    const constructor = Function("this.unit = globalThis.__parseProbe();");
    check(new constructor().unit === host.__parseProbe(constructor) && Reflect.construct(constructor, []).unit === host.__parseProbe(constructor),
        "constructed-source-context");
    const abrupt = {};
    const throws = Function("reason", "globalThis.__parseProbe(); throw reason;");
    try { throws(abrupt); } catch (reason) { check(reason === abrupt && host.__parseProbe() === initial, "abrupt-context-restoration"); }
    const GeneratorFunction = (function*(){}).constructor;
    const AsyncFunction = (async function(){}).constructor;
    const AsyncGeneratorFunction = (async function*(){}).constructor;
    const generator = GeneratorFunction("yield globalThis.__parseProbe(); yield globalThis.__parseProbe();");
    const otherGenerator = GeneratorFunction("yield globalThis.__parseProbe(); yield globalThis.__parseProbe();");
    const iterator = generator(), other = otherGenerator(), unit = iterator.next().value;
    collect();
    check(other.next().value !== unit && iterator.next().value === unit && unit === host.__parseProbe(generator) &&
        host.__parseProbe() === initial, "generator-resumption-context");
    const awaited = AsyncFunction("const unit = globalThis.__parseProbe(); await 0; return [unit, globalThis.__parseProbe()];");
    const values = await awaited();
    check(values[0] === values[1] && values[0] === host.__parseProbe(awaited) && host.__parseProbe() === initial,
        "async-resumption-context");
    const asynchronous = AsyncGeneratorFunction("yield globalThis.__parseProbe(); await 0; yield globalThis.__parseProbe();");
    const asyncIterator = asynchronous(), pending = [asyncIterator.next(), asyncIterator.next()];
    collect();
    const results = await Promise.all(pending);
    check(results[0].value === results[1].value && results[0].value === host.__parseProbe(asynchronous) && host.__parseProbe() === initial,
        "async-generator-queued-context");
    const evalText = "globalThis.__parseProbe()";
    const directFirst = eval(evalText), directSecond = eval(evalText);
    const indirect = eval;
    const indirectFirst = indirect(evalText), indirectSecond = indirect(evalText);
    const scriptFirst = host.$262.evalScript(evalText), scriptSecond = host.$262.evalScript(evalText);
    check(directFirst !== directSecond && indirectFirst !== indirectSecond && scriptFirst !== scriptSecond &&
        directFirst !== indirectFirst && indirectFirst !== scriptFirst && host.__parseProbe() === initial, "fresh-eval-parsing");
    const evalClosureText = "(function(){return globalThis.__parseProbe();})";
    const evalClosure = host.$262.evalScript(evalClosureText), otherEvalClosure = host.$262.evalScript(evalClosureText);
    collect();
    check(evalClosure() === evalClosure() && evalClosure() !== otherEvalClosure() &&
        evalClosure() === host.__parseProbe(evalClosure), "escaped-eval-source-owner");
    const evalDeclarationText = "function fromEval(){return globalThis.__parseProbe();} fromEval;";
    const declared = host.$262.evalScript(evalDeclarationText), otherDeclared = host.$262.evalScript(evalDeclarationText);
    check(declared !== otherDeclared && declared() !== otherDeclared() && declared() === host.__parseProbe(declared),
        "fresh-eval-declaration-owner");
    host.__parseAbrupt = abrupt;
    try { host.$262.evalScript("throw globalThis.__parseAbrupt"); }
    catch (reason) { check(reason === abrupt && host.__parseProbe() === initial, "abrupt-eval-context-restoration"); }
    const foreign = host.$262.createRealm(); foreign.global.__parseProbe = host.__parseProbe;
    const foreignClosure = foreign.evalScript(evalClosureText), secondForeignClosure = foreign.evalScript(evalClosureText);
    check(foreignClosure() !== secondForeignClosure() && foreignClosure() !== evalClosure() &&
        foreignClosure() === host.__parseProbe(foreignClosure) && host.__parseProbe() === initial, "cross-realm-parse-ownership");
    // One representative deep retained source-owner tree. Each edge performs
    // fresh parsing; both normal and abrupt traversal must restore each owner.
    let tree = reason => { if (reason) throw reason; return 0; };
    const owners = [];
    for (let index = 0; index < 1024; ++index) {
        const create = Function("previous", "return function(reason){const unit = globalThis.__parseProbe(); try { if (previous(reason) < 0) throw reason; } finally { if (globalThis.__parseProbe() !== unit) throw 'lost owner'; } return unit;};");
        tree = create(tree); owners.push(tree);
    }
    collect();
    let caught = false;
    try { tree(abrupt); } catch (reason) { caught = reason === abrupt && host.__parseProbe() === initial; }
    check(tree() === host.__parseProbe(tree) && owners[0]() !== owners[owners.length - 1]() && host.__parseProbe() === initial,
        "deep-retained-parse-owner-tree");
    check(caught, "deep-abrupt-owner-restoration");
}
main();
`;

test("fresh parsing and retained callable/resumable contexts own distinct Parse Nodes", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-parse-unit-"));
    const labels = ["fresh-function-parsing", "retained-source-closures", "method-and-accessor-context", "constructed-source-context",
        "abrupt-context-restoration", "generator-resumption-context", "async-resumption-context", "async-generator-queued-context",
        "fresh-eval-parsing", "escaped-eval-source-owner", "fresh-eval-declaration-owner", "abrupt-eval-context-restoration",
        "cross-realm-parse-ownership", "deep-retained-parse-owner-tree", "deep-abrupt-owner-restoration"].map(label => label + ":true");
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".js"), output = path.join(temporary, name), buildDir = path.join(temporary, name + "-build");
            await fs.writeFile(entry, source.replaceAll("NATIVE_GC", String(!noGc)));
            const evalEntries = [];
            for (const [index, text] of ["globalThis.__parseProbe()", "(function(){return globalThis.__parseProbe();})",
                "function fromEval(){return globalThis.__parseProbe();} fromEval;", "throw globalThis.__parseAbrupt"].entries()) {
                const script = path.join(temporary, name + "-eval-" + index + ".js"); await fs.writeFile(script, text);
                evalEntries.push({ source: text, entry: script });
            }
            const roots = evalEntries.map(record => record.entry), diagnostics: string[] = [];
            const result = await compile({ entry, output, noGc, emitCOnly: true, additionalRoots: roots, isolatedScriptRoots: [entry, ...roots],
                initializationEntries: [entry], buildDir,
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/parse-unit-context.js#sloppy", setupEntries: [], testEntry: entry,
                    async: false, scriptEntries: [entry, ...roots], evalScriptEntries: evalEntries,
                    directEvalEntries: [{ ...evalEntries[0]!, strictCaller: false, strict: false }], indirectEvalEntries: [{ ...evalEntries[0]!, strict: false }] },
                diagnosticWriter: message => diagnostics.push(message) });
            expect({ exitCode: result.exitCode, diagnostics: diagnostics.join("") }).toEqual({ exitCode: 0, diagnostics: "" });
            const main = path.join(buildDir, "main.c"), emitted = await fs.readFile(main, "utf8");
            const begin = /    tsc_test262_begin\([^)]*\);/;
            expect(emitted).toMatch(begin);
            await fs.writeFile(main, probe + emitted.replace(begin, "$&\n    install_probe();"));
            const sources = (await fs.readdir(buildDir)).filter(file => file.endsWith(".c")).sort().map(file => path.join(buildDir, file));
            const linked = await invokeCc({ sources, output, includeDirs: [buildDir], libs: [...(noGc ? [] : ["gc"]), "m", "resolv", "ssl", "crypto", "icui18n", "icuuc", "icudata", "gmp"],
                extraFlags: noGc ? ["-DTSC_NO_GC"] : [], stderrWriter: message => diagnostics.push(message) });
            expect({ exitCode: linked.exitCode, diagnostics: diagnostics.join("") }).toEqual({ exitCode: 0, diagnostics: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(labels);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);
