import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { harnessIncludeNames, resourceDirectoriesForTests } from "./inventory";
import { expandModes, parseTest262Metadata, scenarioSource } from "./metadata";
import {
    hostProtocolVersion,
    nativeArtifactManifestSha256,
    parseHostObservation,
    parseHostPreparation,
    requireCanonicalNativeTranscript,
    type HostPreparation,
    type HostRequest,
    type NativeArtifactAttestation,
} from "./protocol";
import { attestScenarioArtifactSet, auditNativeArtifactDelegation, judge, runPreparedNative } from "./run";
import {
    loadRegularFileSnapshot,
    requireTrackedRegularProjectFile,
    sha256Text,
    trackedProjectFiles,
} from "./model";
import {
    extractClauseCatalog,
    independentlyExtractChoiceMarkers,
    independentlyExtractClauseIds,
    isNormativeDefinitionBinding,
    isNormativeXrefBinding,
} from "./spec-catalog";
import { discoverE2eCaseManifest } from "../e2e/case-manifest";
import { requireCanonicalStressBinding } from "./matrix";
import { validatePropertyJUnit } from "../property/run";
import { buildEvidenceContainment, supervisedArguments } from "./process-supervision";
import { requireCanonicalMergedShards } from "./check-claim";
import { prepareNativeRequest } from "./native-host";
import ts from "typescript";
import { buildProgram, resolvePackageRoot } from "../../src/program";

describe("Test262 metadata and scenarios", () => {
    test("parses CRLF YAML and preserves exact negative phase/type", () => {
        const source = "/*---\r\nesid: sec-example\r\nflags: [async]\r\nnegative:\r\n  phase: parse\r\n  type: SyntaxError\r\n---*/\r\n0;\r\n";
        expect(parseTest262Metadata(source, "example.js")).toEqual({
            esid: "sec-example",
            es5id: undefined,
            es6id: undefined,
            features: [],
            flags: ["async"],
            includes: [],
            negative: { phase: "parse", type: "SyntaxError" },
        });
    });

    test("expands the official execution modes without count ladders", () => {
        const base = { features: [], flags: [], includes: [] };
        expect(expandModes(base, "default.js")).toEqual(["sloppy", "strict"]);
        expect(expandModes({ ...base, flags: ["onlyStrict"] }, "strict.js")).toEqual(["strict"]);
        expect(expandModes({ ...base, flags: ["noStrict"] }, "sloppy.js")).toEqual(["sloppy"]);
        expect(expandModes({ ...base, flags: ["module", "raw"] }, "module.js")).toEqual(["module"]);
        expect(expandModes({ ...base, flags: ["raw"] }, "raw.js")).toEqual(["raw"]);
        expect(() => expandModes({ ...base, flags: ["raw", "noStrict"] }, "raw-sloppy.js")).toThrow("redundant combination");
        expect(() => expandModes({ ...base, flags: ["raw", "async"] }, "invalid.js")).toThrow("forbids harness injection");
        expect(scenarioSource("value;", "strict")).toBe('"use strict";\nvalue;');
        expect(scenarioSource("value;", "raw")).toBe("value;");
    });

    test("orders harness scripts and leaves raw tests unmodified", () => {
        expect(harnessIncludeNames(["async"], ["compareArray.js"])).toEqual([
            "assert.js",
            "sta.js",
            "doneprintHandle.js",
            "compareArray.js",
        ]);
        expect(harnessIncludeNames(["raw"], ["compareArray.js"])).toEqual([]);
        expect(parseTest262Metadata("/*---\nincludes: [assert.js, assert.js]\n---*/", "ordered.js").includes).toEqual([
            "assert.js",
            "assert.js",
        ]);
        expect(() => parseTest262Metadata(
            "/*---\nnegative: { phase: parse, type: SyntaxError, extra: invalid }\n---*/",
            "negative-extra.js",
        )).toThrow("exactly phase and type");
        expect(() => parseTest262Metadata(
            "/*---\nnegative: { type: SyntaxError, phase: parse }\n---*/",
            "negative-order.js",
        )).toThrow("phase must precede type");
    });

    test("builds one canonical sibling-resource directory independently of source shape", () => {
        expect(resourceDirectoriesForTests([
            "test/example/root.js",
            "test/example/computed-import.js",
        ], [
            { path: "test/example/root.js", sha256: "root" },
            { path: "test/example/computed-import.js", sha256: "computed" },
            { path: "test/example/ordinary-sibling.js", sha256: "module" },
            { path: "test/example/data_FIXTURE.json", sha256: "json" },
            { path: "test/other/not-visible.js", sha256: "other" },
        ])).toEqual([{
            directory: "test/example",
            files: [
                { path: "test/example/computed-import.js", sha256: "computed" },
                { path: "test/example/data_FIXTURE.json", sha256: "json" },
                { path: "test/example/ordinary-sibling.js", sha256: "module" },
                { path: "test/example/root.js", sha256: "root" },
            ],
        }]);
        expect(resourceDirectoriesForTests(["test/empty/root.js"], [])).toEqual([
            { directory: "test/empty", files: [] },
        ]);
    });
});

