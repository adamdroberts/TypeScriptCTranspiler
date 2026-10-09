import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vm from "node:vm";
import ts from "typescript";
import { compile } from "../../src/compile";
import { finiteFunctionConstructorSources, functionConstructorSourceKey, type FunctionConstructorSource } from "../../src/function-constructor-source";
import { parseHostObservation } from "../test262/protocol";

function program(files: Record<string, string>): ts.Program {
    const options: ts.CompilerOptions = { noLib: true, allowJs: true, noEmit: true, target: ts.ScriptTarget.ESNext };
    const host = ts.createCompilerHost(options);
    host.getSourceFile = filename => filename in files ? ts.createSourceFile(filename, files[filename]!, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS) : undefined;
    host.readFile = filename => files[filename]; host.fileExists = filename => filename in files;
    const result = ts.createProgram(Object.keys(files), options, host), checker = result.getTypeChecker();
    const original = checker.getSymbolAtLocation.bind(checker);
    checker.getSymbolAtLocation = node => {
        if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) throw new Error("member type inference bypassed the source graph");
        return original(node);
    };
    return result;
}

const source = String.raw`
var host = globalThis;
function check(value, label) { if (!value) throw label; host.print(label + ":true"); }
function collect() { if (NATIVE_GC) host.$262.gc(); }
const GeneratorFunction = (function*(){}).constructor;
const AsyncFunction = (async function(){}).constructor;
const AsyncGeneratorFunction = (async function*(){}).constructor;
function pick(value) { return value; }
function wrap(value) { return { selected: value }; }
const object = { selected: function*(){}, get read() { return pick(this.selected); } };
async function main() {
    const selected = object.read.constructor;
    check(selected("yield 31;")().next().value === 31 && wrap(GeneratorFunction).selected("yield 37;")().next().value === 37,
        "source-member-getter-and-result");
    const first = object.read.constructor("yield 41;"); object.selected = async function*(){};
    const second = object.read.constructor("yield 41;");
    check(first().next().value === 41 && (await second().next()).value === 41, "mutable-source-member-selection");
    const returned = Function("return (function*(){}).constructor;");
    check(returned()("yield 43;")().next().value === 43 && pick(AsyncFunction)("return await 47;")() instanceof Promise,
        "returned-and-parameter-constructor");
    const bound = GeneratorFunction.bind(null, "value");
    const applied = bound.apply(null, ["yield value + 53;"]);
    const constructed = Reflect.construct(bound, ["yield value + 59;"]);
    check(applied(2).next().value === 55 && constructed(2).next().value === 61,
        "bound-prefix-and-actual-list");
    const list = ["value", "return await value;"];
    list[1] = "return await value + 1;";
    const fromList = AsyncFunction.apply(null, list), spread = GeneratorFunction(...["value", "yield value;"]);
    check(await fromList(61) === 62 && spread(67).next().value === 67, "source-argument-list-flow");
    const textFactory = value => value;
    check(GeneratorFunction(textFactory("yield 71;"))().next().value === 71, "returned-source-text");
    const foreign = host.$262.createRealm();
    const foreignConstructor = foreign.global.eval("(function*(){})").constructor;
    const foreignFactory = foreign.evalScript("(function(){return (async function*(){}).constructor;})");
    const foreignGenerated = foreignConstructor("yield 73;"), foreignAsync = foreignFactory()("yield 79;");
    check(foreignGenerated().next().value === 73 && (await foreignAsync().next()).value === 79 &&
        Object.getPrototypeOf(foreignGenerated) === foreignConstructor.prototype, "foreign-eval-returned-constructor");
    DEEP_TREE
    collect();
    const retained = LAST_OWNER.selected("yield 83;");
    check(retained().next().value === 83 && LAST_OWNER.previous !== null, "deep-source-owner-flow");
}
main();
`;
const evaluations = ["(function*(){})", "(function(){return (async function*(){}).constructor;})"];
const expected = ["source-member-getter-and-result", "mutable-source-member-selection", "returned-and-parameter-constructor",
    "bound-prefix-and-actual-list", "source-argument-list-flow", "returned-source-text", "foreign-eval-returned-constructor", "deep-source-owner-flow"].map(label => label + ":true");
function input(noGc: boolean): string {
    const tree = ["const owner0 = { selected: GeneratorFunction, previous: null };"];
    for (let index = 1; index <= 4096; ++index) tree.push(`const owner${index} = { selected: owner${index - 1}.selected, previous: owner${index - 1} };`);
    return source.replaceAll("NATIVE_GC", String(!noGc)).replace("DEEP_TREE", tree.join("\n")).replaceAll("LAST_OWNER", "owner4096");
}

