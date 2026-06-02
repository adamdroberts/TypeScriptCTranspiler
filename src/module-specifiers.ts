import * as path from "node:path";
import ts from "typescript";

const MAX_STATIC_STRING_ALTERNATIVES = 64;

export function staticStringExpressionText(expr: ts.Expression): string | null {
    const texts = staticStringExpressionTexts(expr);
    return texts.length === 1 ? texts[0]! : null;
}

export function staticStringExpressionTexts(expr: ts.Expression): string[] {
    const seen = new Set<ts.VariableDeclaration>();

    const dedupe = (values: string[]): string[] => {
        const out: string[] = [];
        const seenValues = new Set<string>();
        for (const value of values) {
            if (seenValues.has(value)) continue;
            seenValues.add(value);
            out.push(value);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return out;
    };

    const concat = (left: string[], right: string[]): string[] => {
        if (left.length === 0 || right.length === 0) return [];
        const out: string[] = [];
        for (const l of left) {
            for (const r of right) {
                out.push(l + r);
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolve = (node: ts.Expression): string[] => {
        while (
            ts.isParenthesizedExpression(node) ||
            ts.isAsExpression(node) ||
            ts.isTypeAssertionExpression(node) ||
            ts.isSatisfiesExpression(node)
        ) {
            node = node.expression;
        }
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            return [node.text];
        }
        if (ts.isNumericLiteral(node)) {
            const val = Number(node.text);
            if (!Number.isFinite(val)) return [];
            return [Object.is(val, -0) ? "0" : String(val)];
        }
        if (ts.isBigIntLiteral(node)) {
            return [node.text.replace(/n$/i, "").toLowerCase()];
        }
        if (node.kind === ts.SyntaxKind.TrueKeyword) return ["true"];
        if (node.kind === ts.SyntaxKind.FalseKeyword) return ["false"];
        if (node.kind === ts.SyntaxKind.NullKeyword) return ["null"];
        if (ts.isIdentifier(node) && node.text === "__filename") return [node.getSourceFile().fileName];
        if (ts.isIdentifier(node) && node.text === "__dirname") return [path.dirname(node.getSourceFile().fileName)];
        if (ts.isIdentifier(node) && node.text === "undefined") return ["undefined"];
        if (node.kind === ts.SyntaxKind.UndefinedKeyword) return ["undefined"];
        if (ts.isVoidExpression(node)) return ["undefined"];
        if (
            ts.isPrefixUnaryExpression(node) &&
            node.operator === ts.SyntaxKind.MinusToken
        ) {
            const vals = resolve(node.operand);
            if (vals.length !== 1) return [];
            if (ts.isBigIntLiteral(node.operand)) {
                return [`-${vals[0]}`];
            }
            const num = -Number(vals[0]);
            return Number.isFinite(num) ? [String(num)] : [];
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
            const left = resolve(node.left);
            const right = resolve(node.right);
            return concat(left, right);
        }
        if (
            ts.isBinaryExpression(node) &&
            (
                node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
                node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
            )
        ) {
            if (node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
                const left = resolveNullishStringOperand(node.left);
                if (!left) return [];
                if (!left.hasNullish) return dedupe(left.strings);
                const right = resolve(node.right);
                return right.length === 0 ? [] : dedupe([...left.strings, ...right]);
            }
            const left = resolveLogicalStringOperand(node.left);
            if (left.length === 0) return [];
            const truthyLeft = left.filter((value) => value.length > 0);
            const falsyLeft = left.filter((value) => value.length === 0);
            if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
                if (falsyLeft.length === 0) return dedupe(truthyLeft);
                const right = resolve(node.right);
                return right.length === 0 ? [] : dedupe([...truthyLeft, ...right]);
            }
            if (truthyLeft.length === 0) return dedupe(falsyLeft);
            const right = resolve(node.right);
            return right.length === 0 ? [] : dedupe([...falsyLeft, ...right]);
        }
        if (ts.isConditionalExpression(node)) {
            return dedupe([...resolve(node.whenTrue), ...resolve(node.whenFalse)]);
        }
        if (ts.isTaggedTemplateExpression(node) && isStringRawTag(node.tag)) {
            return resolveStringRawTemplate(node.template);
        }
        if (ts.isCallExpression(node)) {
            const pathText = resolvePathCall(node);
            if (pathText.length > 0) return pathText;
            const atText = resolveStaticArrayAtCall(node);
            if (atText.length > 0) return atText;
            const joinText = resolveStaticArrayJoinCall(node);
            if (joinText.length > 0) return joinText;
            const caseText = resolveStaticStringCaseCall(node);
            if (caseText.length > 0) return caseText;
            const trimText = resolveStaticStringTrimCall(node);
            if (trimText.length > 0) return trimText;
        }
        if (ts.isTemplateExpression(node)) {
            let out = [node.head.text];
            for (const span of node.templateSpans) {
                out = concat(concat(out, resolve(span.expression)), [span.literal.text]);
                if (out.length === 0) return [];
            }
            return out;
        }
        if (ts.isElementAccessExpression(node) && node.argumentExpression) {
            const objectKeysValues = resolveObjectKeysValuesAccess(node);
            if (objectKeysValues.length > 0) return objectKeysValues;
            const objectEntries = resolveObjectEntriesAccess(node);
            if (objectEntries.length > 0) return objectEntries;
            return resolveStaticCollectionAccess(node.expression, node.argumentExpression);
        }
        if (ts.isPropertyAccessExpression(node)) {
            return resolveStaticCollectionAccess(node.expression, node.name);
        }
        if (!ts.isIdentifier(node)) return [];
        const decl = earlierConstStringDeclaration(node) ?? topLevelConstStringDeclaration(node);
        if (decl?.initializer) {
            if (seen.has(decl)) return [];
            seen.add(decl);
            const values = resolve(decl.initializer);
            seen.delete(decl);
            if (values.length > 0) return values;
        }
        return stringLiteralUnionIdentifierTexts(node);
    };

    const resolveLogicalStringOperand = (node: ts.Expression): string[] => {
        const cur = unwrapStaticExpression(node);
        if (
            ts.isStringLiteral(cur) ||
            ts.isNoSubstitutionTemplateLiteral(cur) ||
            ts.isTemplateExpression(cur) ||
            (ts.isTaggedTemplateExpression(cur) && isStringRawTag(cur.tag))
        ) {
            return resolve(cur);
        }
        if (ts.isBinaryExpression(cur) && cur.operatorToken.kind === ts.SyntaxKind.PlusToken) {
            return resolve(cur);
        }
        if (ts.isCallExpression(cur) && resolvePathCall(cur).length > 0) {
            return resolve(cur);
        }
        if (ts.isConditionalExpression(cur)) {
            const whenTrue = resolveLogicalStringOperand(cur.whenTrue);
            const whenFalse = resolveLogicalStringOperand(cur.whenFalse);
            return whenTrue.length === 0 || whenFalse.length === 0
                ? []
                : dedupe([...whenTrue, ...whenFalse]);
        }
        if (ts.isIdentifier(cur)) {
            if (cur.text === "__filename" || cur.text === "__dirname") return resolve(cur);
            const decl = earlierConstStringDeclaration(cur) ?? topLevelConstStringDeclaration(cur);
            if (!decl?.initializer || seen.has(decl)) return [];
            seen.add(decl);
            const values = resolveLogicalStringOperand(decl.initializer);
            seen.delete(decl);
            return values;
        }
        return [];
    };

    const resolveNullishStringOperand = (node: ts.Expression): { strings: string[]; hasNullish: boolean } | null => {
        const cur = unwrapStaticExpression(node);
        if (
            cur.kind === ts.SyntaxKind.NullKeyword ||
            cur.kind === ts.SyntaxKind.UndefinedKeyword ||
            (ts.isIdentifier(cur) && cur.text === "undefined") ||
            ts.isVoidExpression(cur)
        ) {
            return { strings: [], hasNullish: true };
        }
        if (ts.isConditionalExpression(cur)) {
            const whenTrue = resolveNullishStringOperand(cur.whenTrue);
            const whenFalse = resolveNullishStringOperand(cur.whenFalse);
            if (!whenTrue || !whenFalse) return null;
            return {
                strings: dedupe([...whenTrue.strings, ...whenFalse.strings]),
                hasNullish: whenTrue.hasNullish || whenFalse.hasNullish,
            };
        }
        if (
            ts.isBinaryExpression(cur) &&
            cur.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
        ) {
            const left = resolveNullishStringOperand(cur.left);
            if (!left) return null;
            if (!left.hasNullish) return left;
            const right = resolveNullishStringOperand(cur.right);
            if (!right) return null;
            return {
                strings: dedupe([...left.strings, ...right.strings]),
                hasNullish: right.hasNullish,
            };
        }
        if (ts.isIdentifier(cur)) {
            if (cur.text === "__filename" || cur.text === "__dirname") {
                return { strings: resolve(cur), hasNullish: false };
            }
            const decl = earlierConstStringDeclaration(cur) ?? topLevelConstStringDeclaration(cur);
            if (!decl?.initializer || seen.has(decl)) return null;
            seen.add(decl);
            const values = resolveNullishStringOperand(decl.initializer);
            seen.delete(decl);
            return values;
        }
        const strings = resolveLogicalStringOperand(cur);
        return strings.length === 0 ? null : { strings, hasNullish: false };
    };

    const resolveStringRawTemplate = (
        template: ts.TemplateLiteral | ts.NoSubstitutionTemplateLiteral,
    ): string[] => {
        if (ts.isNoSubstitutionTemplateLiteral(template)) {
            return [templateRawText(template)];
        }

        let out = [templateRawText(template.head)];
        for (const span of template.templateSpans) {
            out = concat(concat(out, resolve(span.expression)), [templateRawText(span.literal)]);
            if (out.length === 0) return [];
        }
        return out;
    };

    const resolvePathCall = (call: ts.CallExpression): string[] => {
        const name = staticPathCallName(call);
        if (!name) return [];
        if (name === "resolve" && call.arguments.length === 0) return [];
        const argValues = call.arguments.map((arg) => resolve(arg));
        if (argValues.some((values) => values.length === 0)) return [];
        let encoded = [""];
        for (const values of argValues) {
            const next: string[] = [];
            for (const prefix of encoded) {
                for (const value of values) {
                    next.push(prefix === "" ? value : `${prefix}\0${value}`);
                    if (next.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
            encoded = dedupe(next);
        }
        return dedupe(encoded.map((joined) => {
            const parts = joined === "" ? [] : joined.split("\0");
            switch (name) {
                case "join":
                    return path.join(...parts);
                case "resolve":
                    return path.resolve(...parts);
                case "normalize":
                    return parts.length === 1 ? path.normalize(parts[0]!) : "";
            }
        }).filter((value) => value !== ""));
    };

    const flattenArrayLiteral = (array: ts.ArrayLiteralExpression): ts.ArrayLiteralExpression | null => {
        const elements: ts.Expression[] = [];
        for (const element of array.elements) {
            if (!ts.isSpreadElement(element)) {
                elements.push(element);
                if (elements.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
                continue;
            }
            const spread = resolveCollectionExpression(element.expression);
            if (!spread || !ts.isArrayLiteralExpression(spread)) return null;
            for (const spreadElement of spread.elements) {
                if (ts.isSpreadElement(spreadElement)) return null;
                elements.push(spreadElement);
                if (elements.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
            }
        }
        return ts.factory.createArrayLiteralExpression(elements);
    };

    const resolveCollectionExpression = (node: ts.Expression): ts.Expression | null => {
        let cur = node;
        while (
            ts.isParenthesizedExpression(cur) ||
            ts.isAsExpression(cur) ||
            ts.isTypeAssertionExpression(cur) ||
            ts.isSatisfiesExpression(cur)
        ) {
            cur = cur.expression;
        }

        if (ts.isIdentifier(cur)) {
            const decl = earlierConstStringDeclaration(cur) ?? topLevelConstStringDeclaration(cur);
            if (!decl?.initializer || seen.has(decl)) return null;
            seen.add(decl);
            const val = resolveCollectionExpression(decl.initializer);
            seen.delete(decl);
            return val;
        }

        if (ts.isPropertyAccessExpression(cur)) {
            const obj = resolveCollectionExpression(cur.expression);
            if (obj && ts.isObjectLiteralExpression(obj)) {
                for (const prop of obj.properties) {
                    if (ts.isPropertyAssignment(prop)) {
                        const key = staticPropertyName(prop.name);
                        if (key === cur.name.text) {
                            return resolveCollectionExpression(prop.initializer);
                        }
                    }
                }
            }
        }

        if (ts.isElementAccessExpression(cur) && cur.argumentExpression) {
            const col = resolveCollectionExpression(cur.expression);
            if (!col) return null;
            const indexTexts = resolve(cur.argumentExpression);
            if (indexTexts.length !== 1) return null;
            const indexText = indexTexts[0]!;

            if (ts.isArrayLiteralExpression(col)) {
                if (/^(0|[1-9][0-9]*)$/.test(indexText)) {
                    const idx = Number(indexText);
                    const element = col.elements[idx];
                    if (element && !ts.isSpreadElement(element)) {
                        return resolveCollectionExpression(element);
                    }
                }
            } else if (ts.isObjectLiteralExpression(col)) {
                for (const prop of col.properties) {
                    if (ts.isPropertyAssignment(prop)) {
                        const key = staticPropertyName(prop.name);
                        if (key === indexText) {
                            return resolveCollectionExpression(prop.initializer);
                        }
                    }
                }
            }
        }

        if (ts.isArrayLiteralExpression(cur)) {
            return flattenArrayLiteral(cur);
        }

        return cur;
    };

    const resolveStaticCollectionAccess = (
        collectionExpr: ts.Expression,
        keyExpr: ts.Expression | ts.Identifier,
    ): string[] => {
        const init = resolveCollectionExpression(collectionExpr);
        if (!init) return [];

        let values: string[] = [];
        if (ts.isArrayLiteralExpression(init)) {
            values = resolveStaticArrayAccess(init, keyExpr);
        } else if (ts.isObjectLiteralExpression(init)) {
            values = resolveStaticObjectAccess(init, keyExpr);
        }
        return dedupe(values);
    };

    const resolveObjectKeysValuesAccess = (expr: ts.ElementAccessExpression): string[] => {
        if (!expr.argumentExpression) return [];
        const keys = resolveStaticNumericKeys(expr.argumentExpression);
        if (keys.length === 0) return [];

        const call = unwrapStaticExpression(expr.expression);
        if (!ts.isCallExpression(call) || call.arguments.length !== 1) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object") return [];
        const method = callee.name.text;
        if (method !== "keys" && method !== "values") return [];

        const object = resolveCollectionExpression(call.arguments[0]!);
        if (!object || !ts.isObjectLiteralExpression(object)) return [];

        const slots: string[][] = [];
        for (const prop of object.properties) {
            if (ts.isSpreadAssignment(prop)) return [];
            const propName = prop.name ? staticPropertyName(prop.name) : null;
            if (propName === null) return [];
            if (method === "keys") {
                slots.push([propName]);
                continue;
            }
            if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) return [];
            const valueExpr = ts.isPropertyAssignment(prop) ? prop.initializer : prop.name;
            const values = resolve(valueExpr);
            if (values.length === 0) return [];
            slots.push(values);
        }

        const out: string[] = [];
        for (const key of keys) {
            const values = slots[key];
            if (!values) return [];
            out.push(...values);
        }
        return dedupe(out);
    };

    const resolveObjectEntriesAccess = (expr: ts.ElementAccessExpression): string[] => {
        if (!expr.argumentExpression) return [];
        const tupleIndices = resolveStaticNumericKeys(expr.argumentExpression);
        if (tupleIndices.length !== 1 || (tupleIndices[0] !== 0 && tupleIndices[0] !== 1)) return [];

        const inner = unwrapStaticExpression(expr.expression);
        if (!ts.isElementAccessExpression(inner) || !inner.argumentExpression) return [];
        const entryIndices = resolveStaticNumericKeys(inner.argumentExpression);
        if (entryIndices.length === 0) return [];

        const call = unwrapStaticExpression(inner.expression);
        if (!ts.isCallExpression(call) || call.arguments.length !== 1) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object" || callee.name.text !== "entries") return [];

        const object = resolveCollectionExpression(call.arguments[0]!);
        if (!object || !ts.isObjectLiteralExpression(object)) return [];

        const slotIndex = tupleIndices[0]!;
        const slots: string[][] = [];
        for (const prop of object.properties) {
            if (ts.isSpreadAssignment(prop)) return [];
            const propName = prop.name ? staticPropertyName(prop.name) : null;
            if (propName === null) return [];
            if (slotIndex === 0) {
                slots.push([propName]);
                continue;
            }
            if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) return [];
            const valueExpr = ts.isPropertyAssignment(prop) ? prop.initializer : prop.name;
            const values = resolve(valueExpr);
            if (values.length === 0) return [];
            slots.push(values);
        }

        const out: string[] = [];
        for (const index of entryIndices) {
            const values = slots[index];
            if (!values) return [];
            out.push(...values);
        }
        return dedupe(out);
    };

    const resolveStaticArrayAtCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "at") return [];
        const init = resolveCollectionExpression(callee.expression);
        if (!init || !ts.isArrayLiteralExpression(init)) return [];

        const elements: string[][] = [];
        for (const element of init.elements) {
            if (ts.isSpreadElement(element)) return [];
            const values = resolve(element);
            if (values.length === 0) return [];
            elements.push(values);
        }

        const keys = resolveStaticIntegerKeys(call.arguments[0]!);
        if (keys.length === 0) return [];
        const out: string[] = [];
        for (const key of keys) {
            const index = key < 0 ? elements.length + key : key;
            const values = index >= 0 ? elements[index] : undefined;
            if (!values) return [];
            out.push(...values);
        }
        return dedupe(out);
    };

    const resolveStaticArrayJoinCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length > 1) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "join") return [];
        const init = resolveCollectionExpression(callee.expression);
        if (!init || !ts.isArrayLiteralExpression(init)) return [];

        const separatorArg = call.arguments[0];
        if (separatorArg && ts.isSpreadElement(separatorArg)) return [];
        const separators = !separatorArg || isStaticUndefinedExpression(separatorArg)
            ? [","]
            : resolve(separatorArg);
        if (separators.length === 0) return [];

        const elements: string[][] = [];
        for (const element of init.elements) {
            if (ts.isSpreadElement(element)) return [];
            if (element.kind === ts.SyntaxKind.OmittedExpression) {
                elements.push([""]);
                continue;
            }
            if (isStaticUndefinedExpression(element) || element.kind === ts.SyntaxKind.NullKeyword) {
                elements.push([""]);
                continue;
            }
            const values = resolve(element);
            if (values.length === 0) return [];
            elements.push(values);
        }

        const out: string[] = [];
        for (const separator of separators) {
            let joined = [""];
            for (let index = 0; index < elements.length; index++) {
                const values = elements[index]!;
                const next: string[] = [];
                for (const prefix of joined) {
                    for (const value of values) {
                        next.push(index === 0 ? value : `${prefix}${separator}${value}`);
                        if (next.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                    }
                }
                joined = dedupe(next);
                if (joined.length === 0) return [];
            }
            out.push(...joined);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupe(out);
    };

    const resolveStaticStringCaseCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 0) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "toLowerCase" && method !== "toUpperCase") return [];
        const values = resolve(callee.expression);
        if (values.length === 0) return [];
        return dedupe(values.map((value) => {
            return method === "toLowerCase" ? value.toLowerCase() : value.toUpperCase();
        }));
    };

    const resolveStaticStringTrimCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 0) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (
            method !== "trim" &&
            method !== "trimStart" &&
            method !== "trimEnd" &&
            method !== "trimLeft" &&
            method !== "trimRight"
        ) {
            return [];
        }
        const values = resolve(callee.expression);
        if (values.length === 0) return [];
        return dedupe(values.map((value) => {
            switch (method) {
                case "trimStart":
                case "trimLeft":
                    return value.trimStart();
                case "trimEnd":
                case "trimRight":
                    return value.trimEnd();
                default:
                    return value.trim();
            }
        }));
    };

    const resolveStaticArrayAccess = (
        init: ts.ArrayLiteralExpression,
        keyExpr: ts.Expression | ts.Identifier,
    ): string[] => {
        const elements: string[][] = [];
        for (const element of init.elements) {
            if (ts.isSpreadElement(element)) return [];
            const values = resolve(element);
            if (values.length === 0) return [];
            elements.push(values);
        }
        const keys = resolveStaticNumericKeys(keyExpr);
        if (keys.length === 0) return dedupe(elements.flat());
        const out: string[] = [];
        for (const key of keys) {
            const values = elements[key];
            if (!values) return [];
            out.push(...values);
        }
        return dedupe(out);
    };

    const resolveStaticObjectAccess = (
        init: ts.ObjectLiteralExpression,
        keyExpr: ts.Expression | ts.Identifier,
    ): string[] => {
        const entries = new Map<string, string[]>();
        for (const prop of init.properties) {
            if (!ts.isPropertyAssignment(prop)) return [];
            const key = staticPropertyName(prop.name);
            if (key == null) return [];
            const values = resolve(prop.initializer);
            if (values.length === 0) return [];
            entries.set(key, values);
        }
        const keys = resolveKeyTexts(keyExpr);
        if (keys.length === 0) return [];
        const out: string[] = [];
        for (const key of keys) {
            const values = entries.get(key);
            if (!values) return [];
            out.push(...values);
        }
        return dedupe(out);
    };

    const resolveKeyTexts = (keyExpr: ts.Expression | ts.Identifier): string[] => {
        if (ts.isIdentifier(keyExpr) && ts.isPropertyAccessExpression(keyExpr.parent) && keyExpr.parent.name === keyExpr) {
            return [keyExpr.text];
        }
        return resolve(keyExpr as ts.Expression);
    };

    const resolveStaticNumericKeys = (keyExpr: ts.Expression | ts.Identifier): number[] => {
        if (ts.isNumericLiteral(keyExpr)) return [Number(keyExpr.text)];
        const texts = resolveKeyTexts(keyExpr);
        if (texts.length === 0) return [];
        const keys: number[] = [];
        for (const text of texts) {
            if (!/^(0|[1-9][0-9]*)$/.test(text)) return [];
            keys.push(Number(text));
        }
        return keys;
    };

    const resolveStaticIntegerKeys = (keyExpr: ts.Expression | ts.Identifier): number[] => {
        if (ts.isNumericLiteral(keyExpr)) return [Number(keyExpr.text)];
        if (
            ts.isPrefixUnaryExpression(keyExpr) &&
            keyExpr.operator === ts.SyntaxKind.MinusToken &&
            ts.isNumericLiteral(keyExpr.operand)
        ) {
            return [-Number(keyExpr.operand.text)];
        }
        const texts = resolveKeyTexts(keyExpr);
        if (texts.length === 0) return [];
        const keys: number[] = [];
        for (const text of texts) {
            if (!/^-?(0|[1-9][0-9]*)$/.test(text)) return [];
            keys.push(Number(text));
        }
        return keys;
    };

    const isStaticUndefinedExpression = (node: ts.Expression): boolean => {
        const cur = unwrapStaticExpression(node);
        if (cur.kind === ts.SyntaxKind.UndefinedKeyword) return true;
        if (ts.isIdentifier(cur) && cur.text === "undefined") return true;
        if (ts.isVoidExpression(cur)) return true;
        if (!ts.isIdentifier(cur)) return false;
        const decl = earlierConstStringDeclaration(cur) ?? topLevelConstStringDeclaration(cur);
        if (!decl?.initializer || seen.has(decl)) return false;
        seen.add(decl);
        const value = isStaticUndefinedExpression(decl.initializer);
        seen.delete(decl);
        return value;
    };

    return dedupe(resolve(expr));
}

