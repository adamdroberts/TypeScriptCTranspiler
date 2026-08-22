import { createHash } from "node:crypto";
import type { NegativePhase, Test262Mode } from "./metadata";

export const hostProtocolVersion = 4 as const;

export type HostExecutionContract = "diagnostic-only-v1" | "tsc2c-runner-owned-native-v1";

export interface HostDescription {
    protocolVersion: 4;
    profileId: string;
    semanticDelegation: boolean;
    capabilities: Record<string, boolean>;
    executionContract: HostExecutionContract;
    effectiveEnvironmentSha256: string;
}

export interface HostScript {
    path: string;
    sha256: string;
    source: string;
}

export interface HostModuleFile {
    path: string;
    sha256: string;
    encoding: "base64";
    data: string;
}

export interface HostRequest {
    protocolVersion: 4;
    scenarioId: string;
    testPath: string;
    moduleBasePath: string;
    moduleFiles: HostModuleFile[];
    mode: Test262Mode;
    goal: "script" | "module";
    raw: boolean;
    setupScripts: HostScript[];
    testSource: string;
    testSourceSha256: string;
    async: boolean;
    canBlock: boolean | null;
    timeoutMs: number;
    /** Ephemeral runner-owned output root. It is deliberately excluded from request identity. */
    artifactDirectory: string;
}

export interface NativeArtifactAttestation {
    path: string;
    sha256: string;
    size: number;
}

export interface NativeExecutionTranscript {
    contract: "tsc2c-runner-owned-native-v1";
    attestationSource: "runner";
    requestIdentitySha256: string;
    implementationSha256: string;
    containmentContract: "linux-subreaper-seccomp-v1";
    processSupervisorSha256: string;
    nativeExecutionGuardSha256: string | null;
    observationSource: "compiler" | "native-binary";
    compileExitCode: number;
    artifacts: NativeArtifactAttestation[];
    artifactManifestSha256: string;
    generatedCPath: string | null;
    executablePath: string | null;
    diagnosticsPath: string | null;
    runExitCode: number | null;
    semanticDelegation: false;
}

export type HostObservation =
    | {
        protocolVersion: 4;
        scenarioId: string;
        kind: "normal";
        asyncCompletion?: "Test262:AsyncTestComplete";
        stdout?: string;
        stderr?: string;
        nativeTranscript?: NativeExecutionTranscript;
    }
    | {
        protocolVersion: 4;
        scenarioId: string;
        kind: "throw";
        phase: NegativePhase;
        origin: "test-source" | "module-graph" | "setup-script" | "async-completion";
        errorConstructor: string | null;
        stdout?: string;
        stderr?: string;
        nativeTranscript?: NativeExecutionTranscript;
    }
    | {
        protocolVersion: 4;
        scenarioId: string;
        kind: "timeout" | "crash" | "unsupported" | "infrastructure-error";
        detail: string;
        stdout?: string;
        stderr?: string;
        nativeTranscript?: NativeExecutionTranscript;
    };

export type HostPreparation =
    | {
        protocolVersion: 4;
        scenarioId: string;
        kind: "prepared-native";
        compileExitCode: 0;
        generatedCPath: string;
        executablePath: string;
        artifactPaths: string[];
    }
    | {
        protocolVersion: 4;
        scenarioId: string;
        kind: "compiler-error";
        compileExitCode: number;
        diagnosticsPath: string;
        artifactPaths: string[];
        observation: HostObservation;
    }
    | {
        protocolVersion: 4;
        scenarioId: string;
        kind: "diagnostic-observation";
        observation: HostObservation;
    };

function sha256Json(value: unknown): string {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function exactKeys(record: Record<string, unknown>, expected: readonly string[], label: string): void {
    if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify([...expected].sort())) {
        throw new Error(`${label} fields differ from the canonical contract`);
    }
}

function canonicalRelativePath(value: unknown, label: string): string {
    if (typeof value !== "string") throw new Error(`${label} must be a string`);
    const segments = value.split("/");
    if (
        value === "" ||
        value.includes("\\") ||
        value.startsWith("/") ||
        segments.some((segment) => segment === "" || segment === "." || segment === "..")
    ) {
        throw new Error(`${label} must be a normalized relative path`);
    }
    return value;
}

