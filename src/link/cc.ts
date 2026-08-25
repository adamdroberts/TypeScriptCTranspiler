import { spawn } from "node:child_process";
import * as path from "node:path";

export interface CcOptions {
    sources: string[];
    output: string;
    includeDirs: string[];
    libs: string[];
    extraFlags?: string[];
    linkFlags?: string[];
    release?: boolean;
    verbose?: boolean;
    stderrWriter?: (message: string) => void;
}

export interface CcResult {
    exitCode: number;
    stderr: string;
}

function releaseSectionFlags(release?: boolean): string[] {
    return release ? ["-ffunction-sections", "-fdata-sections"] : [];
}

function releaseSectionGcLinkFlags(release?: boolean): string[] {
    if (!release || process.platform !== "linux") return [];
    return ["-Wl,--gc-sections"];
}

function ccCommand(): string {
    return process.env.TSC2C_CC || "gcc";
}

function cxxCommand(): string {
    return process.env.TSC2C_CXX || "g++";
}

export async function invokeCc(opts: CcOptions): Promise<CcResult> {
    const hasCxx = opts.sources.some((source) => /\.(cc|cpp|cxx)$/i.test(source));
    if (hasCxx) return invokeCcWithCxx(opts);

    const sectionFlags = releaseSectionFlags(opts.release);
    const sectionGcLinkFlags = releaseSectionGcLinkFlags(opts.release);
    const args: string[] = [
        "-std=c11",
        opts.release ? "-Os" : "-O2",
        "-flto",
        "-fno-plt",
        "-fno-semantic-interposition",
        "-fno-math-errno",
        "-fno-trapping-math",
        ...sectionFlags,
        "-Wall",
        "-Wno-unused-variable",
        "-Wno-unused-parameter",
        "-Wno-unused-but-set-variable",
        "-Wno-parentheses-equality",
        "-Wno-stringop-overflow",
    ];
    if (opts.release) args.push("-s");
    for (const dir of opts.includeDirs) args.push("-I", dir);
    args.push(...(opts.extraFlags ?? []));
    args.push(...opts.sources);
    args.push(...sectionGcLinkFlags);
    args.push(...(opts.linkFlags ?? []));
    for (const lib of opts.libs) args.push("-l" + lib);
    args.push("-o", opts.output);

    if (opts.verbose) {
        console.error(`[tsc2c] ${ccCommand()} ` + args.join(" "));
    }

    return new Promise((resolve) => {
        const proc = spawn(ccCommand(), args, { stdio: ["ignore", "inherit", "pipe"] });
        let stderr = "";
        proc.stderr.on("data", (d) => (stderr += d.toString()));
        proc.on("close", (code) => {
            if (stderr && (code !== 0 || opts.verbose)) {
                (opts.stderrWriter ?? ((message: string) => process.stderr.write(message)))(stderr);
            }
            resolve({ exitCode: code ?? 1, stderr });
        });
    });
}

async function invokeCcWithCxx(opts: CcOptions): Promise<CcResult> {
    const sectionFlags = releaseSectionFlags(opts.release);
    const sectionGcLinkFlags = releaseSectionGcLinkFlags(opts.release);
    const optimizationFlags = [
        opts.release ? "-Os" : "-O2",
        "-flto",
        "-fno-plt",
        "-fno-semantic-interposition",
        "-fno-math-errno",
        "-fno-trapping-math",
    ];
    const commonFlags = [
        ...optimizationFlags,
        ...sectionFlags,
        "-Wall",
        "-Wno-unused-variable",
        "-Wno-unused-parameter",
        "-Wno-unused-but-set-variable",
        "-Wno-parentheses-equality",
        "-Wno-stringop-overflow",
    ];
    const includeFlags = opts.includeDirs.flatMap((dir) => ["-I", dir]);
    const extraFlags = opts.extraFlags ?? [];
    const objects = opts.sources.map((source) =>
        path.join(path.dirname(source), path.basename(source).replace(/[^A-Za-z0-9_.-]/g, "_") + ".o"),
    );

    for (let i = 0; i < opts.sources.length; i++) {
        const source = opts.sources[i]!;
        const object = objects[i]!;
        const isCxx = /\.(cc|cpp|cxx)$/i.test(source);
        const compiler = isCxx ? cxxCommand() : ccCommand();
        const args = [
            isCxx ? "-std=c++20" : "-std=c11",
            ...commonFlags,
            ...includeFlags,
            ...extraFlags,
            "-c",
            source,
            "-o",
            object,
        ];
        const result = await spawnCompiler(compiler, args, opts.verbose, opts.stderrWriter);
        if (result.exitCode !== 0) return result;
    }

    const linkArgs: string[] = [];
    if (opts.release) linkArgs.push("-s");
    linkArgs.push(...optimizationFlags);
    linkArgs.push(...objects);
    linkArgs.push(...sectionGcLinkFlags);
    linkArgs.push(...(opts.linkFlags ?? []));
    for (const lib of opts.libs) linkArgs.push("-l" + lib);
    linkArgs.push("-o", opts.output);
    return spawnCompiler(cxxCommand(), linkArgs, opts.verbose, opts.stderrWriter);
}

function spawnCompiler(
    command: string,
    args: readonly string[],
    verbose?: boolean,
    stderrWriter?: (message: string) => void,
): Promise<CcResult> {
    if (verbose) {
        console.error(`[tsc2c] ${command} ${args.join(" ")}`);
    }
    return new Promise((resolve) => {
        const proc = spawn(command, args, { stdio: ["ignore", "inherit", "pipe"] });
        let stderr = "";
        proc.stderr.on("data", (d) => (stderr += d.toString()));
        proc.on("close", (code) => {
            if (stderr && (code !== 0 || verbose)) {
                (stderrWriter ?? ((message: string) => process.stderr.write(message)))(stderr);
            }
            resolve({ exitCode: code ?? 1, stderr });
        });
    });
}
