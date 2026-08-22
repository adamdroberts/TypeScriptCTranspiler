#!/usr/bin/env bun
import { spawn } from "node:child_process";
import * as path from "node:path";
import { propertyEvidenceFiles } from "./manifest";

const files = await propertyEvidenceFiles();
if (files.length === 0) {
    console.error("property evidence: no *.property.test.ts specifications are registered");
    process.exit(1);
}

const relativeFiles = files.map((filename) => `./${path.relative(process.cwd(), filename).split(path.sep).join("/")}`);
const child = spawn("bun", ["test", ...relativeFiles], { stdio: "inherit" });
child.on("error", (error) => {
    console.error(`property evidence: ${String(error)}`);
    process.exit(1);
});
child.on("close", (code) => process.exit(code ?? 1));
