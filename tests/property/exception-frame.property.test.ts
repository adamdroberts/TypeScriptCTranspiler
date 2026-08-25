import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { compile } from "../../src/compile";
import { hostProtocolVersion, parseHostObservation } from "../test262/protocol";

function nestedTrySource(depth: number): string {
    let body = "return sentinel;";
    for (let remaining = depth; remaining > 0; remaining--) {
        body = `try { ${body} } catch (error) { return error; }`;
    }
    return body;
}

function subjectSource(): string {
    return `
        var sentinel = { marker: "sentinel" };

        function probe(label, callback) {
            var result = callback();
            var caught;
            try { throw sentinel; }
            catch (error) { caught = error; }
            print(label + ":" + String(result) + ":" + String(caught === sentinel));
        }

        function returnFromTry() {
            try { return "try"; }
            catch (error) { return "wrong"; }
        }

        function returnFromCatch() {
            try { throw sentinel; }
            catch (error) { return error === sentinel; }
        }

        function nestedReturn() {
            ${nestedTrySource(29)}
        }

        function loopCompletions() {
            var trace = "";
            for (var index = 0; index < 7; index++) {
                try {
                    if (index % 2 === 0) continue;
                    if (index === 5) break;
                    trace += String(index);
                } catch (error) {
                    return "wrong";
                }
            }
            return trace;
        }

        probe("try-return", returnFromTry);
        probe("catch-return", returnFromCatch);
        probe("nested-return", function () { return nestedReturn() === sentinel; });
        probe("loop-completions", loopCompletions);
    `;
}

test("exception frames are removed on every lexical completion edge", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-exception-frame-property-"));
    const entry = path.join(temporary, "subject.js");
    const scenarioId = "property/exception-frame.js#sloppy";
    try {
        await fs.writeFile(entry, subjectSource(), "utf8");
        for (const noGc of [false, true]) {
            const mode = noGc ? "no-gc" : "gc";
            const executable = path.join(temporary, `subject-${mode}`);
            const diagnostics: string[] = [];
            const result = await compile({
                entry,
                output: executable,
                buildDir: path.join(temporary, `build-${mode}`),
                initializationEntries: [entry],
                noGc,
                test262Observation: {
                    kind: "test262-native-observation",
                    scenarioId,
                    setupEntries: [],
                    testEntry: entry,
                    async: false,
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
                stdout: [
                    "try-return:try:true",
                    "catch-return:true:true",
                    "nested-return:true:true",
                    "loop-completions:13:true",
                    "",
                ].join("\n"),
                stderr: undefined,
                nativeTranscript: undefined,
            });
        }
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 90_000);
