import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export const projectRoot = path.resolve(import.meta.dir, "../..");
export const complianceDir = path.join(projectRoot, "compliance/ecmascript-2026");
export const defaultCacheRoot = path.join(projectRoot, "cache/compliance/ecmascript-2026");
export const defaultArtifactRoot = path.join(projectRoot, "artifacts/ecmascript-2026");

export interface Baseline {
    schemaVersion: number;
    claim: {
        standard: string;
        edition: number;
        name: string;
        published: string;
        wording: string;
        includesNormativeAnnexB: boolean;
        excludes: string[];
    };
    ecma262: PinnedRepository & {
        tag: string;
        specSource: string;
        specSourceSha256: string;
        clauseCatalogSha256: string;
    };
    test262: PinnedRepository & {
        packageVersion: string;
        interpretationSha256: string;
        featureRegistrySha256: string;
        discoveryRoots: string[];
        ecma402Roots: string[];
        ecma402FeatureTags: string[];
        postEditionFeatureTags: string[];
    };
    runnerContract: {
        version: number;
        requiredCapabilities: string[];
        allowedResultStatuses: string[];
        claimPassingStatus: "pass";
    };
    executionProfile: {
        id: string;
        platform: string;
        architecture: string;
        compiler: string;
        environment: Record<string, string>;
    };
    localGates: Array<{
        id: string;
        command: string[];
        environment?: Record<string, string>;
        timeoutMs: number;
    }>;
}

export interface PinnedRepository {
    repository: string;
    commit: string;
    tree: string;
}

export interface ProcessResult {
    code: number;
    stdout: string;
    stderr: string;
}

export async function readJson<T>(filename: string): Promise<T> {
    const raw = await fs.readFile(filename, "utf8");
    try {
        return JSON.parse(raw) as T;
    } catch (error) {
        throw new Error(`invalid JSON in ${filename}: ${String(error)}`);
    }
}

export async function loadBaseline(): Promise<Baseline> {
    return readJson<Baseline>(path.join(complianceDir, "baseline.json"));
}

export function stableJson(value: unknown): string {
    return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256Text(value: string | Uint8Array): string {
    return createHash("sha256").update(value).digest("hex");
}

export async function sha256File(filename: string): Promise<string> {
    return sha256Text(await fs.readFile(filename));
}

export async function fileManifestSha256(files: readonly string[], root = projectRoot): Promise<string> {
    const entries: Array<{ path: string; sha256: string }> = [];
    for (const filename of [...files].sort()) {
        const absolute = path.resolve(root, filename);
        if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error(`unsafe manifest path ${filename}`);
        entries.push({ path: filename.split(path.sep).join("/"), sha256: await sha256File(absolute) });
    }
    return sha256Text(JSON.stringify(entries));
}

export async function pathExists(filename: string): Promise<boolean> {
    try {
        await fs.access(filename);
        return true;
    } catch {
        return false;
    }
}

export function runProcess(
    command: string,
    args: readonly string[],
    options: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<ProcessResult> {
    return new Promise((resolve) => {
        const child = spawn(command, [...args], {
            cwd: options.cwd,
            env: options.env ?? process.env,
            stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const timer = options.timeoutMs === undefined
            ? undefined
            : setTimeout(() => {
                timedOut = true;
                child.kill("SIGKILL");
            }, options.timeoutMs);
        child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
        child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
        child.on("error", (error) => {
            if (timer) clearTimeout(timer);
            resolve({ code: 127, stdout, stderr: `${stderr}${String(error)}\n` });
        });
        child.on("close", (code) => {
            if (timer) clearTimeout(timer);
            resolve({
                code: timedOut ? 124 : (code ?? 1),
                stdout,
                stderr: timedOut ? `${stderr}process timed out\n` : stderr,
            });
        });
    });
}

export async function git(cwd: string, args: readonly string[]): Promise<string> {
    const result = await runProcess("git", args, { cwd });
    if (result.code !== 0) {
        throw new Error(`git ${args.join(" ")} failed in ${cwd}: ${result.stderr.trim()}`);
    }
    return result.stdout.trim();
}

function normalizeRepositoryUrl(value: string): string {
    return value.replace(/^git\+/, "").replace(/\.git$/, "").replace(/\/$/, "");
}

export async function verifyPinnedCheckout(
    label: "ECMA-262" | "Test262",
    checkout: string,
    pin: PinnedRepository,
): Promise<void> {
    if (!(await pathExists(path.join(checkout, ".git")))) {
        throw new Error(`${label} checkout is missing at ${checkout}`);
    }
    const [head, tree, origin, dirty, autocrlf] = await Promise.all([
        git(checkout, ["rev-parse", "HEAD"]),
        git(checkout, ["rev-parse", "HEAD^{tree}"]),
        git(checkout, ["remote", "get-url", "origin"]),
        git(checkout, ["status", "--porcelain", "--untracked-files=all"]),
        git(checkout, ["config", "--get", "core.autocrlf"]).catch(() => ""),
    ]);
    if (head !== pin.commit) {
        throw new Error(`${label} HEAD ${head} does not match pin ${pin.commit}`);
    }
    if (tree !== pin.tree) {
        throw new Error(`${label} tree ${tree} does not match pin ${pin.tree}`);
    }
    if (normalizeRepositoryUrl(origin) !== normalizeRepositoryUrl(pin.repository)) {
        throw new Error(`${label} origin ${origin} does not match ${pin.repository}`);
    }
    if (dirty !== "") {
        throw new Error(`${label} checkout is not clean:\n${dirty}`);
    }
    if (autocrlf !== "false") {
        throw new Error(`${label} checkout must set core.autocrlf=false so line-sensitive source bytes are preserved`);
    }
}

export async function projectSourceIdentity(): Promise<{
    commit: string;
    tree: string;
    clean: boolean;
    statusSha256: string;
}> {
    const [commit, tree, status] = await Promise.all([
        git(projectRoot, ["rev-parse", "HEAD"]),
        git(projectRoot, ["rev-parse", "HEAD^{tree}"]),
        git(projectRoot, ["status", "--porcelain", "--untracked-files=all"]),
    ]);
    return {
        commit,
        tree,
        clean: status === "",
        statusSha256: sha256Text(status),
    };
}

export function requireFullSha(value: unknown, label: string): asserts value is string {
    if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
        throw new Error(`${label} must be a lowercase 40-character Git SHA`);
    }
}

export function argumentValue(name: string): string | undefined {
    const index = process.argv.indexOf(name);
    if (index < 0) return undefined;
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
    return value;
}

export function hasArgument(name: string): boolean {
    return process.argv.includes(name);
}
