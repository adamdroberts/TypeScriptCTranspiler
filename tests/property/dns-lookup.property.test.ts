import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";

const validSource = [
    'import dns from "node:dns";',
    'import { ALL, V4MAPPED, lookup, promises } from "dns";',
    "const hints = V4MAPPED | ALL;",
    "const mappedOptions = { family: 6, hints } as const;",
    "const mappedAlias = mappedOptions;",
    "const mappedFinal = mappedAlias;",
    "const numericFamily = 4 as const;",
    "const numericAlias = numericFamily;",
    "const family = 4 as const;",
    "const shorthandOptions = { family } as const;",
    'const order = "verbatim" as const;',
    "const orderedOptions = { family: 4, order } as const;",
    'const events: string[] = ["sync"];',
    'lookup("127.0.0.1", mappedFinal, (error: any, address: string, resultFamily: number): void => {',
    '    events.push("callback-mapped:" + String(error === null && address.indexOf("127.0.0.1") >= 0 && resultFamily === 6));',
    "});",
    'promises.lookup("127.0.0.1", orderedOptions).then((result: any): void => {',
    '    events.push("promise-ordered:" + String(result.address === "127.0.0.1" && result.family === 4));',
    "});",
    'lookup("127.0.0.1", numericAlias, (error: any, address: string, resultFamily: number): void => {',
    '    events.push("callback-numeric:" + String(error === null && address === "127.0.0.1" && resultFamily === 4));',
    "});",
    'promises.lookup("127.0.0.1", shorthandOptions).then((result: any): void => {',
    '    events.push("promise-shorthand:" + String(result.address === "127.0.0.1" && result.family === 4));',
    "});",
    'dns.lookup("127.0.0.1", null as any, (error: any, address: string, resultFamily: number): void => {',
    '    events.push("callback-null:" + String(error === null && address === "127.0.0.1" && resultFamily === 4));',
    "});",
    'dns.promises.lookup("127.0.0.1", { all: true, family: 4 }).then((results: any[]): void => {',
    '    events.push("promise-all:" + String(results.length > 0 && results[0].family === 4));',
    "});",
    "setImmediate((): void => console.log(events.join(\",\")));",
    "",
].join("\n");

const invalidPartitions: ReadonlyArray<{ source: string; diagnostic: string }> = [
    {
        source: [
            'import { lookup } from "dns";',
            "const options = { get family(): number { return 4; } };",
            'lookup("127.0.0.1", options as any, (): void => {});',
            "",
        ].join("\n"),
        diagnostic: "dns.lookup options only support property assignments and shorthand property assignments",
    },
    {
        source: [
            'import { lookup } from "dns";',
            "function makeOptions(): any { return { family: 4 }; }",
            "const options = makeOptions();",
            'lookup("127.0.0.1", options, (): void => {});',
            "",
        ].join("\n"),
        diagnostic: "dns.lookup options must be a numeric family or object literal in this subset",
    },
    {
        source: [
            'import { lookup } from "dns";',
            "let options = { family: 4 } as const;",
            'lookup("127.0.0.1", options, (): void => {});',
            "",
        ].join("\n"),
        diagnostic: "dns.lookup options must be a numeric family or object literal in this subset",
    },
];

test("DNS lookup options and completion jobs use canonical alias and scheduling worklists", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-dns-lookup-property-"));
    try {
        const entry = path.join(temporary, "subject.ts");
        await fs.writeFile(entry, validSource, "utf8");
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
            expect(result.mainC).toContain("tsc_promise_settle_immediate");

            const process = Bun.spawnSync([executable], { stdout: "pipe", stderr: "pipe" });
            expect(process.exitCode).toBe(0);
            expect(process.stderr.toString()).toBe("");
            expect(process.stdout.toString()).toBe(
                "sync," +
                "callback-mapped:true," +
                "promise-ordered:true," +
                "callback-numeric:true," +
                "promise-shorthand:true," +
                "callback-null:true," +
                "promise-all:true\n",
            );
        }

        for (const [index, partition] of invalidPartitions.entries()) {
            const invalidEntry = path.join(temporary, `invalid-${index}.ts`);
            const diagnostics: string[] = [];
            await fs.writeFile(invalidEntry, partition.source, "utf8");
            const result = await compile({
                entry: invalidEntry,
                output: path.join(temporary, `invalid-${index}`),
                buildDir: path.join(temporary, `build-invalid-${index}`),
                diagnosticWriter: (message) => diagnostics.push(message),
            });
            expect(result.exitCode).toBe(3);
            expect(diagnostics.join("")).toContain(partition.diagnostic);
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 120_000);
