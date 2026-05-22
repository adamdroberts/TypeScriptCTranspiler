#!/usr/bin/env bun
import { execFile, execFileSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { compile } from "../../src/compile";

const execFileAsync = promisify(execFile);

function nodeExecPath(): string {
    if (process.env.TSC2C_NODE_EXEC) return process.env.TSC2C_NODE_EXEC;
    if (process.env.NVM_BIN) {
        const nvmNode = path.join(process.env.NVM_BIN, "node");
        if (fsSync.existsSync(nvmNode)) return nvmNode;
    }
    try {
        const fromPath = execFileSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).trim();
        if (fromPath) return fromPath;
    } catch {
        // fall through to the current runtime
    }
    return process.execPath;
}

function nodeIncludeDir(): string {
    const nodePath = nodeExecPath();
    return process.env.TSC2C_NODE_INCLUDE ??
        path.resolve(path.dirname(nodePath), "..", "include", "node");
}

function findLibnode(): string | null {
    const explicit = process.env.TSC2C_LIBNODE;
    if (explicit && fsSync.existsSync(explicit)) return explicit;
    const nodePath = nodeExecPath();
    const roots = [
        path.resolve(path.dirname(nodePath), ".."),
        "/usr",
        "/usr/local",
    ];
    for (const root of roots) {
        for (const libDir of [path.join(root, "lib"), path.join(root, "lib64")]) {
            try {
                const match = fsSync
                    .readdirSync(libDir)
                    .find((name) => /^libnode\.(so|dylib|a)(\.|$)/.test(name));
                if (match) return path.join(libDir, match);
            } catch {
                // try next directory
            }
        }
    }
    return null;
}

async function main(): Promise<void> {
    const includeDir = nodeIncludeDir();
    if (!fsSync.existsSync(path.join(includeDir, "node_api.h"))) {
        console.log("SKIP native addon smoke: Node headers not found; set TSC2C_NODE_INCLUDE");
        return;
    }
    if (!findLibnode()) {
        console.log("SKIP native addon smoke: libnode not found; set TSC2C_LIBNODE");
        return;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-native-addon-smoke-"));
    try {
        const releaseDir = path.join(root, "build", "Release");
        await fs.mkdir(releaseDir, { recursive: true });
        const addonC = path.join(root, "smoke_addon.c");
        const addonNode = path.join(releaseDir, "smoke.node");
        await fs.writeFile(addonC, `
#include <node_api.h>

static napi_value Init(napi_env env, napi_value exports) {
    napi_value answer;
    napi_create_int32(env, 4242, &answer);
    napi_set_named_property(env, exports, "answer", answer);

    napi_value label;
    napi_create_string_utf8(env, "native-addon-smoke", NAPI_AUTO_LENGTH, &label);
    napi_set_named_property(env, exports, "label", label);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
`, "utf8");
        await execFileAsync("gcc", [
            "-shared",
            "-fPIC",
            "-I",
            includeDir,
            addonC,
            "-o",
            addonNode,
        ]);

        const entry = path.join(root, "in.ts");
        const manifest = path.join(root, "native-addon-manifest.json");
        await fs.writeFile(entry, `
import addon from "./build/Release/smoke.node";

console.log("native smoke:", addon.answer, addon.label);
`, "utf8");
        await fs.writeFile(manifest, JSON.stringify({
            addons: {
                "./build/Release/smoke.node": "./build/Release/smoke.node",
            },
        }, null, 2), "utf8");

        const output = path.join(root, "out");
        const buildDir = path.join(root, "tsc2c-build");
        const result = await compile({
            entry,
            output,
            buildDir,
            noGc: true,
            nativeAddonManifest: manifest,
        });
        if (result.exitCode !== 0) {
            throw new Error(`tsc2c native addon smoke compile failed with exit ${result.exitCode}`);
        }

        const run = await execFileAsync(output, []);
        if (run.stdout !== "native smoke: 4242 native-addon-smoke\n") {
            throw new Error(`native addon smoke stdout mismatch: ${JSON.stringify(run.stdout)}`);
        }
        console.log("OK native addon smoke");
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
}

await main();
