import ts from "typescript";
import * as path from "node:path";
import {
    isCommonJsRequireCallee,
    requireCallSpecifier as staticRequireCallSpecifier,
} from "./module-specifiers";

export interface ModuleInfo {
    sf: ts.SourceFile;
    moduleId: string;
    /** moduleIds this module imports from (direct deps). */
    imports: string[];
    /** Literal module specifier to resolved module id for import/export/require edges. */
    resolvedSpecifiers: Map<string, string>;
    /** absolute filename (same as sf.fileName, cached for readability). */
    fileName: string;
}

export interface ModuleGraph {
    modules: Map<string, ModuleInfo>;
    emitOrder: string[];
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
            resolvedSpecifiers: new Map(),
            fileName: sf.fileName,
        });
        fileToModuleId.set(sf.fileName, id);
    }

    // Resolve imports per module using TS's resolver.
    const options = program.getCompilerOptions();
    for (const [id, info] of modules) {
        const requireAliases = commonJsRequireAliases(info.sf);
        for (const stmt of info.sf.statements) {
            const specs: string[] = [];
            if (ts.isImportDeclaration(stmt) || ts.isExportDeclaration(stmt)) {
                if (isTypeOnlyModuleEdge(stmt)) continue;
                const m = stmt.moduleSpecifier;
                if (m && ts.isStringLiteral(m)) specs.push(m.text);
            }
            specs.push(...staticRequireSpecifiers(stmt, requireAliases));
            for (const spec of specs) {
                const resolved = ts.resolveModuleName(
                    spec,
                    info.sf.fileName,
                    options,
                    ts.sys,
                );
                const mod = resolved.resolvedModule;
                if (!mod) continue;
                const depId = fileToModuleId.get(mod.resolvedFileName);
                if (depId) {
                    info.resolvedSpecifiers.set(spec, depId);
                    if (depId !== id && !info.imports.includes(depId)) {
                        info.imports.push(depId);
                    }
                }
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

    return { modules, emitOrder: [...modules.keys()], topoOrder: topo, entryModuleId, fileToModuleId };
}

function isTypeOnlyModuleEdge(stmt: ts.ImportDeclaration | ts.ExportDeclaration): boolean {
    if (ts.isImportDeclaration(stmt)) return stmt.importClause?.isTypeOnly === true;
    return stmt.isTypeOnly === true;
}

function staticRequireSpecifiers(stmt: ts.Statement, requireAliases: Set<string>): string[] {
    const specs: string[] = [];
    const visit = (node: ts.Node): void => {
        const spec = ts.isExpression(node) ? requireCallSpecifier(node, requireAliases) : null;
        if (spec) specs.push(spec);
        ts.forEachChild(node, visit);
    };
    visit(stmt);
    return specs;
}

function requireCallSpecifier(expr: ts.Expression, requireAliases: Set<string>): string | null {
    return staticRequireCallSpecifier(expr, requireAliases);
}

function commonJsRequireAliases(sf: ts.SourceFile): Set<string> {
    const aliases = new Set<string>();
    const visit = (node: ts.Node): void => {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
            let init = node.initializer;
            while (ts.isParenthesizedExpression(init)) init = init.expression;
            if (isCommonJsRequireAliasInitializer(init)) aliases.add(node.name.text);
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return aliases;
}

function isCommonJsRequireAliasInitializer(expr: ts.Expression): boolean {
    return isCommonJsRequireCallee(expr, new Set());
}