export function staticStringExpressionAffix(expr: ts.Expression): { prefix: string; suffix: string } | null {
    const exact = staticStringExpressionTexts(expr);
    if (exact.length > 0) return null;
    const seen = new Set<ts.VariableDeclaration>();

    const resolve = (node: ts.Expression): { prefix: string; suffix: string } | null => {
        node = unwrapStaticExpression(node);
        const nodeExact = staticStringExpressionTexts(node);
        if (nodeExact.length > 0) return null;
        if (ts.isIdentifier(node)) {
            const decl = earlierConstStringDeclaration(node) ?? topLevelConstStringDeclaration(node);
            if (!decl?.initializer || seen.has(decl)) return null;
            seen.add(decl);
            const value = resolve(decl.initializer);
            seen.delete(decl);
            return value;
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
            const leftExact = staticStringExpressionTexts(node.left);
            const rightExact = staticStringExpressionTexts(node.right);
            if (leftExact.length === 1) {
                const rightAffix = resolve(node.right);
                return {
                    prefix: leftExact[0]! + (rightAffix?.prefix ?? ""),
                    suffix: rightAffix?.suffix ?? "",
                };
            }
            if (rightExact.length === 1) {
                const leftAffix = resolve(node.left);
                return {
                    prefix: leftAffix?.prefix ?? "",
                    suffix: (leftAffix?.suffix ?? "") + rightExact[0]!,
                };
            }
            return null;
        }
        if (ts.isTemplateExpression(node)) {
            let prefix = node.head.text;
            let prefixOpen = true;
            for (const span of node.templateSpans) {
                if (!prefixOpen) break;
                const values = staticStringExpressionTexts(span.expression);
                if (values.length !== 1) {
                    prefixOpen = false;
                    break;
                }
                prefix += values[0]! + span.literal.text;
            }

            let suffix = node.templateSpans[node.templateSpans.length - 1]?.literal.text ?? "";
            for (let i = node.templateSpans.length - 1; i >= 0; i--) {
                const span = node.templateSpans[i]!;
                const values = staticStringExpressionTexts(span.expression);
                if (values.length !== 1) break;
                suffix = values[0]! + suffix;
                suffix = (i === 0 ? node.head.text : node.templateSpans[i - 1]!.literal.text) + suffix;
            }

            return prefix || suffix ? { prefix, suffix } : null;
        }
        return null;
    };

    const affix = resolve(expr);
    return affix && (affix.prefix || affix.suffix) ? affix : null;
}