describe("host result contract", () => {
    test("ignores editor-only @ts-check metadata only for exact host roots", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-native-check-js-self-test-"));
        const entry = path.join(root, "checked.js");
        const source = "// @ts-check\nfunction identity(value) { return value; }\nidentity(1);\n";
        await fs.writeFile(entry, source);
        try {
            const ordinary = buildProgram({ entry, packageRoot: resolvePackageRoot() });
            expect(ts.getPreEmitDiagnostics(ordinary.program).some((diagnostic) => diagnostic.code === 7006)).toBe(true);

            const hostScoped = buildProgram({
                entry,
                packageRoot: resolvePackageRoot(),
                ignoreCheckJsDirectiveRoots: [entry],
            });
            expect(ts.getPreEmitDiagnostics(hostScoped.program).some((diagnostic) => diagnostic.code === 7006)).toBe(false);
            expect(hostScoped.entrySourceFile.text).toBe(source);
        } finally {
            await fs.rm(root, { recursive: true, force: true });
        }
    });

    test("prepares separate global Scripts as one runner-owned native observation", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-native-host-self-test-"));
        const artifactDirectory = path.join(root, "artifacts");
        await fs.mkdir(artifactDirectory);
        const setupSource = [
            "// @ts-check",
            "function HarnessError(message) {",
            "  if (!(this instanceof HarnessError)) return new HarnessError(message);",
            "  this.message = message || '';",
            "}",
            "HarnessError.prototype.describe = function () { return 'HarnessError: ' + this.message; };",
            "function add(left, right) { return left + right; }",
            "",
        ].join("\n");
        const testSource = [
            "var error = HarnessError('native');",
            "if (!(error instanceof HarnessError)) throw new TypeError('bad function prototype');",
            "if (error.describe() !== 'HarnessError: native') throw new TypeError('bad function this');",
            "if (add(20, 22) !== 42) throw new TypeError('bad setup realm');",
            "print('native-ok');",
            "",
        ].join("\n");
        const scenarioId = "test/native-host-separate-scripts.js#sloppy";
        const request: HostRequest = {
            protocolVersion: hostProtocolVersion,
            scenarioId,
            testPath: "test/native-host-separate-scripts.js",
            moduleBasePath: "test",
            moduleFiles: [],
            mode: "sloppy",
            goal: "script",
            raw: false,
            setupScripts: [{
                path: "harness/native-host-setup.js",
                sha256: sha256Text(setupSource),
                source: setupSource,
            }],
            testSource,
            testSourceSha256: sha256Text(testSource),
            async: false,
            canBlock: null,
            timeoutMs: 30_000,
            artifactDirectory,
        };
        try {
            const preparation = await prepareNativeRequest(request);
            expect(preparation.kind).toBe("prepared-native");
            if (preparation.kind !== "prepared-native") return;
            const attestations = await attestScenarioArtifactSet(artifactDirectory, preparation.artifactPaths);
            await auditNativeArtifactDelegation(
                artifactDirectory,
                attestations,
                path.join(artifactDirectory, preparation.generatedCPath),
                path.join(artifactDirectory, preparation.executablePath),
            );
            const generated = await fs.readFile(path.join(artifactDirectory, preparation.generatedCPath), "utf8");
            expect(generated).toContain("native-host-setup.js");
            expect(generated).toContain("native-host-separate-scripts.js");

            const child = Bun.spawn([path.join(artifactDirectory, preparation.executablePath)], {
                stdout: "pipe",
                stderr: "pipe",
            });
            const [exitCode, stdout, stderr] = await Promise.all([
                child.exited,
                new Response(child.stdout).text(),
                new Response(child.stderr).text(),
            ]);
            expect(exitCode).toBe(0);
            expect(stderr).toBe("");
            expect(parseHostObservation(JSON.parse(stdout))).toEqual({
                protocolVersion: hostProtocolVersion,
                scenarioId,
                kind: "normal",
                asyncCompletion: undefined,
                stdout: "native-ok\n",
                stderr: undefined,
                nativeTranscript: undefined,
            });
        } finally {
            await fs.rm(root, { recursive: true, force: true });
        }
    }, 60_000);

    test("returns an attested compiler observation for an exact root parse failure", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-native-parse-self-test-"));
        const artifactDirectory = path.join(root, "artifacts");
        await fs.mkdir(artifactDirectory);
        const testSource = "function broken( {\n";
        const request: HostRequest = {
            protocolVersion: hostProtocolVersion,
            scenarioId: "test/native-host-parse.js#raw",
            testPath: "test/native-host-parse.js",
            moduleBasePath: "test",
            moduleFiles: [],
            mode: "raw",
            goal: "script",
            raw: true,
            setupScripts: [],
            testSource,
            testSourceSha256: sha256Text(testSource),
            async: false,
            canBlock: null,
            timeoutMs: 30_000,
            artifactDirectory,
        };
        try {
            const preparation = await prepareNativeRequest(request);
            expect(preparation.kind).toBe("compiler-error");
            if (preparation.kind !== "compiler-error") return;
            expect(preparation.observation).toMatchObject({
                kind: "throw",
                phase: "parse",
                origin: "test-source",
                errorConstructor: "SyntaxError",
            });
            expect(await fs.readFile(path.join(artifactDirectory, preparation.diagnosticsPath), "utf8"))
                .toContain("native-host-parse.js");
        } finally {
            await fs.rm(root, { recursive: true, force: true });
        }
    });

    test("requires one canonical exact-byte identity for every merged shard", () => {
        const canonical = [
            { index: 0, total: 2, sha256: "a".repeat(64) },
            { index: 1, total: 2, sha256: "b".repeat(64) },
        ];
        expect(requireCanonicalMergedShards(canonical)).toEqual(canonical);
        expect(() => requireCanonicalMergedShards([
            canonical[0],
            { ...canonical[1], sha256: canonical[0].sha256 },
        ])).toThrow("invalid exact-byte identity");
        expect(() => requireCanonicalMergedShards([
            { ...canonical[0], total: 1 },
            canonical[1],
        ])).toThrow("invalid exact-byte identity");
    });
    test("accepts only structured phases and exact negative constructors", () => {
        const observation = parseHostObservation({
            protocolVersion: hostProtocolVersion,
            scenarioId: "negative.js#strict",
            kind: "throw",
            phase: "parse",
            origin: "test-source",
            errorConstructor: "SyntaxError",
        });
        expect(judge(
            { id: "negative.js#strict", negative: { phase: "parse", type: "SyntaxError" }, async: false },
            observation,
        ).status).toBe("pass");
        expect(judge(
            { id: "negative.js#strict", negative: { phase: "runtime", type: "SyntaxError" }, async: false },
            observation,
        ).status).toBe("fail");
        expect(() => parseHostObservation({
            protocolVersion: hostProtocolVersion,
            scenarioId: "negative.js#strict",
            kind: "throw",
            phase: "early",
            origin: "test-source",
            errorConstructor: "SyntaxError",
        })).toThrow("invalid phase");
        expect(() => parseHostObservation({
            protocolVersion: hostProtocolVersion,
            scenarioId: "forged.js#sloppy",
            kind: "pass",
            detail: "authored verdict",
        })).toThrow("unknown kind");
        const setupFailure = parseHostObservation({
            protocolVersion: hostProtocolVersion,
            scenarioId: "negative.js#strict",
            kind: "throw",
            phase: "runtime",
            origin: "setup-script",
            errorConstructor: "TypeError",
        });
        expect(judge(
            { id: "negative.js#strict", negative: { phase: "runtime", type: "TypeError" }, async: false },
            setupFailure,
        ).status).toBe("fail");
        const dependencyParseFailure = parseHostObservation({
            protocolVersion: hostProtocolVersion,
            scenarioId: "negative.js#strict",
            kind: "throw",
            phase: "parse",
            origin: "module-graph",
            errorConstructor: "SyntaxError",
        });
        expect(judge(
            { id: "negative.js#strict", negative: { phase: "parse", type: "SyntaxError" }, async: false },
            dependencyParseFailure,
        ).status).toBe("fail");
        const doneFailure = parseHostObservation({
            protocolVersion: hostProtocolVersion,
            scenarioId: "negative-async.js#sloppy",
            kind: "throw",
            phase: "runtime",
            origin: "async-completion",
            errorConstructor: "TypeError",
        });
        expect(judge(
            { id: "negative-async.js#sloppy", negative: { phase: "runtime", type: "TypeError" }, async: true },
            doneFailure,
        ).status).toBe("fail");
    });

    test("requires the exact asynchronous completion marker", () => {
        const withoutMarker = parseHostObservation({
            protocolVersion: hostProtocolVersion,
            scenarioId: "async.js#sloppy",
            kind: "normal",
        });
        const withMarker = parseHostObservation({
            protocolVersion: hostProtocolVersion,
            scenarioId: "async.js#sloppy",
            kind: "normal",
            asyncCompletion: "Test262:AsyncTestComplete",
        });
        expect(judge({ id: "async.js#sloppy", async: true }, withoutMarker).status).toBe("fail");
        expect(judge({ id: "async.js#sloppy", async: true }, withMarker).status).toBe("pass");
    });

    test("accepts only runner-authored transcripts bound to the canonical artifact manifest", () => {
        const digestA = "a".repeat(64);
        const digestB = "b".repeat(64);
        const artifacts: NativeArtifactAttestation[] = [
            { path: "generated.c", sha256: digestA, size: 10 },
            { path: "program", sha256: digestB, size: 20 },
        ];
        const withoutTranscript = parseHostObservation({
            protocolVersion: hostProtocolVersion,
            scenarioId: "native.js#strict",
            kind: "normal",
        });
        expect(() => requireCanonicalNativeTranscript(withoutTranscript, {
            requestIdentitySha256: digestA,
            implementationSha256: digestB,
            processSupervisorSha256: digestA,
            nativeExecutionGuardSha256: digestB,
        })).toThrow("lacks the exact runner-attested native request/implementation transcript");

        const runnerObservation = parseHostObservation({
            protocolVersion: hostProtocolVersion,
            scenarioId: "native.js#strict",
            kind: "normal",
            nativeTranscript: {
                contract: "tsc2c-runner-owned-native-v1",
                attestationSource: "runner",
                requestIdentitySha256: digestA,
                implementationSha256: digestB,
                containmentContract: "linux-subreaper-seccomp-v1",
                processSupervisorSha256: digestA,
                nativeExecutionGuardSha256: digestB,
                observationSource: "native-binary",
                compileExitCode: 0,
                artifacts,
                artifactManifestSha256: nativeArtifactManifestSha256(artifacts),
                generatedCPath: "generated.c",
                executablePath: "program",
                diagnosticsPath: null,
                runExitCode: 0,
                semanticDelegation: false,
            },
        });
        expect(() => requireCanonicalNativeTranscript(runnerObservation, {
            requestIdentitySha256: digestA,
            implementationSha256: digestB,
            processSupervisorSha256: digestA,
            nativeExecutionGuardSha256: digestB,
        })).not.toThrow();

        expect(() => parseHostObservation({
            protocolVersion: hostProtocolVersion,
            scenarioId: "native.js#strict",
            kind: "normal",
            nativeTranscript: {
                contract: "tsc2c-runner-owned-native-v1",
                attestationSource: "runner",
                requestIdentitySha256: digestA,
                implementationSha256: digestB,
                containmentContract: "linux-subreaper-seccomp-v1",
                processSupervisorSha256: digestA,
                nativeExecutionGuardSha256: digestB,
                observationSource: "native-binary",
                compileExitCode: 0,
                artifacts,
                artifactManifestSha256: digestA,
                generatedCPath: "generated.c",
                executablePath: "program",
                diagnosticsPath: null,
                runExitCode: 0,
                semanticDelegation: false,
            },
        })).toThrow("identity/status is invalid");

        expect(() => parseHostPreparation({
            protocolVersion: hostProtocolVersion,
            scenarioId: "native.js#strict",
            kind: "diagnostic-observation",
            observation: runnerObservation,
        })).toThrow("carry no native transcript");

        expect(parseHostPreparation({
            protocolVersion: hostProtocolVersion,
            scenarioId: "native.js#strict",
            kind: "prepared-native",
            compileExitCode: 0,
            generatedCPath: "generated.c",
            executablePath: "program",
            artifactPaths: ["generated.c", "program"],
        }).kind).toBe("prepared-native");
    });

    test("runner independently hashes one exact artifact worklist", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-artifact-self-test-"));
        try {
            await fs.writeFile(path.join(root, "generated.c"), "int main(void) { return 0; }\n");
            await fs.writeFile(path.join(root, "program"), "not-an-executable-placeholder\n");
            const attested = await attestScenarioArtifactSet(root, ["generated.c", "program"]);
            expect(attested.map((entry) => entry.path)).toEqual(["generated.c", "program"]);
            expect(attested.every((entry) => /^[0-9a-f]{64}$/.test(entry.sha256))).toBeTrue();
            await fs.writeFile(path.join(root, "host-authored-extra"), "forged\n");
            await expect(attestScenarioArtifactSet(root, ["generated.c", "program"]))
                .rejects.toThrow("extra file");
        } finally {
            await fs.rm(root, { recursive: true, force: true });
        }
    });

    test("runner, not the preparer, launches and attests the native observation", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-native-runner-self-test-"));
        const containmentRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-containment-self-test-"));
        const scenarioId = "runner-owned-native.js#sloppy";
        const generatedCPath = path.join(root, "generated.c");
        const executablePath = path.join(root, "program");
        const nativeJson = JSON.stringify({
            protocolVersion: hostProtocolVersion,
            scenarioId,
            kind: "normal",
        });
        const escaped = nativeJson.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
        try {
            await fs.writeFile(
                generatedCPath,
                `#define _GNU_SOURCE\n#include <errno.h>\n#include <stdio.h>\n#include <sys/syscall.h>\n#include <unistd.h>\nextern char **environ;\nint main(void) { char *const arguments[] = { (char *)"true", NULL }; if (syscall(SYS_execve, "/bin/true", arguments, environ) != -1 || errno != EPERM) return 9; fputs("${escaped}", stdout); return 0; }\n`,
            );
            const compiler = Bun.spawn(["gcc", generatedCPath, "-o", executablePath], {
                stdout: "pipe",
                stderr: "pipe",
            });
            const compilerExit = await compiler.exited;
            expect(compilerExit).toBe(0);

            const request: HostRequest = {
                protocolVersion: hostProtocolVersion,
                scenarioId,
                testPath: "test/runner-owned-native.js",
                moduleBasePath: "test",
                moduleFiles: [],
                mode: "sloppy",
                goal: "script",
                raw: false,
                setupScripts: [],
                testSource: "0;",
                testSourceSha256: "a".repeat(64),
                async: false,
                canBlock: null,
                timeoutMs: 5_000,
                artifactDirectory: root,
            };
            const preparation: Extract<HostPreparation, { kind: "prepared-native" }> = {
                protocolVersion: hostProtocolVersion,
                scenarioId,
                kind: "prepared-native",
                compileExitCode: 0,
                generatedCPath: "generated.c",
                executablePath: "program",
                artifactPaths: ["generated.c", "program"],
            };
            const containment = await buildEvidenceContainment(containmentRoot, "gcc", process.env);
            const result = await runPreparedNative(
                request,
                preparation,
                { id: scenarioId, async: false },
                5_000,
                process.env,
                "b".repeat(64),
                containment,
            );
            expect(result.status).toBe("pass");
            expect(result.observation.nativeTranscript?.attestationSource).toBe("runner");
            expect(result.observation.nativeTranscript?.observationSource).toBe("native-binary");
            expect(result.observation.nativeTranscript?.artifacts.map((entry) => entry.path))
                .toEqual(["generated.c", "program"]);
        } finally {
            await fs.chmod(root, 0o700).catch(() => undefined);
            await fs.rm(root, { recursive: true, force: true });
            await fs.rm(containmentRoot, { recursive: true, force: true });
        }
    });

    test("subreaper fails closed when a command leaves a detached descendant", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-supervisor-self-test-"));
        try {
            const source = path.join(root, "leaker.c");
            const executable = path.join(root, "leaker");
            await fs.writeFile(source, "#include <unistd.h>\n#include <sys/types.h>\nint main(void) { pid_t child = fork(); if (child < 0) return 2; if (child == 0) { if (setsid() < 0) return 3; sleep(30); return 0; } return 0; }\n");
            const compiler = Bun.spawn(["gcc", source, "-o", executable], { stdout: "pipe", stderr: "pipe" });
            expect(await compiler.exited).toBe(0);
            const containment = await buildEvidenceContainment(path.join(root, "containment"), "gcc", process.env);
            const supervised = Bun.spawn([
                containment.supervisorPath,
                ...supervisedArguments(5_000, executable, []),
            ], { stdout: "pipe", stderr: "pipe" });
            expect(await supervised.exited).toBe(126);
            expect(await new Response(supervised.stderr).text()).toContain("left a surviving descendant");
        } finally {
            await fs.rm(root, { recursive: true, force: true });
        }
    });

    test("native audit rejects execution before the runner guard constructor", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-preinit-self-test-"));
        try {
            const source = path.join(root, "generated.c");
            const executable = path.join(root, "program");
            await fs.writeFile(source, "static void before_guard(void) {}\n__attribute__((section(\".preinit_array\"), used)) static void (*const preinit)(void) = before_guard;\nint main(void) { return 0; }\n");
            const compiler = Bun.spawn(["gcc", source, "-o", executable], { stdout: "pipe", stderr: "pipe" });
            expect(await compiler.exited).toBe(0);
            const artifacts = await attestScenarioArtifactSet(root, ["generated.c", "program"]);
            await expect(auditNativeArtifactDelegation(root, artifacts, source, executable))
                .rejects.toThrow("forbidden ELF dynamic tag");
        } finally {
            await fs.rm(root, { recursive: true, force: true });
        }
    });
});

