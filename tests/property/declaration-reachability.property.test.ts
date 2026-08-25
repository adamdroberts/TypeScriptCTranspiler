import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

interface DeclarationNode {
    readonly name: string;
    readonly next: string | null;
    readonly terminal: number | null;
}

function declarationGraph(depth: number): readonly DeclarationNode[] {
    return Array.from({ length: depth + 1 }, (_, index) => ({
        name: `step_${index}`,
        next: index === depth ? null : `step_${index + 1}`,
        terminal: index === depth ? depth : null,
    }));
}

function reachableTerminal(
    graph: readonly DeclarationNode[],
    root: string,
): { readonly reachable: ReadonlySet<string>; readonly terminal: number } {
    const byName = new Map(graph.map((node) => [node.name, node]));
    const reachable = new Set<string>();
    const worklist = [root];
    let terminal: number | null = null;
    for (let cursor = 0; cursor < worklist.length; cursor++) {
        const name = worklist[cursor]!;
        if (reachable.has(name)) continue;
        const node = byName.get(name);
        if (!node) throw new Error(`missing declaration graph node ${name}`);
        reachable.add(name);
        if (node.next) worklist.push(node.next);
        if (node.terminal !== null) terminal = node.terminal;
    }
    if (terminal === null) throw new Error("declaration graph has no reachable terminal");
    return { reachable, terminal };
}

function declarationSource(graph: readonly DeclarationNode[], expected: number): string {
    const declarations = [...graph].reverse().map((node) =>
        node.next
            ? `function ${node.name}(): number { return ${node.next}(); }`
            : `function ${node.name}(): number { return ${node.terminal}; }`,
    );
    return [
        ...declarations,
        "function unreachable_branch(): number { return -1; }",
        `console.log("declaration-worklist:" + String(step_0() === ${expected}));`,
        "",
    ].join("\n");
}

test("declaration reachability is an explicit graph worklist", async () => {
    // This single depth is a stack/order stress guard for the graph algorithm,
    // not a family of declaration-count completion tasks.
    const graph = declarationGraph(193);
    const modeled = reachableTerminal(graph, "step_0");
    expect(modeled.reachable.size).toBe(graph.length);

    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-declaration-reachability-property-"));
    const entry = path.join(temporary, "subject.ts");
    try {
        await fs.writeFile(entry, declarationSource(graph, modeled.terminal), "utf8");
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                noGc,
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);
            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString()).toBe("declaration-worklist:true\n");
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);

const setupSource = String.raw`
const validateCompactNativeSource = function(source) {
  const UnicodeIDStart = /(?:[A-Za-z]|\uD800[\uDC00-\uDFFF])/;
  const UnicodeIDContinue = /(?:[0-9A-Za-z]|\uD800[\uDC00-\uDFFF])/;
  let pos = 0;

  const isIdentifierStart = (value) => UnicodeIDStart.test(value);
  const isIdentifierContinue = (value) => UnicodeIDContinue.test(value);
  const eatWhitespace = () => {
    while (source[pos] === " ") pos += 1;
  };
  const eat = (text) => {
    eatWhitespace();
    if (source.slice(pos, pos + text.length) !== text) return false;
    pos += text.length;
    return true;
  };
  const eatIdentifier = () => {
    eatWhitespace();
    if (!isIdentifierStart(source[pos])) return false;
    pos += 1;
    while (pos < source.length && isIdentifierContinue(source[pos])) pos += 1;
    return true;
  };

  return eat("function") && eatIdentifier() && eat("(") && eat(")") &&
    eat("{") && eat("[") && eat("native") && eat("code") && eat("]") &&
    eat("}") && (eatWhitespace(), pos === source.length);
};
`;

const observerSource = `
print("script-root-abi-regexp:" + String(
  validateCompactNativeSource("function value() { [native code] }")
));
`;

test("Script roots, captured JavaScript function ABIs, and ECMAScript escapes stay connected", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-script-root-abi-property-"));
    const setup = path.join(temporary, "setup.js");
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/script-root-abi-regexp.js#sloppy";
    try {
        await fs.writeFile(setup, setupSource, "utf8");
        await fs.writeFile(entry, observerSource, "utf8");
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                additionalRoots: [setup],
                initializationEntries: [setup, entry],
                isolatedScriptRoots: [setup, entry],
                ignoreCheckJsDirectiveRoots: [setup, entry],
                noGc,
                test262Observation: {
                    kind: "test262-native-observation",
                    scenarioId,
                    setupEntries: [setup],
                    testEntry: entry,
                    async: false,
                    scriptEntries: [setup, entry],
                    evalScriptEntries: [],
                    directEvalEntries: [],
                    indirectEvalEntries: [],
                },
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(diagnostics.join("")).toBe("");
            expect(result.exitCode).toBe(0);
            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(parseHostObservation(JSON.parse(process.stdout.toString()))).toEqual({
                protocolVersion: hostProtocolVersion,
                scenarioId,
                kind: "normal",
                asyncCompletion: undefined,
                stdout: "script-root-abi-regexp:true\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