export function filterSpecifiersByStaticAffix(specifiers: string[], expr: ts.Expression): string[] {
    const affix = staticStringExpressionAffix(expr);
    return affix
        ? specifiers.filter((spec) => spec.startsWith(affix.prefix) && spec.endsWith(affix.suffix))
        : specifiers;
}

export function requireCallSpecifier(
    expr: ts.Expression,
    requireAliases: Set<string>,
    moduleAliases: Set<string> = new Set(),
): string | null {
    const specs = requireCallSpecifiers(expr, requireAliases, moduleAliases);
    return specs && specs.length === 1 ? specs[0]! : null;
}

export function requireCallSpecifiers(
    expr: ts.Expression,
    requireAliases: Set<string>,
    moduleAliases: Set<string> = new Set(),
): string[] | null {
    if (!ts.isCallExpression(expr)) return null;
    const specifierArg = commonJsRequireSpecifierArgument(expr, requireAliases, moduleAliases);
    if (specifierArg) return staticStringExpressionTexts(specifierArg);
    return null;
}

export function commonJsRequireSpecifierArgument(
    expr: ts.CallExpression,
    requireAliases: Set<string>,
    moduleAliases: Set<string>,
): ts.Expression | null {
    if (
        isCommonJsRequireCallee(expr.expression, requireAliases, moduleAliases) &&
        expr.arguments.length === 1
    ) {
        return expr.arguments[0]!;
    }
    const callee = expr.expression;
    if (
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === "call" &&
        isCommonJsRequireCallee(callee.expression, requireAliases, moduleAliases) &&
        expr.arguments.length === 2 &&
        isCommonJsModuleThisArg(expr.arguments[0]!, moduleAliases)
    ) {
        return expr.arguments[1]!;
    }
    if (
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === "apply" &&
        isCommonJsRequireCallee(callee.expression, requireAliases, moduleAliases) &&
        expr.arguments.length === 2 &&
        isCommonJsModuleThisArg(expr.arguments[0]!, moduleAliases)
    ) {
        const specList = expr.arguments[1]!;
        return staticSingleRequireApplySpecifierArgument(specList);
    }
    if (
        ts.isPropertyAccessExpression(callee) &&
        ts.isIdentifier(callee.expression) &&
        callee.expression.text === "Reflect" &&
        callee.name.text === "apply" &&
        expr.arguments.length === 3 &&
        isCommonJsRequireCallee(expr.arguments[0]!, requireAliases, moduleAliases) &&
        isCommonJsModuleThisArg(expr.arguments[1]!, moduleAliases)
    ) {
        const specList = expr.arguments[2]!;
        return staticSingleRequireApplySpecifierArgument(specList);
    }
    return null;
}

