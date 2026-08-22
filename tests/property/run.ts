#!/usr/bin/env bun
import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { propertyEvidenceFiles } from "./manifest";

export function validatePropertyJUnit(junit: string, files: readonly string[], cwd: string): void {
    const root = junit.match(/<testsuites\b([^>]*)>/i)?.[1] ?? "";
    const attribute = (attributes: string, name: string): number => {
        const raw = attributes.match(new RegExp(`\\b${name}="(\\d+)"`, "i"))?.[1];
        return raw === undefined ? Number.NaN : Number(raw);
    };
    const testcases = [...junit.matchAll(/<testcase\b[^>]*>/gi)];
    const suites = [...junit.matchAll(/<testsuite\b([^>]*)>/gi)].map((match) => match[1]!);
    if (
        !(attribute(root, "tests") > 0) ||
        attribute(root, "tests") !== testcases.length ||
        attribute(root, "failures") !== 0 ||
        attribute(root, "skipped") !== 0 ||
        /<(?:failure|error|skipped)\b/i.test(junit) ||
        suites.some((suite) =>
            !(attribute(suite, "tests") >= 0) ||
            attribute(suite, "failures") !== 0 ||
            attribute(suite, "skipped") !== 0,
        )
    ) {
        throw new Error("property evidence must execute tests with zero failures, skips, or todos");
    }
    const executedFiles = new Set(
        [...junit.matchAll(/<testcase\b[^>]*\bfile="([^"]+)"/gi)]
            .map((match) => path.resolve(cwd, match[1]!)),
    );
    const missing = files.find((filename) => !executedFiles.has(path.resolve(filename)));
    if (missing) throw new Error(`property specification executed no test cases: ${path.relative(cwd, missing)}`);
}

async function run(): Promise<void> {
    const files = await propertyEvidenceFiles();
    if (files.length === 0) {
        throw new Error("no *.property.test.ts specifications are registered");
    }

    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-property-"));
    const report = path.join(temporary, "junit.xml");
    try {
        const relativeFiles = files.map((filename) => `./${path.relative(process.cwd(), filename).split(path.sep).join("/")}`);
        const code = await new Promise<number>((resolve) => {
            const child = spawn("bun", [
                "test",
                "--no-orphans",
                "--isolate",
                "--reporter=junit",
                `--reporter-outfile=${report}`,
                ...relativeFiles,
            ], { stdio: "inherit" });
            child.on("error", (error) => {
                console.error(`property evidence: ${String(error)}`);
                resolve(127);
            });
            child.on("close", (exitCode) => resolve(exitCode ?? 1));
        });
        if (code !== 0) throw new Error(`Bun property runner exited ${code}`);

        const junit = await fs.readFile(report, "utf8");
        validatePropertyJUnit(junit, files, process.cwd());
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
}

if (import.meta.main) {
    run().catch((error) => {
        console.error(`property evidence: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