describe("local evidence worklist", () => {
    test("accepts dotted names but rejects untracked or traversing evidence inputs", async () => {
        const tracked = await trackedProjectFiles();
        await expect(requireTrackedRegularProjectFile(
            "tests/e2e/cases/dynamic_require_static_string_padding/..pad.ts",
            tracked,
            "dotted E2E input",
        )).resolves.toBeUndefined();
        await expect(requireTrackedRegularProjectFile(
            "tests/property/node_modules/forged.property.test.ts",
            tracked,
            "untracked property dependency",
        )).rejects.toThrow("not a normalized tracked project file");
        await expect(requireTrackedRegularProjectFile(
            "tests/property/../test262/self.test.ts",
            tracked,
            "traversing property dependency",
        )).rejects.toThrow("not a normalized tracked project file");

        const root = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-exact-report-"));
        try {
            const report = path.join(root, "report.json");
            const link = path.join(root, "report-link.json");
            const raw = '{\n  "exact": true\n}\n';
            await fs.writeFile(report, raw);
            await fs.symlink(report, link);
            const loaded = await loadRegularFileSnapshot(report, "test report");
            expect(loaded.bytes.toString("utf8")).toBe(raw);
            expect(loaded.sha256).toBe(sha256Text(raw));
            await expect(loadRegularFileSnapshot(link, "test report")).rejects.toThrow(
                "must be a regular non-symbolic-link file",
            );
        } finally {
            await fs.rm(root, { recursive: true, force: true });
        }
    });

    test("admits only executable E2E cases and binds negative diagnostics", async () => {
        const manifest = await discoverE2eCaseManifest();
        expect(manifest.some((entry) => entry.name === "_probe_async_string_raw_selector")).toBeFalse();
        const negative = manifest.find((entry) => entry.name === "async_cfg_fail_closed");
        expect(negative?.expectedExitCode).toBe(3);
        expect(negative?.expectedStderrContains).toContain("canonical CFG");
        expect(negative?.unsafeEval).toBeFalse();
        const serial = manifest.find((entry) => entry.name === "dispatch_serial");
        expect(serial?.dispatch).toBeTrue();
        expect(serial?.dispatchSerial).toBeTrue();
        expect(serial?.dispatchNoGc).toBeFalse();
        const noGc = manifest.find((entry) => entry.name === "dispatch_no_gc");
        expect(noGc?.dispatch).toBeTrue();
        expect(noGc?.dispatchSerial).toBeFalse();
        expect(noGc?.dispatchNoGc).toBeTrue();
        const nativeAddon = manifest.find((entry) => entry.name === "native_addon_manifest_import");
        expect(nativeAddon?.nativeAddon).toBeTrue();
        expect(nativeAddon?.semanticDelegation).toBeTrue();
        const generatedStress = manifest.find((entry) => entry.name === "async_cfg_suspending_binding_default_depth");
        const stressReview = {
            dimension: "nested binding-default depth in one canonical CFG",
            parameter: "depth",
            representativeHighDepth: 64,
            rationale: "Exercises the general binding worklist well beyond ordinary source depth.",
            reviewedBy: "compliance-review",
        };
        expect(() => requireCanonicalStressBinding(generatedStress, stressReview)).not.toThrow();
        expect(() => requireCanonicalStressBinding(generatedStress, {
            ...stressReview,
            representativeHighDepth: 63,
        })).toThrow("does not equal the canonical generated input value");
        expect(() => requireCanonicalStressBinding(
            manifest.find((entry) => entry.name === "hello"),
            stressReview,
        )).toThrow("must name one exact generated positive native runtime case");
    });

    test("requires every property file to execute without skips or todos", () => {
        const cwd = "/project";
        const file = "/project/tests/property/example.property.test.ts";
        expect(() => validatePropertyJUnit(
            '<testsuites tests="1" failures="0" skipped="0"><testcase file="tests/property/example.property.test.ts" /></testsuites>',
            [file],
            cwd,
        )).not.toThrow();
        expect(() => validatePropertyJUnit(
            '<testsuites tests="1" failures="0" skipped="1"><testcase file="tests/property/example.property.test.ts"><skipped /></testcase></testsuites>',
            [file],
            cwd,
        )).toThrow("zero failures, skips, or todos");
        expect(() => validatePropertyJUnit(
            '<testsuites tests="1" failures="0" skipped="0"><testcase file="tests/property/example.property.test.ts"><skipped message="TODO" /></testcase></testsuites>',
            [file],
            cwd,
        )).toThrow("zero failures, skips, or todos");
        expect(() => validatePropertyJUnit(
            '<testsuites tests="1" failures="0" skipped="0"><testcase file="tests/property/other.property.test.ts" /></testsuites>',
            [file],
            cwd,
        )).toThrow("executed no test cases");
    });
});

