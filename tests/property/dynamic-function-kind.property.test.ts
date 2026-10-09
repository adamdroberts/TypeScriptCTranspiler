import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { functionConstructorSourceIsValid, type DynamicFunctionKind } from "../../src/function-constructor-source";
import { parseHostObservation } from "../test262/protocol";

const kinds: DynamicFunctionKind[] = ["ordinary", "generator", "async", "async-generator"];
const constructors = [Function, (function* () {}).constructor, (async function () {}).constructor, (async function* () {}).constructor] as FunctionConstructor[];
test("dynamic function grammar selects context from the canonical source kind", () => {
    for (const [index, kind] of kinds.entries()) for (const partition of [
        { parameters: "", body: "return 1;", valid: true },
        { parameters: "", body: "yield 1;", valid: kind.includes("generator") },
        { parameters: "", body: "return await 1;", valid: kind.startsWith("async") },
        { parameters: "yield", body: "return 1;", valid: !kind.includes("generator") },
        { parameters: "await", body: "return 1;", valid: !kind.startsWith("async") },
        { parameters: "", body: "var yield; return 1;", valid: !kind.includes("generator") },
        { parameters: "", body: "var await; return 1;", valid: !kind.startsWith("async") },
        { parameters: "", body: "return function* yield(){};", valid: false },
        { parameters: "a,a", body: "return a;", valid: true },
        { parameters: "a=1,a", body: "return a;", valid: false },
        { parameters: "a=1", body: '"use strict"; return a;', valid: false },
        { parameters: "/*", body: "*/ ) {", valid: false },
    ]) {
        expect(functionConstructorSourceIsValid({ kind, ...partition })).toBe(partition.valid);
        let valid = true;
        try { new constructors[index]!(partition.parameters, partition.body); } catch { valid = false; }
        expect(valid).toBe(partition.valid);
    }
});