function staticSingleRequireApplySpecifierArgument(expr: ts.Expression): ts.Expression | null {
    const unwrapped = unwrapStaticExpression(expr);
    if (ts.isArrayLiteralExpression(unwrapped)) {
        return singleArraySpecifier(unwrapped);
    }
    if (!ts.isIdentifier(unwrapped)) return null;
    const decl = earlierConstStringDeclaration(unwrapped) ?? topLevelConstStringDeclaration(unwrapped);
    if (!decl?.initializer) return null;
    const init = unwrapStaticExpression(decl.initializer);
    return ts.isArrayLiteralExpression(init) ? singleArraySpecifier(init) : null;
}

function singleArraySpecifier(array: ts.ArrayLiteralExpression): ts.Expression | null {
    if (array.elements.length !== 1) return null;
    const element = array.elements[0]!;
    return ts.isSpreadElement(element) ? null : element;
}

function isCommonJsModuleThisArg(expr: ts.Expression, moduleAliases: Set<string>): boolean {
    const unwrapped = unwrapStaticExpression(expr);
    return ts.isIdentifier(unwrapped) && (unwrapped.text === "module" || moduleAliases.has(unwrapped.text));
}

export function isCommonJsRequireCallee(
    expr: ts.Expression,
    requireAliases: Set<string>,
    moduleAliases: Set<string> = new Set(),
): boolean {
    const unwrapped = unwrapStaticExpression(expr);
    if (isCommonJsModuleRequireBindExpression(unwrapped, requireAliases, moduleAliases)) return true;
    return (ts.isIdentifier(unwrapped) && (unwrapped.text === "require" || requireAliases.has(unwrapped.text))) ||
        (
            ts.isPropertyAccessExpression(unwrapped) &&
            unwrapped.name.text === "require" &&
            ts.isIdentifier(unwrapped.expression) &&
            (unwrapped.expression.text === "module" || moduleAliases.has(unwrapped.expression.text))
        );
}