describe("pinned specification catalog", () => {
    test("maps canonical, legacy, element, and grammar-production anchors", () => {
        const source = [
            '<emu-clause id="sec-root"><h1>Root</h1>',
            '<emu-clause id="sec-child" oldids="sec-old" namespace="annexB"><h1>Child</h1>',
            '<emu-xref href="#sec-root"></emu-xref>',
            '<emu-note id="note-anchor"></emu-note>',
            '<emu-grammar type="definition">Thing : `x`</emu-grammar>',
            "</emu-clause></emu-clause>",
        ].join("\n");
        const catalog = extractClauseCatalog(source);
        expect(independentlyExtractClauseIds(source)).toEqual(["sec-child", "sec-root"]);
        expect(catalog.clauses.map((clause) => clause.id)).toEqual(["sec-root", "sec-child"]);
        expect(catalog.clauses[1]?.references).toEqual(["sec-root"]);
        expect(new Map(catalog.anchors.map((anchor) => [anchor.id, anchor.clauseId]))).toEqual(new Map([
            ["note-anchor", "sec-child"],
            ["prod-annexB-Thing", "sec-child"],
            ["sec-child", "sec-child"],
            ["sec-old", "sec-child"],
            ["sec-root", "sec-root"],
        ]));
    });

    test("proves the specification-choice marker set with an independent HTML traversal", () => {
        const source = [
            '<emu-clause id="sec-root" type="host-defined abstract operation"><h1>Root</h1>',
            "<p>An implementation-defined selection.</p>",
            "<!-- an implementation-approximated comment is not normative text -->",
            '<emu-clause id="sec-child"><h1>Child</h1><p>An implementation-approximated result.</p></emu-clause>',
            "</emu-clause>",
        ].join("\n");
        const catalog = extractClauseCatalog(source);
        expect(catalog.choiceObligations
            .map(({ sourceClauseId: clauseId, kind, sourceOffset }) => ({ clauseId, kind, sourceOffset }))
            .sort((left, right) => left.sourceOffset - right.sourceOffset)).toEqual(
            independentlyExtractChoiceMarkers(source),
        );
        expect(catalog.choiceObligations
            .map(({ sourceClauseId, kind, sourceOffset }) => ({ sourceClauseId, kind, sourceOffset }))
            .sort((left, right) => left.sourceOffset - right.sourceOffset)
            .map(({ sourceClauseId, kind }) => [sourceClauseId, kind])).toEqual([
            ["sec-root", "host-defined"],
            ["sec-root", "implementation-defined"],
            ["sec-child", "implementation-approximated"],
        ]);
    });

    test("propagates optional and informative clause classification to descendants", () => {
        const source = [
            '<emu-clause id="sec-optional" normative-optional><h1>Optional</h1>',
            '<emu-clause id="sec-optional-child"><h1>Optional child</h1></emu-clause>',
            "</emu-clause>",
            '<emu-annex id="sec-info"><h1>Information</h1>',
            '<emu-clause id="sec-info-child"><h1>Information child</h1></emu-clause>',
            "</emu-annex>",
        ].join("\n");
        expect(extractClauseCatalog(source).clauses.map((clause) => [clause.id, clause.classification])).toEqual([
            ["sec-optional", "normative-optional"],
            ["sec-optional-child", "normative-optional"],
            ["sec-info", "informative"],
            ["sec-info-child", "informative"],
        ]);
    });

    test("binds structural inheritance only to exact normative xrefs and definitions", () => {
        const source = [
            '<emu-clause id="sec-target"><h1>Target</h1><p>A <dfn id="target-term">target term</dfn>.</p></emu-clause>',
            '<emu-clause id="sec-source"><h1>Source</h1>',
            '<p>Normative <emu-xref href="#sec-target"></emu-xref>.</p>',
            '<emu-note><p>Note-only <emu-xref href="#sec-target"></emu-xref>.</p></emu-note>',
            '<emu-grammar type="definition">Thing :: `x`</emu-grammar>',
            '<emu-grammar type="definition" example>Example :: `y`</emu-grammar>',
            '</emu-clause>',
        ].join("\n");
        const catalog = extractClauseCatalog(source);
        const normativeXref = catalog.xrefs.find((xref) => xref.provenance === "normative")!;
        const noteXref = catalog.xrefs.find((xref) => xref.provenance === "note")!;
        expect(isNormativeXrefBinding(normativeXref, "sec-source", "sec-target")).toBeTrue();
        expect(isNormativeXrefBinding(noteXref, "sec-source", "sec-target")).toBeFalse();
        expect(isNormativeXrefBinding(normativeXref, "sec-target", "sec-source")).toBeFalse();

        const grammarDefinition = catalog.definitions.find((definition) =>
            definition.kind === "grammar-definition" && definition.provenance === "normative"
        )!;
        const exampleDefinition = catalog.definitions.find((definition) => definition.provenance === "example")!;
        expect(isNormativeDefinitionBinding(grammarDefinition, "sec-source")).toBeTrue();
        expect(isNormativeDefinitionBinding(exampleDefinition, "sec-source")).toBeFalse();
        expect(isNormativeDefinitionBinding(grammarDefinition, "sec-target")).toBeFalse();

        const targetDefinition = catalog.definitions.find((definition) => definition.sourceAnchor === "target-term")!;
        const changedDefinitionContext = extractClauseCatalog(source.replace(
            "target term</dfn>.",
            "target term</dfn> with a materially changed normative rule.",
        )).definitions.find((definition) => definition.sourceAnchor === "target-term")!;
        expect(changedDefinitionContext.sourceOffset).toBe(targetDefinition.sourceOffset);
        expect(changedDefinitionContext.endOffset).toBe(targetDefinition.endOffset);
        expect(changedDefinitionContext.contextSha256).not.toBe(targetDefinition.contextSha256);
        expect(changedDefinitionContext.id).not.toBe(targetDefinition.id);
    });

    test("extracts clause, HTML, and algorithm normative-optional sites from one independently checked marker set", () => {
        const source = [
            '<emu-clause id="sec-optional" normative-optional><h1>Optional</h1></emu-clause>',
            '<emu-clause id="sec-required"><h1>Required</h1>',
            '<emu-alg>',
            '  1. [id="step-optional", normative-optional] If <emu-xref href="#sec-optional"></emu-xref>, then',
            '    1. Return *true*.',
            '  1. Return *false*.',
            '</emu-alg>',
            '<li><p>Required text<span normative-optional> unless <emu-xref href="#sec-optional"></emu-xref>:</span></p>',
            '<ul normative-optional><li>The condition is true.</li></ul></li>',
            "</emu-clause>",
        ].join("\n");
        const catalog = extractClauseCatalog(source);
        expect(catalog.normativeOptionalSites.map((site) => site.kind).sort()).toEqual([
            "algorithm-step",
            "clause-subtree",
            "html-subtree",
            "html-subtree",
        ]);
        for (const site of catalog.normativeOptionalSites) {
            expect(site.affectedClauseIds).toContain("sec-optional");
        }
        const algorithm = catalog.normativeOptionalSites.find((site) => site.kind === "algorithm-step")!;
        expect(algorithm.sourceAnchor).toBe("step-optional");
        expect(new Map(catalog.anchors.map((anchor) => [anchor.id, anchor.clauseId])).get("step-optional"))
            .toBe("sec-required");
        expect(catalog.normativeOptionalFamilies).toHaveLength(1);
        expect(catalog.normativeOptionalFamilies[0]?.siteIds.sort()).toEqual(
            catalog.normativeOptionalSites.map((site) => site.id).sort(),
        );

        const changedNestedStep = extractClauseCatalog(source.replace("Return *true*", "Return *null*"));
        const changedAlgorithm = changedNestedStep.normativeOptionalSites.find((site) => site.kind === "algorithm-step")!;
        expect(changedAlgorithm.sourceOffset).toBe(algorithm.sourceOffset);
        expect(changedAlgorithm.contextSha256).not.toBe(algorithm.contextSha256);
        expect(changedAlgorithm.id).not.toBe(algorithm.id);
        expect(changedNestedStep.normativeOptionalFamilies[0]?.id).not.toBe(catalog.normativeOptionalFamilies[0]?.id);
    });
});
