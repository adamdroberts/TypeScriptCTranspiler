import { expect, test } from "bun:test";
import ts from "typescript";
import { sourceConstructorInvocations } from "../../src/source-value-flow";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nodeReferenceSync } from "./node-reference";

function program(source: string): ts.Program {
    const filename = "source.js";
    const options = { noLib: true, allowJs: true, target: ts.ScriptTarget.ESNext };
    const host = ts.createCompilerHost(options);
    host.getSourceFile = name => name === filename ? ts.createSourceFile(name, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS) : undefined;
    host.readFile = name => name === filename ? source : undefined;
    host.fileExists = name => name === filename;
    return ts.createProgram([filename], options, host);
}

/* The actual List each source passes to Function, observed by the reference
 * Node: every source runs in a fresh vm context whose Function returns its
 * arguments (one process for the whole batch). */
function actualLists(sources: readonly string[]): string[][] {
    const root = mkdtempSync(join(tmpdir(), "tsc2c-actual-lists-"));
    try {
        const input = join(root, "sources.json");
        writeFileSync(input, JSON.stringify(sources));
        const result = nodeReferenceSync(["node", "-e", `const vm = require("node:vm"), fs = require("node:fs");
const out = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).map(source =>
    new vm.Script(source).runInNewContext({ Function: function (...args) { return args; } }).map(String));
fs.writeFileSync(1, JSON.stringify(out));`, input], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });
        if (result.exitCode !== 0) throw new Error(result.stderr.toString());
        return JSON.parse(result.stdout.toString());
    } finally { rmSync(root, { recursive: true, force: true }); }
}
const pendingActual: string[] = [];
function includesActual(source: string): boolean { pendingActual.push(source); return true; }
function checkActualLists(): void {
    const actuals = actualLists(pendingActual);
    const missing = pendingActual.flatMap((source, index) => sourceConstructorInvocations(program(source)).some(call => call.choices !== null &&
        call.choices.length === actuals[index]!.length && call.choices.every((values, position) => values.includes(actuals[index]![position]!))) ? [] : [source]);
    expect(missing).toEqual([]);
}

test("actual Lists project mutable length and index locations across every call adapter", () => {
    const adapters = ["Function(...args)", "Function.apply(null,args)", "Reflect.apply(Function,null,args)", "Reflect.construct(Function,args)"];
    const mutations = [
        'args[0]="y";', 'args[1]="return 37;";', 'args[2]="return 41;";',
        'args.length=0;', 'args.length=1;', 'args.length=3;',
        'Reflect.set(args,"1","return 43;");',
        'Object.defineProperty(args,"1",{value:"return 47;"});',
    ];
    for (const mutation of mutations) for (const adapter of adapters) {
        const source = `var args=["x","return x+1;"];${mutation}${adapter};`;
        expect({ source, includesActual: includesActual(source) }).toEqual({ source, includesActual: true });
    }
    for (const adapter of adapters) {
        const source = 'const original=["x","return x+1;"];const snapshot=[...original];original[1]="return 53;";' +
            adapter.replaceAll("args", "snapshot") + ";";
        expect(includesActual(source)).toBe(true);
    }
    for (const mutation of ['args[1]=external;', 'args[externalKey]="return 59;";', 'external(args);', 'args.length=external;']) {
        for (const adapter of adapters) {
            const source = `var args=["x","return x+1;"];${mutation}${adapter};`;
            expect({ source, allUnknown: sourceConstructorInvocations(program(source)).every(call => call.choices === null) })
                .toEqual({ source, allUnknown: true });
        }
    }
    const rest = 'function make(...args){args[0]="x";args[1]="return x+2;";return Function.apply(null,args);}make("return 61;");';
    expect(includesActual(rest)).toBe(true);
    let deep = 'var list0=["return 67;"];';
    for (let index = 1; index <= 512; index++) deep += `var list${index}=[...list${index - 1}];`;
    deep += 'list512[0]="return 71;";Function.apply(null,list512);';
    expect(includesActual(deep)).toBe(true);
    // A reassignment that spreads the binding's earlier List reads that List:
    // the call receives exactly ("x", "return 73;").
    const reassigned = 'var args=["return 73;"];args=["x",...args];Function(...args);';
    expect(sourceConstructorInvocations(program(reassigned)).map(call => call.choices)).toEqual([[["x"], ["return 73;"]]]);
    // Repeated self-spreading grows the List without a represented bound.
    const cycle = 'var args=["return 73;"];for(let index=0;index<2;index++)args=["x",...args];Function(...args);';
    expect(sourceConstructorInvocations(program(cycle)).every(call => call.choices === null)).toBe(true);
    checkActualLists();
});