test("source graph closes member, result, binding and List dependencies without member type inference", () => {
    // Independent execution records the actual constructor's conversions and
    // joined source key. Static discovery must contain every observed key.
    for (const [index, kind] of ["ordinary", "generator", "async", "async-generator"].entries()) {
        const body = kind.includes("generator") ? `yield ${index + 1};` : `return ${index + 1};`;
        const definitions = ["function(){}", "function*(){}", "async function(){}", "async function*(){}"];
        const text = `
            function identity(value) { return value; }
            const record = { fn: (${definitions[index]}), get constructorValue(){return this.fn.constructor;} };
            const constructor = identity(record.constructorValue);
            const argumentsList = [${JSON.stringify(body + " /*apply*/")}];
            const bound = constructor.bind(null, "value");
            bound.apply(null, argumentsList);
            Reflect.construct(bound, [${JSON.stringify(body + " /*construct*/")}]);
            constructor(...[${JSON.stringify(body + " /*spread*/")}]);
            constructor.call(null, ${JSON.stringify(body + " /*call*/")});
            function forward(...list) { return constructor(...list); }
            forward(${JSON.stringify(body + " /*rest*/")});
            function textResult() { return ${JSON.stringify(body + " /*result*/")}; }
            constructor(textResult());
            const alternate = globalThis.flag ? [${JSON.stringify(body + " /*left*/")}] : [${JSON.stringify(body + " /*right*/")}];
            constructor.apply(null, [...alternate]);
            const mutated = [${JSON.stringify(body + " /*before-write*/")}];
            mutated[0] = ${JSON.stringify(body + " /*element-write*/")};
            constructor.apply(null, mutated);
            constructor("return " + (2 + 3) + "; /*numeric-add*/");
            constructor(\`return \${2n + 3n}; /*template*/\`);
            async function* unrelated() { yield 1; return 2; }
            unrelated().next();
        `;
        const observed: FunctionConstructorSource[] = [];
        const context = vm.createContext({ recordSource: (...args: string[]) => observed.push({ kind: kind as FunctionConstructorSource["kind"], parameters: args.slice(0, -1).join(","), body: args.at(-1) ?? "" }) });
        new vm.Script(`const definition = (${definitions[index]}); const original = definition.constructor;
            Object.defineProperty(Object.getPrototypeOf(definition), "constructor", { configurable: true, value: function(...args) {
                const strings = args.map(String); recordSource(...strings); return original(...strings);
            }});`).runInContext(context);
        context.flag = true; new vm.Script(text).runInContext(context);
        const otherContext = vm.createContext({ recordSource: context.recordSource, flag: false });
        new vm.Script(`const definition = (${definitions[index]}); const original = definition.constructor;
            Object.defineProperty(Object.getPrototypeOf(definition), "constructor", { configurable: true, value: function(...args) {
                const strings = args.map(String); recordSource(...strings); return original(...strings);
            }});`).runInContext(otherContext);
        new vm.Script(text).runInContext(otherContext);
        const found = new Set(finiteFunctionConstructorSources(program({ "model.js": text }), []).map(functionConstructorSourceKey));
        expect(observed.length > 0).toBe(true);
        for (const invocation of observed) expect(found.has(functionConstructorSourceKey(invocation))).toBe(true);
    }
    const cycle = program({ "cycle.js": `let first = Function, second = first; first = second;
        first("return 89;"); const bound = first.bind(null); first = bound; first("return 97;");` });
    const keys = finiteFunctionConstructorSources(cycle, []).map(functionConstructorSourceKey);
    expect(keys).toContain(functionConstructorSourceKey({ parameters: "", body: "return 89;" }));
    const listCycle = program({ "list-cycle.js": `let list = ["return 101;"]; list = ["value", ...list];
        Function.apply(null, list); let text = "return 103;"; text = text + text; Function(text);` });
    const manifest = { parameters: "value", body: "return 107;" };
    expect(finiteFunctionConstructorSources(listCycle, [manifest])).toContainEqual(manifest);
});

test("source-owner facts close the native AOT registry through returned values and foreign eval", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-source-flow-"));
    try {
        for (const noGc of [false, true]) {
            const name = noGc ? "no-gc" : "gc", entry = path.join(temporary, name + ".js"), output = path.join(temporary, name), diagnostics: string[] = [];
            await fs.writeFile(entry, input(noGc));
            const evalEntries = [];
            for (const [index, source] of evaluations.entries()) {
                const script = path.join(temporary, name + "-eval-" + index + ".js"); await fs.writeFile(script, source); evalEntries.push({ source, entry: script });
            }
            const roots = evalEntries.map(record => record.entry);
            const result = await compile({ entry, output, noGc, additionalRoots: roots, isolatedScriptRoots: [entry, ...roots], initializationEntries: [entry], buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: "property/constructor-source-flow.js#sloppy", setupEntries: [], testEntry: entry, async: false,
                    scriptEntries: [entry, ...roots], evalScriptEntries: evalEntries, indirectEvalEntries: [{ ...evalEntries[0]!, strict: false }] },
                diagnosticWriter: message => diagnostics.push(message) });
            expect({ exitCode: result.exitCode, diagnostics: diagnostics.join("") }).toEqual({ exitCode: 0, diagnostics: "" });
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000, env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString())); expect(observation).toMatchObject({ kind: "normal" });
            expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 600_000);
