#!/usr/bin/env bun
import { Command } from "commander";
import * as path from "node:path";
import { compile } from "./compile";

const program = new Command();

function collectOption(value: string, previous: string[]): string[] {
    previous.push(value);
    return previous;
}

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
    .option(
        "--unsafe-eval",
        "lower eval/Function to the embedded Node bridge; requires libnode when linking",
    )
    .option(
        "--native-addon-manifest <path>",
        "JSON allow-list mapping native addon specifiers to concrete .node files",
    )
    .option(
        "--dynamic-require-manifest <path>",
        "JSON allow-list of finite dynamic require specifiers compiled into the AOT graph",
    )
    .option(
        "--runtime-code-manifest <path>",
        "JSON allow-list of eval/Function source strings compiled into AOT dispatch",
    )
    .option(
        "--custom-condition <condition>",
        "additional package exports/imports condition to include in AOT module resolution",
        collectOption,
        [],
    )
    .option(
        "--dispatch <mode>",
        "dispatch backend: threaded (default) or serial",
        "threaded",
    )
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
            unsafeEval: !!opts.unsafeEval,
            nativeAddonManifest: opts.nativeAddonManifest
                ? path.resolve(opts.nativeAddonManifest as string)
                : undefined,
            dynamicRequireManifest: opts.dynamicRequireManifest
                ? path.resolve(opts.dynamicRequireManifest as string)
                : undefined,
            runtimeCodeManifest: opts.runtimeCodeManifest
                ? path.resolve(opts.runtimeCodeManifest as string)
                : undefined,
            customConditions: opts.customCondition as string[] | undefined,
            dispatch: opts.dispatch as "threaded" | "serial",
        });
        process.exit(result.exitCode);
    });

await program.parseAsync(process.argv);
