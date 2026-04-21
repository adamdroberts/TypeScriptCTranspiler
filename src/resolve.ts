import ts from "typescript";
import * as path from "node:path";

export interface ModuleInfo {
    sf: ts.SourceFile;
    moduleId: string;
    /** moduleIds this module imports from (direct deps). */
    imports: string[];
    /** absolute filename (same as sf.fileName, cached for readability). */
    fileName: string;
}

export interface ModuleGraph {
    modules: Map<string, ModuleInfo>;
    topoOrder: string[];
    entryModuleId: string;
    fileToModuleId: Map<string, string>;
}

/** Build a module id from a file path relative to `rootDir`. */
export function moduleIdOf(fileName: string, rootDir: string): string {
    let rel = path.relative(rootDir, fileName);
    if (rel === "" || rel === path.basename(fileName)) {
        rel = path.basename(fileName, path.extname(fileName));
    } else {
        rel = rel.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/i, "");
    }
    rel = rel.replace(/\.\./g, "_up_");
    rel = rel.replace(/[^a-zA-Z0-9_]/g, "_");
    rel = rel.replace(/^_+/, "");
    if (!rel) rel = "root";
    return "m_" + rel;
}

/** Is this file a declaration (.d.ts) or our lib shim we should skip? */
function isEmittable(sf: ts.SourceFile, libCoreDts: string): boolean {
    if (sf.isDeclarationFile) return false;
    if (sf.fileName === libCoreDts) return false;
    // node_modules files are Phase 14 territory — skip for now.
    if (sf.fileName.includes("/node_modules/")) return false;
    return true;
}

export function buildModuleGraph(
    program: ts.Program,
    libCoreDts: string,
    entry: string,
): ModuleGraph {
    const modules = new Map<string, ModuleInfo>();
    const fileToModuleId = new Map<string, string>();
    const entryDir = path.dirname(entry);

    for (const sf of program.getSourceFiles()) {
        if (!isEmittable(sf, libCoreDts)) continue;
        const id = moduleIdOf(sf.fileName, entryDir);
        if (modules.has(id)) {
            throw new Error(
                `module id collision: ${id} between ${modules.get(id)!.fileName} and ${sf.fileName}`,
            );
        }
        modules.set(id, {
            sf,
            moduleId: id,
            imports: [],
            fileName: sf.fileName,
        });
        fileToModuleId.set(sf.fileName, id);
    }

    // Resolve imports per module using TS's resolver.
    const options = program.getCompilerOptions();
    for (const [id, info] of modules) {
        for (const stmt of info.sf.statements) {
            let spec: string | undefined;
            if (ts.isImportDeclaration(stmt) || ts.isExportDeclaration(stmt)) {
                const m = stmt.moduleSpecifier;
                if (m && ts.isStringLiteral(m)) spec = m.text;
            }
            if (!spec) continue;
            const resolved = ts.resolveModuleName(
                spec,
                info.sf.fileName,
                options,
                ts.sys,
            );
            const mod = resolved.resolvedModule;
            if (!mod) continue;
            const depId = fileToModuleId.get(mod.resolvedFileName);
            if (depId && depId !== id && !info.imports.includes(depId)) {
                info.imports.push(depId);
            }
        }
    }

    const entryModuleId = fileToModuleId.get(entry);
    if (!entryModuleId) {
        throw new Error(`entry not found in module graph: ${entry}`);
    }

    // DFS topological sort: deps first, entry last.
    const topo: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    function visit(id: string): void {
        if (visited.has(id)) return;
        if (visiting.has(id)) return; // cycle — stop the back edge, pick up caller's recursion
        visiting.add(id);
        const m = modules.get(id);
        if (m) for (const dep of m.imports) visit(dep);
        visiting.delete(id);
        visited.add(id);
        topo.push(id);
    }
    visit(entryModuleId);
    // Also visit any other modules that aren't reachable from entry but
    // are in the program (shouldn't normally happen, but just in case).
    for (const id of modules.keys()) visit(id);

    return { modules, topoOrder: topo, entryModuleId, fileToModuleId };
}
