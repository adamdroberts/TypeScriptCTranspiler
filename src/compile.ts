import ts from "typescript";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { buildProgram, resolvePackageRoot } from "./program";
import { buildModuleGraph } from "./resolve";
import { emitProgram } from "./emit/index";
import { invokeCc } from "./link/cc";
import { formatTsDiagnostics } from "./diagnostics";

export interface CompileOptions {
    entry: string;
    output: string;
    emitCOnly?: boolean;
    buildDir?: string;
    verbose?: boolean;
    /** If true, link without Boehm GC (uses leaking malloc fallback). */
    noGc?: boolean;
}

export interface CompileResult {
    exitCode: number;
    buildDir: string;
    mainC: string;
}

const RUNTIME_SOURCES = ["tsc_runtime.c"];
const RUNTIME_HEADERS = ["tsc_runtime.h"];

export async function compile(opts: CompileOptions): Promise<CompileResult> {
    const pkg = resolvePackageRoot();
    const buildDir =
        opts.buildDir ?? (await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-")));
    if (opts.verbose) console.error(`[tsc2c] build dir: ${buildDir}`);
    await fs.mkdir(buildDir, { recursive: true });

    const { program, checker, entrySourceFile, libCoreDts } = buildProgram({
        entry: opts.entry,
        packageRoot: pkg,
    });
    const pre = ts.getPreEmitDiagnostics(program);
    if (pre.length > 0) {
        process.stderr.write(formatTsDiagnostics(pre));
        return { exitCode: 2, buildDir, mainC: "" };
    }

    const graph = buildModuleGraph(program, libCoreDts, entrySourceFile.fileName);
    if (opts.verbose) {
        console.error(
            `[tsc2c] modules: ${[...graph.modules.keys()].join(", ")}`,
        );
        console.error(`[tsc2c] topo: ${graph.topoOrder.join(" -> ")}`);
    }

    const { mainC, diagnostics } = emitProgram(graph, checker);
    if (diagnostics.length > 0) {
        for (const d of diagnostics) process.stderr.write(d + "\n");
        return { exitCode: 3, buildDir, mainC: "" };
    }
    const mainPath = path.join(buildDir, "main.c");
    await fs.writeFile(mainPath, mainC, "utf8");
    if (opts.verbose) console.error(`[tsc2c] wrote ${mainPath}`);

    const runtimeSrc = path.join(pkg, "runtime");
    for (const f of RUNTIME_SOURCES) {
        await fs.copyFile(path.join(runtimeSrc, f), path.join(buildDir, f));
    }
    for (const f of RUNTIME_HEADERS) {
        await fs.copyFile(path.join(runtimeSrc, f), path.join(buildDir, f));
    }

    if (opts.emitCOnly) {
        if (opts.verbose) console.error(`[tsc2c] --emit-c-only: skipping gcc.`);
        return { exitCode: 0, buildDir, mainC };
    }

    const cc = await invokeCc({
        sources: [mainPath, ...RUNTIME_SOURCES.map((f) => path.join(buildDir, f))],
        output: opts.output,
        includeDirs: [buildDir],
        libs: opts.noGc ? ["m"] : ["gc", "m"],
        extraFlags: opts.noGc ? ["-DTSC_NO_GC"] : [],
        verbose: !!opts.verbose,
    });
    if (cc.exitCode !== 0) {
        process.stderr.write(`tsc2c: gcc exited ${cc.exitCode}\n`);
        return { exitCode: cc.exitCode, buildDir, mainC };
    }
    if (opts.verbose) console.error(`[tsc2c] wrote ${opts.output}`);
    return { exitCode: 0, buildDir, mainC };
}
