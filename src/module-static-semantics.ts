import ts from "typescript";

export interface ModuleStaticSemanticsFailure {
    readonly node: ts.Node;
    readonly message: string;
}

interface NameEntry {
    readonly name: string;
    readonly node: ts.Node;
}

const strictBindingIdentifierNames = new Set([
    "arguments",
    "await",
    "eval",
    "implements",
    "interface",
    "let",
    "package",
    "private",
    "protected",
    "public",
    "static",
    "yield",
]);

function pushChildren(worklist: ts.Node[], node: ts.Node): void {
    const children: ts.Node[] = [];
    node.forEachChild((child) => { children.push(child); });
    for (let index = children.length - 1; index >= 0; index--) {
        worklist.push(children[index]!);
    }
}

/** BoundNames over one canonical binding tree. The explicit worklist keeps
 * nested Array/ObjectBindingPattern depth independent of the host stack. */
export function bindingNameEntries(name: ts.BindingName): NameEntry[] {
    const entries: NameEntry[] = [];
    const worklist: ts.BindingName[] = [name];
    while (worklist.length > 0) {
        const current = worklist.pop()!;
        if (ts.isIdentifier(current)) {
            entries.push({ name: current.text, node: current });
            continue;
        }
        for (let index = current.elements.length - 1; index >= 0; index--) {
            const element = current.elements[index];
            if (!element || ts.isOmittedExpression(element)) continue;
            worklist.push(element.name);
        }
    }
    return entries;
}

export function bindingNames(name: ts.BindingName): string[] {
    return bindingNameEntries(name).map((entry) => entry.name);
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
    return ts.canHaveModifiers(node) &&
        (ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false);
}

function declarationBoundNames(statement: ts.Statement): NameEntry[] {
    if (ts.isVariableStatement(statement)) {
        return statement.declarationList.declarations.flatMap((declaration) =>
            bindingNameEntries(declaration.name));
    }
    if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
        const entries: NameEntry[] = statement.name
            ? [{ name: statement.name.text, node: statement.name }]
            : [];
        if (hasModifier(statement, ts.SyntaxKind.DefaultKeyword)) {
            entries.push({ name: "*default*", node: statement });
        }
        return entries;
    }
    return [];
}

function importBoundNames(statement: ts.ImportDeclaration): NameEntry[] {
    const clause = statement.importClause;
    if (!clause) return [];
    const entries: NameEntry[] = [];
    if (clause.name) entries.push({ name: clause.name.text, node: clause.name });
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
        entries.push({ name: bindings.name.text, node: bindings.name });
    } else if (bindings) {
        for (const element of bindings.elements) {
            entries.push({ name: element.name.text, node: element.name });
        }
    }
    return entries;
}

function moduleExportName(name: ts.ModuleExportName): string {
    return name.text;
}

function duplicateName(entries: readonly NameEntry[]): NameEntry | null {
    const seen = new Set<string>();
    for (const entry of entries) {
        if (seen.has(entry.name)) return entry;
        seen.add(entry.name);
    }
    return null;
}

/** VarDeclaredNames of ModuleItemList, including nested statement forms but
 * never crossing a function or class definition boundary. */
function moduleVarDeclaredNames(sourceFile: ts.SourceFile): NameEntry[] {
    const entries: NameEntry[] = [];
    const worklist: ts.Node[] = [];
    for (let index = sourceFile.statements.length - 1; index >= 0; index--) {
        worklist.push(sourceFile.statements[index]!);
    }
    while (worklist.length > 0) {
        const node = worklist.pop()!;
        if (ts.isFunctionLike(node) || ts.isClassLike(node)) continue;
        if (ts.isVariableDeclarationList(node)) {
            if ((node.flags & ts.NodeFlags.BlockScoped) === 0) {
                for (const declaration of node.declarations) {
                    entries.push(...bindingNameEntries(declaration.name));
                }
            }
            // Initializers cannot contribute VarDeclaredNames without first
            // crossing a function/class boundary, so do not scan them.
            continue;
        }
        pushChildren(worklist, node);
    }
    return entries;
}

