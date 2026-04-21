import ts from "typescript";
import * as path from "node:path";
import * as url from "node:url";

export interface BuildProgramOpts {
    entry: string;
    packageRoot: string;
}

export interface BuiltProgram {
    program: ts.Program;
    checker: ts.TypeChecker;
    entrySourceFile: ts.SourceFile;
    libCoreDts: string;
}

/** Locate package root (where package.json lives) relative to this file. */
export function resolvePackageRoot(): string {
    const thisFile = url.fileURLToPath(import.meta.url);
    // src/program.ts lives at <root>/src/program.ts
    return path.resolve(path.dirname(thisFile), "..");
}

export function buildProgram(opts: BuildProgramOpts): BuiltProgram {
    const libCoreDts = path.resolve(opts.packageRoot, "stdlib/lib.core.d.ts");

    const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        strict: true,
        noImplicitAny: true,
        strictNullChecks: true,
        noEmit: true,
        skipLibCheck: true,
        // Crucial: disable default lib; we supply our own via rootFiles.
        noLib: true,
        types: [],
        allowJs: false,
    };

    const program = ts.createProgram({
        rootNames: [libCoreDts, opts.entry],
        options: compilerOptions,
    });

    const checker = program.getTypeChecker();
    const entrySourceFile = program.getSourceFile(opts.entry);
    if (!entrySourceFile) {
        throw new Error(`Entry not found in program: ${opts.entry}`);
    }

    return { program, checker, entrySourceFile, libCoreDts };
}
