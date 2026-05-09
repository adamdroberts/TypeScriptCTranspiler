#!/usr/bin/env bun
import { Command } from "commander";
import * as path from "node:path";
import { compile } from "./compile";

const program = new Command();

program
    .name("tsc2c")
    .description("Transpile TypeScript to C and compile to a native binary")
    .argument("<entry>", "entry .ts file to compile")
    .option("-o, --output <path>", "output binary path", "a.out")
    .option("--emit-c-only", "write generated C to the build dir but skip gcc")
    .option(
        "--keep-build-dir <path>",
        "reuse this directory for intermediate .c/.h files (default: tempdir)",
    )
    .option("--no-gc", "link without Boehm GC (leaks — for bootstrap only)")
    .option("--release", "optimize for smaller release binaries and strip symbols")
    .option("--verbose", "print compile steps")
    .action(async (entry: string, opts: Record<string, unknown>) => {
        const result = await compile({
            entry: path.resolve(entry),
            output: path.resolve(opts.output as string),
            emitCOnly: !!opts.emitCOnly,
            buildDir: opts.keepBuildDir
                ? path.resolve(opts.keepBuildDir as string)
                : undefined,
            verbose: !!opts.verbose,
            noGc: opts.gc === false,
            release: !!opts.release,
        });
        process.exit(result.exitCode);
    });

await program.parseAsync(process.argv);