function isCommonJsModuleRequireBindExpression(
    expr: ts.Expression,
    requireAliases: Set<string>,
    moduleAliases: Set<string>,
): boolean {
    const unwrapped = unwrapStaticExpression(expr);
    if (!ts.isCallExpression(unwrapped) || unwrapped.arguments.length < 1) return false;
    const callee = unwrapped.expression;
    if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "bind") return false;
    const target = unwrapStaticExpression(callee.expression);
    if (ts.isIdentifier(target)) {
        if (target.text !== "require" && !requireAliases.has(target.text)) return false;
    } else {
        if (
            !ts.isPropertyAccessExpression(target) ||
            target.name.text !== "require" ||
            !ts.isIdentifier(target.expression) ||
            (target.expression.text !== "module" && !moduleAliases.has(target.expression.text))
        ) {
            return false;
        }
    }
    const thisArg = unwrapStaticExpression(unwrapped.arguments[0]!);
    return ts.isIdentifier(thisArg) && (thisArg.text === "module" || moduleAliases.has(thisArg.text));
}

function topLevelConstStringDeclaration(id: ts.Identifier): ts.VariableDeclaration | null {
    const sf = id.getSourceFile();
    for (const stmt of sf.statements) {
        if (!ts.isVariableStatement(stmt)) continue;
        if ((ts.getCombinedNodeFlags(stmt.declarationList) & ts.NodeFlags.Const) === 0) continue;
        for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === id.text) return decl;
        }
    }
    return null;
}