function canonicalPathList(value: unknown, label: string): string[] {
    if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must be a non-empty array`);
    const paths = value.map((entry) => canonicalRelativePath(entry, `${label} entry`));
    if (new Set(paths).size !== paths.length) throw new Error(`${label} must not contain duplicates`);
    if (JSON.stringify(paths) !== JSON.stringify([...paths].sort())) throw new Error(`${label} must be sorted`);
    return paths;
}

function optionalOutput(value: unknown, field: "stdout" | "stderr"): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== "string") throw new Error(`host observation ${field} must be a string`);
    return value;
}

function parseArtifactAttestations(value: unknown): NativeArtifactAttestation[] {
    if (!Array.isArray(value) || value.length === 0) {
        throw new Error("runner native transcript artifacts must be a non-empty array");
    }
    const result = value.map((entry, index) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            throw new Error(`runner native transcript artifact ${index} must be an object`);
        }
        const record = entry as Record<string, unknown>;
        exactKeys(record, ["path", "sha256", "size"], "runner native transcript artifact");
        const artifactPath = canonicalRelativePath(record.path, "runner native transcript artifact path");
        if (typeof record.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(record.sha256)) {
            throw new Error("runner native transcript artifact SHA-256 is invalid");
        }
        if (!Number.isSafeInteger(record.size) || (record.size as number) < 0) {
            throw new Error("runner native transcript artifact size is invalid");
        }
        return { path: artifactPath, sha256: record.sha256, size: record.size as number };
    });
    if (new Set(result.map((entry) => entry.path)).size !== result.length) {
        throw new Error("runner native transcript artifact paths must be unique");
    }
    if (JSON.stringify(result) !== JSON.stringify([...result].sort((left, right) => left.path.localeCompare(right.path)))) {
        throw new Error("runner native transcript artifacts must be sorted by path");
    }
    return result;
}

function optionalNativeTranscript(value: unknown): NativeExecutionTranscript | undefined {
    if (value === undefined) return undefined;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("runner native transcript must be an object");
    }
    const record = value as Record<string, unknown>;
    exactKeys(record, [
        "artifactManifestSha256",
        "artifacts",
        "attestationSource",
        "compileExitCode",
        "containmentContract",
        "contract",
        "diagnosticsPath",
        "executablePath",
        "generatedCPath",
        "implementationSha256",
        "nativeExecutionGuardSha256",
        "observationSource",
        "requestIdentitySha256",
        "processSupervisorSha256",
        "runExitCode",
        "semanticDelegation",
    ], "runner native transcript");
    const artifacts = parseArtifactAttestations(record.artifacts);
    const optionalPath = (field: "generatedCPath" | "executablePath" | "diagnosticsPath"): string | null => {
        const candidate = record[field];
        return candidate === null ? null : canonicalRelativePath(candidate, `runner native transcript ${field}`);
    };
    if (
        record.contract !== "tsc2c-runner-owned-native-v1" ||
        record.attestationSource !== "runner" ||
        typeof record.requestIdentitySha256 !== "string" ||
        !/^[0-9a-f]{64}$/.test(record.requestIdentitySha256) ||
        typeof record.implementationSha256 !== "string" ||
        !/^[0-9a-f]{64}$/.test(record.implementationSha256) ||
        record.containmentContract !== "linux-subreaper-seccomp-v1" ||
        typeof record.processSupervisorSha256 !== "string" ||
        !/^[0-9a-f]{64}$/.test(record.processSupervisorSha256) ||
        !(record.nativeExecutionGuardSha256 === null ||
            (typeof record.nativeExecutionGuardSha256 === "string" && /^[0-9a-f]{64}$/.test(record.nativeExecutionGuardSha256))) ||
        !(record.observationSource === "compiler" || record.observationSource === "native-binary") ||
        !Number.isInteger(record.compileExitCode) ||
        !(record.runExitCode === null || Number.isInteger(record.runExitCode)) ||
        record.semanticDelegation !== false ||
        typeof record.artifactManifestSha256 !== "string" ||
        record.artifactManifestSha256 !== sha256Json(artifacts)
    ) {
        throw new Error("runner native transcript identity/status is invalid");
    }
    return {
        contract: "tsc2c-runner-owned-native-v1",
        attestationSource: "runner",
        requestIdentitySha256: record.requestIdentitySha256,
        implementationSha256: record.implementationSha256,
        containmentContract: "linux-subreaper-seccomp-v1",
        processSupervisorSha256: record.processSupervisorSha256,
        nativeExecutionGuardSha256: record.nativeExecutionGuardSha256 as string | null,
        observationSource: record.observationSource,
        compileExitCode: record.compileExitCode as number,
        artifacts,
        artifactManifestSha256: record.artifactManifestSha256,
        generatedCPath: optionalPath("generatedCPath"),
        executablePath: optionalPath("executablePath"),
        diagnosticsPath: optionalPath("diagnosticsPath"),
        runExitCode: record.runExitCode as number | null,
        semanticDelegation: false,
    };
}

export function nativeArtifactManifestSha256(artifacts: readonly NativeArtifactAttestation[]): string {
    return sha256Json(artifacts);
}

export function requireCanonicalNativeTranscript(
    observation: HostObservation,
    expected: {
        requestIdentitySha256: string;
        implementationSha256: string;
        processSupervisorSha256: string;
        nativeExecutionGuardSha256: string;
    },
): void {
    const transcript = observation.nativeTranscript;
    if (
        !transcript ||
        transcript.attestationSource !== "runner" ||
        transcript.requestIdentitySha256 !== expected.requestIdentitySha256 ||
        transcript.implementationSha256 !== expected.implementationSha256 ||
        transcript.containmentContract !== "linux-subreaper-seccomp-v1" ||
        transcript.processSupervisorSha256 !== expected.processSupervisorSha256 ||
        transcript.artifactManifestSha256 !== nativeArtifactManifestSha256(transcript.artifacts)
    ) {
        throw new Error("observation lacks the exact runner-attested native request/implementation transcript");
    }
    const paths = new Set(transcript.artifacts.map((entry) => entry.path));
    if (observation.kind === "normal" || (observation.kind === "throw" && observation.phase === "runtime")) {
        if (
            transcript.observationSource !== "native-binary" ||
            transcript.nativeExecutionGuardSha256 !== expected.nativeExecutionGuardSha256 ||
            transcript.compileExitCode !== 0 ||
            transcript.generatedCPath === null ||
            transcript.executablePath === null ||
            !paths.has(transcript.generatedCPath) ||
            !paths.has(transcript.executablePath) ||
            transcript.diagnosticsPath !== null ||
            transcript.runExitCode !== 0
        ) {
            throw new Error("runtime observation was not produced by a runner-attested native artifact");
        }
        return;
    }
    if (observation.kind === "throw" && (observation.phase === "parse" || observation.phase === "resolution")) {
        if (
            transcript.observationSource !== "compiler" ||
            transcript.nativeExecutionGuardSha256 !== null ||
            transcript.compileExitCode === 0 ||
            transcript.generatedCPath !== null ||
            transcript.executablePath !== null ||
            transcript.diagnosticsPath === null ||
            !paths.has(transcript.diagnosticsPath) ||
            transcript.runExitCode !== null
        ) {
            throw new Error("parse/resolution observation was not produced by a runner-attested compiler failure");
        }
        return;
    }
    throw new Error("non-terminal observations cannot carry claim-eligible native evidence");
}

export function parseHostObservation(value: unknown): HostObservation {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("host observation must be a JSON object");
    }
    const record = value as Record<string, unknown>;
    if (record.protocolVersion !== hostProtocolVersion || typeof record.scenarioId !== "string") {
        throw new Error("host observation protocol/scenario identity is invalid");
    }
    const output = {
        stdout: optionalOutput(record.stdout, "stdout"),
        stderr: optionalOutput(record.stderr, "stderr"),
        nativeTranscript: optionalNativeTranscript(record.nativeTranscript),
    };
    if (record.kind === "normal") {
        if (record.asyncCompletion !== undefined && record.asyncCompletion !== "Test262:AsyncTestComplete") {
            throw new Error("host normal observation has an invalid async completion marker");
        }
        return {
            protocolVersion: hostProtocolVersion,
            scenarioId: record.scenarioId,
            kind: "normal",
            asyncCompletion: record.asyncCompletion as "Test262:AsyncTestComplete" | undefined,
            ...output,
        };
    }
    if (record.kind === "throw") {
        if (!(record.phase === "parse" || record.phase === "resolution" || record.phase === "runtime")) {
            throw new Error(`host throw has invalid phase ${String(record.phase)}`);
        }
        if (!(typeof record.errorConstructor === "string" || record.errorConstructor === null)) {
            throw new Error("host throw errorConstructor must be a string or null");
        }
        if (!(
            record.origin === "test-source" ||
            record.origin === "module-graph" ||
            record.origin === "setup-script" ||
            record.origin === "async-completion"
        )) {
            throw new Error(`host throw has invalid origin ${String(record.origin)}`);
        }
        return {
            protocolVersion: hostProtocolVersion,
            scenarioId: record.scenarioId,
            kind: "throw",
            phase: record.phase,
            origin: record.origin,
            errorConstructor: record.errorConstructor,
            ...output,
        };
    }
    if (
        record.kind === "timeout" ||
        record.kind === "crash" ||
        record.kind === "unsupported" ||
        record.kind === "infrastructure-error"
    ) {
        if (typeof record.detail !== "string" || record.detail.trim() === "") {
            throw new Error(`host ${record.kind} observation needs a non-empty detail`);
        }
        return {
            protocolVersion: hostProtocolVersion,
            scenarioId: record.scenarioId,
            kind: record.kind,
            detail: record.detail,
            ...output,
        };
    }
    throw new Error(`host observation has unknown kind ${String(record.kind)}`);
}

export function parseHostPreparation(value: unknown): HostPreparation {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("host preparation must be a JSON object");
    }
    const record = value as Record<string, unknown>;
    if (record.protocolVersion !== hostProtocolVersion || typeof record.scenarioId !== "string") {
        throw new Error("host preparation protocol/scenario identity is invalid");
    }
    if (record.kind === "prepared-native") {
        exactKeys(record, [
            "artifactPaths",
            "compileExitCode",
            "executablePath",
            "generatedCPath",
            "kind",
            "protocolVersion",
            "scenarioId",
        ], "prepared-native response");
        const artifactPaths = canonicalPathList(record.artifactPaths, "prepared-native artifactPaths");
        const generatedCPath = canonicalRelativePath(record.generatedCPath, "prepared-native generatedCPath");
        const executablePath = canonicalRelativePath(record.executablePath, "prepared-native executablePath");
        if (
            record.compileExitCode !== 0 ||
            generatedCPath === executablePath ||
            !artifactPaths.includes(generatedCPath) ||
            !artifactPaths.includes(executablePath)
        ) {
            throw new Error("prepared-native response has an invalid compiler/artifact worklist");
        }
        return {
            protocolVersion: hostProtocolVersion,
            scenarioId: record.scenarioId,
            kind: "prepared-native",
            compileExitCode: 0,
            generatedCPath,
            executablePath,
            artifactPaths,
        };
    }
    if (record.kind === "compiler-error") {
        exactKeys(record, [
            "artifactPaths",
            "compileExitCode",
            "diagnosticsPath",
            "kind",
            "observation",
            "protocolVersion",
            "scenarioId",
        ], "compiler-error response");
        const artifactPaths = canonicalPathList(record.artifactPaths, "compiler-error artifactPaths");
        const diagnosticsPath = canonicalRelativePath(record.diagnosticsPath, "compiler-error diagnosticsPath");
        const observation = parseHostObservation(record.observation);
        if (
            !Number.isInteger(record.compileExitCode) ||
            (record.compileExitCode as number) === 0 ||
            !artifactPaths.includes(diagnosticsPath) ||
            observation.scenarioId !== record.scenarioId ||
            observation.nativeTranscript !== undefined ||
            observation.kind !== "throw" ||
            !(observation.phase === "parse" || observation.phase === "resolution")
        ) {
            throw new Error("compiler-error response does not describe an exact parse/resolution compiler failure");
        }
        return {
            protocolVersion: hostProtocolVersion,
            scenarioId: record.scenarioId,
            kind: "compiler-error",
            compileExitCode: record.compileExitCode as number,
            diagnosticsPath,
            artifactPaths,
            observation,
        };
    }
    if (record.kind === "diagnostic-observation") {
        exactKeys(record, ["kind", "observation", "protocolVersion", "scenarioId"], "diagnostic-observation response");
        const observation = parseHostObservation(record.observation);
        if (observation.scenarioId !== record.scenarioId || observation.nativeTranscript !== undefined) {
            throw new Error("diagnostic observation must match the scenario and carry no native transcript");
        }
        return {
            protocolVersion: hostProtocolVersion,
            scenarioId: record.scenarioId,
            kind: "diagnostic-observation",
            observation,
        };
    }
    throw new Error(`host preparation has unknown kind ${String(record.kind)}`);
}
