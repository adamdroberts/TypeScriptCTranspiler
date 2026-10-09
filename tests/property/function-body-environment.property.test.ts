import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

// The host derives an arbitrary declaration graph independently of lowering.
// Every node captures its invocation's seed and returns its modeled successor.
let seed = 0x41c0ffee;
const edges = Array.from({ length: 137 }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % 137;
});
const declarations = edges.map((edge, index) =>
    `function node${index}() { return [node${edge}, base + ${index}]; }`).join("\n");
const source = String.raw`
function collect() { if (NATIVE_GC) $262.gc(); }
function check(value, label) { print(label + ":" + value); }
function factory(base) {
    const before = entry;
    let early = false;
    try { entry(); } catch (error) { early = error instanceof ReferenceError; }
    let value = base;
    function entry() { return value; }
    function update(next) { value = next; }
    function paired() { return entry; }
    var entry;
    return [before, entry, update, paired, early];
}
const left = factory("A"), right = factory("B");
check(left[0] === left[1] && left[1] !== right[1] && left[3]() === left[1] && left[4], "hoist-identity-tdz");
left[2]("C"); collect();
check(left[0]() === "C" && right[0]() === "B", "shared-mutable-captures");
function varFactory(base) {
    const early = method("before");
    const uninitialized = early()[0] === undefined;
    var prefix = base;
    function method(suffix) { return function () { return [prefix, suffix]; }; }
    var prefix;
    return [early, method("after"), uninitialized];
}
const varPair = varFactory("var"); collect();
check(varPair[2] && varPair[0]()[0] === "var" && varPair[1]()[0] === "var" &&
    varPair[0]()[1] === "before" && varPair[1]()[1] === "after", "hoisted-captured-var");
function recursive(base) {
    return walk;
    function walk(depth) { return depth ? walk(depth - 1) : base; }
}
check(recursive("R")(23) === "R", "after-return-recursion");
function duplicate() { const before = entry; function entry() { return 1; } function entry() { return 2; } return before(); }
check(duplicate() === 2, "last-declaration");
function redeclare() { const before = entry; var entry = 7; function entry() { return 3; } return [before(), entry]; }
const rewritten = redeclare(); check(rewritten[0] === 3 && rewritten[1] === 7, "var-initializer");
function parameter(value) {
    const read = () => value;
    function value() { return "F"; }
    return [read, value, arguments];
}
const alias = parameter("P");
check(alias[0]() === alias[1] && (alias[2][0] === alias[1]) === !STRICT_MODE, "parameter-arguments-environment");
function separate(value = () => value, read = value) {
    function value() { return "F"; }
    return [read, value, arguments];
}
const separated = separate(); collect();
check(separated[0]() === separated[0] && separated[1]() === "F" && separated[2][0] === undefined, "default-environment-separation");
function outerFactory(base) {
    let entry = base;
    function defaults(read = () => entry) { function entry() { return "body"; } return [read, entry]; }
    const pair = defaults(); entry += "!"; return pair;
}
const outer = outerFactory("outer"); collect();
check(outer[0]() === "outer!" && outer[1]() === "body", "default-outer-binding");
function absent(read = () => hiddenBodyName) { function hiddenBodyName() { return 1; } return read; }
try { absent()(); check(false, "default-body-barrier"); } catch (error) { check(error instanceof ReferenceError, "default-body-barrier"); }
function absentTypeof(read = () => typeof hiddenBodyVar) { var hiddenBodyVar = 1; return read; }
check(absentTypeof()() === "undefined", "default-unresolvable-typeof");
function receiverFactory() { return method; function method(argument) { return this.tag + argument + arguments.length; } }
check(receiverFactory().call({ tag: "this:" }, "arg") === "this:arg1", "own-call-activation");
function constructorFactory(base) { return Constructor; function Constructor(value = base) { this.value = value; } }
const Constructor = constructorFactory("instance"), object = new Constructor();
check(object.value === "instance" && object instanceof Constructor && Constructor.name === "Constructor" && Constructor.length === 0, "constructor-metadata");
function graph(base) { GRAPH_DECLARATIONS return [GRAPH_NODES]; }
const nodes = graph(17), otherNodes = graph(29), edges = GRAPH_EDGES;
let valid = true;
for (let index = 0; index < nodes.length; ++index) {
    const node = nodes[index](), other = otherNodes[index]();
    valid = valid && node[0] === nodes[edges[index]] && node[1] === 17 + index &&
        other[0] === otherNodes[edges[index]] && other[1] === 29 + index && nodes[index] !== otherNodes[index];
}
check(valid, "generated-binding-graph");
// One deep retained environment graph, with collection between creation and
// traversal. Its expected chain is derived from iteration, not fixture counts.
function link(previous, value) { return read; function read() { return [previous, value]; } }
let chain = null;
const depth = 4096;
for (let index = 0; index < depth; ++index) { chain = link(chain, index); if (index % 257 === 0) collect(); }
collect(); valid = true;
for (let index = depth - 1; index >= 0; --index) { const pair = chain(); valid = valid && pair[1] === index; chain = pair[0]; }
check(valid && chain === null, "retained-environment-depth");
`.replace("GRAPH_DECLARATIONS", declarations)
 .replace("GRAPH_NODES", edges.map((_, index) => `node${index}`).join(","))
 .replace("GRAPH_EDGES", JSON.stringify(edges));