function strictModuleFailure(sourceFile: ts.SourceFile): ModuleStaticSemanticsFailure | null {
    const invalidBinding = (entry: NameEntry): ModuleStaticSemanticsFailure | null =>
        strictBindingIdentifierNames.has(entry.name)
            ? {
                node: entry.node,
                message: `binding identifier '${entry.name}' is not permitted in Module strict mode`,
            }
            : null;
    const assignmentIdentifier = (expression: ts.Expression): ts.Identifier | null => {
        while (
            ts.isParenthesizedExpression(expression) ||
            ts.isAsExpression(expression) ||
            ts.isTypeAssertionExpression(expression) ||
            ts.isSatisfiesExpression(expression)
        ) expression = expression.expression;
        return ts.isIdentifier(expression) ? expression : null;
    };
    const invalidStrictAssignment = (expression: ts.Expression): ModuleStaticSemanticsFailure | null => {
        const identifier = assignmentIdentifier(expression);
        return identifier && (identifier.text === "eval" || identifier.text === "arguments")
            ? {
                node: identifier,
                message: `assignment to '${identifier.text}' is not permitted in Module strict mode`,
            }
            : null;
    };

    const worklist: ts.Node[] = [sourceFile];
    while (worklist.length > 0) {
        const node = worklist.pop()!;
        let entries: NameEntry[] = [];
        if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
            entries = bindingNameEntries(node.name);
        } else if (
            (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) ||
                ts.isClassDeclaration(node) || ts.isClassExpression(node)) &&
            node.name
        ) {
            entries = [{ name: node.name.text, node: node.name }];
        } else if (ts.isImportDeclaration(node)) {
            entries = importBoundNames(node);
        }
        for (const entry of entries) {
            const failure = invalidBinding(entry);
            if (failure) return failure;
        }

        if (ts.isWithStatement(node)) {
            return { node, message: "with statements are not permitted in Module strict mode" };
        }
        if (ts.isDeleteExpression(node) && ts.isIdentifier(node.expression)) {
            return {
                node: node.expression,
                message: "deleting an unqualified identifier is not permitted in Module strict mode",
            };
        }
        if (
            ts.isBinaryExpression(node) &&
            node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
        ) {
            const failure = invalidStrictAssignment(node.left);
            if (failure) return failure;
        }
        if (
            (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
            (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
        ) {
            const failure = invalidStrictAssignment(node.operand);
            if (failure) return failure;
        }
        if (ts.isForInStatement(node) || ts.isForOfStatement(node)) {
            if (!ts.isVariableDeclarationList(node.initializer)) {
                const failure = invalidStrictAssignment(node.initializer);
                if (failure) return failure;
            }
        }
        pushChildren(worklist, node);
    }
    return null;
}

/** Contains(super/NewTarget) with the specification's function/class
 * boundaries. Arrow bodies remain visible because they inherit both values. */
function moduleContainsFailure(sourceFile: ts.SourceFile): ModuleStaticSemanticsFailure | null {
    const enqueueComputedName = (worklist: ts.Node[], name: ts.PropertyName | undefined): void => {
        if (name && ts.isComputedPropertyName(name)) worklist.push(name.expression);
    };
    const worklist: ts.Node[] = [sourceFile];
    while (worklist.length > 0) {
        const node = worklist.pop()!;
        if (node.kind === ts.SyntaxKind.SuperKeyword) {
            return { node, message: "ModuleItemList contains super" };
        }
        if (
            ts.isMetaProperty(node) &&
            node.keywordToken === ts.SyntaxKind.NewKeyword &&
            node.name.text === "target"
        ) {
            return { node, message: "ModuleItemList contains NewTarget" };
        }
        if (ts.isClassLike(node)) {
            for (let index = node.members.length - 1; index >= 0; index--) {
                const member = node.members[index]!;
                if (ts.isClassStaticBlockDeclaration(member)) continue;
                enqueueComputedName(worklist, member.name);
            }
            if (node.heritageClauses) {
                for (let clauseIndex = node.heritageClauses.length - 1; clauseIndex >= 0; clauseIndex--) {
                    const clause = node.heritageClauses[clauseIndex]!;
                    for (let typeIndex = clause.types.length - 1; typeIndex >= 0; typeIndex--) {
                        worklist.push(clause.types[typeIndex]!.expression);
                    }
                }
            }
            continue;
        }
        if (ts.isFunctionLike(node) && !ts.isArrowFunction(node)) {
            enqueueComputedName(worklist, node.name);
            continue;
        }
        pushChildren(worklist, node);
    }
    return null;
}

/** AllPrivateIdentifiersValid over one lexical private-environment worklist.
 * A nested class receives the union of its enclosing and own PrivateBoundNames;
 * sibling/outside nodes retain their original environment. */
