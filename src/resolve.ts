import ts from "typescript";
import * as path from "node:path";

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
        for (const stmt of info.sf.statements) {
            const specs: string[] = [];
            if (ts.isImportDeclaration(stmt) || ts.isExportDeclaration(stmt)) {
                if (isTypeOnlyModuleEdge(stmt)) continue;
                const m = stmt.moduleSpecifier;
                if (m && ts.isStringLiteral(m)) specs.push(m.text);
            }
            specs.push(...topLevelRequireSpecifiers(stmt));
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

function topLevelRequireSpecifiers(stmt: ts.Statement): string[] {
    const specs: string[] = [];
    const visit = (node: ts.Node): void => {
        const spec = ts.isExpression(node) ? requireCallSpecifier(node) : null;
        if (spec) specs.push(spec);
        if (node !== stmt && ts.isFunctionLike(node)) return;
        ts.forEachChild(node, visit);
    };
    if (ts.isExpressionStatement(stmt)) visit(stmt.expression);
    if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
            if (decl.initializer) visit(decl.initializer);
        }
    }
    return specs;
}

function requireCallSpecifier(expr: ts.Expression): string | null {
    if (
        ts.isCallExpression(expr) &&
        isCommonJsRequireCallee(expr.expression) &&
        expr.arguments.length === 1 &&
        ts.isStringLiteralLike(expr.arguments[0])
    ) {
        return expr.arguments[0].text;
    }
    return null;
}

function isCommonJsRequireCallee(expr: ts.Expression): boolean {
    return (ts.isIdentifier(expr) && expr.text === "require") ||
        (
            ts.isPropertyAccessExpression(expr) &&
            expr.name.text === "require" &&
            ts.isIdentifier(expr.expression) &&
            expr.expression.text === "module"
        );
}