function earlierConstStringDeclaration(id: ts.Identifier): ts.VariableDeclaration | null {
    let cur: ts.Node = id;
    while (cur.parent && !ts.isStatement(cur)) cur = cur.parent;
    const stmt = cur;
    const block = stmt.parent;
    if (!ts.isBlock(block) && !ts.isSourceFile(block) && !ts.isModuleBlock(block)) return null;
    for (const sibling of block.statements) {
        if (sibling === stmt) break;
        if (!ts.isVariableStatement(sibling)) continue;
        if ((ts.getCombinedNodeFlags(sibling.declarationList) & ts.NodeFlags.Const) === 0) continue;
        for (const decl of sibling.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === id.text) return decl;
        }
    }
    return null;
}

function stringLiteralUnionIdentifierTexts(id: ts.Identifier): string[] {
    const paramValues = parameterStringLiteralUnionTexts(id);
    if (paramValues.length > 0) return paramValues;
    const localValues = earlierVariableStringLiteralUnionTexts(id);
    if (localValues.length > 0) return localValues;
    const topLevelValues = topLevelVariableStringLiteralUnionTexts(id);
    if (topLevelValues.length > 0) return topLevelValues;
    return [];
}

function parameterStringLiteralUnionTexts(id: ts.Identifier): string[] {
    let cur: ts.Node | undefined = id.parent;
    while (cur) {
        if (ts.isFunctionLike(cur)) {
            for (const param of cur.parameters) {
                if (ts.isIdentifier(param.name) && param.name.text === id.text) {
                    return stringLiteralUnionTypeTexts(param.type);
                }
            }
        }
        cur = cur.parent;
    }
    return [];
}

function topLevelVariableStringLiteralUnionTexts(id: ts.Identifier): string[] {
    const sf = id.getSourceFile();
    for (const stmt of sf.statements) {
        if (!ts.isVariableStatement(stmt)) continue;
        for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === id.text) {
                return stringLiteralUnionTypeTexts(decl.type);
            }
        }
    }
    return [];
}

function earlierVariableStringLiteralUnionTexts(id: ts.Identifier): string[] {
    let cur: ts.Node = id;
    while (cur.parent && !ts.isStatement(cur)) cur = cur.parent;
    const stmt = cur;
    const block = stmt.parent;
    if (!ts.isBlock(block) && !ts.isSourceFile(block) && !ts.isModuleBlock(block)) return [];
    for (const sibling of block.statements) {
        if (sibling === stmt) break;
        if (!ts.isVariableStatement(sibling)) continue;
        for (const decl of sibling.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === id.text) {
                return stringLiteralUnionTypeTexts(decl.type);
            }
        }
    }
    return [];
}