const source = `
var host = globalThis;
function check(value, label) { if (!value) throw label; host.print(label + ":true"); }
function collect() { if (NATIVE_GC) host.$262.gc(); }
const generatorConstructor = (function* () {}).constructor;
const asyncConstructor = (async function () {}).constructor;
const asyncGeneratorConstructor = (async function* () {}).constructor;
const abrupt = { marker: "abrupt", [Symbol.toPrimitive]() { throw "conversion"; } };
async function main() {
    for (const [constructor, definition, name, tag, generated] of [
        [generatorConstructor, function* sample(value) { yield value; }, "GeneratorFunction", "Generator", true],
        [asyncConstructor, async function sample(value) { return value; }, "AsyncFunction", undefined, false],
        [asyncGeneratorConstructor, async function* sample(value) { yield value; }, "AsyncGeneratorFunction", "AsyncGenerator", true]
    ]) {
        const prototype = constructor.prototype;
        check(Object.getPrototypeOf(constructor) === Function && Object.getPrototypeOf(prototype) === Function.prototype &&
            Object.getPrototypeOf(definition) === prototype && prototype.constructor === constructor && typeof prototype === "object" &&
            Object.prototype.toString.call(prototype) === "[object " + name + "]" && constructor.length === 1 && constructor.name === name,
            name + "-intrinsic-identity");
        const owner = Object.getOwnPropertyDescriptor(constructor, "prototype"), back = Object.getOwnPropertyDescriptor(prototype, "constructor");
        check(!owner.writable && !owner.enumerable && !owner.configurable && !back.writable && !back.enumerable && back.configurable,
            name + "-intrinsic-descriptors");
        let rejected = false;
        try { Reflect.construct(definition, []); } catch (reason) { rejected = reason instanceof TypeError; }
        check(rejected && Object.prototype.hasOwnProperty.call(definition, "prototype") === generated, name + "-source-brand");
        if (generated) {
            const generatorPrototype = prototype.prototype;
            const link = Object.getOwnPropertyDescriptor(prototype, "prototype"), instance = Object.getOwnPropertyDescriptor(definition, "prototype");
            check(!link.writable && !link.enumerable && link.configurable && instance.writable && !instance.enumerable && !instance.configurable &&
                Object.getPrototypeOf(definition.prototype) === generatorPrototype && generatorPrototype.constructor === prototype &&
                !Object.prototype.hasOwnProperty.call(definition.prototype, "constructor") &&
                Object.prototype.toString.call(generatorPrototype) === "[object " + tag + "]", name + "-generator-prototype");
        }
        const replaced = {}; Object.setPrototypeOf(definition, replaced); collect();
        check(Object.getPrototypeOf(definition) === replaced, name + "-retained-prototype-mutation");
    }
    const generator = generatorConstructor("value = 3", "...tail", "yield [value, tail[0], arguments.length]; return tail[1];");
    const second = new generatorConstructor("value = 3", "...tail", "yield [value, tail[0], arguments.length]; return tail[1];");
    const subject = generator(undefined, 5, abrupt); collect();
    check(subject.next().value.join(",") === "3,5,3" && subject.next().value === abrupt && generator !== second &&
        generator.prototype !== second.prototype && generator.name === "anonymous" && generator.length === 0 &&
        Object.getPrototypeOf(generator) === generatorConstructor.prototype &&
        generator.toString() === "function* anonymous(value = 3,...tail\\n) {\\nyield [value, tail[0], arguments.length]; return tail[1];\\n}", "dynamic-generator-source-and-activation");
    const awaited = asyncConstructor("value", "return await value;");
    check(await awaited(Promise.resolve(abrupt)) === abrupt && !Object.prototype.hasOwnProperty.call(awaited, "prototype") &&
        Object.getPrototypeOf(awaited) === asyncConstructor.prototype && awaited.toString() === "async function anonymous(value\\n) {\\nreturn await value;\\n}",
        "dynamic-async-source-and-await");
    const asynchronous = asyncGeneratorConstructor("value", "try { yield await value; return arguments[1]; } finally { yield 7; }");
    const asyncSubject = asynchronous(Promise.resolve(11), abrupt);
    const results = await Promise.all([asyncSubject.next(), asyncSubject.next(), asyncSubject.next()]);
    check(results[0].value === 11 && !results[0].done && results[1].value === 7 && !results[1].done && results[2].value === abrupt && results[2].done &&
        Object.getPrototypeOf(asynchronous) === asyncGeneratorConstructor.prototype && asynchronous.name === "anonymous", "dynamic-async-generator-queue");
    const viaPrototype = Object.getPrototypeOf(function* () {}).constructor("yield 13;");
    const viaCall = generatorConstructor.call(null, "yield 17;");
    const viaApply = asyncGeneratorConstructor.apply(null, ["yield 19;"]);
    check(viaPrototype().next().value === 13 && viaCall().next().value === 17 && (await viaApply().next()).value === 19,
        "constructor-source-fact-projections");
    let selectedConstructor = generatorConstructor;
    selectedConstructor = asyncGeneratorConstructor;
    const mutableAsync = selectedConstructor("yield 37;");
    selectedConstructor = generatorConstructor;
    const mutableSync = selectedConstructor("yield 37;");
    check((await mutableAsync().next()).value === 37 && mutableSync().next().value === 37, "dynamic-kind-mutable-selection");
    const methodOwner = { *values() { yield 0; }, async *asynchronous() { yield 0; }, async value() { return 0; } };
    const methodGenerated = methodOwner.values.constructor("yield 41;");
    const methodAsynchronous = methodOwner.asynchronous.constructor("yield 43;");
    const methodAwaited = methodOwner.value.constructor("return await 47;");
    check(methodGenerated().next().value === 41 && (await methodAsynchronous().next()).value === 43 && await methodAwaited() === 47,
        "dynamic-kind-method-owner-facts");
    let effects = [];
    const selected = generatorConstructor({ toString() { effects.push("parameter"); collect(); return "value"; } },
        { toString() { effects.push("body"); return "yield value;"; } });
    check(effects.join(",") === "parameter,body" && selected(23).next().value === 23, "dynamic-kind-ordered-conversion");
    function Other() {}
    const custom = {}, target = new Proxy(Other, { get(owner, key) { if (key === "prototype") { effects.push("prototype"); return custom; }
        return Reflect.get(owner, key); } });
    effects = [];
    const constructed = Reflect.construct(generatorConstructor, ["yield 29;"], target);
    check(effects.join(",") === "prototype" && Object.getPrototypeOf(constructed) === custom && constructed().next().value === 29,
        "dynamic-kind-newtarget-prototype");
    const foreign = host.$262.createRealm();
    const foreignGenerator = foreign.evalScript("(function*(){}).constructor");
    const foreignAsync = foreign.evalScript("(async function(){}).constructor");
    const foreignAsyncGenerator = foreign.evalScript("(async function*(){}).constructor");
    const foreignTarget = foreign.evalScript("(function Target(){})"); foreignTarget.prototype = 0;
    const foreignFunction = foreignGenerator("yield 29;");
    const cross = Reflect.construct(generatorConstructor, ["yield 29;"], foreignTarget);
    check(foreignGenerator !== generatorConstructor && foreignAsync !== asyncConstructor && foreignAsyncGenerator !== asyncGeneratorConstructor &&
        Object.getPrototypeOf(foreignGenerator.prototype) === foreign.global.Function.prototype &&
        Object.getPrototypeOf(foreignFunction) === foreignGenerator.prototype && Object.getPrototypeOf(cross) === foreignGenerator.prototype &&
        cross().next().value === 29, "dynamic-kind-realm-fallback");
    const invalidSources = [[generatorConstructor, "yield", "return 1;"], [asyncConstructor, "await", "return 1;"],
        [asyncGeneratorConstructor, "value = 1", '"use strict"; return value;']];
    for (const [constructor, parameters, body] of invalidSources) {
        let rejected = false; try { constructor(parameters, body); } catch (reason) { rejected = reason instanceof SyntaxError; }
        if (!rejected) throw "dynamic kind early errors";
    }
    check(true, "dynamic-kind-runtime-syntax-errors");
    const nested = generatorConstructor('return (async function*(){}).constructor("yield 31;");');
    check((await nested().next()).value().next() instanceof Promise, "dynamic-kind-transitive-source-graph");
    DEEP_ALIASES
    const make = LAST_ALIAS("value", "previous", "yield value; return previous;");
    let graph = null;
    for (let index = 0; index < 4096; ++index) { graph = make(index, graph); if (index % 37 === 0) collect(); }
    let expected = 4095;
    while (graph !== null) {
        if (graph.next().value !== expected) throw "retained dynamic generator cell";
        const previous = graph.next(); if (!previous.done) throw "retained dynamic completion"; graph = previous.value; expected--;
    }
    check(expected === -1, "deep-dynamic-kind-owner-graph");
}
main().catch(reason => { host.print("failure:" + (reason === abrupt ? "abrupt" : String(reason))); });
`;

