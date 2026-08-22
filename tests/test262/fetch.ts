#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
    argumentValue,
    defaultCacheRoot,
    git,
    hasArgument,
    loadBaseline,
    pathExists,
    runProcess,
    sha256File,
    verifyPinnedCheckout,
} from "./model";

async function fetchPinned(repository: string, commit: string, destination: string): Promise<void> {
    await fs.mkdir(destination, { recursive: true });
    if (!(await pathExists(path.join(destination, ".git")))) {
        await checked("git", ["init", destination]);
        await checked("git", ["remote", "add", "origin", repository], destination);
    }
    const currentOrigin = await git(destination, ["remote", "get-url", "origin"]);
    if (currentOrigin !== repository) {
        throw new Error(`refusing to reuse ${destination}: origin is ${currentOrigin}, expected ${repository}`);
    }
    await checked("git", ["config", "core.autocrlf", "false"], destination);
    await checked("git", ["fetch", "--depth", "1", "origin", commit], destination);
    await checked(
        "git",
        ["-c", "advice.detachedHead=false", "checkout", "--detach", "--force", commit],
        destination,
    );
}

async function fetchAndVerifyReleaseTag(destination: string, tag: string, commit: string): Promise<void> {
    const localRef = `refs/tsc2c-baseline/${tag}`;
    await checked("git", ["fetch", "--force", "--depth", "1", "origin", `refs/tags/${tag}:${localRef}`], destination);
    const peeled = await git(destination, ["rev-parse", `${localRef}^{}`]);
    if (peeled !== commit) throw new Error(`ECMA-262 release tag ${tag} resolves to ${peeled}, expected ${commit}`);
}

async function checked(command: string, args: string[], cwd?: string): Promise<void> {
    const result = await runProcess(command, args, { cwd });
    if (result.code !== 0) {
        throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr.trim()}`);
    }
}

async function verifyFiles(test262: string, ecma262: string): Promise<void> {
    const baseline = await loadBaseline();
    await Promise.all([
        verifyPinnedCheckout("Test262", test262, baseline.test262),
        verifyPinnedCheckout("ECMA-262", ecma262, baseline.ecma262),
    ]);
    const test262Package = JSON.parse(await fs.readFile(path.join(test262, "package.json"), "utf8")) as {
        version?: unknown;
    };
    if (test262Package.version !== baseline.test262.packageVersion) {
        throw new Error(
            `Test262 package version ${String(test262Package.version)} does not match ${baseline.test262.packageVersion}`,
        );
    }
    const checks: Array<[string, string, string]> = [
        ["Test262 interpretation contract", path.join(test262, "INTERPRETING.md"), baseline.test262.interpretationSha256],
        ["Test262 feature registry", path.join(test262, "features.txt"), baseline.test262.featureRegistrySha256],
        ["ECMA-262 source", path.join(ecma262, baseline.ecma262.specSource), baseline.ecma262.specSourceSha256],
    ];
    for (const [label, filename, expected] of checks) {
        const actual = await sha256File(filename);
        if (actual !== expected) throw new Error(`${label} digest ${actual} does not match pin ${expected}`);
    }
    const releaseRef = `refs/tsc2c-baseline/${baseline.ecma262.tag}`;
    const releaseCommit = await git(ecma262, ["rev-parse", `${releaseRef}^{}`]);
    if (releaseCommit !== baseline.ecma262.commit) {
        throw new Error(`ECMA-262 release tag ${baseline.ecma262.tag} does not resolve to the pinned commit`);
    }
}

async function main(): Promise<void> {
    const baseline = await loadBaseline();
    const test262 = path.resolve(argumentValue("--test262") ?? path.join(defaultCacheRoot, "test262"));
    const ecma262 = path.resolve(argumentValue("--ecma262") ?? path.join(defaultCacheRoot, "ecma262"));
    if (!hasArgument("--verify-only")) {
        await fetchPinned(baseline.test262.repository, baseline.test262.commit, test262);
        await fetchPinned(baseline.ecma262.repository, baseline.ecma262.commit, ecma262);
        await fetchAndVerifyReleaseTag(ecma262, baseline.ecma262.tag, baseline.ecma262.commit);
    }
    await verifyFiles(test262, ecma262);
    console.log(`Pinned Test262 verified at ${test262}`);
    console.log(`Pinned ECMAScript 2026 specification verified at ${ecma262}`);
}

main().catch((error) => {
    console.error(`compliance fetch: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});