function stringLiteralUnionTypeTexts(
    typeNode: ts.TypeNode | undefined,
    seenAliases = new Set<string>(),
): string[] {
    if (!typeNode) return [];
    if (ts.isParenthesizedTypeNode(typeNode)) {
        return stringLiteralUnionTypeTexts(typeNode.type, seenAliases);
    }
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
        const aliasName = typeNode.typeName.text;
        if (seenAliases.has(aliasName)) return [];
        const alias = visibleTypeAliasDeclaration(typeNode.typeName, typeNode);
        if (!alias) return [];
        seenAliases.add(aliasName);
        const values = stringLiteralUnionTypeTexts(alias.type, seenAliases);
        seenAliases.delete(aliasName);
        return values;
    }
    if (ts.isTemplateLiteralTypeNode(typeNode)) {
        return templateLiteralTypeTexts(typeNode, seenAliases);
    }
    if (ts.isTypeOperatorNode(typeNode) && typeNode.operator === ts.SyntaxKind.KeyOfKeyword) {
        return keyofTypeTexts(typeNode.type);
    }
    if (typeNode.kind === ts.SyntaxKind.NullKeyword) return ["null"];
    if (typeNode.kind === ts.SyntaxKind.UndefinedKeyword) return ["undefined"];
    if (ts.isLiteralTypeNode(typeNode)) {
        const literal = typeNode.literal;
        if (ts.isStringLiteral(literal) || ts.isNumericLiteral(literal)) return [literal.text];
        if (ts.isBigIntLiteral(literal)) return [literal.text.replace(/n$/i, "")];
        if (literal.kind === ts.SyntaxKind.NullKeyword) return ["null"];
        if (literal.kind === ts.SyntaxKind.TrueKeyword) return ["true"];
        if (literal.kind === ts.SyntaxKind.FalseKeyword) return ["false"];
        if (ts.isPrefixUnaryExpression(literal) && ts.isNumericLiteral(literal.operand)) {
            if (literal.operator === ts.SyntaxKind.MinusToken) return [`-${literal.operand.text}`];
            if (literal.operator === ts.SyntaxKind.PlusToken) return [literal.operand.text];
        }
        if (ts.isPrefixUnaryExpression(literal) && ts.isBigIntLiteral(literal.operand)) {
            const formatted = literal.operand.text.replace(/n$/i, "");
            if (literal.operator === ts.SyntaxKind.MinusToken) return [`-${formatted}`];
            if (literal.operator === ts.SyntaxKind.PlusToken) return [formatted];
        }
        return [];
    }
    if (!ts.isUnionTypeNode(typeNode)) return [];
    const values: string[] = [];
    const seen = new Set<string>();
    for (const part of typeNode.types) {
        const partValues = stringLiteralUnionTypeTexts(part, seenAliases);
        if (partValues.length === 0) return [];
        for (const value of partValues) {
            if (seen.has(value)) continue;
            seen.add(value);
            values.push(value);
        }
    }
    return values;
}

function keyofTypeTexts(typeNode: ts.TypeNode): string[] {
    if (!ts.isTypeQueryNode(typeNode) || !ts.isIdentifier(typeNode.exprName)) return [];
    const decl = earlierConstStringDeclaration(typeNode.exprName) ?? topLevelConstStringDeclaration(typeNode.exprName);
    if (!decl?.initializer) return [];
    const init = unwrapStaticExpression(decl.initializer);
    if (!ts.isObjectLiteralExpression(init)) return [];
    const values: string[] = [];
    const seen = new Set<string>();
    for (const prop of init.properties) {
        if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) return [];
        const key = staticPropertyName(prop.name);
        if (key === null) return [];
        if (seen.has(key)) continue;
        seen.add(key);
        values.push(key);
        if (values.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
    }
    return values;
}

function templateLiteralTypeTexts(
    typeNode: ts.TemplateLiteralTypeNode,
    seenAliases: Set<string>,
): string[] {
    let values = [typeNode.head.text];
    for (const span of typeNode.templateSpans) {
        const spanValues = templateLiteralSpanTypeTexts(span.type, seenAliases);
        if (spanValues.length === 0) return [];
        values = concatStringAlternatives(values, spanValues);
        if (values.length === 0) return [];
        values = concatStringAlternatives(values, [span.literal.text]);
        if (values.length === 0) return [];
    }
    return dedupeStringAlternatives(values);
}

function templateLiteralSpanTypeTexts(
    typeNode: ts.TypeNode | undefined,
    seenAliases: Set<string>,
): string[] {
    if (!typeNode) return [];
    if (ts.isParenthesizedTypeNode(typeNode)) {
        return templateLiteralSpanTypeTexts(typeNode.type, seenAliases);
    }
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
        const aliasName = typeNode.typeName.text;
        if (seenAliases.has(aliasName)) return [];
        const alias = visibleTypeAliasDeclaration(typeNode.typeName, typeNode);
        if (!alias) return [];
        seenAliases.add(aliasName);
        const values = templateLiteralSpanTypeTexts(alias.type, seenAliases);
        seenAliases.delete(aliasName);
        return values;
    }
    if (ts.isTemplateLiteralTypeNode(typeNode)) {
        return templateLiteralTypeTexts(typeNode, seenAliases);
    }
    if (typeNode.kind === ts.SyntaxKind.NullKeyword) return ["null"];
    if (typeNode.kind === ts.SyntaxKind.UndefinedKeyword) return ["undefined"];
    if (ts.isLiteralTypeNode(typeNode)) {
        const literal = typeNode.literal;
        if (ts.isStringLiteral(literal) || ts.isNumericLiteral(literal)) return [literal.text];
        if (ts.isBigIntLiteral(literal)) return [literal.text.replace(/n$/i, "")];
        if (literal.kind === ts.SyntaxKind.NullKeyword) return ["null"];
        if (literal.kind === ts.SyntaxKind.TrueKeyword) return ["true"];
        if (literal.kind === ts.SyntaxKind.FalseKeyword) return ["false"];
        if (ts.isPrefixUnaryExpression(literal) && ts.isNumericLiteral(literal.operand)) {
            if (literal.operator === ts.SyntaxKind.MinusToken) return [`-${literal.operand.text}`];
            if (literal.operator === ts.SyntaxKind.PlusToken) return [literal.operand.text];
        }
        return [];
    }
    if (!ts.isUnionTypeNode(typeNode)) return [];
    const values: string[] = [];
    const seen = new Set<string>();
    for (const part of typeNode.types) {
        const partValues = templateLiteralSpanTypeTexts(part, seenAliases);
        if (partValues.length === 0) return [];
        for (const value of partValues) {
            if (seen.has(value)) continue;
            seen.add(value);
            values.push(value);
            if (values.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
    }
    return values;
}

function concatStringAlternatives(left: string[], right: string[]): string[] {
    if (left.length === 0 || right.length === 0) return [];
    const out: string[] = [];
    for (const l of left) {
        for (const r of right) {
            out.push(l + r);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
    }
    return dedupeStringAlternatives(out);
}

function dedupeStringAlternatives(values: string[]): string[] {
    const out: string[] = [];
    const seenValues = new Set<string>();
    for (const value of values) {
        if (seenValues.has(value)) continue;
        seenValues.add(value);
        out.push(value);
        if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
    }
    return out;
}

function visibleTypeAliasDeclaration(id: ts.Identifier, context: ts.Node): ts.TypeAliasDeclaration | null {
    let cur: ts.Node | undefined = context;
    while (cur) {
        if (ts.isBlock(cur) || ts.isSourceFile(cur) || ts.isModuleBlock(cur)) {
            for (const stmt of cur.statements) {
                if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === id.text) {
                    return stmt;
                }
            }
        }
        cur = cur.parent;
    }
    return null;
}

function staticPropertyName(name: ts.PropertyName): string | null {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
        return name.text;
    }
    if (ts.isComputedPropertyName(name)) {
        return staticStringExpressionText(name.expression);
    }
    return null;
}

