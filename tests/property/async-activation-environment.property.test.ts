import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { parseHostObservation } from "../test262/protocol";

const source = String.raw`
function collect() { if (NATIVE_GC) $262.gc(); }
function check(value, label) { print(label + ":" + value); }
async function mapped(value) {
    const args = arguments, read = () => arguments;
    await Promise.resolve(1); collect();
    value += "!";
    await Promise.resolve(2); arguments[0] += "?";
    function own() { return arguments[0]; }
    return [args === arguments, read() === arguments, value, own("own"), arguments.length, arguments[0]];
}
mapped("A", "extra").then(result => check(result[0] && result[1] && result[2] === (STRICT_MODE ? "A!" : "A!?") &&
    result[3] === "own" && result[4] === 2 && result[5] === (STRICT_MODE ? "A?" : "A!?"), "mapped-parameter"));
async function replacement(value) {
    const args = arguments, read = () => value;
    function value() { return "function"; }
    await Promise.resolve(1); collect();
    return [args, read(), value];
}
replacement("parameter").then(result => check(result[1] === result[2] && result[2]() === "function" &&
    (result[0][0] === result[2]) === !STRICT_MODE, "body-function-parameter-alias"));
async function strict(value) { "use strict"; const args = arguments; await Promise.resolve(1); value = "B"; return [args === arguments, arguments[0], value]; }
strict("A").then(result => check(result[0] && result[1] === "A" && result[2] === "B", "strict-unmapped"));
async function defaulted(value = () => value, read = value) {
    function value() { return "body"; }
    await Promise.resolve(1); collect();
    return [read() === read, value(), arguments[0] === undefined];
}
defaulted().then(result => check(result[0] && result[1] === "body" && result[2], "default-environment"));
async function arrowFactory(value) {
    const args = arguments;
    const run = async () => { await Promise.resolve(1); collect(); return arguments; };
    await Promise.resolve(2);
    const received = await run();
    return [args, received];
}
arrowFactory("arrow").then(result => check(result[0] === result[1] && result[1][0] === "arrow", "async-arrow-arguments"));
const holder = { tag: "receiver", run: async function () {
    const self = this;
    await Promise.resolve(1); collect();
    const reader = () => this;
    await Promise.resolve(2);
    return [self === this, reader() === this, this.tag, new.target === undefined];
} };
holder.run().then(result => check(result[0] && result[1] && result[2] === "receiver" && result[3], "receiver-and-own-new-target"));
function Constructor() {
    this.run = async () => { const target = new.target; await Promise.resolve(1); collect(); return [target === Constructor, new.target === Constructor]; };
}
const instance = new Constructor();
instance.run().then(result => check(result[0] && result[1], "async-arrow-new-target"));
async function isolated(value) { const args = arguments; await Promise.resolve(1); value += "!"; await Promise.resolve(2); return [args, value]; }
Promise.all([isolated("L"), isolated("R")]).then(result => check(result[0][0] !== result[1][0] &&
    result[0][1] === "L!" && result[1][1] === "R!" && result[0][0][0] === (STRICT_MODE ? "L" : "L!") &&
    result[1][0][0] === (STRICT_MODE ? "R" : "R!"), "invocation-isolation"));
// One retained invocation graph: its expected chain is derived independently
// from the loop index. All activations suspend before collection and release.
var release;
const gate = new Promise(resolve => { release = resolve; });
async function link(previous, value) {
    const args = arguments;
    await gate;
    return () => [previous, value, args];
}
let chain = Promise.resolve(null);
const depth = 4096;
for (let index = 0; index < depth; ++index) { chain = link(chain, index); if (index % 257 === 0) collect(); }
collect(); release();
chain.then(async function (reader) {
    let valid = true;
    for (let index = depth - 1; index >= 0; --index) {
        if (index % 257 === 0) collect();
        const pair = reader();
        valid = valid && pair[1] === index && pair[2][0] === pair[0] && pair[2][1] === index;
        reader = await pair[0];
    }
    check(valid && reader === null, "retained-activation-depth");
});
`;
const labels = ["mapped-parameter", "body-function-parameter-alias", "strict-unmapped", "default-environment",
    "async-arrow-arguments", "receiver-and-own-new-target", "async-arrow-new-target", "invocation-isolation", "retained-activation-depth"];

test("async activation collection preserves bindings, aliases and roots across suspension", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-async-activation-"));
    try {
        const expected = labels.map(label => label + ":true").sort();
        for (const strict of [false, true]) for (const noGc of [false, true]) {
            const name = `${strict ? "strict" : "sloppy"}-${noGc ? "no-gc" : "gc"}`;
            const entry = path.join(temporary, name + ".js"), output = path.join(temporary, name);
            const program = (strict ? '"use strict";\n' : "") + source
                .replaceAll("STRICT_MODE", String(strict)).replaceAll("NATIVE_GC", String(!noGc));
            await fs.writeFile(entry, program);
            const diagnostics: string[] = [];
            const result = await compile({ entry, output, initializationEntries: [entry], noGc,
                buildDir: path.join(temporary, name + "-build"),
                test262Observation: { kind: "test262-native-observation", scenarioId: `property/async-activation.js#${strict ? "strict" : "sloppy"}`,
                    setupEntries: [], testEntry: entry, async: false }, diagnosticWriter: message => diagnostics.push(message) });
            expect(diagnostics.join("")).toBe(""); expect(result.exitCode).toBe(0);
            const native = Bun.spawnSync([output], { stdout: "pipe", stderr: "pipe", timeout: 120_000,
                env: { ...process.env, GC_FREE_SPACE_DIVISOR: "100" } });
            expect(native.exitCode).toBe(0); expect(native.stderr.toString()).toBe("");
            const observation = parseHostObservation(JSON.parse(native.stdout.toString()));
            if (observation.kind !== "normal") throw new Error(JSON.stringify(observation));
            expect((observation.stdout ?? "").trimEnd().split("\n").sort()).toEqual(expected);
        }
    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 240_000);