test("dynamic function kinds retain intrinsic owners, actual source and canonical constructor semantics", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-dynamic-kind-"));
    const labels = ["GeneratorFunction-intrinsic-identity", "GeneratorFunction-intrinsic-descriptors", "GeneratorFunction-source-brand", "GeneratorFunction-generator-prototype", "GeneratorFunction-retained-prototype-mutation",
        "AsyncFunction-intrinsic-identity", "AsyncFunction-intrinsic-descriptors", "AsyncFunction-source-brand", "AsyncFunction-retained-prototype-mutation",
        "AsyncGeneratorFunction-intrinsic-identity", "AsyncGeneratorFunction-intrinsic-descriptors", "AsyncGeneratorFunction-source-brand", "AsyncGeneratorFunction-generator-prototype", "AsyncGeneratorFunction-retained-prototype-mutation",
        "dynamic-generator-source-and-activation", "dynamic-async-source-and-await", "dynamic-async-generator-queue", "constructor-source-fact-projections",
        "dynamic-kind-mutable-selection", "dynamic-kind-method-owner-facts", "dynamic-kind-ordered-conversion", "dynamic-kind-newtarget-prototype", "dynamic-kind-realm-fallback", "dynamic-kind-runtime-syntax-errors",
        "dynamic-kind-transitive-source-graph", "deep-dynamic-kind-owner-graph"].map(label => label + ":true");
    // Parameter/body sources crossing user conversion hooks are explicitly
    // allow-listed, while constructor kind remains an actual runtime input.
    const manifest = { functions: [
        { kind: "generator", parameters: "value", body: "yield value;" },
        { kind: "generator", parameters: "yield", body: "return 1;" },
        { kind: "async", parameters: "await", body: "return 1;" },
        { kind: "async-generator", parameters: "value = 1", body: '"use strict"; return value;' },
    ] };
    let aliases = "const alias0 = generatorConstructor;";
    for (let index = 1; index <= 512; ++index) aliases += `const alias${index} = alias${index - 1};`;
    try {
        const manifestPath = path.join(temporary, "runtime-code.json"); await fs.writeFile(manifestPath, JSON.stringify(manifest));
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", subject = path.join(temporary, name + ".js"), driver = path.join(temporary, name + "-driver.js"), output = path.join(temporary, name);
            await fs.writeFile(subject, source.replaceAll("NATIVE_GC", String(!noGc)).replace("DEEP_ALIASES", aliases).replace("LAST_ALIAS", "alias512")); await fs.writeFile(driver, "");
            const evalScriptEntries = [];
            for (const [index, source] of ["(function*(){}).constructor", "(async function(){}).constructor", "(async function*(){}).constructor", "(function Target(){})"].entries()) {
                const entry = path.join(temporary, name + "-realm-" + index + ".js"); await fs.writeFile(entry, source);
                evalScriptEntries.push({ source, entry });
            }
            const roots = [subject, ...evalScriptEntries.map(entry => entry.entry)];
            const diagnostics: string[] = [];
            const result = await compile({ entry: driver, output, noGc, runtimeCodeManifest: manifestPath, additionalRoots: roots, isolatedScriptRoots: evalScriptEntries.map(entry => entry.entry), initializationEntries: [subject, driver], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/dynamic-function-kind.js#sloppy", setupEntries: [], testEntry: driver, async: false, scriptEntries: [driver, ...roots], evalScriptEntries },
                diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(labels);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);