test("function body declaration graph shares invocation bindings and separates parameter expressions", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-function-body-"));
    try {
        for (const strict of [false, true]) {
            const program = (strict ? '"use strict";\n' : "") + source.replaceAll("STRICT_MODE", String(strict));
            // Each check is an independently specified language invariant.
            // Node verifies the source oracle separately: Bun differs for a
            // body function replacing a sloppy mapped parameter binding.
            const expected = ["hoist-identity-tdz", "shared-mutable-captures", "hoisted-captured-var", "after-return-recursion",
                "last-declaration", "var-initializer", "parameter-arguments-environment",
                "default-environment-separation", "default-outer-binding", "default-body-barrier",
                "default-unresolvable-typeof", "own-call-activation", "constructor-metadata",
                "generated-binding-graph", "retained-environment-depth"].map(label => label + ":true");
            for (const noGc of [false, true]) {
                const name = `${strict ? "strict" : "sloppy"}-${noGc ? "no-gc" : "gc"}`;
                const entry = path.join(temporary, name + ".js"), output = path.join(temporary, name);
                await fs.writeFile(entry, program.replaceAll("NATIVE_GC", String(!noGc)));
                const diagnostics: string[] = [];
                const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                    buildDir: path.join(temporary, name + "-build"),
                    test262Observation: { kind: "test262-native-observation", scenarioId: `property/function-body-environment.js#${strict ? "strict" : "sloppy"}`,
                        setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
                expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
                const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                    env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
                expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
                const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
                if (observation.kind !== "normal") throw new Error(JSON.stringify(observation));
                expect((observation.stdout ?? "").trimEnd().split("\n")).toEqual(expected);
            }
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);

test("unrepresented resumable binding environments fail with stable diagnostics", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-function-body-admission-"));
    try {
        const partitions = [
            { name: "generator", source: 'function* run() { function entry() { return 1; } yield entry; } run().next();',
                diagnostic: "generator body declaration environment requires canonical resumable binding cells" },
        ];
        for (const partition of partitions) {
            const entry = path.join(temporary, partition.name + ".js");
            await fs.writeFile(entry, partition.source);
            const diagnostics: string[] = [];
            const result = await compile({ entry, output: path.join(temporary, partition.name), noGc: true,
                diagnosticWriter: message => diagnostics.push(message) });
            expect(result.exitCode).toBe(3);
            expect(diagnostics.join("\n")).toContain(partition.diagnostic);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
});
