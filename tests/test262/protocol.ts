import type { NegativePhase, Test262Mode } from "./metadata";

export const hostProtocolVersion = 1 as const;

export interface HostDescription {
    protocolVersion: 1;
    profileId: string;
    semanticDelegation: boolean;
    capabilities: Record<string, boolean>;
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
    protocolVersion: 1;
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
}

export type HostObservation =
    | {
        protocolVersion: 1;
        scenarioId: string;
        kind: "normal";
        asyncCompletion?: "Test262:AsyncTestComplete";
        stdout?: string;
        stderr?: string;
    }
    | {
        protocolVersion: 1;
        scenarioId: string;
        kind: "throw";
        phase: NegativePhase;
        errorConstructor: string | null;
        stdout?: string;
        stderr?: string;
    }
    | {
        protocolVersion: 1;
        scenarioId: string;
        kind: "timeout" | "crash" | "unsupported" | "infrastructure-error";
        detail: string;
        stdout?: string;
        stderr?: string;
    };

function optionalOutput(value: unknown, field: "stdout" | "stderr"): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== "string") throw new Error(`host observation ${field} must be a string`);
    return value;
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
        return {
            protocolVersion: hostProtocolVersion,
            scenarioId: record.scenarioId,
            kind: "throw",
            phase: record.phase,
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