function modulePrivateIdentifierFailure(
    sourceFile: ts.SourceFile,
): ModuleStaticSemanticsFailure | null {
    interface PrivateFrame {
        readonly node: ts.Node;
        readonly names: ReadonlySet<string>;
    }
    const worklist: PrivateFrame[] = [{ node: sourceFile, names: new Set() }];
    while (worklist.length > 0) {
        const { node, names } = worklist.pop()!;
        if (ts.isPrivateIdentifier(node)) {
            const parent = node.parent;
            const declaration = parent && ts.isClassElement(parent) && parent.name === node;
            if (!declaration && !names.has(node.text)) {
                return {
                    node,
                    message: `private identifier '${node.text}' is not valid in this lexical private environment`,
                };
            }
            continue;
        }
        let childNames = names;
        if (ts.isClassLike(node)) {
            const extended = new Set(names);
            for (const member of node.members) {
                if (member.name && ts.isPrivateIdentifier(member.name)) {
                    extended.add(member.name.text);
                }
            }
            childNames = extended;
        }
        const children: ts.Node[] = [];
        node.forEachChild((child) => { children.push(child); });
        for (let index = children.length - 1; index >= 0; index--) {
            worklist.push({ node: children[index]!, names: childNames });
        }
    }
    return null;
}

/** Complete ModuleBody early-error collection owned by the native frontend.
 * The result follows from source-derived name collections and tree worklists;
 * no test-family or declaration-count cases participate in the algorithm. */
export function earlyModuleStaticSemanticsFailure(
    sourceFile: ts.SourceFile,
): ModuleStaticSemanticsFailure | null {
    const lexicalNames: NameEntry[] = [];
    const exportedBindings: NameEntry[] = [];
    const exportedNames: NameEntry[] = [];

    for (const statement of sourceFile.statements) {
        if (ts.isImportDeclaration(statement)) {
            lexicalNames.push(...importBoundNames(statement));
            continue;
        }

        const declarationNames = declarationBoundNames(statement);
        if (ts.isVariableStatement(statement)) {
            if ((statement.declarationList.flags & ts.NodeFlags.BlockScoped) !== 0) {
                lexicalNames.push(...declarationNames);
            }
        } else if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
            lexicalNames.push(...declarationNames);
        }

        if (ts.isExportAssignment(statement)) {
            const internal = { name: "*default*", node: statement };
            lexicalNames.push(internal);
            exportedBindings.push(internal);
            exportedNames.push({ name: "default", node: statement });
            continue;
        }

        if (ts.isExportDeclaration(statement)) {
            const clause = statement.exportClause;
            if (!clause) continue;
            if (ts.isNamespaceExport(clause)) {
                exportedNames.push({ name: moduleExportName(clause.name), node: clause.name });
                continue;
            }
            for (const element of clause.elements) {
                exportedNames.push({ name: moduleExportName(element.name), node: element.name });
                if (!statement.moduleSpecifier) {
                    const local = element.propertyName ?? element.name;
                    if (ts.isStringLiteralLike(local)) {
                        return {
                            node: local,
                            message: "a local export binding cannot be a StringLiteral",
                        };
                    }
                    exportedBindings.push({ name: moduleExportName(local), node: local });
                }
            }
            continue;
        }

        if (hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
            const isDefault = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
            if (isDefault) exportedNames.push({ name: "default", node: statement });
            for (const entry of declarationNames) {
                exportedBindings.push(entry);
                if (!isDefault && entry.name !== "*default*") {
                    exportedNames.push({
                        name: entry.name,
                        node: entry.node,
                    });
                }
            }
        }
    }

    const varNames = moduleVarDeclaredNames(sourceFile);
    const duplicateLexical = duplicateName(lexicalNames);
    if (duplicateLexical) {
        return {
            node: duplicateLexical.node,
            message: `LexicallyDeclaredNames contains duplicate '${duplicateLexical.name}'`,
        };
    }
    const lexicalSet = new Set(lexicalNames.map((entry) => entry.name));
    for (const entry of varNames) {
        if (lexicalSet.has(entry.name)) {
            return {
                node: entry.node,
                message: `LexicallyDeclaredNames and VarDeclaredNames both contain '${entry.name}'`,
            };
        }
    }
    const duplicateExport = duplicateName(exportedNames);
    if (duplicateExport) {
        return {
            node: duplicateExport.node,
            message: `ExportedNames contains duplicate '${duplicateExport.name}'`,
        };
    }
    const declaredNames = new Set([...lexicalSet, ...varNames.map((entry) => entry.name)]);
    for (const entry of exportedBindings) {
        if (!declaredNames.has(entry.name)) {
            return {
                node: entry.node,
                message: `exported binding '${entry.name}' is not declared by this Module`,
            };
        }
    }

    return strictModuleFailure(sourceFile) ??
        moduleContainsFailure(sourceFile) ??
        modulePrivateIdentifierFailure(sourceFile);
}
