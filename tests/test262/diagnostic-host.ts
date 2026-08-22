#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { complianceDir, hasArgument, readJson } from "./model";
import { hostProtocolVersion, type HostDescription, type HostObservation, type HostRequest } from "./protocol";

interface HostProfile {
    id: string;
    semanticDelegation: boolean;
    capabilities: Record<string, boolean>;
}

async function profileDescription(): Promise<HostDescription> {
    const profile = await readJson<HostProfile>(path.join(complianceDir, "host-profile.json"));
    return {
        protocolVersion: hostProtocolVersion,
        profileId: profile.id,
        semanticDelegation: profile.semanticDelegation,
        capabilities: profile.capabilities,
    };
}

async function main(): Promise<void> {
    if (hasArgument("--describe")) {
        console.log(JSON.stringify(await profileDescription()));
        return;
    }
    const requestIndex = process.argv.indexOf("--request");
    const requestPath = requestIndex < 0 ? undefined : process.argv[requestIndex + 1];
    const input = requestPath ? await fs.readFile(requestPath, "utf8") : await Bun.stdin.text();
    const request = JSON.parse(input) as HostRequest;
    if (request.protocolVersion !== hostProtocolVersion || typeof request.scenarioId !== "string") {
        throw new Error("invalid Test262 host request");
    }
    const observation: HostObservation = {
        protocolVersion: hostProtocolVersion,
        scenarioId: request.scenarioId,
        kind: "infrastructure-error",
        detail:
            "tsc2c native host is diagnostic-only: separate same-Realm global Script setup, structured negative phases, module fixtures, async completion, and the required $262 hooks are not all implemented",
    };
    console.log(JSON.stringify(observation));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