function isStringRawTag(expr: ts.Expression): boolean {
    const unwrapped = unwrapStaticExpression(expr);
    return ts.isPropertyAccessExpression(unwrapped) &&
        unwrapped.name.text === "raw" &&
        ts.isIdentifier(unwrapped.expression) &&
        unwrapped.expression.text === "String";
}

function templateRawText(node: ts.TemplateLiteralLikeNode): string {
    const rawText = (node as ts.TemplateLiteralLikeNode & { rawText?: string }).rawText;
    return rawText ?? node.text;
}

function staticPathCallName(call: ts.CallExpression): "join" | "resolve" | "normalize" | null {
    const callee = unwrapStaticExpression(call.expression);
    if (ts.isPropertyAccessExpression(callee)) {
        const name = callee.name.text;
        if (name !== "join" && name !== "resolve" && name !== "normalize") return null;
        const target = unwrapStaticExpression(callee.expression);
        return ts.isIdentifier(target) && isPathNamespaceIdentifier(target) ? name : null;
    }
    if (!ts.isIdentifier(callee)) return null;
    const imported = pathNamedImport(callee);
    return imported === "join" || imported === "resolve" || imported === "normalize" ? imported : null;
}

function isPathNamespaceIdentifier(id: ts.Identifier): boolean {
    if (isIdentifierShadowedInLocalScope(id)) return false;
    const sf = id.getSourceFile();
    for (const stmt of sf.statements) {
        if (ts.isImportDeclaration(stmt) && isPathModuleSpecifier(stmt.moduleSpecifier)) {
            const bindings = stmt.importClause?.namedBindings;
            if (bindings && ts.isNamespaceImport(bindings) && bindings.name.text === id.text) return true;
            if (stmt.importClause?.name?.text === id.text) return true;
        }
        if (!ts.isVariableStatement(stmt)) continue;
        for (const decl of stmt.declarationList.declarations) {
            if (
                ts.isIdentifier(decl.name) &&
                decl.name.text === id.text &&
                decl.initializer &&
                isStaticPathRequireCall(decl.initializer)
            ) {
                return true;
            }
        }
    }
    return false;
}

function pathNamedImport(id: ts.Identifier): "join" | "resolve" | "normalize" | null {
    if (isIdentifierShadowedInLocalScope(id)) return null;
    const sf = id.getSourceFile();
    for (const stmt of sf.statements) {
        if (!ts.isImportDeclaration(stmt) || !isPathModuleSpecifier(stmt.moduleSpecifier)) continue;
        const bindings = stmt.importClause?.namedBindings;
        if (!bindings || !ts.isNamedImports(bindings)) continue;
        for (const element of bindings.elements) {
            if (element.name.text !== id.text) continue;
            const imported = element.propertyName?.text ?? element.name.text;
            if (imported === "join" || imported === "resolve" || imported === "normalize") return imported;
        }
    }
    return null;
}

function isStaticPathRequireCall(expr: ts.Expression): boolean {
    const cur = unwrapStaticExpression(expr);
    if (!ts.isCallExpression(cur)) return false;
    const callee = unwrapStaticExpression(cur.expression);
    return ts.isCallExpression(cur) &&
        ts.isIdentifier(callee) &&
        callee.text === "require" &&
        cur.arguments.length === 1 &&
        isPathModuleSpecifier(cur.arguments[0]);
}

function isPathModuleSpecifier(node: ts.Node | undefined): boolean {
    return !!node &&
        ts.isStringLiteralLike(node) &&
        (node.text === "path" || node.text === "node:path");
}

function isIdentifierShadowedInLocalScope(id: ts.Identifier): boolean {
    let cur: ts.Node = id;
    while (cur.parent && !ts.isSourceFile(cur.parent)) {
        const parent = cur.parent;
        if (ts.isFunctionLike(parent)) {
            for (const param of parent.parameters) {
                if (ts.isIdentifier(param.name) && param.name.text === id.text) return true;
            }
        }
        if (ts.isBlock(parent) || ts.isModuleBlock(parent)) {
            for (const stmt of parent.statements) {
                if (stmt.pos >= cur.pos) break;
                if (!ts.isVariableStatement(stmt)) continue;
                for (const decl of stmt.declarationList.declarations) {
                    if (ts.isIdentifier(decl.name) && decl.name.text === id.text) return true;
                }
            }
        }
        cur = parent;
    }
    return false;
}

function unwrapStaticExpression(expr: ts.Expression): ts.Expression {
    while (
        ts.isParenthesizedExpression(expr) ||
        ts.isAsExpression(expr) ||
        ts.isTypeAssertionExpression(expr) ||
        ts.isNonNullExpression(expr) ||
        ts.isSatisfiesExpression(expr)
    ) {
        expr = expr.expression;
    }
    return expr;
}
