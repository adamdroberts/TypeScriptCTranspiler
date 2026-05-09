import { spawn } from "node:child_process";

export interface CcOptions {
    sources: string[];
    output: string;
    includeDirs: string[];
    libs: string[];
    extraFlags?: string[];
    linkFlags?: string[];
    release?: boolean;
    verbose?: boolean;
}

export interface CcResult {
    exitCode: number;
    stderr: string;
}

export async function invokeCc(opts: CcOptions): Promise<CcResult> {
    const args: string[] = [
        "-std=c11",
        opts.release ? "-Os" : "-O2",
        "-Wall",
        "-Wno-unused-variable",
        "-Wno-unused-parameter",
        "-Wno-unused-but-set-variable",
        "-Wno-parentheses-equality",
    ];
    if (opts.release) args.push("-s");
    for (const dir of opts.includeDirs) args.push("-I", dir);
    args.push(...(opts.extraFlags ?? []));
    args.push(...opts.sources);
    args.push(...(opts.linkFlags ?? []));
    for (const lib of opts.libs) args.push("-l" + lib);
    args.push("-o", opts.output);

    if (opts.verbose) {
        console.error("[tsc2c] gcc " + args.join(" "));
    }

    return new Promise((resolve) => {
        const proc = spawn("gcc", args, { stdio: ["ignore", "inherit", "pipe"] });
        let stderr = "";
        proc.stderr.on("data", (d) => (stderr += d.toString()));
        proc.on("close", (code) => {
            if (stderr && (code !== 0 || opts.verbose)) process.stderr.write(stderr);
            resolve({ exitCode: code ?? 1, stderr });
        });
    });
}
