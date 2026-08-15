import { Buffer } from "node:buffer";
import * as path from "node:path";
import { format as nodeUtilFormat } from "node:util";
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

    const isNamedImportIdentifier = (
        id: ts.Identifier,
        moduleNames: readonly string[],
        exportedName: string,
    ): boolean => {
        const sourceFile = id.getSourceFile();
        for (const stmt of sourceFile.statements) {
            if (!ts.isImportDeclaration(stmt)) continue;
            if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
            if (!moduleNames.includes(stmt.moduleSpecifier.text)) continue;
            const bindings = stmt.importClause?.namedBindings;
            if (!bindings || !ts.isNamedImports(bindings)) continue;
            for (const element of bindings.elements) {
                const importedName = element.propertyName?.text ?? element.name.text;
                if (importedName === exportedName && element.name.text === id.text) {
                    return true;
                }
            }
        }
        return false;
    };

    const isStaticUrlConstructorIdentifier = (id: ts.Identifier): boolean => {
        return id.text === "URL" || isNamedImportIdentifier(id, ["url", "node:url"], "URL");
    };

    const isStaticUrlSearchParamsConstructorIdentifier = (id: ts.Identifier): boolean => {
        return id.text === "URLSearchParams" ||
            isNamedImportIdentifier(id, ["url", "node:url"], "URLSearchParams");
    };

    const isDefaultImportIdentifier = (id: ts.Identifier, moduleNames: readonly string[]): boolean => {
        const sourceFile = id.getSourceFile();
        for (const stmt of sourceFile.statements) {
            if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
            if (!moduleNames.includes(stmt.moduleSpecifier.text)) continue;
            if (stmt.importClause?.name?.text === id.text) return true;
        }
        return false;
    };

    const isNamespaceImportIdentifier = (id: ts.Identifier, moduleNames: readonly string[]): boolean => {
        const sourceFile = id.getSourceFile();
        for (const stmt of sourceFile.statements) {
            if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
            if (!moduleNames.includes(stmt.moduleSpecifier.text)) continue;
            const bindings = stmt.importClause?.namedBindings;
            if (bindings && ts.isNamespaceImport(bindings) && bindings.name.text === id.text) return true;
        }
        return false;
    };

    const isStaticUrlConstructorExpression = (expr: ts.Expression): boolean => {
        const unwrapped = unwrapStaticExpression(expr);
        if (ts.isIdentifier(unwrapped)) return isStaticUrlConstructorIdentifier(unwrapped);
        if (!ts.isPropertyAccessExpression(unwrapped) || unwrapped.name.text !== "URL") return false;
        const receiver = unwrapStaticExpression(unwrapped.expression);
        return ts.isIdentifier(receiver) && (
            isDefaultImportIdentifier(receiver, ["url", "node:url"]) ||
            isNamespaceImportIdentifier(receiver, ["url", "node:url"])
        );
    };

    const isStaticUrlSearchParamsConstructorExpression = (expr: ts.Expression): boolean => {
        const unwrapped = unwrapStaticExpression(expr);
        if (ts.isIdentifier(unwrapped)) return isStaticUrlSearchParamsConstructorIdentifier(unwrapped);
        if (!ts.isPropertyAccessExpression(unwrapped) || unwrapped.name.text !== "URLSearchParams") return false;
        const receiver = unwrapStaticExpression(unwrapped.expression);
        return ts.isIdentifier(receiver) && (
            isDefaultImportIdentifier(receiver, ["url", "node:url"]) ||
            isNamespaceImportIdentifier(receiver, ["url", "node:url"])
        );
    };

    const isStaticBufferConstructorIdentifier = (id: ts.Identifier): boolean => {
        return id.text === "Buffer" ||
            isNamedImportIdentifier(id, ["buffer", "node:buffer"], "Buffer");
    };

    const isStaticBufferConstructorExpression = (expr: ts.Expression): boolean => {
        const unwrapped = unwrapStaticExpression(expr);
        if (ts.isIdentifier(unwrapped)) return isStaticBufferConstructorIdentifier(unwrapped);
        if (!ts.isPropertyAccessExpression(unwrapped) || unwrapped.name.text !== "Buffer") return false;
        const receiver = unwrapStaticExpression(unwrapped.expression);
        return ts.isIdentifier(receiver) && (
            isDefaultImportIdentifier(receiver, ["buffer", "node:buffer"]) ||
            isNamespaceImportIdentifier(receiver, ["buffer", "node:buffer"])
        );
    };

    const isStaticTextEncoderConstructorIdentifier = (id: ts.Identifier): boolean => {
        return id.text === "TextEncoder" ||
            isNamedImportIdentifier(id, ["util", "node:util"], "TextEncoder");
    };

    const isStaticTextDecoderConstructorIdentifier = (id: ts.Identifier): boolean => {
        return id.text === "TextDecoder" ||
            isNamedImportIdentifier(id, ["util", "node:util"], "TextDecoder");
    };

    const isStaticTextEncoderConstructorExpression = (expr: ts.Expression): boolean => {
        const unwrapped = unwrapStaticExpression(expr);
        if (ts.isIdentifier(unwrapped)) return isStaticTextEncoderConstructorIdentifier(unwrapped);
        if (!ts.isPropertyAccessExpression(unwrapped) || unwrapped.name.text !== "TextEncoder") return false;
        const receiver = unwrapStaticExpression(unwrapped.expression);
        return ts.isIdentifier(receiver) && (
            isDefaultImportIdentifier(receiver, ["util", "node:util"]) ||
            isNamespaceImportIdentifier(receiver, ["util", "node:util"])
        );
    };

    const isStaticTextDecoderConstructorExpression = (expr: ts.Expression): boolean => {
        const unwrapped = unwrapStaticExpression(expr);
        if (ts.isIdentifier(unwrapped)) return isStaticTextDecoderConstructorIdentifier(unwrapped);
        if (!ts.isPropertyAccessExpression(unwrapped) || unwrapped.name.text !== "TextDecoder") return false;
        const receiver = unwrapStaticExpression(unwrapped.expression);
        return ts.isIdentifier(receiver) && (
            isDefaultImportIdentifier(receiver, ["util", "node:util"]) ||
            isNamespaceImportIdentifier(receiver, ["util", "node:util"])
        );
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
            const booleanText = resolveStaticBooleanCall(node);
            if (booleanText.length > 0) return booleanText;
            const primitiveConstructorText = resolveStaticPrimitiveConstructorCall(node);
            if (primitiveConstructorText.length > 0) return primitiveConstructorText;
            const stringStaticText = resolveStaticStringConstructorCall(node);
            if (stringStaticText.length > 0) return stringStaticText;
            const stringRawText = resolveStaticStringRawCall(node);
            if (stringRawText.length > 0) return stringRawText;
            const regexpEscapeText = resolveStaticRegExpEscapeCall(node);
            if (regexpEscapeText.length > 0) return regexpEscapeText;
            const regexpStringText = resolveStaticRegExpStringCall(node);
            if (regexpStringText.length > 0) return regexpStringText;
            const regexpTestText = resolveStaticRegExpTestCall(node);
            if (regexpTestText.length > 0) return regexpTestText;
            const stringRegExpSearchText = resolveStaticStringRegExpSearchCall(node);
            if (stringRegExpSearchText.length > 0) return stringRegExpSearchText;
            const uriText = resolveStaticUriCall(node);
            if (uriText.length > 0) return uriText;
            const base64Text = resolveStaticBase64Call(node);
            if (base64Text.length > 0) return base64Text;
            const urlCanParseText = resolveStaticUrlCanParseCall(node);
            if (urlCanParseText.length > 0) return urlCanParseText;
            const urlStringText = resolveStaticUrlStringCall(node);
            if (urlStringText.length > 0) return urlStringText;
            const bufferByteLengthText = resolveStaticBufferByteLengthCall(node);
            if (bufferByteLengthText.length > 0) return bufferByteLengthText;
            const bufferIsEncodingText = resolveStaticBufferIsEncodingCall(node);
            if (bufferIsEncodingText.length > 0) return bufferIsEncodingText;
            const bufferFromToStringText = resolveStaticBufferFromToStringCall(node);
            if (bufferFromToStringText.length > 0) return bufferFromToStringText;
            const bufferConcatToStringText = resolveStaticBufferConcatToStringCall(node);
            if (bufferConcatToStringText.length > 0) return bufferConcatToStringText;
            const bufferAllocToStringText = resolveStaticBufferAllocToStringCall(node);
            if (bufferAllocToStringText.length > 0) return bufferAllocToStringText;
            const bufferToStringText = resolveStaticBufferToStringCall(node);
            if (bufferToStringText.length > 0) return bufferToStringText;
            const bufferToLocaleStringText = resolveStaticBufferToLocaleStringCall(node);
            if (bufferToLocaleStringText.length > 0) return bufferToLocaleStringText;
            const bufferCompareText = resolveStaticBufferCompareCall(node);
            if (bufferCompareText.length > 0) return bufferCompareText;
            const bufferCopyText = resolveStaticBufferCopyCall(node);
            if (bufferCopyText.length > 0) return bufferCopyText;
            const bufferWriteText = resolveStaticBufferWriteCall(node);
            if (bufferWriteText.length > 0) return bufferWriteText;
            const bufferIntegerWriteText = resolveStaticBufferIntegerWriteCall(node);
            if (bufferIntegerWriteText.length > 0) return bufferIntegerWriteText;
            const bufferIntegerReadText = resolveStaticBufferIntegerReadCall(node);
            if (bufferIntegerReadText.length > 0) return bufferIntegerReadText;
            const bufferFloatWriteText = resolveStaticBufferFloatWriteCall(node);
            if (bufferFloatWriteText.length > 0) return bufferFloatWriteText;
            const bufferFloatReadText = resolveStaticBufferFloatReadCall(node);
            if (bufferFloatReadText.length > 0) return bufferFloatReadText;
            const bufferEqualsText = resolveStaticBufferEqualsCall(node);
            if (bufferEqualsText.length > 0) return bufferEqualsText;
            const bufferSearchText = resolveStaticBufferSearchCall(node);
            if (bufferSearchText.length > 0) return bufferSearchText;
            const bufferIsBufferText = resolveStaticBufferIsBufferCall(node);
            if (bufferIsBufferText.length > 0) return bufferIsBufferText;
            const textDecoderText = resolveStaticTextDecoderDecodeCall(node);
            if (textDecoderText.length > 0) return textDecoderText;
            const numericParserText = resolveStaticNumericParserCall(node);
            if (numericParserText.length > 0) return numericParserText;
            const globalNumericPredicateText = resolveStaticGlobalNumericPredicateCall(node);
            if (globalNumericPredicateText.length > 0) return globalNumericPredicateText;
            const numericPredicateText = resolveStaticNumericPredicateCall(node);
            if (numericPredicateText.length > 0) return numericPredicateText;
            const arrayPredicateText = resolveStaticArrayPredicateCall(node);
            if (arrayPredicateText.length > 0) return arrayPredicateText;
            const arrayMutationText = resolveStaticArrayMutationCall(node);
            if (arrayMutationText.length > 0) return arrayMutationText;
            const arraySearchText = resolveStaticArraySearchCall(node);
            if (arraySearchText.length > 0) return arraySearchText;
            const arrayReduceText = resolveStaticArrayReduceCall(node);
            if (arrayReduceText.length > 0) return arrayReduceText;
            const mapSetText = resolveStaticMapSetCall(node);
            if (mapSetText.length > 0) return mapSetText;
            const sameValueText = resolveStaticObjectIsCall(node);
            if (sameValueText.length > 0) return sameValueText;
            const ownPredicateText = resolveStaticObjectHasOwnCall(node);
            if (ownPredicateText.length > 0) return ownPredicateText;
            const ownPrototypePredicateText = resolveStaticObjectOwnPrototypePredicateCall(node);
            if (ownPrototypePredicateText.length > 0) return ownPrototypePredicateText;
            const bufferOwnPrototypePredicateText = resolveStaticBufferOwnPrototypePredicateCall(node);
            if (bufferOwnPrototypePredicateText.length > 0) return bufferOwnPrototypePredicateText;
            const objectPrototypeToStringText = resolveStaticObjectPrototypeToStringCall(node);
            if (objectPrototypeToStringText.length > 0) return objectPrototypeToStringText;
            const reflectGetText = resolveStaticReflectGetCall(node);
            if (reflectGetText.length > 0) return reflectGetText;
            const reflectHasText = resolveStaticReflectHasCall(node);
            if (reflectHasText.length > 0) return reflectHasText;
            const integrityPredicateText = resolveStaticObjectIntegrityPredicateCall(node);
            if (integrityPredicateText.length > 0) return integrityPredicateText;
            const dateText = resolveStaticDateCall(node);
            if (dateText.length > 0) return dateText;
            const dateInstanceText = resolveStaticDateInstanceCall(node);
            if (dateInstanceText.length > 0) return dateInstanceText;
            const mathText = resolveStaticMathCall(node);
            if (mathText.length > 0) return mathText;
            const pathText = resolvePathCall(node);
            if (pathText.length > 0) return pathText;
            const queryStringText = resolveStaticQueryStringCall(node);
            if (queryStringText.length > 0) return queryStringText;
            const utilFormatText = resolveStaticUtilFormatCall(node);
            if (utilFormatText.length > 0) return utilFormatText;
            const urlSearchParamsText = resolveStaticUrlSearchParamsCall(node);
            if (urlSearchParamsText.length > 0) return urlSearchParamsText;
            const jsonStringifyText = resolveStaticJsonStringifyCall(node);
            if (jsonStringifyText.length > 0) return jsonStringifyText;
            const atText = resolveStaticArrayAtCall(node);
            if (atText.length > 0) return atText;
            const stringIndexText = resolveStaticStringIndexCall(node);
            if (stringIndexText.length > 0) return stringIndexText;
            const stringCodeText = resolveStaticStringCodeCall(node);
            if (stringCodeText.length > 0) return stringCodeText;
            const stringSearchText = resolveStaticStringSearchCall(node);
            if (stringSearchText.length > 0) return stringSearchText;
            const stringLocaleCompareText = resolveStaticStringLocaleCompareCall(node);
            if (stringLocaleCompareText.length > 0) return stringLocaleCompareText;
            const stringIdentityText = resolveStaticStringIdentityCall(node);
            if (stringIdentityText.length > 0) return stringIdentityText;
            const stringConcatText = resolveStaticStringConcatCall(node);
            if (stringConcatText.length > 0) return stringConcatText;
            const joinText = resolveStaticArrayJoinCall(node);
            if (joinText.length > 0) return joinText;
            const caseText = resolveStaticStringCaseCall(node);
            if (caseText.length > 0) return caseText;
            const trimText = resolveStaticStringTrimCall(node);
            if (trimText.length > 0) return trimText;
            const normalizeText = resolveStaticStringNormalizeCall(node);
            if (normalizeText.length > 0) return normalizeText;
            const wellFormedText = resolveStaticStringWellFormedCall(node);
            if (wellFormedText.length > 0) return wellFormedText;
            const repeatText = resolveStaticStringRepeatCall(node);
            if (repeatText.length > 0) return repeatText;
            const padText = resolveStaticStringPadCall(node);
            if (padText.length > 0) return padText;
            const rangeText = resolveStaticStringRangeCall(node);
            if (rangeText.length > 0) return rangeText;
            const replaceText = resolveStaticStringReplaceCall(node);
            if (replaceText.length > 0) return replaceText;
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
            const stringIndex = resolveStaticStringElementAccess(node);
            if (stringIndex.length > 0) return stringIndex;
            const bufferIndex = resolveStaticBufferElementAccess(node);
            if (bufferIndex.length > 0) return bufferIndex;
            const bufferJsonDataIndex = resolveStaticBufferToJsonDataElementAccess(node);
            if (bufferJsonDataIndex.length > 0) return bufferJsonDataIndex;
            const stringSplit = resolveStaticStringSplitAccess(node);
            if (stringSplit.length > 0) return stringSplit;
            const enumValues = resolveStaticEnumAccess(node.expression, node.argumentExpression);
            if (enumValues.length > 0) return enumValues;
            const objectKeysValues = resolveObjectKeysValuesAccess(node);
            if (objectKeysValues.length > 0) return objectKeysValues;
            const objectEntries = resolveObjectEntriesAccess(node);
            if (objectEntries.length > 0) return objectEntries;
            return resolveStaticCollectionAccess(node.expression, node.argumentExpression);
        }
        if (ts.isPropertyAccessExpression(node)) {
            const numericConstant = resolveStaticNumericConstantAccess(node);
            if (numericConstant.length > 0) return numericConstant;
            const stringLength = resolveStaticStringLengthAccess(node);
            if (stringLength.length > 0) return stringLength;
            const bufferLength = resolveStaticBufferLengthAccess(node);
            if (bufferLength.length > 0) return bufferLength;
            const arrayBufferLength = resolveStaticArrayBufferLengthAccess(node);
            if (arrayBufferLength.length > 0) return arrayBufferLength;
            const dataViewProperty = resolveStaticDataViewPropertyAccess(node);
            if (dataViewProperty.length > 0) return dataViewProperty;
            const dataViewBufferLength = resolveStaticDataViewBufferLengthAccess(node);
            if (dataViewBufferLength.length > 0) return dataViewBufferLength;
            const urlProperty = resolveStaticUrlPropertyAccess(node);
            if (urlProperty.length > 0) return urlProperty;
            const regexpProperty = resolveStaticRegExpPropertyAccess(node);
            if (regexpProperty.length > 0) return regexpProperty;
            const bufferJsonProperty = resolveStaticBufferToJsonPropertyAccess(node);
            if (bufferJsonProperty.length > 0) return bufferJsonProperty;
            const descriptorProperty = resolveStaticDescriptorPropertyAccess(node);
            if (descriptorProperty.length > 0) return descriptorProperty;
            const enumValues = resolveStaticEnumAccess(node.expression, node.name);
            if (enumValues.length > 0) return enumValues;
            const mapSetSize = resolveStaticMapSetSizeAccess(node);
            if (mapSetSize.length > 0) return mapSetSize;
            const urlSearchParamsSize = resolveStaticUrlSearchParamsSizeAccess(node);
            if (urlSearchParamsSize.length > 0) return urlSearchParamsSize;
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

    const resolveStaticStringRawCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length === 0 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!isStringRawMember(callee)) return [];

        const template = resolveCollectionExpression(call.arguments[0]!);
        if (!template || !ts.isObjectLiteralExpression(template)) return [];

        let rawExpression: ts.Expression | null = null;
        for (const property of template.properties) {
            if (ts.isPropertyAssignment(property)) {
                if (staticPropertyName(property.name) === "raw") rawExpression = property.initializer;
            } else if (ts.isShorthandPropertyAssignment(property)) {
                if (staticPropertyName(property.name) === "raw") rawExpression = property.name;
            } else {
                return [];
            }
        }
        if (!rawExpression) return [];

        const raw = resolveCollectionExpression(rawExpression);
        if (!raw || !ts.isArrayLiteralExpression(raw) || raw.elements.length > MAX_STATIC_STRING_ALTERNATIVES) {
            return [];
        }
        if (raw.elements.some((element) => ts.isSpreadElement(element) || element.kind === ts.SyntaxKind.OmittedExpression)) {
            return [];
        }

        let out = [""];
        for (let index = 0; index < raw.elements.length; index++) {
            const rawValues = resolve(raw.elements[index]!);
            if (rawValues.length === 0) return [];
            out = index === 0 ? concat(out, rawValues) : out;
            if (index > 0) {
                const substitutionIndex = index - 1;
                const substitution = substitutionIndex < call.arguments.length - 1
                    ? resolve(call.arguments[substitutionIndex + 1]!)
                    : ["undefined"];
                if (substitution.length === 0) return [];
                out = concat(out, substitution);
                out = concat(out, rawValues);
            }
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
                case "basename":
                    return parts.length === 1 ? path.basename(parts[0]!) :
                        parts.length === 2 ? path.basename(parts[0]!, parts[1]!) : "";
                case "dirname":
                    return parts.length === 1 ? path.dirname(parts[0]!) : "";
                case "extname":
                    return parts.length === 1 ? path.extname(parts[0]!) : "";
            }
        }).filter((value) => value !== ""));
    };

    const resolveStaticQueryStringCall = (call: ts.CallExpression): string[] => {
        const name = staticQueryStringCallName(call);
        if (!name || call.arguments.length < 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const values = resolve(call.arguments[0]!);
        if (values.length === 0) return [];
        return dedupe(values.map((value) => {
            if (name === "escape") return encodeURIComponent(value);
            try {
                return decodeURIComponent(value);
            } catch {
                return "";
            }
        }).filter((value) => value !== ""));
    };

    const resolveStaticUtilFormatCall = (call: ts.CallExpression): string[] => {
        if (!isStaticUtilFormatCall(call) || call.arguments.length === 0 || call.arguments.some(ts.isSpreadElement)) {
            return [];
        }
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
        return dedupe(encoded.map((joined) => nodeUtilFormat(...joined.split("\0"))).filter((value) => value !== ""));
    };

    const resolveStaticBooleanCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length > 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isIdentifier(callee) || callee.text !== "Boolean") return [];
        if (call.arguments.length === 0) return ["false"];
        const values = resolveStaticBooleanValues(call.arguments[0]!);
        return values.length === 0 ? [] : dedupe(values.map(String));
    };

    const resolveStaticBooleanValues = (expr: ts.Expression): boolean[] => {
        const value = resolveCollectionExpression(expr);
        if (!value) return [];
        if (value.kind === ts.SyntaxKind.TrueKeyword) return [true];
        if (value.kind === ts.SyntaxKind.FalseKeyword) return [false];
        if (
            value.kind === ts.SyntaxKind.NullKeyword ||
            value.kind === ts.SyntaxKind.UndefinedKeyword ||
            (ts.isIdentifier(value) && value.text === "undefined") ||
            ts.isVoidExpression(value)
        ) {
            return [false];
        }
        if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
            return [value.text.length > 0];
        }
        if (ts.isNumericLiteral(value)) {
            const num = Number(value.text);
            return Number.isFinite(num) ? [num !== 0] : [];
        }
        if (ts.isBigIntLiteral(value)) {
            return [BigInt(value.text.replace(/n$/i, "")) !== 0n];
        }
        if (
            ts.isPrefixUnaryExpression(value) &&
            value.operator === ts.SyntaxKind.MinusToken &&
            ts.isNumericLiteral(value.operand)
        ) {
            const num = -Number(value.operand.text);
            return Number.isFinite(num) ? [num !== 0] : [];
        }
        if (ts.isArrayLiteralExpression(value) || ts.isObjectLiteralExpression(value)) {
            return [true];
        }
        if (
            ts.isTemplateExpression(value) ||
            (ts.isTaggedTemplateExpression(value) && isStringRawTag(value.tag))
        ) {
            const texts = resolve(value);
            return texts.length === 0 ? [] : [...new Set(texts.map((text) => text.length > 0))];
        }
        return [];
    };

    const resolveStaticPrimitiveConstructorCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length > 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (
            !ts.isIdentifier(callee) ||
            (callee.text !== "String" && callee.text !== "Number" && callee.text !== "BigInt")
        ) {
            return [];
        }
        if (callee.text === "String") {
            if (call.arguments.length === 0) return [""];
            const values = resolveStaticStringCoercionValues(call.arguments[0]!);
            return values.length === 0 ? [] : dedupe(values);
        }
        if (callee.text === "BigInt") {
            if (call.arguments.length === 0) return [];
            const values = resolveStaticBigIntCoercionValues(call.arguments[0]!);
            return values.length === 0 ? [] : dedupe(values);
        }
        if (call.arguments.length === 0) return ["0"];
        const values = resolveStaticCoercedNumberValues(call.arguments[0]!);
        return values.length === 0 ? [] : dedupe(values.map((value) => {
            return Object.is(value, -0) ? "0" : String(value);
        }));
    };

    const resolveStaticStringCoercionValues = (expr: ts.Expression): string[] => {
        const value = unwrapStaticExpression(expr);
        if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return [value.text];
        if (ts.isNumericLiteral(value)) return [value.text];
        if (ts.isBigIntLiteral(value)) return [value.text.replace(/n$/i, "")];
        if (value.kind === ts.SyntaxKind.TrueKeyword) return ["true"];
        if (value.kind === ts.SyntaxKind.FalseKeyword) return ["false"];
        if (value.kind === ts.SyntaxKind.NullKeyword) return ["null"];
        if (
            value.kind === ts.SyntaxKind.UndefinedKeyword ||
            (ts.isIdentifier(value) && value.text === "undefined") ||
            ts.isVoidExpression(value)
        ) {
            return ["undefined"];
        }
        if (
            ts.isPrefixUnaryExpression(value) &&
            value.operator === ts.SyntaxKind.MinusToken &&
            (ts.isNumericLiteral(value.operand) || ts.isBigIntLiteral(value.operand))
        ) {
            const coerced = resolveStaticStringCoercionValues(value.operand);
            return coerced.length === 1 ? [`-${coerced[0]}`] : [];
        }
        return [];
    };

    const resolveStaticBigIntCoercionValues = (expr: ts.Expression): string[] => {
        const value = unwrapStaticExpression(expr);
        if (ts.isBigIntLiteral(value)) return [BigInt(value.text.replace(/n$/i, "")).toString()];
        if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
            try {
                return [BigInt(value.text).toString()];
            } catch {
                return [];
            }
        }
        if (ts.isNumericLiteral(value)) {
            const num = Number(value.text);
            return Number.isSafeInteger(num) ? [BigInt(num).toString()] : [];
        }
        if (value.kind === ts.SyntaxKind.TrueKeyword) return ["1"];
        if (value.kind === ts.SyntaxKind.FalseKeyword) return ["0"];
        if (
            ts.isPrefixUnaryExpression(value) &&
            value.operator === ts.SyntaxKind.MinusToken &&
            (ts.isNumericLiteral(value.operand) || ts.isBigIntLiteral(value.operand))
        ) {
            const coerced = resolveStaticBigIntCoercionValues(value.operand);
            return coerced.length === 1 ? [`-${coerced[0]}`] : [];
        }
        return [];
    };

    const resolveStaticStringConstructorCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "String") return [];
        const method = callee.name.text;
        if (method !== "fromCharCode" && method !== "fromCodePoint") return [];

        let out = [""];
        for (const argument of call.arguments) {
            const codes = resolveStaticIntegerKeys(argument);
            if (codes.length === 0) return [];
            const next: string[] = [];
            for (const prefix of out) {
                for (const code of codes) {
                    if (method === "fromCodePoint" && (code < 0 || code > 0x10ffff)) return [];
                    let char: string;
                    try {
                        char = method === "fromCharCode"
                            ? String.fromCharCode(code)
                            : String.fromCodePoint(code);
                    } catch {
                        return [];
                    }
                    next.push(prefix + char);
                    if (next.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
            out = dedupe(next);
            if (out.length === 0) return [];
        }
        if (out.some((value) => value.length > 4096)) return [];
        return dedupe(out);
    };

    const escapeRegExpAscii = (input: string): string | null => {
        const hex = "0123456789abcdef";
        let out = "";
        for (let i = 0; i < input.length; i++) {
            const code = input.charCodeAt(i);
            if (code >= 128) return null;
            const leadingAlnum = i === 0 && (
                (code >= 48 && code <= 57) ||
                (code >= 65 && code <= 90) ||
                (code >= 97 && code <= 122)
            );
            if (leadingAlnum) {
                out += "\\x" + hex[code >> 4] + hex[code & 0x0f];
                continue;
            }
            switch (code) {
                case 94:
                case 36:
                case 92:
                case 46:
                case 42:
                case 43:
                case 63:
                case 40:
                case 41:
                case 91:
                case 93:
                case 123:
                case 125:
                case 124:
                case 47:
                    out += "\\" + String.fromCharCode(code);
                    break;
                case 10:
                    out += "\\n";
                    break;
                case 13:
                    out += "\\r";
                    break;
                case 9:
                    out += "\\t";
                    break;
                case 12:
                    out += "\\f";
                    break;
                case 11:
                    out += "\\v";
                    break;
                case 45:
                case 32:
                case 44:
                case 61:
                case 60:
                case 62:
                case 35:
                case 38:
                case 33:
                case 37:
                case 58:
                case 59:
                case 64:
                case 126:
                case 39:
                case 96:
                case 34:
                    out += "\\x" + hex[code >> 4] + hex[code & 0x0f];
                    break;
                default:
                    out += code < 0x20 || code === 0x7f
                        ? "\\x" + hex[code >> 4] + hex[code & 0x0f]
                        : String.fromCharCode(code);
                    break;
            }
        }
        return out;
    };

    const resolveStaticRegExpEscapeCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "escape") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "RegExp") return [];
        const values = resolve(call.arguments[0]!);
        if (values.length === 0) return [];
        const out: string[] = [];
        for (const value of values) {
            const escaped = escapeRegExpAscii(value);
            if (escaped === null) return [];
            out.push(escaped);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupe(out);
    };

    const resolveStaticRegExpRecords = (expr: ts.Expression): RegExp[] => {
        const current = unwrapStaticExpression(expr);
        if (ts.isIdentifier(current)) {
            const decl = earlierConstStringDeclaration(current) ?? topLevelConstStringDeclaration(current);
            if (!decl?.initializer || seen.has(decl)) return [];
            seen.add(decl);
            const values = resolveStaticRegExpRecords(decl.initializer);
            seen.delete(decl);
            return values;
        }
        if (ts.isRegularExpressionLiteral(current)) {
            const text = current.text;
            const slash = text.lastIndexOf("/");
            if (slash <= 0) return [];
            try {
                return [new RegExp(text.slice(1, slash), text.slice(slash + 1))];
            } catch {
                return [];
            }
        }
        if (!ts.isCallExpression(current) && !ts.isNewExpression(current)) return [];
        if (current.arguments?.some(ts.isSpreadElement)) return [];
        const target = unwrapStaticExpression(current.expression);
        if (!ts.isIdentifier(target) || target.text !== "RegExp") return [];
        const args = current.arguments ?? [];
        if (args.length > 2) return [];

        const patterns = args[0] ? resolve(args[0]) : [""];
        if (patterns.length === 0) return [];
        const flags = !args[1] || isStaticUndefinedExpression(args[1])
            ? [undefined]
            : resolve(args[1]);
        if (flags.length === 0) return [];

        const out: RegExp[] = [];
        for (const pattern of patterns) {
            for (const flag of flags) {
                try {
                    out.push(new RegExp(pattern, flag));
                } catch {
                    return [];
                }
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return out;
    };

    const resolveFreshStaticRegExpRecords = (expr: ts.Expression): RegExp[] => {
        const current = unwrapStaticExpression(expr);
        if (ts.isIdentifier(current)) {
            const decl = earlierConstStringDeclaration(current) ?? topLevelConstStringDeclaration(current);
            if (!decl?.initializer || seen.has(decl)) return [];
            seen.add(decl);
            const values = resolveFreshStaticRegExpRecords(decl.initializer);
            seen.delete(decl);
            return values;
        }
        if (ts.isRegularExpressionLiteral(current)) {
            const text = current.text;
            const slash = text.lastIndexOf("/");
            if (slash <= 0) return [];
            try {
                return [new RegExp(text.slice(1, slash), text.slice(slash + 1))];
            } catch {
                return [];
            }
        }
        if (!ts.isCallExpression(current) && !ts.isNewExpression(current)) return [];
        if (current.arguments?.some(ts.isSpreadElement)) return [];
        const target = unwrapStaticExpression(current.expression);
        if (!ts.isIdentifier(target) || target.text !== "RegExp") return [];
        const args = current.arguments ?? [];
        if (args.length > 2) return [];

        const patterns = args[0] ? resolve(args[0]) : [""];
        if (patterns.length === 0) return [];
        const flags = !args[1] || isStaticUndefinedExpression(args[1])
            ? [undefined]
            : resolve(args[1]);
        if (flags.length === 0) return [];

        const out: RegExp[] = [];
        for (const pattern of patterns) {
            for (const flag of flags) {
                try {
                    out.push(new RegExp(pattern, flag));
                } catch {
                    return [];
                }
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return out;
    };

    const resolveStaticRegExpPropertyAccess = (access: ts.PropertyAccessExpression): string[] => {
        const property = access.name.text;
        if (
            property !== "source" &&
            property !== "flags" &&
            property !== "global" &&
            property !== "ignoreCase" &&
            property !== "multiline" &&
            property !== "dotAll" &&
            property !== "unicode" &&
            property !== "sticky" &&
            property !== "hasIndices"
        ) {
            return [];
        }
        const regexps = resolveStaticRegExpRecords(access.expression);
        if (regexps.length === 0) return [];
        return dedupe(regexps.map((regexp) => String(regexp[property as keyof RegExp])));
    };

    const resolveStaticRegExpStringCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 0) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "toString" && method !== "toLocaleString") return [];
        const regexps = resolveStaticRegExpRecords(callee.expression);
        if (regexps.length === 0) return [];
        return dedupe(regexps.map((regexp) => regexp.toString()));
    };

    const resolveStaticRegExpTestCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "test") return [];
        const regexps = resolveFreshStaticRegExpRecords(callee.expression);
        if (regexps.length === 0) return [];
        const inputs = resolve(call.arguments[0]!);
        if (inputs.length === 0) return [];

        const out: string[] = [];
        for (const regexp of regexps) {
            for (const input of inputs) {
                out.push(String(regexp.test(input)));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticUriCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isIdentifier(callee)) return [];
        const name = callee.text;
        if (
            name !== "encodeURI" &&
            name !== "encodeURIComponent" &&
            name !== "decodeURI" &&
            name !== "decodeURIComponent"
        ) {
            return [];
        }
        const values = resolve(call.arguments[0]!);
        if (values.length === 0) return [];
        const out: string[] = [];
        for (const value of values) {
            try {
                if (name === "encodeURI") {
                    out.push(encodeURI(value));
                } else if (name === "encodeURIComponent") {
                    out.push(encodeURIComponent(value));
                } else if (name === "decodeURI") {
                    out.push(decodeURI(value));
                } else {
                    out.push(decodeURIComponent(value));
                }
            } catch {
                return [];
            }
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupe(out);
    };

    const resolveStaticBase64Call = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isIdentifier(callee) || (callee.text !== "btoa" && callee.text !== "atob")) return [];
        const values = resolve(call.arguments[0]!);
        if (values.length === 0) return [];
        const out: string[] = [];
        for (const value of values) {
            try {
                if (callee.text === "btoa") {
                    out.push(Buffer.from(value, "utf8").toString("base64"));
                } else {
                    if (!/^[A-Za-z0-9+/=\s]*$/.test(value)) return [];
                    out.push(Buffer.from(value, "base64").toString("utf8"));
                }
            } catch {
                return [];
            }
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupe(out);
    };

    const canParseRuntimeUrl = (value: string): boolean => {
        const schemeColon = value.indexOf(":");
        return schemeColon >= 0 &&
            schemeColon + 2 < value.length &&
            value[schemeColon + 1] === "/" &&
            value[schemeColon + 2] === "/";
    };

    const resolveStaticUrlCanParseCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 1 || call.arguments.length > 2 || call.arguments.some(ts.isSpreadElement)) {
            return [];
        }
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "canParse") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!isStaticUrlConstructorExpression(target)) return [];

        const inputs = resolve(call.arguments[0]!);
        if (inputs.length === 0) return [];
        const baseArg = call.arguments[1];
        const bases = !baseArg || isStaticUndefinedExpression(baseArg)
            ? [undefined]
            : resolve(baseArg);
        if (bases.length === 0) return [];

        const out: string[] = [];
        for (const input of inputs) {
            for (const base of bases) {
                out.push(String(base === undefined
                    ? canParseRuntimeUrl(input)
                    : canParseRuntimeUrl(input) || canParseRuntimeUrl(base)));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticUrlRecords = (expr: ts.Expression): URL[] => {
        const current = unwrapStaticExpression(expr);
        if (ts.isIdentifier(current)) {
            const decl = earlierConstStringDeclaration(current) ?? topLevelConstStringDeclaration(current);
            if (!decl?.initializer || seen.has(decl)) return [];
            seen.add(decl);
            const values = resolveStaticUrlRecords(decl.initializer);
            seen.delete(decl);
            return values;
        }
        if (!ts.isNewExpression(current) || current.arguments?.some(ts.isSpreadElement)) return [];
        const target = unwrapStaticExpression(current.expression);
        if (!isStaticUrlConstructorExpression(target)) return [];
        const args = current.arguments ?? [];
        if (args.length < 1 || args.length > 2) return [];
        if (args.length === 2 && isStaticUndefinedExpression(args[1]!)) return [];

        const inputs = resolve(args[0]!);
        if (inputs.length === 0) return [];
        const bases = args.length === 1 ? [undefined] : resolve(args[1]!);
        if (bases.length === 0) return [];

        const out: URL[] = [];
        for (const input of inputs) {
            for (const base of bases) {
                if (base === undefined) {
                    if (!canParseRuntimeUrl(input)) return [];
                } else if (!canParseRuntimeUrl(input) && !canParseRuntimeUrl(base)) {
                    return [];
                }
                try {
                    out.push(base === undefined ? new URL(input) : new URL(input, base));
                } catch {
                    return [];
                }
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return out;
    };

    const resolveStaticUrlPropertyAccess = (access: ts.PropertyAccessExpression): string[] => {
        const property = access.name.text;
        if (
            property !== "href" &&
            property !== "protocol" &&
            property !== "host" &&
            property !== "hostname" &&
            property !== "username" &&
            property !== "password" &&
            property !== "port" &&
            property !== "pathname" &&
            property !== "search" &&
            property !== "hash" &&
            property !== "origin"
        ) {
            return [];
        }
        const urls = resolveStaticUrlRecords(access.expression);
        if (urls.length === 0) return [];
        return dedupe(urls.map((url) => url[property as keyof URL] as string));
    };

    const resolveStaticUrlStringCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 0) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "toString" && method !== "toJSON" && method !== "toLocaleString") return [];
        const urls = resolveStaticUrlRecords(callee.expression);
        if (urls.length === 0) return [];
        return dedupe(urls.map((url) => url.href));
    };

    const staticBufferByteLength = (value: string, encoding: string | undefined): number | null => {
        const normalized = encoding?.toLowerCase();
        if (!normalized || isStaticBufferEncoding(normalized, true)) {
            return Buffer.byteLength(value, "utf8");
        }
        if (normalized === "hex") return Math.floor(value.length / 2);
        if (normalized === "base64") {
            if (!/^[A-Za-z0-9+/=\s]*$/.test(value)) return null;
            return Buffer.from(value, "base64").length;
        }
        if (normalized === "latin1" || normalized === "binary" || normalized === "ascii") {
            return value.length;
        }
        return null;
    };

    const isStaticBufferEncoding = (encoding: string, utf8Only = false): boolean => {
        const normalized = encoding.toLowerCase();
        if (normalized === "utf8" || normalized === "utf-8") return true;
        if (utf8Only) return false;
        return normalized === "hex" ||
            normalized === "base64" ||
            normalized === "latin1" ||
            normalized === "binary" ||
            normalized === "ascii";
    };

    const nodeBufferEncoding = (encoding: string | undefined): BufferEncoding | null => {
        const normalized = encoding?.toLowerCase();
        if (!normalized || normalized === "utf8" || normalized === "utf-8") return "utf8";
        if (!isStaticBufferEncoding(normalized)) return null;
        return normalized as BufferEncoding;
    };

    const isRuntimeValidBufferInput = (value: string, encoding: BufferEncoding): boolean => {
        if (encoding === "hex") return value.length % 2 === 0 && /^[0-9A-Fa-f]*$/.test(value);
        if (encoding === "base64") return /^[A-Za-z0-9+/=\s]*$/.test(value);
        return true;
    };

    const resolveStaticBufferFromExpression = (call: ts.CallExpression): Buffer[] => {
        if (call.arguments.length < 1 || call.arguments.length > 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "from") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!isStaticBufferConstructorExpression(target)) return [];

        const arrayValue = unwrapStaticExpression(call.arguments[0]!);
        if (ts.isArrayLiteralExpression(arrayValue)) {
            if (call.arguments.length > 1) return [];
            const bytes: number[] = [];
            for (const element of arrayValue.elements) {
                if (ts.isSpreadElement(element)) return [];
                const elementValues = resolveStaticIntegerKeys(element);
                if (elementValues.length !== 1) return [];
                bytes.push(elementValues[0]! & 0xff);
            }
            return [Buffer.from(bytes)];
        }

        const values = resolve(call.arguments[0]!);
        if (values.length === 0) return [];
        const encodingArg = call.arguments[1];
        const encodings = !encodingArg || isStaticUndefinedExpression(encodingArg)
            ? [undefined]
            : resolve(encodingArg);
        if (encodings.length === 0) return [];

        const out: Buffer[] = [];
        for (const value of values) {
            for (const encoding of encodings) {
                const nodeEncoding = nodeBufferEncoding(encoding);
                if (!nodeEncoding || !isRuntimeValidBufferInput(value, nodeEncoding)) return [];
                out.push(Buffer.from(value, nodeEncoding));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return out;
    };

    const resolveStaticBufferAllocExpression = (call: ts.CallExpression): Buffer[] => {
        if (call.arguments.length < 1 || call.arguments.length > 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "alloc" && method !== "allocUnsafe" && method !== "allocUnsafeSlow") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!isStaticBufferConstructorExpression(target)) return [];
        if (method !== "alloc" && call.arguments.length > 1) return [];

        const sizes = resolveStaticIntegerKeys(call.arguments[0]!);
        if (sizes.length === 0) return [];
        const fillArg = call.arguments[1];
        const fills = method !== "alloc" || !fillArg || isStaticUndefinedExpression(fillArg)
            ? [0]
            : resolveStaticIntegerKeys(fillArg);
        if (fills.length === 0) return [];

        const out: Buffer[] = [];
        for (const size of sizes) {
            if (size < 0) return [];
            for (const fill of fills) {
                out.push(Buffer.alloc(size, fill & 0xff));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupeBuffers(out);
    };

    const resolveStaticBufferRangeArgs = (startExpr: ts.Expression | undefined, endExpr: ts.Expression | undefined): Array<[number | undefined, number | undefined]> => {
        const starts = !startExpr || isStaticUndefinedExpression(startExpr)
            ? [undefined]
            : resolveStaticIntegerKeys(startExpr);
        if (starts.length === 0) return [];
        const ends = !endExpr || isStaticUndefinedExpression(endExpr)
            ? [undefined]
            : resolveStaticIntegerKeys(endExpr);
        if (ends.length === 0) return [];

        const out: Array<[number | undefined, number | undefined]> = [];
        for (const start of starts) {
            for (const end of ends) {
                out.push([start, end]);
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return out;
    };

    const resolveStaticBufferSliceExpression = (call: ts.CallExpression): Buffer[] => {
        if (call.arguments.length > 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "slice" && method !== "subarray") return [];

        const receivers = resolveStaticBufferExpression(callee.expression);
        if (receivers.length === 0) return [];
        const ranges = resolveStaticBufferRangeArgs(call.arguments[0], call.arguments[1]);
        if (ranges.length === 0) return [];

        const out: Buffer[] = [];
        for (const receiver of receivers) {
            for (const [start, end] of ranges) {
                const view = method === "slice"
                    ? receiver.slice(start, end)
                    : receiver.subarray(start, end);
                out.push(Buffer.from(view));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupeBuffers(out);
    };

    const resolveStaticBufferFillExpression = (call: ts.CallExpression): Buffer[] => {
        if (call.arguments.length < 1 || call.arguments.length > 3 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "fill") return [];

        const receivers = resolveStaticBufferExpression(callee.expression);
        if (receivers.length === 0) return [];
        const fills = resolveStaticIntegerKeys(call.arguments[0]!);
        if (fills.length === 0) return [];
        const ranges = resolveStaticBufferRangeArgs(call.arguments[1], call.arguments[2]);
        if (ranges.length === 0) return [];

        const out: Buffer[] = [];
        for (const receiver of receivers) {
            for (const fill of fills) {
                for (const [start, end] of ranges) {
                    if ((start !== undefined && start < 0) || (end !== undefined && end < 0)) return [];
                    const buffer = Buffer.from(receiver);
                    buffer.fill(fill & 0xff, start, end);
                    out.push(buffer);
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
        }
        return dedupeBuffers(out);
    };

    const resolveStaticBufferSwapExpression = (call: ts.CallExpression): Buffer[] => {
        if (call.arguments.length > 0 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "swap16" && method !== "swap32" && method !== "swap64") return [];

        const receivers = resolveStaticBufferExpression(callee.expression);
        if (receivers.length === 0) return [];

        const out: Buffer[] = [];
        for (const receiver of receivers) {
            try {
                const buffer = Buffer.from(receiver);
                buffer[method]();
                out.push(buffer);
            } catch {
                return [];
            }
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupeBuffers(out);
    };

    const resolveStaticBufferValueOfExpression = (call: ts.CallExpression): Buffer[] => {
        if (call.arguments.length > 0 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "valueOf") return [];
        return resolveStaticBufferExpression(callee.expression);
    };

    const isStaticBufferTranscodeCall = (call: ts.CallExpression): boolean => {
        if (call.arguments.length !== 3 || call.arguments.some(ts.isSpreadElement)) return false;
        const callee = unwrapStaticExpression(call.expression);
        if (ts.isIdentifier(callee)) {
            return isNamedImportIdentifier(callee, ["buffer", "node:buffer"], "transcode");
        }
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "transcode") return false;
        const receiver = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(receiver)) return false;
        return isDefaultImportIdentifier(receiver, ["buffer", "node:buffer"]) ||
            isNamespaceImportIdentifier(receiver, ["buffer", "node:buffer"]);
    };

    const resolveStaticBufferTranscodeExpression = (call: ts.CallExpression): Buffer[] => {
        if (!isStaticBufferTranscodeCall(call)) return [];
        const sources = resolveStaticBufferExpression(call.arguments[0]!);
        const fromEncodings = resolve(call.arguments[1]!);
        const toEncodings = resolve(call.arguments[2]!);
        if (sources.length === 0 || fromEncodings.length === 0 || toEncodings.length === 0) return [];

        const normalizeEncoding = (encoding: string): "utf8" | "hex" | "base64" | null => {
            const normalized = encoding.toLowerCase();
            if (normalized === "utf8" || normalized === "utf-8") return "utf8";
            if (normalized === "hex" || normalized === "base64") return normalized;
            return null;
        };

        const out: Buffer[] = [];
        for (const source of sources) {
            for (const fromEncoding of fromEncodings) {
                const from = normalizeEncoding(fromEncoding);
                if (!from) return [];
                let raw: Buffer;
                if (from === "utf8") {
                    raw = Buffer.from(source);
                } else {
                    const encoded = source.toString("utf8");
                    if (!isRuntimeValidBufferInput(encoded, from)) return [];
                    raw = Buffer.from(encoded, from);
                }
                for (const toEncoding of toEncodings) {
                    const to = normalizeEncoding(toEncoding);
                    if (!to) return [];
                    out.push(to === "utf8"
                        ? Buffer.from(raw)
                        : Buffer.from(raw.toString(to), "utf8"));
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
        }
        return dedupeBuffers(out);
    };

    const resolveStaticTextEncoderEncodeExpression = (call: ts.CallExpression): Buffer[] => {
        if (call.arguments.length > 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "encode") return [];
        const receiver = unwrapStaticExpression(callee.expression);
        if (!ts.isNewExpression(receiver)) return [];
        const ctor = unwrapStaticExpression(receiver.expression);
        if (!isStaticTextEncoderConstructorExpression(ctor)) return [];
        if ((receiver.arguments?.length ?? 0) > 0 || receiver.arguments?.some(ts.isSpreadElement)) return [];
        const values = !call.arguments[0] || isStaticUndefinedExpression(call.arguments[0])
            ? [""]
            : resolve(call.arguments[0]);
        if (values.length === 0) return [];
        const out: Buffer[] = [];
        for (const value of values) {
            out.push(Buffer.from(value, "utf8"));
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupeBuffers(out);
    };

    const resolveStaticBufferExpression = (expr: ts.Expression): Buffer[] => {
        const unwrapped = unwrapStaticExpression(expr);
        if (!ts.isCallExpression(unwrapped)) return [];
        const transcodeBuffers = resolveStaticBufferTranscodeExpression(unwrapped);
        if (transcodeBuffers.length > 0) return transcodeBuffers;
        const encodedBuffers = resolveStaticTextEncoderEncodeExpression(unwrapped);
        if (encodedBuffers.length > 0) return encodedBuffers;
        const fromBuffers = resolveStaticBufferFromExpression(unwrapped);
        if (fromBuffers.length > 0) return fromBuffers;
        const allocBuffers = resolveStaticBufferAllocExpression(unwrapped);
        if (allocBuffers.length > 0) return allocBuffers;
        const sliceBuffers = resolveStaticBufferSliceExpression(unwrapped);
        if (sliceBuffers.length > 0) return sliceBuffers;
        const fillBuffers = resolveStaticBufferFillExpression(unwrapped);
        if (fillBuffers.length > 0) return fillBuffers;
        const swapBuffers = resolveStaticBufferSwapExpression(unwrapped);
        if (swapBuffers.length > 0) return swapBuffers;
        const valueOfBuffers = resolveStaticBufferValueOfExpression(unwrapped);
        if (valueOfBuffers.length > 0) return valueOfBuffers;
        const callee = unwrapStaticExpression(unwrapped.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "concat") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!isStaticBufferConstructorExpression(target)) return [];
        if (unwrapped.arguments.length < 1 || unwrapped.arguments.length > 2 || unwrapped.arguments.some(ts.isSpreadElement)) {
            return [];
        }
        const list = unwrapStaticExpression(unwrapped.arguments[0]!);
        if (!ts.isArrayLiteralExpression(list)) return [];

        let buffers: Buffer[] = [Buffer.alloc(0)];
        for (const element of list.elements) {
            if (ts.isSpreadElement(element)) return [];
            const elementBuffers = resolveStaticBufferExpression(element);
            if (elementBuffers.length === 0) return [];
            const next: Buffer[] = [];
            for (const prefix of buffers) {
                for (const elementBuffer of elementBuffers) {
                    next.push(Buffer.concat([prefix, elementBuffer]));
                    if (next.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
            buffers = next;
        }

        const lengthArg = unwrapped.arguments[1];
        if (!lengthArg || isStaticUndefinedExpression(lengthArg)) return dedupeBuffers(buffers);
        const lengths = resolveStaticIntegerKeys(lengthArg);
        if (lengths.length === 0) return [];
        const out: Buffer[] = [];
        for (const buffer of buffers) {
            for (const length of lengths) {
                if (length < 0) return [];
                out.push(Buffer.concat([buffer], length));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupeBuffers(out);
    };

    const resolveStaticTextDecoderDecodeCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length > 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "decode") return [];
        const receiver = unwrapStaticExpression(callee.expression);
        if (!ts.isNewExpression(receiver)) return [];
        const ctor = unwrapStaticExpression(receiver.expression);
        if (!isStaticTextDecoderConstructorExpression(ctor)) return [];
        if ((receiver.arguments?.length ?? 0) > 1 || receiver.arguments?.some(ts.isSpreadElement)) return [];
        const labelValues = !receiver.arguments?.[0] || isStaticUndefinedExpression(receiver.arguments[0])
            ? ["utf-8"]
            : resolve(receiver.arguments[0]);
        if (labelValues.length === 0) return [];
        for (const label of labelValues) {
            const normalized = label.toLowerCase();
            if (normalized !== "utf-8" && normalized !== "utf8") return [];
        }
        if (!call.arguments[0] || isStaticUndefinedExpression(call.arguments[0])) return [""];
        const buffers = resolveStaticBufferExpression(call.arguments[0]);
        if (buffers.length === 0) return [];
        return dedupe(buffers.map((buffer) => buffer.toString("utf8")));
    };

    const dedupeBuffers = (buffers: Buffer[]): Buffer[] => {
        const seenBuffers = new Set<string>();
        const out: Buffer[] = [];
        for (const buffer of buffers) {
            const key = buffer.toString("hex");
            if (seenBuffers.has(key)) continue;
            seenBuffers.add(key);
            out.push(buffer);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return out;
    };

    const resolveStaticBufferByteLengthCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 1 || call.arguments.length > 2 || call.arguments.some(ts.isSpreadElement)) {
            return [];
        }
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "byteLength") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!isStaticBufferConstructorExpression(target)) return [];

        const buffers = resolveStaticBufferExpression(call.arguments[0]!);
        if (buffers.length > 0) {
            return dedupe(buffers.map((buffer) => String(buffer.length)));
        }

        const values = resolve(call.arguments[0]!);
        if (values.length === 0) return [];
        const encodingArg = call.arguments[1];
        const encodings = !encodingArg || isStaticUndefinedExpression(encodingArg)
            ? [undefined]
            : resolve(encodingArg);
        if (encodings.length === 0) return [];

        const out: string[] = [];
        for (const value of values) {
            for (const encoding of encodings) {
                const length = staticBufferByteLength(value, encoding);
                if (length === null) return [];
                out.push(String(length));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticBufferIsEncodingCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "isEncoding") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!isStaticBufferConstructorExpression(target)) return [];

        const values = resolve(call.arguments[0]!);
        if (values.length === 0) return [];
        return dedupe(values.map((value) => String(isStaticBufferEncoding(value))));
    };

    const resolveStaticBufferFromToStringCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length > 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "toString") return [];
        const receiver = unwrapStaticExpression(callee.expression);
        if (!ts.isCallExpression(receiver) || receiver.arguments.length < 1 || receiver.arguments.length > 2) {
            return [];
        }
        if (receiver.arguments.some(ts.isSpreadElement)) return [];
        const fromCallee = unwrapStaticExpression(receiver.expression);
        if (!ts.isPropertyAccessExpression(fromCallee) || fromCallee.name.text !== "from") return [];
        const fromTarget = unwrapStaticExpression(fromCallee.expression);
        if (!isStaticBufferConstructorExpression(fromTarget)) return [];

        const values = resolve(receiver.arguments[0]!);
        if (values.length === 0) return [];
        const fromEncodingArg = receiver.arguments[1];
        const fromEncodings = !fromEncodingArg || isStaticUndefinedExpression(fromEncodingArg)
            ? [undefined]
            : resolve(fromEncodingArg);
        if (fromEncodings.length === 0) return [];
        const toEncodingArg = call.arguments[0];
        const toEncodings = !toEncodingArg || isStaticUndefinedExpression(toEncodingArg)
            ? [undefined]
            : resolve(toEncodingArg);
        if (toEncodings.length === 0) return [];

        const out: string[] = [];
        for (const value of values) {
            for (const fromEncoding of fromEncodings) {
                const fromNodeEncoding = nodeBufferEncoding(fromEncoding);
                if (!fromNodeEncoding || !isRuntimeValidBufferInput(value, fromNodeEncoding)) return [];
                const buffer = Buffer.from(value, fromNodeEncoding);
                for (const toEncoding of toEncodings) {
                    const toNodeEncoding = nodeBufferEncoding(toEncoding);
                    if (!toNodeEncoding) return [];
                    out.push(buffer.toString(toNodeEncoding));
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
        }
        return dedupe(out);
    };

    const resolveStaticBufferToStringCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length > 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "toString") return [];
        const buffers = resolveStaticBufferExpression(callee.expression);
        if (buffers.length === 0) return [];
        const encodingArg = call.arguments[0];
        const encodings = !encodingArg || isStaticUndefinedExpression(encodingArg)
            ? [undefined]
            : resolve(encodingArg);
        if (encodings.length === 0) return [];

        const out: string[] = [];
        for (const buffer of buffers) {
            for (const encoding of encodings) {
                const nodeEncoding = nodeBufferEncoding(encoding);
                if (!nodeEncoding) return [];
                out.push(buffer.toString(nodeEncoding));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticBufferToLocaleStringCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length > 0 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "toLocaleString") return [];
        const buffers = resolveStaticBufferExpression(callee.expression);
        return buffers.length > 0 ? dedupe(buffers.map((buffer) => buffer.toString("utf8"))) : [];
    };

    const resolveStaticBufferConcatToStringCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length > 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "toString") return [];
        const receiver = unwrapStaticExpression(callee.expression);
        if (!ts.isCallExpression(receiver)) return [];
        const receiverCallee = unwrapStaticExpression(receiver.expression);
        if (!ts.isPropertyAccessExpression(receiverCallee) || receiverCallee.name.text !== "concat") return [];

        const buffers = resolveStaticBufferExpression(receiver);
        if (buffers.length === 0) return [];
        const encodingArg = call.arguments[0];
        const encodings = !encodingArg || isStaticUndefinedExpression(encodingArg)
            ? [undefined]
            : resolve(encodingArg);
        if (encodings.length === 0) return [];

        const out: string[] = [];
        for (const buffer of buffers) {
            for (const encoding of encodings) {
                const nodeEncoding = nodeBufferEncoding(encoding);
                if (!nodeEncoding) return [];
                out.push(buffer.toString(nodeEncoding));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticBufferAllocToStringCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length > 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "toString") return [];
        const receiver = unwrapStaticExpression(callee.expression);
        if (!ts.isCallExpression(receiver)) return [];
        const receiverCallee = unwrapStaticExpression(receiver.expression);
        if (!ts.isPropertyAccessExpression(receiverCallee)) return [];
        const receiverMethod = receiverCallee.name.text;
        if (receiverMethod !== "alloc" && receiverMethod !== "allocUnsafe" && receiverMethod !== "allocUnsafeSlow") return [];

        const buffers = resolveStaticBufferExpression(receiver);
        if (buffers.length === 0) return [];
        const encodingArg = call.arguments[0];
        const encodings = !encodingArg || isStaticUndefinedExpression(encodingArg)
            ? [undefined]
            : resolve(encodingArg);
        if (encodings.length === 0) return [];

        const out: string[] = [];
        for (const buffer of buffers) {
            for (const encoding of encodings) {
                const nodeEncoding = nodeBufferEncoding(encoding);
                if (!nodeEncoding) return [];
                out.push(buffer.toString(nodeEncoding));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const compareStaticBuffers = (left: Buffer, right: Buffer): string => {
        const result = Buffer.compare(left, right);
        return String(result < 0 ? -1 : result > 0 ? 1 : 0);
    };

    const resolveStaticBufferCompareRanges = (
        args: ts.NodeArray<ts.Expression>,
        receiver: Buffer,
        target: Buffer,
    ): Array<[Buffer, Buffer]> => {
        if (args.length === 1) return [[receiver, target]];
        if (args.length > 5) return [];
        const targetRanges = resolveStaticBufferRangeArgs(args[1], args[2]);
        if (targetRanges.length === 0) return [];
        const sourceRanges = resolveStaticBufferRangeArgs(args[3], args[4]);
        if (sourceRanges.length === 0) return [];

        const out: Array<[Buffer, Buffer]> = [];
        for (const [targetStart, targetEnd] of targetRanges) {
            for (const [sourceStart, sourceEnd] of sourceRanges) {
                if (
                    (targetStart !== undefined && (targetStart < 0 || targetStart > target.length)) ||
                    (targetEnd !== undefined && (targetEnd < 0 || targetEnd > target.length)) ||
                    (sourceStart !== undefined && (sourceStart < 0 || sourceStart > receiver.length)) ||
                    (sourceEnd !== undefined && (sourceEnd < 0 || sourceEnd > receiver.length))
                ) {
                    return [];
                }
                out.push([receiver.slice(sourceStart, sourceEnd), target.slice(targetStart, targetEnd)]);
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return out;
    };

    const resolveStaticBufferCompareCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        let leftExpr: ts.Expression | null = null;
        let rightExpr: ts.Expression | null = null;
        let isInstanceCompare = false;

        if (ts.isPropertyAccessExpression(callee) && callee.name.text === "compare") {
            const target = unwrapStaticExpression(callee.expression);
            if (isStaticBufferConstructorExpression(target)) {
                if (call.arguments.length !== 2) return [];
                leftExpr = call.arguments[0]!;
                rightExpr = call.arguments[1]!;
            } else {
                if (call.arguments.length < 1 || call.arguments.length > 5) return [];
                isInstanceCompare = true;
                leftExpr = target;
                rightExpr = call.arguments[0]!;
            }
        }
        if (!leftExpr || !rightExpr) return [];

        const leftBuffers = resolveStaticBufferExpression(leftExpr);
        if (leftBuffers.length === 0) return [];
        const rightBuffers = resolveStaticBufferExpression(rightExpr);
        if (rightBuffers.length === 0) return [];

        const out: string[] = [];
        for (const left of leftBuffers) {
            for (const right of rightBuffers) {
                const pairs = isInstanceCompare
                    ? resolveStaticBufferCompareRanges(call.arguments, left, right)
                    : [[left, right] as [Buffer, Buffer]];
                if (pairs.length === 0) return [];
                for (const [leftRange, rightRange] of pairs) {
                    out.push(compareStaticBuffers(leftRange, rightRange));
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
        }
        return dedupe(out);
    };

    const resolveStaticOptionalBufferIntegerArg = (
        expr: ts.Expression | undefined,
        defaultValue: number | undefined,
    ): Array<number | undefined> => {
        if (!expr || isStaticUndefinedExpression(expr)) return [defaultValue];
        const values = resolveStaticIntegerKeys(expr);
        return values.length > 0 ? values : [];
    };

    const resolveStaticBufferCopyCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 1 || call.arguments.length > 4 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "copy") return [];

        const sources = resolveStaticBufferExpression(callee.expression);
        if (sources.length === 0) return [];
        const targets = resolveStaticBufferExpression(call.arguments[0]!);
        if (targets.length === 0) return [];
        const targetStarts = resolveStaticOptionalBufferIntegerArg(call.arguments[1], undefined);
        if (targetStarts.length === 0) return [];
        const sourceStarts = resolveStaticOptionalBufferIntegerArg(call.arguments[2], undefined);
        if (sourceStarts.length === 0) return [];
        const sourceEnds = resolveStaticOptionalBufferIntegerArg(call.arguments[3], undefined);
        if (sourceEnds.length === 0) return [];

        const out: string[] = [];
        for (const source of sources) {
            for (const target of targets) {
                for (const targetStart of targetStarts) {
                    for (const sourceStart of sourceStarts) {
                        for (const sourceEnd of sourceEnds) {
                            try {
                                out.push(String(source.copy(Buffer.from(target), targetStart, sourceStart, sourceEnd)));
                            } catch {
                                return [];
                            }
                            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                        }
                    }
                }
            }
        }
        return dedupe(out);
    };

    const resolveStaticBufferWriteCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 1 || call.arguments.length > 4 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "write") return [];

        const receivers = resolveStaticBufferExpression(callee.expression);
        if (receivers.length === 0) return [];
        const texts = resolve(call.arguments[0]!);
        if (texts.length === 0) return [];
        const offsets = resolveStaticOptionalBufferIntegerArg(call.arguments[1], undefined);
        if (offsets.length === 0) return [];
        const lengths = resolveStaticOptionalBufferIntegerArg(call.arguments[2], undefined);
        if (lengths.length === 0) return [];
        const encodingArg = call.arguments[3];
        const encodings = !encodingArg || isStaticUndefinedExpression(encodingArg)
            ? [undefined]
            : resolve(encodingArg);
        if (encodings.length === 0) return [];

        const out: string[] = [];
        for (const receiver of receivers) {
            for (const text of texts) {
                for (const offset of offsets) {
                    for (const length of lengths) {
                        for (const encoding of encodings) {
                            const nodeEncoding = nodeBufferEncoding(encoding);
                            if (!nodeEncoding) return [];
                            try {
                                const buffer = Buffer.from(receiver);
                                out.push(String((buffer.write as (...args: unknown[]) => number)(text, offset, length, nodeEncoding)));
                            } catch {
                                return [];
                            }
                            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                        }
                    }
                }
            }
        }
        return dedupe(out);
    };

    const resolveStaticBufferIntegerReadCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length > 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (
            method !== "readUInt8" &&
            method !== "readUint8" &&
            method !== "readUInt16LE" &&
            method !== "readUInt16BE" &&
            method !== "readUint16LE" &&
            method !== "readUint16BE" &&
            method !== "readUInt32LE" &&
            method !== "readUInt32BE" &&
            method !== "readUint32LE" &&
            method !== "readUint32BE" &&
            method !== "readInt8" &&
            method !== "readInt16LE" &&
            method !== "readInt16BE" &&
            method !== "readInt32LE" &&
            method !== "readInt32BE"
        ) {
            return [];
        }

        const buffers = resolveStaticBufferExpression(callee.expression);
        if (buffers.length === 0) return [];
        const offsets = resolveStaticOptionalBufferIntegerArg(call.arguments[0], undefined);
        if (offsets.length === 0) return [];

        const out: string[] = [];
        for (const buffer of buffers) {
            for (const offset of offsets) {
                try {
                    out.push(String((buffer[method as keyof Buffer] as (...args: unknown[]) => number)(offset)));
                } catch {
                    return [];
                }
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticBufferIntegerWriteCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 1 || call.arguments.length > 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (
            method !== "writeUInt8" &&
            method !== "writeUint8" &&
            method !== "writeUInt16LE" &&
            method !== "writeUInt16BE" &&
            method !== "writeUint16LE" &&
            method !== "writeUint16BE" &&
            method !== "writeUInt32LE" &&
            method !== "writeUInt32BE" &&
            method !== "writeUint32LE" &&
            method !== "writeUint32BE" &&
            method !== "writeInt8" &&
            method !== "writeInt16LE" &&
            method !== "writeInt16BE" &&
            method !== "writeInt32LE" &&
            method !== "writeInt32BE"
        ) {
            return [];
        }

        const buffers = resolveStaticBufferExpression(callee.expression);
        if (buffers.length === 0) return [];
        const values = resolveStaticIntegerKeys(call.arguments[0]!);
        if (values.length === 0) return [];
        const offsets = resolveStaticOptionalBufferIntegerArg(call.arguments[1], undefined);
        if (offsets.length === 0) return [];

        const out: string[] = [];
        for (const buffer of buffers) {
            for (const value of values) {
                for (const offset of offsets) {
                    try {
                        const receiver = Buffer.from(buffer);
                        out.push(String((receiver[method as keyof Buffer] as (...args: unknown[]) => number)(value, offset)));
                    } catch {
                        return [];
                    }
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
        }
        return dedupe(out);
    };

    const resolveStaticBufferFloatReadCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length > 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (
            method !== "readFloatLE" &&
            method !== "readFloatBE" &&
            method !== "readDoubleLE" &&
            method !== "readDoubleBE"
        ) {
            return [];
        }

        const buffers = resolveStaticBufferExpression(callee.expression);
        if (buffers.length === 0) return [];
        const offsets = resolveStaticOptionalBufferIntegerArg(call.arguments[0], undefined);
        if (offsets.length === 0) return [];

        const out: string[] = [];
        for (const buffer of buffers) {
            for (const offset of offsets) {
                try {
                    out.push(String((buffer[method as keyof Buffer] as (...args: unknown[]) => number)(offset)));
                } catch {
                    return [];
                }
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticBufferFloatWriteCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 1 || call.arguments.length > 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (
            method !== "writeFloatLE" &&
            method !== "writeFloatBE" &&
            method !== "writeDoubleLE" &&
            method !== "writeDoubleBE"
        ) {
            return [];
        }

        const buffers = resolveStaticBufferExpression(callee.expression);
        if (buffers.length === 0) return [];
        const values = resolveStaticNumberValues(call.arguments[0]!);
        if (values.length === 0) return [];
        const offsets = resolveStaticOptionalBufferIntegerArg(call.arguments[1], undefined);
        if (offsets.length === 0) return [];

        const out: string[] = [];
        for (const buffer of buffers) {
            for (const value of values) {
                for (const offset of offsets) {
                    try {
                        const receiver = Buffer.from(buffer);
                        out.push(String((receiver[method as keyof Buffer] as (...args: unknown[]) => number)(value, offset)));
                    } catch {
                        return [];
                    }
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
        }
        return dedupe(out);
    };

    const resolveStaticBufferEqualsCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "equals") return [];
        const leftBuffers = resolveStaticBufferExpression(callee.expression);
        if (leftBuffers.length === 0) return [];
        const rightBuffers = resolveStaticBufferExpression(call.arguments[0]!);
        if (rightBuffers.length === 0) return [];

        const out: string[] = [];
        for (const left of leftBuffers) {
            for (const right of rightBuffers) {
                out.push(String(left.equals(right)));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticBufferSearchNeedles = (expr: ts.Expression): Array<Buffer | string | number> => {
        const buffers = resolveStaticBufferExpression(expr);
        if (buffers.length > 0) return buffers;
        const raw = unwrapStaticExpression(expr);
        if (!ts.isStringLiteralLike(raw) && !ts.isNoSubstitutionTemplateLiteral(raw)) {
            const bytes = resolveStaticIntegerKeys(expr);
            if (bytes.length > 0) return bytes;
        }
        const strings = resolve(expr);
        if (strings.length > 0) return strings;
        const bytes = resolveStaticIntegerKeys(expr);
        if (bytes.length > 0) return bytes;
        return [];
    };

    const resolveStaticBufferSearchOffsets = (expr: ts.Expression | undefined): Array<number | undefined> => {
        if (!expr || isStaticUndefinedExpression(expr)) return [undefined];
        const offsets = resolveStaticIntegerKeys(expr);
        return offsets.length > 0 ? offsets : [];
    };

    const resolveStaticBufferSearchEncodings = (expr: ts.Expression | undefined): Array<BufferEncoding | undefined> => {
        if (!expr || isStaticUndefinedExpression(expr)) return [undefined];
        const encodings = resolve(expr);
        if (encodings.length === 0) return [];
        const out: Array<BufferEncoding | undefined> = [];
        for (const encoding of encodings) {
            const nodeEncoding = nodeBufferEncoding(encoding);
            if (!nodeEncoding) return [];
            out.push(nodeEncoding);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return out;
    };

    const resolveStaticBufferSearchCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 1 || call.arguments.length > 3 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "indexOf" && method !== "lastIndexOf" && method !== "includes") return [];

        const haystacks = resolveStaticBufferExpression(callee.expression);
        if (haystacks.length === 0) return [];
        const needles = resolveStaticBufferSearchNeedles(call.arguments[0]!);
        if (needles.length === 0) return [];
        const offsets = resolveStaticBufferSearchOffsets(call.arguments[1]);
        if (offsets.length === 0) return [];
        const encodings = resolveStaticBufferSearchEncodings(call.arguments[2]);
        if (encodings.length === 0) return [];

        const out: string[] = [];
        for (const haystack of haystacks) {
            for (const needle of needles) {
                for (const offset of offsets) {
                    for (const encoding of encodings) {
                        if (method === "includes") {
                            out.push(String(haystack.includes(needle, offset, encoding)));
                        } else if (method === "indexOf") {
                            out.push(String(haystack.indexOf(needle, offset, encoding)));
                        } else {
                            out.push(String(haystack.lastIndexOf(needle, offset, encoding)));
                        }
                        if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                    }
                }
            }
        }
        return dedupe(out);
    };

    const isStaticBufferExpression = (expr: ts.Expression): boolean | null => {
        const unwrapped = unwrapStaticExpression(expr);
        if (ts.isCallExpression(unwrapped)) {
            const callee = unwrapStaticExpression(unwrapped.expression);
            if (ts.isPropertyAccessExpression(callee)) {
                const target = unwrapStaticExpression(callee.expression);
                if (isStaticBufferConstructorExpression(target)) {
                    const name = callee.name.text;
                    return name === "from" ||
                        name === "alloc" ||
                        name === "allocUnsafe" ||
                        name === "allocUnsafeSlow" ||
                        name === "concat";
                }
            }
            return null;
        }
        if (
            ts.isStringLiteralLike(unwrapped) ||
            ts.isNoSubstitutionTemplateLiteral(unwrapped) ||
            ts.isNumericLiteral(unwrapped) ||
            ts.isBigIntLiteral(unwrapped) ||
            unwrapped.kind === ts.SyntaxKind.TrueKeyword ||
            unwrapped.kind === ts.SyntaxKind.FalseKeyword ||
            unwrapped.kind === ts.SyntaxKind.NullKeyword ||
            ts.isArrayLiteralExpression(unwrapped) ||
            ts.isObjectLiteralExpression(unwrapped)
        ) {
            return false;
        }
        return null;
    };

    const resolveStaticBufferIsBufferCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "isBuffer") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!isStaticBufferConstructorExpression(target)) return [];
        const result = isStaticBufferExpression(call.arguments[0]!);
        return result === null ? [] : [String(result)];
    };

    const resolveStaticBufferLengthAccess = (access: ts.PropertyAccessExpression): string[] => {
        if (access.name.text !== "length") return [];
        const buffers = resolveStaticBufferExpression(access.expression);
        return buffers.length > 0 ? dedupe(buffers.map((buffer) => String(buffer.length))) : [];
    };

    const resolveStaticArrayBufferByteLengths = (expr: ts.Expression): number[] => {
        const current = unwrapStaticExpression(expr);
        if (ts.isIdentifier(current)) {
            const decl = earlierConstStringDeclaration(current) ?? topLevelConstStringDeclaration(current);
            if (!decl?.initializer || seen.has(decl)) return [];
            seen.add(decl);
            const values = resolveStaticArrayBufferByteLengths(decl.initializer);
            seen.delete(decl);
            return values;
        }
        if (!ts.isNewExpression(current) || current.arguments?.some(ts.isSpreadElement)) return [];
        const target = unwrapStaticExpression(current.expression);
        if (!ts.isIdentifier(target) || target.text !== "ArrayBuffer") return [];
        const args = current.arguments ?? [];
        if (args.length > 1) return [];

        const lengths = args.length === 0 || isStaticUndefinedExpression(args[0]!)
            ? [0]
            : resolveStaticIntegerKeys(args[0]!);
        if (lengths.length === 0) return [];

        const out: number[] = [];
        for (const length of lengths) {
            if (!Number.isSafeInteger(length) || length < 0) return [];
            out.push(length);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return Array.from(new Set(out));
    };

    const resolveStaticArrayBufferLengthAccess = (access: ts.PropertyAccessExpression): string[] => {
        if (access.name.text !== "byteLength") return [];
        const lengths = resolveStaticArrayBufferByteLengths(access.expression);
        return lengths.length > 0 ? lengths.map((length) => String(length)) : [];
    };

    const resolveStaticDataViewMetadata = (expr: ts.Expression): Array<{ bufferLength: number; byteOffset: number; byteLength: number }> => {
        const current = unwrapStaticExpression(expr);
        if (ts.isIdentifier(current)) {
            const decl = earlierConstStringDeclaration(current) ?? topLevelConstStringDeclaration(current);
            if (!decl?.initializer || seen.has(decl)) return [];
            seen.add(decl);
            const values = resolveStaticDataViewMetadata(decl.initializer);
            seen.delete(decl);
            return values;
        }
        if (!ts.isNewExpression(current) || current.arguments?.some(ts.isSpreadElement)) return [];
        const target = unwrapStaticExpression(current.expression);
        if (!ts.isIdentifier(target) || target.text !== "DataView") return [];
        const args = current.arguments ?? [];
        if (args.length < 1 || args.length > 3) return [];

        const bufferLengths = resolveStaticArrayBufferByteLengths(args[0]!);
        if (bufferLengths.length === 0) return [];
        const offsets = args.length < 2 || isStaticUndefinedExpression(args[1]!)
            ? [0]
            : resolveStaticIntegerKeys(args[1]!);
        if (offsets.length === 0) return [];

        const out: Array<{ bufferLength: number; byteOffset: number; byteLength: number }> = [];
        for (const bufferLength of bufferLengths) {
            for (const offset of offsets) {
                if (!Number.isSafeInteger(offset) || offset < 0 || offset > bufferLength) return [];
                const explicitLengths = args.length < 3 || isStaticUndefinedExpression(args[2]!)
                    ? [bufferLength - offset]
                    : resolveStaticIntegerKeys(args[2]!);
                if (explicitLengths.length === 0) return [];
                for (const byteLength of explicitLengths) {
                    if (!Number.isSafeInteger(byteLength) || byteLength < 0 || offset + byteLength > bufferLength) return [];
                    out.push({ bufferLength, byteOffset: offset, byteLength });
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
        }
        return out;
    };

    const resolveStaticDataViewPropertyAccess = (access: ts.PropertyAccessExpression): string[] => {
        if (access.name.text !== "byteLength" && access.name.text !== "byteOffset") return [];
        const metadata = resolveStaticDataViewMetadata(access.expression);
        if (metadata.length === 0) return [];
        const out = metadata.map((entry) => String(access.name.text === "byteOffset" ? entry.byteOffset : entry.byteLength));
        return dedupe(out);
    };

    const resolveStaticDataViewBufferLengthAccess = (access: ts.PropertyAccessExpression): string[] => {
        if (access.name.text !== "byteLength") return [];
        const bufferAccess = unwrapStaticExpression(access.expression);
        if (!ts.isPropertyAccessExpression(bufferAccess) || bufferAccess.name.text !== "buffer") return [];
        const metadata = resolveStaticDataViewMetadata(bufferAccess.expression);
        return metadata.length > 0 ? dedupe(metadata.map((entry) => String(entry.bufferLength))) : [];
    };

    const resolveStaticBufferElementAccess = (access: ts.ElementAccessExpression): string[] => {
        if (!access.argumentExpression) return [];
        const buffers = resolveStaticBufferExpression(access.expression);
        if (buffers.length === 0) return [];
        const indexes = resolveStaticIntegerKeys(access.argumentExpression);
        if (indexes.length === 0) return [];

        const out: string[] = [];
        for (const buffer of buffers) {
            for (const index of indexes) {
                const value = buffer[index];
                out.push(value === undefined ? "undefined" : String(value));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticBufferToJsonBuffers = (expr: ts.Expression): Buffer[] => {
        const call = unwrapStaticExpression(expr);
        if (!ts.isCallExpression(call) || call.arguments.length > 0 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "toJSON") return [];
        return resolveStaticBufferExpression(callee.expression);
    };

    const resolveStaticBufferToJsonDataAccess = (expr: ts.Expression): Buffer[] => {
        const access = unwrapStaticExpression(expr);
        if (!ts.isPropertyAccessExpression(access) || access.name.text !== "data") return [];
        return resolveStaticBufferToJsonBuffers(access.expression);
    };

    const resolveStaticBufferToJsonPropertyAccess = (access: ts.PropertyAccessExpression): string[] => {
        if (access.name.text === "type") {
            const buffers = resolveStaticBufferToJsonBuffers(access.expression);
            return buffers.length > 0 ? ["Buffer"] : [];
        }
        if (access.name.text !== "length") return [];
        const buffers = resolveStaticBufferToJsonDataAccess(access.expression);
        return buffers.length > 0 ? dedupe(buffers.map((buffer) => String(buffer.length))) : [];
    };

    const resolveStaticBufferToJsonDataElementAccess = (access: ts.ElementAccessExpression): string[] => {
        if (!access.argumentExpression) return [];
        const buffers = resolveStaticBufferToJsonDataAccess(access.expression);
        if (buffers.length === 0) return [];
        const indexes = resolveStaticIntegerKeys(access.argumentExpression);
        if (indexes.length === 0) return [];

        const out: string[] = [];
        for (const buffer of buffers) {
            for (const index of indexes) {
                const value = buffer[index];
                out.push(value === undefined ? "undefined" : String(value));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticNumericParserCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        let method: "parseInt" | "parseFloat" | null = null;
        if (ts.isIdentifier(callee)) {
            if (callee.text === "parseInt" || callee.text === "parseFloat") {
                method = callee.text;
            }
        } else if (ts.isPropertyAccessExpression(callee)) {
            const target = unwrapStaticExpression(callee.expression);
            if (
                ts.isIdentifier(target) &&
                target.text === "Number" &&
                (callee.name.text === "parseInt" || callee.name.text === "parseFloat")
            ) {
                method = callee.name.text;
            }
        }
        if (!method) return [];
        if (method === "parseFloat" && call.arguments.length !== 1) return [];
        if (method === "parseInt" && call.arguments.length > 2) return [];

        const values = resolve(call.arguments[0]!);
        if (values.length === 0) return [];

        if (method === "parseFloat") {
            return dedupe(values.map((value) => String(Number.parseFloat(value))));
        }

        const radixArg = call.arguments[1];
        const radices = !radixArg || isStaticUndefinedExpression(radixArg)
            ? [undefined]
            : resolveStaticIntegerKeys(radixArg);
        if (radices.length === 0) return [];
        const out: string[] = [];
        for (const value of values) {
            for (const radix of radices) {
                out.push(String(Number.parseInt(value, radix)));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticNumericPredicateCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Number") return [];
        const method = callee.name.text;
        if (
            method !== "isFinite" &&
            method !== "isInteger" &&
            method !== "isNaN" &&
            method !== "isSafeInteger"
        ) {
            return [];
        }

        const values = resolveStaticNumberValues(call.arguments[0]!);
        if (values.length === 0) return [];
        return dedupe(values.map((value) => {
            switch (method) {
                case "isFinite":
                    return String(Number.isFinite(value));
                case "isInteger":
                    return String(Number.isInteger(value));
                case "isNaN":
                    return String(Number.isNaN(value));
                default:
                    return String(Number.isSafeInteger(value));
            }
        }));
    };

    const resolveStaticGlobalNumericPredicateCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isIdentifier(callee) || (callee.text !== "isFinite" && callee.text !== "isNaN")) return [];
        const values = resolveStaticCoercedNumberValues(call.arguments[0]!);
        if (values.length === 0) return [];
        return dedupe(values.map((value) => {
            return callee.text === "isFinite"
                ? String(Number.isFinite(value))
                : String(Number.isNaN(value));
        }));
    };

    const resolveStaticCoercedNumberValues = (expr: ts.Expression): number[] => {
        const value = unwrapStaticExpression(expr);
        if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return [Number(value.text)];
        if (ts.isNumericLiteral(value)) return [Number(value.text)];
        if (value.kind === ts.SyntaxKind.TrueKeyword) return [1];
        if (value.kind === ts.SyntaxKind.FalseKeyword || value.kind === ts.SyntaxKind.NullKeyword) return [0];
        if (
            value.kind === ts.SyntaxKind.UndefinedKeyword ||
            (ts.isIdentifier(value) && value.text === "undefined") ||
            ts.isVoidExpression(value)
        ) {
            return [NaN];
        }
        if (
            ts.isPrefixUnaryExpression(value) &&
            (value.operator === ts.SyntaxKind.PlusToken || value.operator === ts.SyntaxKind.MinusToken) &&
            ts.isNumericLiteral(value.operand)
        ) {
            const num = Number(value.operand.text);
            return [value.operator === ts.SyntaxKind.MinusToken ? -num : num];
        }
        return [];
    };

    const resolveStaticArrayPredicateCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "isArray") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Array") return [];
        const value = resolveCollectionExpression(call.arguments[0]!);
        if (!value) return [];
        if (ts.isArrayLiteralExpression(value)) return ["true"];
        if (
            ts.isObjectLiteralExpression(value) ||
            ts.isStringLiteral(value) ||
            ts.isNoSubstitutionTemplateLiteral(value) ||
            ts.isNumericLiteral(value) ||
            ts.isBigIntLiteral(value) ||
            value.kind === ts.SyntaxKind.TrueKeyword ||
            value.kind === ts.SyntaxKind.FalseKeyword ||
            value.kind === ts.SyntaxKind.NullKeyword ||
            value.kind === ts.SyntaxKind.UndefinedKeyword ||
            (ts.isIdentifier(value) && value.text === "undefined") ||
            ts.isVoidExpression(value)
        ) {
            return ["false"];
        }
        return [];
    };

    const resolveStaticObjectIsCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "is") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object") return [];
        const left = resolveStaticSameValueKey(call.arguments[0]!);
        const right = resolveStaticSameValueKey(call.arguments[1]!);
        return left !== null && right !== null ? [String(left === right)] : [];
    };

    const resolveStaticSameValueKey = (expr: ts.Expression): string | null => {
        const raw = unwrapStaticExpression(expr);
        if (ts.isIdentifier(raw) && raw.text === "NaN") return "number:NaN";
        const value = resolveCollectionExpression(expr);
        if (!value) return null;
        if (value.kind === ts.SyntaxKind.TrueKeyword) return "boolean:true";
        if (value.kind === ts.SyntaxKind.FalseKeyword) return "boolean:false";
        if (value.kind === ts.SyntaxKind.NullKeyword) return "null";
        if (
            value.kind === ts.SyntaxKind.UndefinedKeyword ||
            (ts.isIdentifier(value) && value.text === "undefined") ||
            ts.isVoidExpression(value)
        ) {
            return "undefined";
        }
        if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
            return `string:${value.text}`;
        }
        if (ts.isNumericLiteral(value)) {
            const num = Number(value.text);
            if (Number.isNaN(num)) return "number:NaN";
            return Number.isFinite(num) ? `number:${Object.is(num, -0) ? "-0" : num}` : null;
        }
        if (
            ts.isPrefixUnaryExpression(value) &&
            value.operator === ts.SyntaxKind.MinusToken &&
            ts.isNumericLiteral(value.operand)
        ) {
            const num = -Number(value.operand.text);
            if (Number.isNaN(num)) return "number:NaN";
            return Number.isFinite(num) ? `number:${Object.is(num, -0) ? "-0" : num}` : null;
        }
        if (ts.isBigIntLiteral(value)) {
            return `bigint:${BigInt(value.text.replace(/n$/i, "")).toString()}`;
        }
        if (
            ts.isPrefixUnaryExpression(value) &&
            value.operator === ts.SyntaxKind.MinusToken &&
            ts.isBigIntLiteral(value.operand)
        ) {
            return `bigint:${(-BigInt(value.operand.text.replace(/n$/i, ""))).toString()}`;
        }
        return null;
    };

    const resolveStaticObjectHasOwnCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "hasOwn") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object") return [];

        const bufferOwn = resolveStaticBufferOwnPredicate(call.arguments[0]!, call.arguments[1]!);
        if (bufferOwn.length > 0) return bufferOwn;

        const object = resolveCollectionExpression(call.arguments[0]!);
        if (!object) return [];
        const keys = resolveKeyTexts(call.arguments[1]!);
        if (keys.length === 0) return [];

        const out: string[] = [];
        for (const key of keys) {
            const value = staticObjectHasOwn(object, key);
            if (value === null) return [];
            out.push(String(value));
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupe(out);
    };

    const staticObjectHasOwn = (object: ts.Expression, key: string): boolean | null => {
        if (ts.isObjectLiteralExpression(object)) {
            for (const prop of object.properties) {
                if (ts.isSpreadAssignment(prop)) return null;
                if (!prop.name) return null;
                const propName = staticPropertyName(prop.name);
                if (propName === null) return null;
                if (propName === key) return true;
            }
            return false;
        }
        if (ts.isArrayLiteralExpression(object)) {
            if (key === "length") return true;
            if (!/^(0|[1-9][0-9]*)$/.test(key)) return false;
            const index = Number(key);
            const element = object.elements[index];
            return element !== undefined && !ts.isSpreadElement(element) && element.kind !== ts.SyntaxKind.OmittedExpression;
        }
        if (ts.isStringLiteral(object) || ts.isNoSubstitutionTemplateLiteral(object)) {
            if (key === "length") return true;
            if (!/^(0|[1-9][0-9]*)$/.test(key)) return false;
            const index = Number(key);
            return index >= 0 && index < object.text.length;
        }
        return null;
    };

    const staticBufferHasOwnKey = (buffer: Buffer, key: string): boolean => {
        if (!/^(0|[1-9][0-9]*)$/.test(key)) return false;
        const index = Number(key);
        return index >= 0 && index < buffer.length;
    };

    const resolveStaticBufferOwnPredicate = (objectExpr: ts.Expression, keyExpr: ts.Expression): string[] => {
        const buffers = resolveStaticBufferExpression(objectExpr);
        if (buffers.length === 0) return [];
        const keys = resolveKeyTexts(keyExpr);
        if (keys.length === 0) return [];

        const out: string[] = [];
        for (const buffer of buffers) {
            for (const key of keys) {
                const own = staticBufferHasOwnKey(buffer, key);
                out.push(String(own));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticReflectGetCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "get") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Reflect") return [];

        const bufferValues = resolveStaticBufferReflectGet(call.arguments[0]!, call.arguments[1]!);
        if (bufferValues.length > 0) return bufferValues;

        const object = resolveCollectionExpression(call.arguments[0]!);
        if (!object) return [];
        const keys = resolveKeyTexts(call.arguments[1]!);
        if (keys.length === 0) return [];

        const out: string[] = [];
        for (const key of keys) {
            const values = staticReflectGet(object, key);
            if (!values) return [];
            out.push(...values);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupe(out);
    };

    const staticReflectGet = (object: ts.Expression, key: string): string[] | null => {
        if (ts.isObjectLiteralExpression(object)) {
            for (const prop of object.properties) {
                if (ts.isSpreadAssignment(prop)) return null;
                if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) return null;
                const propName = staticPropertyName(prop.name);
                if (propName === null) return null;
                if (propName === key) {
                    const valueExpr = ts.isPropertyAssignment(prop) ? prop.initializer : prop.name;
                    const values = resolve(valueExpr);
                    return values.length === 0 ? null : values;
                }
            }
            return null;
        }
        if (ts.isArrayLiteralExpression(object)) {
            if (key === "length") return [String(object.elements.length)];
            if (!/^(0|[1-9][0-9]*)$/.test(key)) return null;
            const element = object.elements[Number(key)];
            if (!element || ts.isSpreadElement(element) || element.kind === ts.SyntaxKind.OmittedExpression) return null;
            const values = resolve(element);
            return values.length === 0 ? null : values;
        }
        if (ts.isStringLiteral(object) || ts.isNoSubstitutionTemplateLiteral(object)) {
            if (key === "length") return [String(object.text.length)];
            if (!/^(0|[1-9][0-9]*)$/.test(key)) return null;
            const char = object.text[Number(key)];
            return char === undefined ? null : [char];
        }
        return null;
    };

    const resolveStaticBufferReflectGet = (objectExpr: ts.Expression, keyExpr: ts.Expression): string[] => {
        const buffers = resolveStaticBufferExpression(objectExpr);
        if (buffers.length === 0) return [];
        const keys = resolveKeyTexts(keyExpr);
        if (keys.length === 0) return [];

        const out: string[] = [];
        for (const buffer of buffers) {
            for (const key of keys) {
                const value = staticBufferReflectGet(buffer, key);
                if (value === null) return [];
                out.push(value);
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const staticBufferReflectGet = (buffer: Buffer, key: string): string | null => {
        if (key === "length") return String(buffer.length);
        if (!/^(0|[1-9][0-9]*)$/.test(key)) return null;
        const index = Number(key);
        return index >= 0 && index < buffer.length ? String(buffer[index]) : null;
    };

    const resolveStaticDescriptorPropertyAccess = (access: ts.PropertyAccessExpression): string[] => {
        const property = access.name.text;
        if (
            property !== "value" &&
            property !== "writable" &&
            property !== "enumerable" &&
            property !== "configurable"
        ) {
            return [];
        }
        const descriptor = resolveStaticDescriptor(access.expression);
        if (!descriptor) return [];
        switch (property) {
            case "value":
                return descriptor.value;
            case "writable":
                return [String(descriptor.writable)];
            case "enumerable":
                return [String(descriptor.enumerable)];
            default:
                return [String(descriptor.configurable)];
        }
    };

    const resolveStaticDescriptor = (
        expr: ts.Expression,
    ): { value: string[]; writable: boolean; enumerable: boolean; configurable: boolean } | null => {
        const mapEntry = resolveStaticDescriptorMapEntry(expr);
        if (mapEntry) return mapEntry;

        const call = unwrapStaticExpression(expr);
        if (!ts.isCallExpression(call) || call.arguments.length < 2 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return null;
        const target = unwrapStaticExpression(callee.expression);
        const method = callee.name.text;
        const isObjectDescriptor =
            ts.isIdentifier(target) &&
            target.text === "Object" &&
            method === "getOwnPropertyDescriptor";
        const isReflectDescriptor =
            ts.isIdentifier(target) &&
            target.text === "Reflect" &&
            method === "getOwnPropertyDescriptor";
        if (!isObjectDescriptor && !isReflectDescriptor) return null;

        const keys = resolveKeyTexts(call.arguments[1]!);
        if (keys.length !== 1) return null;

        const bufferDescriptor = resolveStaticBufferDescriptorFor(call.arguments[0]!, keys[0]!);
        if (bufferDescriptor) return bufferDescriptor;

        const object = resolveCollectionExpression(call.arguments[0]!);
        if (!object) return null;
        return staticDescriptorFor(object, keys[0]!);
    };

    const resolveStaticDescriptorMapEntry = (
        expr: ts.Expression,
    ): { value: string[]; writable: boolean; enumerable: boolean; configurable: boolean } | null => {
        const access = unwrapStaticExpression(expr);
        let mapExpr: ts.Expression;
        let keys: string[];
        if (ts.isPropertyAccessExpression(access)) {
            mapExpr = access.expression;
            keys = [access.name.text];
        } else if (ts.isElementAccessExpression(access) && access.argumentExpression) {
            mapExpr = access.expression;
            keys = resolveKeyTexts(access.argumentExpression);
        } else {
            return null;
        }
        if (keys.length !== 1) return null;

        const call = unwrapStaticExpression(mapExpr);
        if (!ts.isCallExpression(call) || call.arguments.length < 1 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "getOwnPropertyDescriptors") return null;
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object") return null;

        const bufferDescriptor = resolveStaticBufferDescriptorFor(call.arguments[0]!, keys[0]!);
        if (bufferDescriptor) return bufferDescriptor;

        const object = resolveCollectionExpression(call.arguments[0]!);
        return object ? staticDescriptorFor(object, keys[0]!) : null;
    };

    const resolveStaticBufferDescriptorFor = (
        objectExpr: ts.Expression,
        key: string,
    ): { value: string[]; writable: boolean; enumerable: boolean; configurable: boolean } | null => {
        const buffers = resolveStaticBufferExpression(objectExpr);
        if (buffers.length === 0) return null;

        const values: string[] = [];
        for (const buffer of buffers) {
            const descriptor = staticBufferDescriptorFor(buffer, key);
            if (!descriptor) return null;
            values.push(...descriptor.value);
            if (values.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        }
        const value = dedupe(values);
        return value.length === 0
            ? null
            : { value, writable: true, enumerable: true, configurable: true };
    };

    const staticBufferDescriptorFor = (
        buffer: Buffer,
        key: string,
    ): { value: string[]; writable: boolean; enumerable: boolean; configurable: boolean } | null => {
        if (!staticBufferHasOwnKey(buffer, key)) return null;
        return {
            value: [String(buffer[Number(key)])],
            writable: true,
            enumerable: true,
            configurable: true,
        };
    };

    const staticDescriptorFor = (
        object: ts.Expression,
        key: string,
    ): { value: string[]; writable: boolean; enumerable: boolean; configurable: boolean } | null => {
        if (ts.isObjectLiteralExpression(object)) {
            for (const prop of object.properties) {
                if (ts.isSpreadAssignment(prop)) return null;
                if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) return null;
                const propName = staticPropertyName(prop.name);
                if (propName === null) return null;
                if (propName !== key) continue;
                const valueExpr = ts.isPropertyAssignment(prop) ? prop.initializer : prop.name;
                const value = resolve(valueExpr);
                return value.length === 0
                    ? null
                    : { value, writable: true, enumerable: true, configurable: true };
            }
            return null;
        }
        if (ts.isArrayLiteralExpression(object)) {
            if (key === "length") {
                return {
                    value: [String(object.elements.length)],
                    writable: true,
                    enumerable: false,
                    configurable: false,
                };
            }
            if (!/^(0|[1-9][0-9]*)$/.test(key)) return null;
            const element = object.elements[Number(key)];
            if (!element || ts.isSpreadElement(element) || element.kind === ts.SyntaxKind.OmittedExpression) return null;
            const value = resolve(element);
            return value.length === 0
                ? null
                : { value, writable: true, enumerable: true, configurable: true };
        }
        if (ts.isStringLiteral(object) || ts.isNoSubstitutionTemplateLiteral(object)) {
            if (key === "length") {
                return {
                    value: [String(object.text.length)],
                    writable: false,
                    enumerable: false,
                    configurable: false,
                };
            }
            if (!/^(0|[1-9][0-9]*)$/.test(key)) return null;
            const char = object.text[Number(key)];
            return char === undefined
                ? null
                : { value: [char], writable: false, enumerable: true, configurable: false };
        }
        return null;
    };

    const resolveStaticReflectHasCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "has") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Reflect") return [];

        const bufferHas = resolveStaticBufferReflectHas(call.arguments[0]!, call.arguments[1]!);
        if (bufferHas.length > 0) return bufferHas;

        const object = resolveCollectionExpression(call.arguments[0]!);
        if (!object) return [];
        const keys = resolveKeyTexts(call.arguments[1]!);
        if (keys.length === 0) return [];

        const out: string[] = [];
        for (const key of keys) {
            const value = staticReflectHas(object, key);
            if (value === null) return [];
            out.push(String(value));
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupe(out);
    };

    const resolveStaticBufferReflectHas = (objectExpr: ts.Expression, keyExpr: ts.Expression): string[] => {
        const buffers = resolveStaticBufferExpression(objectExpr);
        if (buffers.length === 0) return [];
        const keys = resolveKeyTexts(keyExpr);
        if (keys.length === 0) return [];

        const out: string[] = [];
        for (const buffer of buffers) {
            for (const key of keys) {
                out.push(String(staticBufferReflectHas(buffer, key)));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const staticBufferReflectHas = (buffer: Buffer, key: string): boolean => {
        if (key === "length") return true;
        return staticBufferHasOwnKey(buffer, key);
    };

    const staticReflectHas = (object: ts.Expression, key: string): boolean | null => {
        if (ts.isObjectLiteralExpression(object)) {
            for (const prop of object.properties) {
                if (ts.isSpreadAssignment(prop)) return null;
                if (!prop.name) return null;
                const propName = staticPropertyName(prop.name);
                if (propName === null) return null;
                if (propName === key) return true;
            }
            return null;
        }
        if (ts.isArrayLiteralExpression(object)) {
            if (key === "length") return true;
            if (!/^(0|[1-9][0-9]*)$/.test(key)) return null;
            const index = Number(key);
            const element = object.elements[index];
            return element !== undefined && !ts.isSpreadElement(element) && element.kind !== ts.SyntaxKind.OmittedExpression;
        }
        if (ts.isStringLiteral(object) || ts.isNoSubstitutionTemplateLiteral(object)) {
            if (key === "length") return true;
            if (!/^(0|[1-9][0-9]*)$/.test(key)) return null;
            const index = Number(key);
            return index >= 0 && index < object.text.length;
        }
        return null;
    };

    const resolveStaticObjectOwnPrototypePredicateCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "call") return [];
        const methodAccess = unwrapStaticExpression(callee.expression);
        if (!ts.isPropertyAccessExpression(methodAccess)) return [];
        const prototypeAccess = unwrapStaticExpression(methodAccess.expression);
        if (!ts.isPropertyAccessExpression(prototypeAccess) || prototypeAccess.name.text !== "prototype") return [];
        const target = unwrapStaticExpression(prototypeAccess.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object") return [];

        const method = methodAccess.name.text;
        if (method !== "hasOwnProperty" && method !== "propertyIsEnumerable") return [];
        const bufferOwn = resolveStaticBufferOwnPredicate(call.arguments[0]!, call.arguments[1]!);
        if (bufferOwn.length > 0) return bufferOwn;

        const object = resolveCollectionExpression(call.arguments[0]!);
        if (!object) return [];
        const keys = resolveKeyTexts(call.arguments[1]!);
        if (keys.length === 0) return [];

        const out: string[] = [];
        for (const key of keys) {
            const own = staticObjectHasOwn(object, key);
            if (own === null) return [];
            if (method === "hasOwnProperty" || !own) {
                out.push(String(method === "hasOwnProperty" ? own : false));
            } else {
                const descriptor = staticDescriptorFor(object, key);
                if (!descriptor) return [];
                out.push(String(descriptor.enumerable));
            }
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupe(out);
    };

    const resolveStaticBufferOwnPrototypePredicateCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "hasOwnProperty" && method !== "propertyIsEnumerable") return [];
        return resolveStaticBufferOwnPredicate(callee.expression, call.arguments[0]!);
    };

    const resolveStaticObjectPrototypeToStringCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "call") return [];
        const methodAccess = unwrapStaticExpression(callee.expression);
        if (!ts.isPropertyAccessExpression(methodAccess) || methodAccess.name.text !== "toString") return [];
        const prototypeAccess = unwrapStaticExpression(methodAccess.expression);
        if (!ts.isPropertyAccessExpression(prototypeAccess) || prototypeAccess.name.text !== "prototype") return [];
        const target = unwrapStaticExpression(prototypeAccess.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object") return [];

        const tag = staticObjectPrototypeToStringTag(unwrapStaticExpression(call.arguments[0]!));
        return tag ? [`[object ${tag}]`] : [];
    };

    const staticObjectPrototypeToStringTag = (expr: ts.Expression): string | null => {
        if (ts.isObjectLiteralExpression(expr)) return "Object";
        if (ts.isArrayLiteralExpression(expr)) return "Array";
        if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return "String";
        if (ts.isNumericLiteral(expr)) return "Number";
        if (ts.isBigIntLiteral(expr)) return "BigInt";
        if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) return "Boolean";
        if (expr.kind === ts.SyntaxKind.NullKeyword) return "Null";
        if (
            expr.kind === ts.SyntaxKind.UndefinedKeyword ||
            (ts.isIdentifier(expr) && expr.text === "undefined") ||
            ts.isVoidExpression(expr)
        ) {
            return "Undefined";
        }
        if (
            ts.isPrefixUnaryExpression(expr) &&
            (expr.operator === ts.SyntaxKind.PlusToken || expr.operator === ts.SyntaxKind.MinusToken) &&
            ts.isNumericLiteral(expr.operand)
        ) {
            return "Number";
        }
        if (
            ts.isPrefixUnaryExpression(expr) &&
            expr.operator === ts.SyntaxKind.MinusToken &&
            ts.isBigIntLiteral(expr.operand)
        ) {
            return "BigInt";
        }
        return null;
    };

    const resolveStaticObjectIntegrityPredicateCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object") return [];
        const method = callee.name.text;
        if (method !== "isExtensible" && method !== "isSealed" && method !== "isFrozen") return [];
        const rawKind = staticIntegrityObjectKind(unwrapStaticExpression(call.arguments[0]!));
        const objectKind = rawKind ?? staticIntegrityResolvedObjectKind(call.arguments[0]!);
        if (objectKind === null) return [];
        if (method === "isExtensible") return [String(objectKind === "object")];
        return [String(objectKind === "primitive")];
    };

    const staticIntegrityResolvedObjectKind = (expr: ts.Expression): "object" | "primitive" | null => {
        const object = resolveCollectionExpression(expr);
        return object ? staticIntegrityObjectKind(object) : null;
    };

    const staticIntegrityObjectKind = (object: ts.Expression): "object" | "primitive" | null => {
        if (ts.isObjectLiteralExpression(object) || ts.isArrayLiteralExpression(object)) return "object";
        if (
            object.kind === ts.SyntaxKind.NullKeyword ||
            object.kind === ts.SyntaxKind.UndefinedKeyword ||
            (ts.isIdentifier(object) && (object.text === "undefined" || object.text === "NaN")) ||
            ts.isVoidExpression(object) ||
            object.kind === ts.SyntaxKind.TrueKeyword ||
            object.kind === ts.SyntaxKind.FalseKeyword ||
            ts.isStringLiteral(object) ||
            ts.isNoSubstitutionTemplateLiteral(object) ||
            ts.isNumericLiteral(object) ||
            ts.isBigIntLiteral(object)
        ) {
            return "primitive";
        }
        if (
            ts.isPrefixUnaryExpression(object) &&
            object.operator === ts.SyntaxKind.MinusToken &&
            (ts.isNumericLiteral(object.operand) || ts.isBigIntLiteral(object.operand))
        ) {
            return "primitive";
        }
        return null;
    };

    const resolveStaticDateCall = (call: ts.CallExpression): string[] => {
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Date") return [];
        if (callee.name.text === "parse") {
            if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
            const values = resolve(call.arguments[0]!);
            if (values.length === 0) return [];
            const out: string[] = [];
            for (const value of values) {
                const stamp = Date.parse(value);
                if (!Number.isFinite(stamp)) return [];
                out.push(String(stamp));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
            return dedupe(out);
        }
        if (callee.name.text !== "UTC") return [];
        if (call.arguments.length < 1 || call.arguments.length > 7 || call.arguments.some(ts.isSpreadElement)) return [];

        const argumentValues = call.arguments.map((argument) => resolveStaticIntegerKeys(argument));
        if (argumentValues.some((values) => values.length === 0)) return [];

        let tuples: number[][] = [[]];
        for (const values of argumentValues) {
            const next: number[][] = [];
            for (const tuple of tuples) {
                for (const value of values) {
                    next.push([...tuple, value]);
                    if (next.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
            tuples = next;
        }

        const out: string[] = [];
        for (const tuple of tuples) {
            let stamp: number;
            switch (tuple.length) {
                case 1:
                    stamp = Date.UTC(tuple[0]!);
                    break;
                case 2:
                    stamp = Date.UTC(tuple[0]!, tuple[1]!);
                    break;
                case 3:
                    stamp = Date.UTC(tuple[0]!, tuple[1]!, tuple[2]!);
                    break;
                case 4:
                    stamp = Date.UTC(tuple[0]!, tuple[1]!, tuple[2]!, tuple[3]!);
                    break;
                case 5:
                    stamp = Date.UTC(tuple[0]!, tuple[1]!, tuple[2]!, tuple[3]!, tuple[4]!);
                    break;
                case 6:
                    stamp = Date.UTC(tuple[0]!, tuple[1]!, tuple[2]!, tuple[3]!, tuple[4]!, tuple[5]!);
                    break;
                default:
                    stamp = Date.UTC(tuple[0]!, tuple[1]!, tuple[2]!, tuple[3]!, tuple[4]!, tuple[5]!, tuple[6]!);
                    break;
            }
            if (!Number.isFinite(stamp)) return [];
            out.push(String(stamp));
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupe(out);
    };

    const isStaticDateStringExpression = (expr: ts.Expression): boolean => {
        const current = unwrapStaticExpression(expr);
        if (ts.isStringLiteralLike(current) || ts.isNoSubstitutionTemplateLiteral(current) || ts.isTemplateExpression(current)) {
            return true;
        }
        if (!ts.isIdentifier(current)) return false;
        const decl = earlierConstStringDeclaration(current) ?? topLevelConstStringDeclaration(current);
        if (!decl?.initializer || seen.has(decl)) return false;
        seen.add(decl);
        const value = isStaticDateStringExpression(decl.initializer);
        seen.delete(decl);
        return value;
    };

    const resolveStaticDateRecords = (expr: ts.Expression): Date[] => {
        const current = unwrapStaticExpression(expr);
        if (ts.isIdentifier(current)) {
            const decl = earlierConstStringDeclaration(current) ?? topLevelConstStringDeclaration(current);
            if (!decl?.initializer || seen.has(decl)) return [];
            seen.add(decl);
            const values = resolveStaticDateRecords(decl.initializer);
            seen.delete(decl);
            return values;
        }
        if (!ts.isNewExpression(current) || current.arguments?.some(ts.isSpreadElement)) return [];
        const target = unwrapStaticExpression(current.expression);
        if (!ts.isIdentifier(target) || target.text !== "Date") return [];
        const args = current.arguments ?? [];
        if (args.length !== 1) return [];

        const stamps = isStaticDateStringExpression(args[0]!)
            ? resolve(args[0]!).map((value) => Date.parse(value))
            : resolveStaticNumberValues(args[0]!);
        if (stamps.length === 0 || stamps.some((stamp) => !Number.isFinite(stamp))) return [];

        const out: Date[] = [];
        for (const stamp of stamps) {
            out.push(new Date(stamp));
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return out;
    };

    const resolveFreshStaticDateRecords = (expr: ts.Expression): Date[] => {
        const current = unwrapStaticExpression(expr);
        if (!ts.isNewExpression(current) || current.arguments?.some(ts.isSpreadElement)) return [];
        const target = unwrapStaticExpression(current.expression);
        if (!ts.isIdentifier(target) || target.text !== "Date") return [];
        const args = current.arguments ?? [];
        if (args.length !== 1) return [];

        const stamps = isStaticDateStringExpression(args[0]!)
            ? resolve(args[0]!).map((value) => Date.parse(value))
            : resolveStaticNumberValues(args[0]!);
        if (stamps.length === 0 || stamps.some((stamp) => !Number.isFinite(stamp))) return [];

        const out: Date[] = [];
        for (const stamp of stamps) {
            out.push(new Date(stamp));
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return out;
    };

    const resolveStaticDateInstanceCall = (call: ts.CallExpression): string[] => {
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;

        const zeroArgMethods = new Set([
            "getTime",
            "valueOf",
            "toISOString",
            "toJSON",
            "toUTCString",
            "toGMTString",
            "getUTCFullYear",
            "getUTCMonth",
            "getUTCDate",
            "getUTCDay",
            "getUTCHours",
            "getUTCMinutes",
            "getUTCSeconds",
            "getUTCMilliseconds",
        ]);
        if (zeroArgMethods.has(method)) {
            if (call.arguments.length !== 0) return [];
            const dates = resolveStaticDateRecords(callee.expression);
            if (dates.length === 0) return [];
            const out: string[] = [];
            for (const date of dates) {
                const stamp = date.getTime();
                if (!Number.isFinite(stamp)) return [];
                switch (method) {
                    case "getTime":
                    case "valueOf":
                        out.push(String(stamp));
                        break;
                    case "toUTCString":
                    case "toGMTString":
                        out.push(date.toUTCString());
                        break;
                    case "toISOString":
                    case "toJSON":
                        out.push(date.toISOString());
                        break;
                    case "getUTCFullYear":
                        out.push(String(date.getUTCFullYear()));
                        break;
                    case "getUTCMonth":
                        out.push(String(date.getUTCMonth()));
                        break;
                    case "getUTCDate":
                        out.push(String(date.getUTCDate()));
                        break;
                    case "getUTCDay":
                        out.push(String(date.getUTCDay()));
                        break;
                    case "getUTCHours":
                        out.push(String(date.getUTCHours()));
                        break;
                    case "getUTCMinutes":
                        out.push(String(date.getUTCMinutes()));
                        break;
                    case "getUTCSeconds":
                        out.push(String(date.getUTCSeconds()));
                        break;
                    case "getUTCMilliseconds":
                        out.push(String(date.getUTCMilliseconds()));
                        break;
                }
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
            return dedupe(out);
        }

        return resolveStaticFreshDateMutatorCall(method, callee.expression, call.arguments);
    };

    const resolveStaticFreshDateMutatorCall = (
        method: string,
        receiver: ts.Expression,
        args: ts.NodeArray<ts.Expression>,
    ): string[] => {
        const ranges: Record<string, [number, number]> = {
            setTime: [1, 1],
            setUTCFullYear: [1, 3],
            setUTCMonth: [1, 2],
            setUTCDate: [1, 1],
            setUTCHours: [1, 4],
            setUTCMinutes: [1, 3],
            setUTCSeconds: [1, 2],
            setUTCMilliseconds: [1, 1],
        };
        const range = ranges[method];
        if (!range || args.length < range[0] || args.length > range[1] || args.some(ts.isSpreadElement)) return [];

        const dates = resolveFreshStaticDateRecords(receiver);
        if (dates.length === 0) return [];
        const argumentValues = args.map((argument) => resolveStaticNumberValues(argument));
        if (argumentValues.some((values) => values.length === 0)) return [];

        let tuples: number[][] = [[]];
        for (const values of argumentValues) {
            const next: number[][] = [];
            for (const tuple of tuples) {
                for (const value of values) {
                    next.push([...tuple, value]);
                    if (next.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
            tuples = next;
        }

        const out: string[] = [];
        for (const sourceDate of dates) {
            for (const tuple of tuples) {
                const date = new Date(sourceDate.getTime());
                const setter = Date.prototype[method as keyof Date] as unknown as (this: Date, ...values: number[]) => number;
                const stamp = setter.call(date, ...tuple);
                if (!Number.isFinite(stamp)) return [];
                out.push(String(stamp));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticMathCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Math") return [];
        const method = callee.name.text;

        const applyMath = (args: number[]): number | null => {
            switch (method) {
                case "abs":
                    return args.length === 1 ? Math.abs(args[0]!) : null;
                case "floor":
                    return args.length === 1 ? Math.floor(args[0]!) : null;
                case "ceil":
                    return args.length === 1 ? Math.ceil(args[0]!) : null;
                case "trunc":
                    return args.length === 1 ? Math.trunc(args[0]!) : null;
                case "round":
                    return args.length === 1 ? Math.round(args[0]!) : null;
                case "sqrt":
                    return args.length === 1 ? Math.sqrt(args[0]!) : null;
                case "cbrt":
                    return args.length === 1 ? Math.cbrt(args[0]!) : null;
                case "sign":
                    return args.length === 1 ? Math.sign(args[0]!) : null;
                case "clz32":
                    return args.length === 1 ? Math.clz32(args[0]!) : null;
                case "fround":
                    return args.length === 1 ? Math.fround(args[0]!) : null;
                case "pow":
                    return args.length === 2 ? Math.pow(args[0]!, args[1]!) : null;
                case "imul":
                    return args.length === 2 ? Math.imul(args[0]!, args[1]!) : null;
                case "min":
                    return args.length >= 1 ? Math.min(...args) : null;
                case "max":
                    return args.length >= 1 ? Math.max(...args) : null;
                case "hypot":
                    return args.length >= 1 ? Math.hypot(...args) : null;
                default:
                    return null;
            }
        };

        const argumentValues = call.arguments.map((argument) => resolveStaticNumberValues(argument));
        if (argumentValues.some((values) => values.length === 0)) return [];
        let tuples: number[][] = [[]];
        for (const values of argumentValues) {
            const next: number[][] = [];
            for (const tuple of tuples) {
                for (const value of values) {
                    next.push([...tuple, value]);
                    if (next.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
            tuples = next;
        }

        const out: string[] = [];
        for (const tuple of tuples) {
            const value = applyMath(tuple);
            if (value === null || !Number.isFinite(value)) return [];
            out.push(Object.is(value, -0) ? "0" : String(value));
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupe(out);
    };

    const resolveStaticNumericConstantAccess = (access: ts.PropertyAccessExpression): string[] => {
        const target = unwrapStaticExpression(access.expression);
        if (!ts.isIdentifier(target)) return [];
        let value: number | null = null;
        if (target.text === "Math") {
            switch (access.name.text) {
                case "E":
                    value = Math.E;
                    break;
                case "LN2":
                    value = Math.LN2;
                    break;
                case "LN10":
                    value = Math.LN10;
                    break;
                case "LOG2E":
                    value = Math.LOG2E;
                    break;
                case "LOG10E":
                    value = Math.LOG10E;
                    break;
                case "PI":
                    value = Math.PI;
                    break;
                case "SQRT1_2":
                    value = Math.SQRT1_2;
                    break;
                case "SQRT2":
                    value = Math.SQRT2;
                    break;
            }
        } else if (target.text === "Number") {
            switch (access.name.text) {
                case "EPSILON":
                    value = Number.EPSILON;
                    break;
                case "MAX_SAFE_INTEGER":
                    value = Number.MAX_SAFE_INTEGER;
                    break;
                case "MAX_VALUE":
                    value = Number.MAX_VALUE;
                    break;
                case "MIN_SAFE_INTEGER":
                    value = Number.MIN_SAFE_INTEGER;
                    break;
                case "MIN_VALUE":
                    value = Number.MIN_VALUE;
                    break;
            }
        }
        return value !== null && Number.isFinite(value)
            ? [Object.is(value, -0) ? "0" : String(value)]
            : [];
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

    const flattenObjectLiteral = (object: ts.ObjectLiteralExpression): ts.ObjectLiteralExpression | null => {
        if (!object.properties.some(ts.isSpreadAssignment)) return object;
        let out = ts.factory.createObjectLiteralExpression([]);
        for (const prop of object.properties) {
            if (ts.isSpreadAssignment(prop)) {
                if (isStaticNullishCollectionSource(prop.expression)) continue;
                const spread = resolveCollectionExpression(prop.expression);
                if (!spread || !ts.isObjectLiteralExpression(spread)) return null;
                for (const spreadProp of spread.properties) {
                    if (!ts.isPropertyAssignment(spreadProp) && !ts.isShorthandPropertyAssignment(spreadProp)) return null;
                    const key = staticPropertyName(spreadProp.name);
                    if (key === null) return null;
                    const value = ts.isPropertyAssignment(spreadProp) ? spreadProp.initializer : spreadProp.name;
                    const next = withStaticObjectProperty(out, key, value);
                    if (!next) return null;
                    out = next;
                }
                continue;
            }
            if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) return null;
            const key = staticPropertyName(prop.name);
            if (key === null) return null;
            const value = ts.isPropertyAssignment(prop) ? prop.initializer : prop.name;
            const next = withStaticObjectProperty(out, key, value);
            if (!next) return null;
            out = next;
        }
        return out;
    };

    const resolveCollectionExpression = (node: ts.Expression): ts.Expression | null => {
        let cur = node;
        while (
            ts.isParenthesizedExpression(cur) ||
            ts.isAsExpression(cur) ||
            ts.isTypeAssertionExpression(cur) ||
            ts.isSatisfiesExpression(cur) ||
            ts.isNonNullExpression(cur)
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

        if (ts.isCallExpression(cur)) {
            const arrayCopy = resolveStaticArrayCopyCollectionExpression(cur);
            if (arrayCopy) return resolveCollectionExpression(arrayCopy);
            const arrayOf = resolveStaticArrayOfCollectionExpression(cur);
            if (arrayOf) return resolveCollectionExpression(arrayOf);
            const arrayFrom = resolveStaticArrayFromCollectionExpression(cur);
            if (arrayFrom) return resolveCollectionExpression(arrayFrom);
            const objectWrapperReceiver = resolveStaticObjectWrapperReceiver(cur);
            if (objectWrapperReceiver) return resolveCollectionExpression(objectWrapperReceiver);
            const objectDescriptorBuilt = resolveStaticObjectDescriptorBuiltCollectionExpression(cur);
            if (objectDescriptorBuilt) return resolveCollectionExpression(objectDescriptorBuilt);
            const objectAssign = resolveStaticObjectAssignCollectionExpression(cur);
            if (objectAssign) return resolveCollectionExpression(objectAssign);
            const objectGroupBy = resolveStaticObjectGroupByCollectionExpression(cur);
            if (objectGroupBy) return resolveCollectionExpression(objectGroupBy);
            const mapGroupBy = resolveStaticMapGroupByCollectionExpression(cur);
            if (mapGroupBy) return resolveCollectionExpression(mapGroupBy);
            const setComposition = resolveStaticSetCompositionCollectionExpression(cur);
            if (setComposition) return resolveCollectionExpression(setComposition);
            const mapSetCollections = resolveStaticMapSetCollectionExpression(cur);
            if (mapSetCollections) return resolveCollectionExpression(mapSetCollections);
            const mapGet = resolveStaticMapGetCollectionExpression(cur);
            if (mapGet) return resolveCollectionExpression(mapGet);
            const objectEntries = resolveStaticObjectEntriesCollectionExpression(cur);
            if (objectEntries) return resolveCollectionExpression(objectEntries);
            const objectFromEntries = resolveStaticObjectFromEntriesCollectionExpression(cur);
            if (objectFromEntries) return resolveCollectionExpression(objectFromEntries);
            const urlSearchParamsValues = resolveStaticUrlSearchParamsCollectionExpression(cur);
            if (urlSearchParamsValues) return resolveCollectionExpression(urlSearchParamsValues);
            const bufferJson = resolveStaticBufferToJsonCollectionExpression(cur);
            if (bufferJson) return resolveCollectionExpression(bufferJson);
            const jsonParsed = resolveStaticJsonParseCollectionExpression(cur);
            if (jsonParsed) return resolveCollectionExpression(jsonParsed);
            const regexpExec = resolveStaticRegExpExecCollectionExpression(cur);
            if (regexpExec) return resolveCollectionExpression(regexpExec);
            const stringMatch = resolveStaticStringMatchCollectionExpression(cur);
            if (stringMatch) return resolveCollectionExpression(stringMatch);
            const stringMatchAll = resolveStaticStringMatchAllCollectionExpression(cur);
            if (stringMatchAll) return resolveCollectionExpression(stringMatchAll);
            const stringSplit = resolveStaticStringSplitCollectionExpression(cur);
            if (stringSplit) return resolveCollectionExpression(stringSplit);
            const valueOfReceiver = resolveStaticObjectPrototypeValueOfReceiver(cur);
            if (valueOfReceiver) return resolveCollectionExpression(valueOfReceiver);
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

        if (ts.isObjectLiteralExpression(cur)) {
            return flattenObjectLiteral(cur);
        }

        return cur;
    };

    const resolveStaticArrayCopyCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return null;
        const method = callee.name.text;
        if (method !== "slice" && method !== "concat" && method !== "copyWithin" && method !== "fill" && method !== "filter" && method !== "flat" && method !== "flatMap" && method !== "map" && method !== "reverse" && method !== "sort" && method !== "splice" && method !== "toReversed" && method !== "toSorted" && method !== "with" && method !== "toSpliced") return null;
        const receiver = resolveCollectionExpression(callee.expression);
        if (!receiver || !ts.isArrayLiteralExpression(receiver)) return null;
        const receiverElements = denseStaticArrayElements(receiver);
        if (!receiverElements) return null;

        if (method === "toReversed" || method === "reverse") {
            if (call.arguments.length !== 0) return null;
            return ts.factory.createArrayLiteralExpression([...receiverElements].reverse());
        }

        if (method === "toSorted" || method === "sort") {
            if (call.arguments.length !== 0) return null;
            const sortable = receiverElements.map((element, index) => {
                const texts = resolveStaticDefaultSortText(element);
                return texts.length === 1 ? { element, text: texts[0]!, index } : null;
            });
            if (sortable.some((entry) => entry === null)) return null;
            const elements = sortable
                .sort((left, right) => left!.text < right!.text ? -1 : left!.text > right!.text ? 1 : left!.index - right!.index)
                .map((entry) => entry!.element);
            return ts.factory.createArrayLiteralExpression(elements);
        }

        if (method === "flat") {
            if (call.arguments.length > 1) return null;
            const depths = !call.arguments[0] || isStaticUndefinedExpression(call.arguments[0]!)
                ? [1]
                : resolveStaticIntegerKeys(call.arguments[0]!);
            if (depths.length !== 1) return null;
            const elements = flattenStaticArrayDepth(receiverElements, depths[0]!);
            if (!elements || elements.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
            return ts.factory.createArrayLiteralExpression(elements);
        }

        if (method === "map" || method === "flatMap") {
            if (call.arguments.length !== 1) return null;
            const mapped = mapStaticArrayCallback(receiverElements, call.arguments[0]!);
            if (!mapped) return null;
            if (method === "map") return ts.factory.createArrayLiteralExpression(mapped);
            const elements = flattenStaticArrayDepth(mapped, 1);
            if (!elements || elements.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
            return ts.factory.createArrayLiteralExpression(elements);
        }

        if (method === "filter") {
            if (call.arguments.length !== 1) return null;
            const elements: ts.Expression[] = [];
            for (let i = 0; i < receiverElements.length; i++) {
                const keep = evaluateStaticArrayPredicateCallback(call.arguments[0]!, receiverElements[i]!, i);
                if (keep === null) return null;
                if (keep) elements.push(receiverElements[i]!);
            }
            return ts.factory.createArrayLiteralExpression(elements);
        }

        if (method === "fill") {
            if (call.arguments.length < 1 || call.arguments.length > 3) return null;
            const starts = !call.arguments[1] || isStaticUndefinedExpression(call.arguments[1]!)
                ? [0]
                : resolveStaticIntegerKeys(call.arguments[1]!);
            const ends = !call.arguments[2] || isStaticUndefinedExpression(call.arguments[2]!)
                ? [receiverElements.length]
                : resolveStaticIntegerKeys(call.arguments[2]!);
            if (starts.length !== 1 || ends.length !== 1) return null;
            const start = normalizeStaticArraySliceIndex(starts[0]!, receiverElements.length);
            const end = normalizeStaticArraySliceIndex(ends[0]!, receiverElements.length);
            const elements = [...receiverElements];
            for (let i = start; i < Math.max(start, end); i++) {
                elements[i] = call.arguments[0]!;
            }
            return ts.factory.createArrayLiteralExpression(elements);
        }

        if (method === "copyWithin") {
            if (call.arguments.length < 2 || call.arguments.length > 3) return null;
            const targets = resolveStaticIntegerKeys(call.arguments[0]!);
            const starts = resolveStaticIntegerKeys(call.arguments[1]!);
            const ends = !call.arguments[2] || isStaticUndefinedExpression(call.arguments[2]!)
                ? [receiverElements.length]
                : resolveStaticIntegerKeys(call.arguments[2]!);
            if (targets.length !== 1 || starts.length !== 1 || ends.length !== 1) return null;
            const target = normalizeStaticArraySliceIndex(targets[0]!, receiverElements.length);
            const start = normalizeStaticArraySliceIndex(starts[0]!, receiverElements.length);
            const end = normalizeStaticArraySliceIndex(ends[0]!, receiverElements.length);
            const count = Math.min(Math.max(end - start, 0), receiverElements.length - target);
            const copied = receiverElements.slice(start, start + count);
            const elements = [...receiverElements];
            for (let i = 0; i < copied.length; i++) {
                elements[target + i] = copied[i]!;
            }
            return ts.factory.createArrayLiteralExpression(elements);
        }

        if (method === "splice") {
            if (call.arguments.some((argument, index) => index >= 2 && resolve(argument).length === 0)) return null;
            if (call.arguments.length === 0) {
                return ts.factory.createArrayLiteralExpression([]);
            }
            const starts = isStaticUndefinedExpression(call.arguments[0]!)
                ? [0]
                : resolveStaticIntegerKeys(call.arguments[0]!);
            if (starts.length !== 1) return null;
            const start = normalizeStaticArraySliceIndex(starts[0]!, receiverElements.length);
            const deleteCounts = call.arguments.length === 1
                ? [receiverElements.length - start]
                : isStaticUndefinedExpression(call.arguments[1]!)
                    ? [0]
                    : resolveStaticIntegerKeys(call.arguments[1]!);
            if (deleteCounts.length !== 1) return null;
            const deleteCount = Math.min(Math.max(deleteCounts[0]!, 0), receiverElements.length - start);
            return ts.factory.createArrayLiteralExpression(receiverElements.slice(start, start + deleteCount));
        }

        if (method === "with") {
            if (call.arguments.length !== 2) return null;
            const indexes = resolveStaticIntegerKeys(call.arguments[0]!);
            if (indexes.length !== 1) return null;
            const index = indexes[0]! < 0 ? receiverElements.length + indexes[0]! : indexes[0]!;
            if (index < 0 || index >= receiverElements.length) return null;
            const elements = [...receiverElements];
            elements[index] = call.arguments[1]!;
            return ts.factory.createArrayLiteralExpression(elements);
        }

        if (method === "toSpliced") {
            if (call.arguments.length === 0) {
                return ts.factory.createArrayLiteralExpression(receiverElements);
            }
            const starts = isStaticUndefinedExpression(call.arguments[0]!)
                ? [0]
                : resolveStaticIntegerKeys(call.arguments[0]!);
            if (starts.length !== 1) return null;
            const start = normalizeStaticArraySliceIndex(starts[0]!, receiverElements.length);
            const deleteCounts = call.arguments.length === 1
                ? [receiverElements.length - start]
                : isStaticUndefinedExpression(call.arguments[1]!)
                    ? [0]
                    : resolveStaticIntegerKeys(call.arguments[1]!);
            if (deleteCounts.length !== 1) return null;
            const deleteCount = Math.min(Math.max(deleteCounts[0]!, 0), receiverElements.length - start);
            const elements = [
                ...receiverElements.slice(0, start),
                ...call.arguments.slice(2),
                ...receiverElements.slice(start + deleteCount),
            ];
            if (elements.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
            return ts.factory.createArrayLiteralExpression(elements);
        }

        if (method === "slice") {
            if (call.arguments.length > 2) return null;
            const starts = !call.arguments[0] || isStaticUndefinedExpression(call.arguments[0]!)
                ? [0]
                : resolveStaticIntegerKeys(call.arguments[0]!);
            const ends = !call.arguments[1] || isStaticUndefinedExpression(call.arguments[1]!)
                ? [receiverElements.length]
                : resolveStaticIntegerKeys(call.arguments[1]!);
            if (starts.length !== 1 || ends.length !== 1) return null;
            const start = normalizeStaticArraySliceIndex(starts[0]!, receiverElements.length);
            const end = normalizeStaticArraySliceIndex(ends[0]!, receiverElements.length);
            return ts.factory.createArrayLiteralExpression(receiverElements.slice(start, Math.max(start, end)));
        }

        const elements = [...receiverElements];
        for (const arg of call.arguments) {
            const value = resolveCollectionExpression(arg);
            if (value && ts.isArrayLiteralExpression(value)) {
                const argElements = denseStaticArrayElements(value);
                if (!argElements) return null;
                elements.push(...argElements);
            } else {
                elements.push(arg);
            }
            if (elements.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        }
        return ts.factory.createArrayLiteralExpression(elements);
    };

    const resolveStaticArrayMutationCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "pop" && method !== "shift" && method !== "push" && method !== "unshift") return [];
        const receiver = resolveCollectionExpression(callee.expression);
        if (!receiver || !ts.isArrayLiteralExpression(receiver)) return [];
        const receiverElements = denseStaticArrayElements(receiver);
        if (!receiverElements) return [];

        if (method === "push" || method === "unshift") {
            if (call.arguments.some((argument) => resolve(argument).length === 0)) return [];
            return [String(receiverElements.length + call.arguments.length)];
        }

        if (call.arguments.length !== 0) return [];
        const element = method === "pop"
            ? receiverElements[receiverElements.length - 1]
            : receiverElements[0];
        return element ? resolve(element) : ["undefined"];
    };

    const resolveStaticArraySearchCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (
            method !== "some" &&
            method !== "every" &&
            method !== "find" &&
            method !== "findIndex" &&
            method !== "findLast" &&
            method !== "findLastIndex"
        ) {
            return [];
        }
        const receiver = resolveCollectionExpression(callee.expression);
        if (!receiver || !ts.isArrayLiteralExpression(receiver)) return [];
        const receiverElements = denseStaticArrayElements(receiver);
        if (!receiverElements) return [];

        const predicate = call.arguments[0]!;
        const indexes = method === "findLast" || method === "findLastIndex"
            ? receiverElements.map((_, index) => index).reverse()
            : receiverElements.map((_, index) => index);

        let matchedIndex = -1;
        for (const index of indexes) {
            const keep = evaluateStaticArrayPredicateCallback(predicate, receiverElements[index]!, index);
            if (keep === null) return [];
            if (keep) {
                matchedIndex = index;
                break;
            }
        }

        switch (method) {
            case "some":
                return [String(matchedIndex !== -1)];
            case "every": {
                for (let i = 0; i < receiverElements.length; i++) {
                    const keep = evaluateStaticArrayPredicateCallback(predicate, receiverElements[i]!, i);
                    if (keep === null) return [];
                    if (!keep) return ["false"];
                }
                return ["true"];
            }
            case "find":
            case "findLast":
                return matchedIndex === -1 ? ["undefined"] : resolve(receiverElements[matchedIndex]!);
            case "findIndex":
            case "findLastIndex":
                return [String(matchedIndex)];
        }
        return [];
    };

    const resolveStaticArrayReduceCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "reduce" && method !== "reduceRight") return [];
        const receiver = resolveCollectionExpression(callee.expression);
        if (!receiver || !ts.isArrayLiteralExpression(receiver)) return [];
        const receiverElements = denseStaticArrayElements(receiver);
        if (!receiverElements) return [];

        let accumulator = call.arguments[1]!;
        const indexes = method === "reduceRight"
            ? receiverElements.map((_, index) => index).reverse()
            : receiverElements.map((_, index) => index);
        for (const index of indexes) {
            const next = substituteStaticArrayReduceCallback(call.arguments[0]!, accumulator, receiverElements[index]!, index);
            if (!next || resolve(next).length !== 1) return [];
            accumulator = next;
        }
        return resolve(accumulator);
    };

    const substituteStaticArrayReduceCallback = (
        callback: ts.Expression,
        accumulator: ts.Expression,
        element: ts.Expression,
        index: number,
    ): ts.Expression | null => {
        const unwrapped = unwrapStaticExpression(callback);
        if (!ts.isArrowFunction(unwrapped) && !ts.isFunctionExpression(unwrapped)) return null;
        const body = ts.isBlock(unwrapped.body)
            ? singleReturnExpression(unwrapped.body)
            : unwrapped.body;
        if (!body) return null;
        const accumulatorParam = unwrapped.parameters[0]?.name;
        const elementParam = unwrapped.parameters[1]?.name;
        const indexParam = unwrapped.parameters[2]?.name;
        const bindings = new Map<string, ts.Expression>();
        if (accumulatorParam && ts.isIdentifier(accumulatorParam)) bindings.set(accumulatorParam.text, accumulator);
        if (elementParam && ts.isIdentifier(elementParam)) bindings.set(elementParam.text, element);
        if (indexParam && ts.isIdentifier(indexParam)) bindings.set(indexParam.text, ts.factory.createNumericLiteral(index));
        return substituteStaticCallbackExpressionWithBindings(body, bindings);
    };

    const mapStaticArrayCallback = (elements: ts.Expression[], callback: ts.Expression): ts.Expression[] | null => {
        const out: ts.Expression[] = [];
        for (let i = 0; i < elements.length; i++) {
            const result = substituteStaticArrayCallback(callback, elements[i]!, i);
            if (!result) return null;
            out.push(result);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        }
        return out;
    };

    const evaluateStaticArrayPredicateCallback = (callback: ts.Expression, element: ts.Expression, index: number): boolean | null => {
        const result = substituteStaticArrayCallback(callback, element, index);
        return result ? staticBooleanResult(result) : null;
    };

    const substituteStaticArrayCallback = (callback: ts.Expression, element: ts.Expression, index: number): ts.Expression | null => {
        const unwrapped = unwrapStaticExpression(callback);
        if (!ts.isArrowFunction(unwrapped) && !ts.isFunctionExpression(unwrapped)) return null;
        const body = ts.isBlock(unwrapped.body)
            ? singleReturnExpression(unwrapped.body)
            : unwrapped.body;
        if (!body) return null;
        const elementParam = unwrapped.parameters[0]?.name;
        const indexParam = unwrapped.parameters[1]?.name;
        const elementName = elementParam && ts.isIdentifier(elementParam) ? elementParam.text : null;
        const indexName = indexParam && ts.isIdentifier(indexParam) ? indexParam.text : null;
        return substituteStaticCallbackExpression(body, elementName, element, indexName, index);
    };

    const substituteStaticCallbackExpressionWithBindings = (
        expr: ts.Expression,
        bindings: Map<string, ts.Expression>,
    ): ts.Expression | null => {
        if (ts.isIdentifier(expr) && bindings.has(expr.text)) return bindings.get(expr.text)!;
        return substituteStaticCallbackExpression(expr, null, expr, null, 0, bindings);
    };

    const substituteStaticCallbackExpression = (
        expr: ts.Expression,
        elementName: string | null,
        element: ts.Expression,
        indexName: string | null,
        index: number,
        extraBindings?: Map<string, ts.Expression>,
    ): ts.Expression | null => {
        if (ts.isIdentifier(expr)) {
            if (extraBindings?.has(expr.text)) return extraBindings.get(expr.text)!;
            if (elementName && expr.text === elementName) return element;
            if (indexName && expr.text === indexName) return ts.factory.createNumericLiteral(index);
            return expr;
        }
        if (ts.isParenthesizedExpression(expr)) {
            const inner = substituteStaticCallbackExpression(expr.expression, elementName, element, indexName, index, extraBindings);
            return inner ? ts.factory.createParenthesizedExpression(inner) : null;
        }
        if (ts.isAsExpression(expr)) {
            const inner = substituteStaticCallbackExpression(expr.expression, elementName, element, indexName, index, extraBindings);
            return inner ? ts.factory.createAsExpression(inner, expr.type) : null;
        }
        if (ts.isTypeAssertionExpression(expr)) {
            const inner = substituteStaticCallbackExpression(expr.expression, elementName, element, indexName, index, extraBindings);
            return inner ? ts.factory.createTypeAssertion(expr.type, inner) : null;
        }
        if (ts.isSatisfiesExpression(expr)) {
            const inner = substituteStaticCallbackExpression(expr.expression, elementName, element, indexName, index, extraBindings);
            return inner ? ts.factory.createSatisfiesExpression(inner, expr.type) : null;
        }
        if (ts.isBinaryExpression(expr)) {
            const left = substituteStaticCallbackExpression(expr.left, elementName, element, indexName, index, extraBindings);
            const right = substituteStaticCallbackExpression(expr.right, elementName, element, indexName, index, extraBindings);
            return left && right ? ts.factory.createBinaryExpression(left, expr.operatorToken, right) : null;
        }
        if (ts.isPrefixUnaryExpression(expr)) {
            const operand = substituteStaticCallbackExpression(expr.operand, elementName, element, indexName, index, extraBindings);
            return operand ? ts.factory.createPrefixUnaryExpression(expr.operator, operand) : null;
        }
        if (ts.isArrayLiteralExpression(expr)) {
            const elements: ts.Expression[] = [];
            for (const item of expr.elements) {
                if (ts.isSpreadElement(item) || item.kind === ts.SyntaxKind.OmittedExpression) return null;
                const next = substituteStaticCallbackExpression(item, elementName, element, indexName, index, extraBindings);
                if (!next) return null;
                elements.push(next);
            }
            return ts.factory.createArrayLiteralExpression(elements);
        }
        return expr;
    };

    const singleReturnExpression = (block: ts.Block): ts.Expression | null => {
        if (block.statements.length !== 1) return null;
        const statement = block.statements[0]!;
        return ts.isReturnStatement(statement) && statement.expression ? statement.expression : null;
    };

    const staticBooleanResult = (expr: ts.Expression): boolean | null => {
        const cur = unwrapStaticExpression(expr);
        if (cur.kind === ts.SyntaxKind.TrueKeyword) return true;
        if (cur.kind === ts.SyntaxKind.FalseKeyword) return false;
        if (ts.isPrefixUnaryExpression(cur) && cur.operator === ts.SyntaxKind.ExclamationToken) {
            const value = staticBooleanResult(cur.operand);
            return value === null ? null : !value;
        }
        if (
            ts.isBinaryExpression(cur) &&
            (
                cur.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
                cur.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
                cur.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
                cur.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken
            )
        ) {
            const left = resolve(cur.left);
            const right = resolve(cur.right);
            if (left.length !== 1 || right.length !== 1) return null;
            const equal = left[0] === right[0];
            return (
                cur.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
                cur.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken
            )
                ? !equal
                : equal;
        }
        return null;
    };

    const flattenStaticArrayDepth = (elements: ts.Expression[], depth: number): ts.Expression[] | null => {
        if (depth <= 0) return elements;
        const out: ts.Expression[] = [];
        for (const element of elements) {
            const value = resolveCollectionExpression(element);
            if (value && ts.isArrayLiteralExpression(value)) {
                const nested = denseStaticArrayElements(value);
                if (!nested) return null;
                const flattened = flattenStaticArrayDepth(nested, depth - 1);
                if (!flattened) return null;
                out.push(...flattened);
            } else {
                out.push(element);
            }
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        }
        return out;
    };

    const denseStaticArrayElements = (array: ts.ArrayLiteralExpression): ts.Expression[] | null => {
        const elements: ts.Expression[] = [];
        for (const element of array.elements) {
            if (ts.isSpreadElement(element) || element.kind === ts.SyntaxKind.OmittedExpression) return null;
            elements.push(element);
        }
        return elements;
    };

    const resolveStaticDefaultSortText = (expr: ts.Expression): string[] => {
        const direct = resolve(expr);
        if (direct.length > 0) return direct;
        const collection = resolveCollectionExpression(expr);
        if (!collection || !ts.isArrayLiteralExpression(collection)) return [];
        const elements = denseStaticArrayElements(collection);
        if (!elements) return [];
        const parts: string[][] = [];
        for (const element of elements) {
            if (isStaticUndefinedExpression(element) || element.kind === ts.SyntaxKind.NullKeyword) {
                parts.push([""]);
                continue;
            }
            const values = resolve(element);
            if (values.length === 0) return [];
            parts.push(values);
        }
        let out = [""];
        for (let index = 0; index < parts.length; index++) {
            const next: string[] = [];
            for (const prefix of out) {
                for (const value of parts[index]!) {
                    next.push(index === 0 ? value : `${prefix},${value}`);
                    if (next.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
            out = dedupe(next);
        }
        return out;
    };

    const normalizeStaticArraySliceIndex = (index: number, length: number): number => {
        return index < 0
            ? Math.max(length + index, 0)
            : Math.min(index, length);
    };

    const resolveStaticArrayOfCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.some(ts.isSpreadElement) || call.arguments.length > MAX_STATIC_STRING_ALTERNATIVES) {
            return null;
        }
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "of") return null;
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Array") return null;
        return ts.factory.createArrayLiteralExpression([...call.arguments]);
    };

    const resolveStaticArrayFromCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "from") return null;
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Array") return null;
        return resolveStaticArrayFromSource(call.arguments[0]!);
    };

    const resolveStaticArrayFromSource = (expr: ts.Expression): ts.ArrayLiteralExpression | null => {
        const source = resolveCollectionExpression(expr);
        if (source && ts.isArrayLiteralExpression(source)) {
            const elements: ts.Expression[] = [];
            for (const element of source.elements) {
                if (ts.isSpreadElement(element) || element.kind === ts.SyntaxKind.OmittedExpression) return null;
                elements.push(element);
            }
            return ts.factory.createArrayLiteralExpression(elements);
        }
        if (source && (ts.isStringLiteral(source) || ts.isNoSubstitutionTemplateLiteral(source))) {
            return ts.factory.createArrayLiteralExpression(
                Array.from(source.text).map((char) => ts.factory.createStringLiteral(char)),
            );
        }

        const urlSearchParamsValues = resolveStaticUrlSearchParamsSourceTexts(expr);
        if (urlSearchParamsValues.length === 1) {
            return staticUrlSearchParamsEntries(urlSearchParamsValues[0]!);
        }

        const ctor = unwrapStaticExpression(expr);
        if (!ts.isNewExpression(ctor)) return null;
        const ctorExpr = unwrapStaticExpression(ctor.expression);
        if (!ts.isIdentifier(ctorExpr)) return null;
        if ((ctor.arguments?.length ?? 0) > 1 || ctor.arguments?.some(ts.isSpreadElement)) return null;
        const arg = ctor.arguments?.[0];
        if (ctorExpr.text === "Set") return resolveStaticArrayFromSetSource(arg);
        if (ctorExpr.text === "Map") return resolveStaticArrayFromMapSource(arg);
        if (ctorExpr.text === "URLSearchParams") return resolveStaticArrayFromUrlSearchParamsSource(arg);
        return null;
    };

    const resolveStaticArrayFromSetSource = (expr: ts.Expression | undefined): ts.ArrayLiteralExpression | null => {
        if (!expr || isStaticNullishCollectionSource(expr)) return ts.factory.createArrayLiteralExpression([]);
        const source = resolveCollectionExpression(expr);
        let elements: ts.NodeArray<ts.Expression>;
        if (source && ts.isArrayLiteralExpression(source)) {
            elements = source.elements;
        } else if (source && (ts.isStringLiteral(source) || ts.isNoSubstitutionTemplateLiteral(source))) {
            return ts.factory.createArrayLiteralExpression(
                Array.from(new Set(Array.from(source.text))).map((char) => ts.factory.createStringLiteral(char)),
            );
        } else {
            return null;
        }

        const seenValues = new Set<string>();
        const out: ts.Expression[] = [];
        for (const element of elements) {
            if (ts.isSpreadElement(element) || element.kind === ts.SyntaxKind.OmittedExpression) return null;
            const values = resolve(element);
            if (values.length !== 1) return null;
            const value = values[0]!;
            if (seenValues.has(value)) continue;
            seenValues.add(value);
            out.push(element);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        }
        return ts.factory.createArrayLiteralExpression(out);
    };

    const resolveStaticArrayFromMapSource = (expr: ts.Expression | undefined): ts.ArrayLiteralExpression | null => {
        if (!expr || isStaticNullishCollectionSource(expr)) return ts.factory.createArrayLiteralExpression([]);
        const entries = resolveStaticEntryCollectionExpression(expr);
        if (!entries) return null;

        const order: string[] = [];
        const slots = new Map<string, ts.ArrayLiteralExpression>();
        for (const element of entries.elements) {
            if (ts.isSpreadElement(element)) return null;
            const entry = resolveCollectionExpression(element);
            if (!entry || !ts.isArrayLiteralExpression(entry) || entry.elements.length < 2) return null;
            const keyExpr = entry.elements[0];
            const valueExpr = entry.elements[1];
            if (!keyExpr || !valueExpr || ts.isSpreadElement(keyExpr) || ts.isSpreadElement(valueExpr)) return null;
            const keyValues = resolve(keyExpr);
            if (keyValues.length !== 1) return null;
            const key = keyValues[0]!;
            if (!slots.has(key)) order.push(key);
            slots.set(key, ts.factory.createArrayLiteralExpression([keyExpr, valueExpr]));
            if (order.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        }
        return ts.factory.createArrayLiteralExpression(order.map((key) => slots.get(key)!));
    };

    const resolveStaticMapSetCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (
            method !== "has" &&
            method !== "get" &&
            method !== "isSubsetOf" &&
            method !== "isSupersetOf" &&
            method !== "isDisjointFrom"
        ) {
            return [];
        }

        const receiver = unwrapStaticExpression(callee.expression);
        if (!ts.isNewExpression(receiver)) return [];
        const ctor = unwrapStaticExpression(receiver.expression);
        if (!ts.isIdentifier(ctor)) return [];
        if ((receiver.arguments?.length ?? 0) > 1 || receiver.arguments?.some(ts.isSpreadElement)) return [];

        const source = receiver.arguments?.[0];
        if (ctor.text === "Set" && method !== "get") {
            if (call.arguments.length !== 1) return [];
            const elements = resolveStaticArrayFromSetSource(source);
            if (!elements) return [];
            const values = new Set<string>();
            for (const element of elements.elements) {
                if (ts.isSpreadElement(element) || element.kind === ts.SyntaxKind.OmittedExpression) return [];
                const elementValues = resolve(element);
                if (elementValues.length !== 1) return [];
                values.add(elementValues[0]!);
            }
            if (method !== "has") {
                const other = resolveStaticArrayFromSource(call.arguments[0]!);
                if (!other) return [];
                const otherElements = denseStaticArrayElements(other);
                if (!otherElements) return [];
                const otherValues = new Set<string>();
                for (const element of otherElements) {
                    const elementValues = resolve(element);
                    if (elementValues.length !== 1) return [];
                    otherValues.add(elementValues[0]!);
                }
                if (method === "isSubsetOf") {
                    return [String([...values].every((value) => otherValues.has(value)))];
                }
                if (method === "isSupersetOf") {
                    return [String([...otherValues].every((value) => values.has(value)))];
                }
                return [String([...values].every((value) => !otherValues.has(value)))];
            }
            const keyValues = resolve(call.arguments[0]!);
            if (keyValues.length === 0) return [];
            return dedupe(keyValues.map((key) => String(values.has(key))));
        }

        if (ctor.text !== "Map") return [];
        const keyValues = call.arguments.length === 1 ? resolve(call.arguments[0]!) : [];
        if (keyValues.length === 0) return [];
        const entries = resolveStaticArrayFromMapSource(source);
        if (!entries) return [];
        const slots = new Map<string, ts.Expression>();
        for (const element of entries.elements) {
            if (ts.isSpreadElement(element)) return [];
            const entry = resolveCollectionExpression(element);
            if (!entry || !ts.isArrayLiteralExpression(entry) || entry.elements.length < 2) return [];
            const keyExpr = entry.elements[0];
            const valueExpr = entry.elements[1];
            if (!keyExpr || !valueExpr || ts.isSpreadElement(keyExpr) || ts.isSpreadElement(valueExpr)) return [];
            const entryKeyValues = resolve(keyExpr);
            if (entryKeyValues.length !== 1) return [];
            slots.set(entryKeyValues[0]!, valueExpr);
            if (slots.size > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }

        if (method === "has") {
            return dedupe(keyValues.map((key) => String(slots.has(key))));
        }
        const out: string[] = [];
        for (const key of keyValues) {
            const valueExpr = slots.get(key);
            if (!valueExpr) {
                out.push("undefined");
                continue;
            }
            const values = resolve(valueExpr);
            if (values.length === 0) return [];
            out.push(...values);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupe(out);
    };

    const resolveStaticMapSetCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length !== 0 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return null;
        const method = callee.name.text;
        if (method !== "keys" && method !== "values" && method !== "entries") return null;

        const receiver = unwrapStaticExpression(callee.expression);
        if (!ts.isNewExpression(receiver)) return null;
        const ctor = unwrapStaticExpression(receiver.expression);
        if (!ts.isIdentifier(ctor)) return null;
        if ((receiver.arguments?.length ?? 0) > 1 || receiver.arguments?.some(ts.isSpreadElement)) return null;
        const source = receiver.arguments?.[0];

        if (ctor.text === "Set") {
            const values = resolveStaticArrayFromSetSource(source);
            if (!values) return null;
            if (method === "entries") {
                const elements = denseStaticArrayElements(values);
                if (!elements) return null;
                return ts.factory.createArrayLiteralExpression(elements.map((element) => {
                    return ts.factory.createArrayLiteralExpression([element, element]);
                }));
            }
            return values;
        }

        if (ctor.text !== "Map") return null;
        const entries = resolveStaticArrayFromMapSource(source);
        if (!entries) return null;
        if (method === "entries") return entries;

        const out: ts.Expression[] = [];
        for (const element of entries.elements) {
            if (ts.isSpreadElement(element)) return null;
            const entry = resolveCollectionExpression(element);
            if (!entry || !ts.isArrayLiteralExpression(entry) || entry.elements.length < 2) return null;
            const keyExpr = entry.elements[0];
            const valueExpr = entry.elements[1];
            if (!keyExpr || !valueExpr || ts.isSpreadElement(keyExpr) || ts.isSpreadElement(valueExpr)) return null;
            out.push(method === "keys" ? keyExpr : valueExpr);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        }
        return ts.factory.createArrayLiteralExpression(out);
    };

    const resolveStaticSetCompositionCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return null;
        const method = callee.name.text;
        if (
            method !== "union" &&
            method !== "intersection" &&
            method !== "difference" &&
            method !== "symmetricDifference"
        ) {
            return null;
        }

        const left = resolveStaticArrayFromSource(callee.expression);
        const right = resolveStaticArrayFromSource(call.arguments[0]!);
        if (!left || !right) return null;

        const leftElements = denseStaticArrayElements(left);
        const rightElements = denseStaticArrayElements(right);
        if (!leftElements || !rightElements) return null;

        const leftKeys = new Map<string, ts.Expression>();
        for (const element of leftElements) {
            const values = resolve(element);
            if (values.length !== 1) return null;
            leftKeys.set(values[0]!, element);
        }

        const rightKeys = new Map<string, ts.Expression>();
        for (const element of rightElements) {
            const values = resolve(element);
            if (values.length !== 1) return null;
            rightKeys.set(values[0]!, element);
        }

        const out: ts.Expression[] = [];
        const pushIf = (value: ts.Expression, condition: boolean): boolean => {
            if (!condition) return true;
            out.push(value);
            return out.length <= MAX_STATIC_STRING_ALTERNATIVES;
        };

        for (const [key, value] of leftKeys) {
            const keep = method === "union"
                ? true
                : method === "intersection"
                    ? rightKeys.has(key)
                    : !rightKeys.has(key);
            if (!pushIf(value, keep)) return null;
        }
        if (method === "union" || method === "symmetricDifference") {
            for (const [key, value] of rightKeys) {
                if (!pushIf(value, !leftKeys.has(key))) return null;
            }
        }
        return ts.factory.createArrayLiteralExpression(out);
    };

    const resolveStaticMapSetSizeAccess = (expr: ts.PropertyAccessExpression): string[] => {
        if (expr.name.text !== "size") return [];
        const receiver = unwrapStaticExpression(expr.expression);
        if (!ts.isNewExpression(receiver)) return [];
        const ctor = unwrapStaticExpression(receiver.expression);
        if (!ts.isIdentifier(ctor)) return [];
        if ((receiver.arguments?.length ?? 0) > 1 || receiver.arguments?.some(ts.isSpreadElement)) return [];

        const source = receiver.arguments?.[0];
        if (ctor.text === "Set") {
            const elements = resolveStaticArrayFromSetSource(source);
            return elements ? [String(elements.elements.length)] : [];
        }
        if (ctor.text === "Map") {
            const entries = resolveStaticArrayFromMapSource(source);
            return entries ? [String(entries.elements.length)] : [];
        }
        return [];
    };

    const resolveStaticObjectWrapperReceiver = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return null;
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object") return null;
        const method = callee.name.text;
        if (method === "freeze" || method === "seal" || method === "preventExtensions") {
            return call.arguments.length === 1 ? call.arguments[0]! : null;
        }
        if (method === "setPrototypeOf") {
            return call.arguments.length === 2 ? call.arguments[0]! : null;
        }
        return null;
    };

    const resolveStaticObjectDescriptorBuiltCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return null;
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object") return null;

        switch (callee.name.text) {
            case "create": {
                if (call.arguments.length !== 2) return null;
                const proto = unwrapStaticExpression(call.arguments[0]!);
                if (proto.kind !== ts.SyntaxKind.NullKeyword) return null;
                return resolveStaticDataDescriptorMapCollection(call.arguments[1]!);
            }
            case "defineProperty": {
                if (call.arguments.length !== 3) return null;
                const object = resolveCollectionExpression(call.arguments[0]!);
                if (!object || !ts.isObjectLiteralExpression(object)) return null;
                const keys = resolveKeyTexts(call.arguments[1]!);
                if (keys.length !== 1) return null;
                const value = resolveStaticOrdinaryDataDescriptorValue(call.arguments[2]!);
                if (!value) return null;
                return withStaticObjectProperty(object, keys[0]!, value);
            }
            case "defineProperties": {
                if (call.arguments.length !== 2) return null;
                const object = resolveCollectionExpression(call.arguments[0]!);
                if (!object || !ts.isObjectLiteralExpression(object)) return null;
                const descriptorValues = resolveStaticDataDescriptorMapProperties(call.arguments[1]!);
                if (!descriptorValues) return null;
                let out = object;
                for (const [key, value] of descriptorValues) {
                    const next = withStaticObjectProperty(out, key, value);
                    if (!next) return null;
                    out = next;
                }
                return out;
            }
            default:
                return null;
        }
    };

    const resolveStaticDataDescriptorMapCollection = (expr: ts.Expression): ts.ObjectLiteralExpression | null => {
        const descriptorValues = resolveStaticDataDescriptorMapProperties(expr);
        if (!descriptorValues) return null;
        return ts.factory.createObjectLiteralExpression(
            descriptorValues.map(([key, value]) => ts.factory.createPropertyAssignment(
                ts.factory.createStringLiteral(key),
                value,
            )),
        );
    };

    const resolveStaticDataDescriptorMapProperties = (expr: ts.Expression): [string, ts.Expression][] | null => {
        const descriptors = resolveCollectionExpression(expr);
        if (!descriptors || !ts.isObjectLiteralExpression(descriptors)) return null;
        const out: [string, ts.Expression][] = [];
        for (const prop of descriptors.properties) {
            if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) return null;
            const key = staticPropertyName(prop.name);
            if (key === null) return null;
            const descriptorExpr = ts.isPropertyAssignment(prop) ? prop.initializer : prop.name;
            const value = resolveStaticOrdinaryDataDescriptorValue(descriptorExpr);
            if (!value) return null;
            out.push([key, value]);
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        }
        return out;
    };

    const resolveStaticOrdinaryDataDescriptorValue = (expr: ts.Expression): ts.Expression | null => {
        const descriptor = resolveCollectionExpression(expr);
        if (!descriptor || !ts.isObjectLiteralExpression(descriptor)) return null;
        let value: ts.Expression | null = null;
        let writable = false;
        let enumerable = false;
        let configurable = false;
        for (const prop of descriptor.properties) {
            if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) return null;
            const key = staticPropertyName(prop.name);
            if (key === null) return null;
            const propValue = ts.isPropertyAssignment(prop) ? prop.initializer : prop.name;
            switch (key) {
                case "value":
                    value = propValue;
                    break;
                case "writable":
                    writable = isStaticTrueExpression(propValue);
                    break;
                case "enumerable":
                    enumerable = isStaticTrueExpression(propValue);
                    break;
                case "configurable":
                    configurable = isStaticTrueExpression(propValue);
                    break;
                default:
                    return null;
            }
        }
        return value && writable && enumerable && configurable ? value : null;
    };

    const withStaticObjectProperty = (
        object: ts.ObjectLiteralExpression,
        key: string,
        value: ts.Expression,
    ): ts.ObjectLiteralExpression | null => {
        const properties: ts.PropertyAssignment[] = [];
        let replaced = false;
        for (const prop of object.properties) {
            if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) return null;
            const propName = staticPropertyName(prop.name);
            if (propName === null) return null;
            if (propName === key) {
                properties.push(ts.factory.createPropertyAssignment(ts.factory.createStringLiteral(key), value));
                replaced = true;
            } else {
                properties.push(ts.factory.createPropertyAssignment(
                    ts.factory.createStringLiteral(propName),
                    ts.isPropertyAssignment(prop) ? prop.initializer : prop.name,
                ));
            }
        }
        if (!replaced) {
            properties.push(ts.factory.createPropertyAssignment(ts.factory.createStringLiteral(key), value));
        }
        return ts.factory.createObjectLiteralExpression(properties);
    };

    const isStaticTrueExpression = (expr: ts.Expression): boolean => {
        const values = resolveStaticBooleanValues(expr);
        return values.length === 1 && values[0] === true;
    };

    const resolveStaticObjectAssignCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length < 1 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "assign") return null;
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object") return null;

        const slots = new Map<string, ts.Expression>();
        const order: string[] = [];
        for (const arg of call.arguments) {
            if (isStaticNullishCollectionSource(arg)) {
                if (arg === call.arguments[0]) return null;
                continue;
            }
            const object = resolveCollectionExpression(arg);
            if (!object || !ts.isObjectLiteralExpression(object)) return null;
            for (const prop of object.properties) {
                if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) return null;
                const key = staticPropertyName(prop.name);
                if (key === null) return null;
                if (!slots.has(key)) order.push(key);
                slots.set(key, ts.isPropertyAssignment(prop) ? prop.initializer : prop.name);
                if (order.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
            }
        }
        return ts.factory.createObjectLiteralExpression(
            order.map((key) => ts.factory.createPropertyAssignment(
                ts.factory.createStringLiteral(key),
                slots.get(key)!,
            )),
        );
    };

    const isStaticNullishCollectionSource = (expr: ts.Expression): boolean => {
        const cur = unwrapStaticExpression(expr);
        return cur.kind === ts.SyntaxKind.NullKeyword || isStaticUndefinedExpression(cur);
    };

    const resolveStaticObjectFromEntriesCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "fromEntries") return null;
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object") return null;

        const entries = resolveStaticEntryCollectionExpression(call.arguments[0]!);
        if (!entries) return null;
        const properties: ts.PropertyAssignment[] = [];
        for (const element of entries.elements) {
            if (ts.isSpreadElement(element)) return null;
            const entry = resolveCollectionExpression(element);
            if (!entry || !ts.isArrayLiteralExpression(entry) || entry.elements.length < 2) return null;
            const keyExpr = entry.elements[0];
            const valueExpr = entry.elements[1];
            if (!keyExpr || !valueExpr || ts.isSpreadElement(keyExpr) || ts.isSpreadElement(valueExpr)) return null;
            const keys = resolveKeyTexts(keyExpr);
            if (keys.length !== 1) return null;
            properties.push(ts.factory.createPropertyAssignment(ts.factory.createStringLiteral(keys[0]!), valueExpr));
            if (properties.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        }
        return ts.factory.createObjectLiteralExpression(properties);
    };

    const resolveStaticObjectGroupByCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length !== 2 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "groupBy") return null;
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object") return null;

        const values = resolveStaticArrayFromSource(call.arguments[0]!);
        if (!values) return null;
        const elements = denseStaticArrayElements(values);
        if (!elements) return null;

        const order: string[] = [];
        const groups = new Map<string, ts.Expression[]>();
        for (let index = 0; index < elements.length; index++) {
            const keyExpr = substituteStaticArrayCallback(call.arguments[1]!, elements[index]!, index);
            if (!keyExpr) return null;
            const keys = resolve(keyExpr);
            if (keys.length !== 1) return null;
            const key = keys[0]!;
            if (!groups.has(key)) {
                order.push(key);
                groups.set(key, []);
            }
            groups.get(key)!.push(elements[index]!);
            if (order.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        }

        return ts.factory.createObjectLiteralExpression(order.map((key) => {
            return ts.factory.createPropertyAssignment(
                ts.factory.createStringLiteral(key),
                ts.factory.createArrayLiteralExpression(groups.get(key)!),
            );
        }));
    };

    const resolveStaticMapGroupByCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length !== 2 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "groupBy") return null;
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Map") return null;

        const values = resolveStaticArrayFromSource(call.arguments[0]!);
        if (!values) return null;
        const elements = denseStaticArrayElements(values);
        if (!elements) return null;

        const order: string[] = [];
        const groups = new Map<string, ts.Expression[]>();
        for (let index = 0; index < elements.length; index++) {
            const keyExpr = substituteStaticArrayCallback(call.arguments[1]!, elements[index]!, index);
            if (!keyExpr) return null;
            const keys = resolve(keyExpr);
            if (keys.length !== 1) return null;
            const key = keys[0]!;
            if (!groups.has(key)) {
                order.push(key);
                groups.set(key, []);
            }
            groups.get(key)!.push(elements[index]!);
            if (order.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        }

        return ts.factory.createArrayLiteralExpression(order.map((key) => {
            return ts.factory.createArrayLiteralExpression([
                ts.factory.createStringLiteral(key),
                ts.factory.createArrayLiteralExpression(groups.get(key)!),
            ]);
        }));
    };

    const resolveStaticMapGetCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "get") return null;
        const receiver = unwrapStaticExpression(callee.expression);
        if (!ts.isNewExpression(receiver)) return null;
        const ctor = unwrapStaticExpression(receiver.expression);
        if (!ts.isIdentifier(ctor) || ctor.text !== "Map") return null;
        if ((receiver.arguments?.length ?? 0) > 1 || receiver.arguments?.some(ts.isSpreadElement)) return null;

        const keys = resolve(call.arguments[0]!);
        if (keys.length !== 1) return null;
        const entries = resolveStaticArrayFromMapSource(receiver.arguments?.[0]);
        if (!entries) return null;
        for (const element of entries.elements) {
            if (ts.isSpreadElement(element)) return null;
            const entry = resolveCollectionExpression(element);
            if (!entry || !ts.isArrayLiteralExpression(entry) || entry.elements.length < 2) return null;
            const keyExpr = entry.elements[0];
            const valueExpr = entry.elements[1];
            if (!keyExpr || !valueExpr || ts.isSpreadElement(keyExpr) || ts.isSpreadElement(valueExpr)) return null;
            const entryKeys = resolve(keyExpr);
            if (entryKeys.length !== 1) return null;
            if (entryKeys[0] === keys[0]) return valueExpr;
        }
        return ts.factory.createIdentifier("undefined");
    };

    const resolveStaticEntryCollectionExpression = (expr: ts.Expression): ts.ArrayLiteralExpression | null => {
        const collection = resolveCollectionExpression(expr);
        if (collection && ts.isArrayLiteralExpression(collection)) return collection;

        const urlSearchParamsValues = resolveStaticUrlSearchParamsSourceTexts(expr);
        if (urlSearchParamsValues.length === 1) {
            return staticUrlSearchParamsEntries(urlSearchParamsValues[0]!);
        }

        const source = unwrapStaticExpression(expr);
        if (!ts.isNewExpression(source)) return null;
        const ctor = unwrapStaticExpression(source.expression);
        if (!ts.isIdentifier(ctor)) return null;
        if ((source.arguments?.length ?? 0) > 1 || source.arguments?.some(ts.isSpreadElement)) return null;
        const arg = source.arguments?.[0];
        if (isStaticUrlSearchParamsConstructorExpression(ctor)) return resolveStaticArrayFromUrlSearchParamsSource(arg);
        if (ctor.text !== "Map") return null;
        if (!arg || isStaticUndefinedExpression(arg)) return ts.factory.createArrayLiteralExpression([]);
        const entries = resolveCollectionExpression(arg);
        return entries && ts.isArrayLiteralExpression(entries) ? entries : null;
    };

    const resolveStaticUrlSearchParamsSourceTexts = (expr: ts.Expression | undefined): string[] => {
        if (!expr || isStaticUndefinedExpression(expr)) return [""];
        const source = unwrapStaticExpression(expr);
        if (ts.isNewExpression(source)) {
            const ctor = unwrapStaticExpression(source.expression);
            if (!isStaticUrlSearchParamsConstructorExpression(ctor)) return [];
            if ((source.arguments?.length ?? 0) > 1 || source.arguments?.some(ts.isSpreadElement)) return [];
            const arg = source.arguments?.[0];
            return !arg || isStaticUndefinedExpression(arg) ? [""] : resolve(arg);
        }
        if (ts.isPropertyAccessExpression(source) && source.name.text === "searchParams") {
            const urls = resolveStaticUrlRecords(source.expression);
            if (urls.length === 0) return [];
            return dedupe(urls.map((url) => url.searchParams.toString()));
        }
        return [];
    };

    const staticUrlSearchParamsEntries = (value: string): ts.ArrayLiteralExpression | null => {
        const entries = Array.from(new URLSearchParams(value));
        if (entries.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        return ts.factory.createArrayLiteralExpression(entries.map(([key, entryValue]) => {
            return ts.factory.createArrayLiteralExpression([
                ts.factory.createStringLiteral(key),
                ts.factory.createStringLiteral(entryValue),
            ]);
        }));
    };

    const resolveStaticArrayFromUrlSearchParamsSource = (expr: ts.Expression | undefined): ts.ArrayLiteralExpression | null => {
        const values = resolveStaticUrlSearchParamsSourceTexts(expr);
        if (values.length !== 1) return null;
        return staticUrlSearchParamsEntries(values[0]!);
    };

    const resolveStaticObjectEntriesCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "entries") return null;
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "Object") return null;

        const object = resolveCollectionExpression(call.arguments[0]!);
        if (!object || !ts.isObjectLiteralExpression(object)) return null;
        const entries: ts.ArrayLiteralExpression[] = [];
        for (const prop of object.properties) {
            if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) return null;
            const key = staticPropertyName(prop.name);
            if (key === null) return null;
            const valueExpr = ts.isPropertyAssignment(prop) ? prop.initializer : prop.name;
            entries.push(ts.factory.createArrayLiteralExpression([
                ts.factory.createStringLiteral(key),
                valueExpr,
            ]));
            if (entries.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        }
        return ts.factory.createArrayLiteralExpression(entries);
    };

    const resolveStaticBufferToJsonCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length > 0 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "toJSON") return null;
        const buffers = resolveStaticBufferExpression(callee.expression);
        if (buffers.length !== 1) return null;
        return jsonValueToStaticExpression(buffers[0]!.toJSON());
    };

    const resolveStaticUrlSearchParamsCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return null;
        const method = callee.name.text;
        if (method !== "getAll" && method !== "keys" && method !== "values" && method !== "entries") return null;
        if (
            (method === "getAll" && call.arguments.length !== 1) ||
            (method !== "getAll" && call.arguments.length !== 0) ||
            call.arguments.some(ts.isSpreadElement)
        ) {
            return null;
        }
        const values = resolveStaticUrlSearchParamsSourceTexts(callee.expression);
        if (values.length !== 1) return null;
        const params = new URLSearchParams(values[0]!);
        if (method === "getAll") {
            const names = resolve(call.arguments[0]!);
            if (names.length !== 1) return null;
            return ts.factory.createArrayLiteralExpression(
                params.getAll(names[0]!).map((value) => ts.factory.createStringLiteral(value)),
            );
        }
        if (method === "keys") {
            return ts.factory.createArrayLiteralExpression(
                Array.from(params.keys()).map((key) => ts.factory.createStringLiteral(key)),
            );
        }
        if (method === "values") {
            return ts.factory.createArrayLiteralExpression(
                Array.from(params.values()).map((value) => ts.factory.createStringLiteral(value)),
            );
        }
        return staticUrlSearchParamsEntries(values[0]!);
    };

    const resolveStaticJsonParseCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "parse") return null;
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "JSON") return null;
        const texts = resolve(call.arguments[0]!);
        if (texts.length !== 1) return null;
        try {
            return jsonValueToStaticExpression(JSON.parse(texts[0]!));
        } catch {
            return null;
        }
    };

    const resolveStaticRegExpExecCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "exec") return null;
        const regexps = resolveFreshStaticRegExpRecords(callee.expression);
        if (regexps.length !== 1) return null;
        const inputs = resolve(call.arguments[0]!);
        if (inputs.length !== 1) return null;

        const match = regexps[0]!.exec(inputs[0]!);
        if (!match || match.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        return ts.factory.createArrayLiteralExpression(Array.from(match, (value) => {
            return value === undefined
                ? ts.factory.createIdentifier("undefined")
                : ts.factory.createStringLiteral(value);
        }));
    };

    const resolveStaticStringMatchCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "match") return null;
        const inputs = resolve(callee.expression);
        if (inputs.length !== 1) return null;
        let regexps = resolveFreshStaticRegExpRecords(call.arguments[0]!);
        if (regexps.length === 0) {
            const patterns = resolve(call.arguments[0]!);
            if (patterns.length !== 1) return null;
            try {
                regexps = [new RegExp(patterns[0]!)];
            } catch {
                return null;
            }
        }
        if (regexps.length !== 1) return null;

        const match = inputs[0]!.match(regexps[0]!);
        if (!match || match.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        return ts.factory.createArrayLiteralExpression(Array.from(match, (value) => {
            return value === undefined
                ? ts.factory.createIdentifier("undefined")
                : ts.factory.createStringLiteral(value);
        }));
    };

    const resolveStaticStringMatchAllCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "matchAll") return null;
        const inputs = resolve(callee.expression);
        if (inputs.length !== 1) return null;
        let regexps = resolveFreshStaticRegExpRecords(call.arguments[0]!);
        if (regexps.length === 0) {
            const patterns = resolve(call.arguments[0]!);
            if (patterns.length !== 1) return null;
            try {
                regexps = [new RegExp(patterns[0]!, "g")];
            } catch {
                return null;
            }
        }
        if (regexps.length !== 1 || !regexps[0]!.global) return null;

        const matchAllValue = inputs[0]! as string & {
            matchAll(pattern: RegExp): Iterable<RegExpMatchArray>;
        };
        const matches = Array.from(matchAllValue.matchAll(regexps[0]!));
        if (matches.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        return ts.factory.createArrayLiteralExpression(matches.map((match) => {
            return ts.factory.createArrayLiteralExpression(Array.from(match, (value) => {
                return value === undefined
                    ? ts.factory.createIdentifier("undefined")
                    : ts.factory.createStringLiteral(value);
            }));
        }));
    };

    const resolveStaticStringSplitCollectionExpression = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length > 2 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "split") return null;

        const inputs = resolve(callee.expression);
        if (inputs.length !== 1) return null;

        const separatorArg = call.arguments[0];
        const regexps = separatorArg && !isStaticUndefinedExpression(separatorArg)
            ? resolveFreshStaticRegExpRecords(separatorArg)
            : [];
        const separators: Array<string | RegExp | undefined> = !separatorArg || isStaticUndefinedExpression(separatorArg)
            ? [undefined]
            : regexps.length > 0
                ? regexps
                : resolve(separatorArg);
        if (separators.length !== 1) return null;

        const limitArg = call.arguments[1];
        const limits = !limitArg || isStaticUndefinedExpression(limitArg)
            ? [undefined]
            : resolveStaticIntegerKeys(limitArg);
        if (limits.length !== 1) return null;
        const limit = limits[0];
        if (limit !== undefined && (limit < 0 || !Number.isSafeInteger(limit))) return null;

        const parts: unknown[] = separators[0] === undefined
            ? [inputs[0]!]
            : inputs[0]!.split(separators[0], limit);
        if (parts.length > MAX_STATIC_STRING_ALTERNATIVES) return null;
        const stringParts = parts.filter((part): part is string => typeof part === "string");
        if (stringParts.length !== parts.length) return null;
        return ts.factory.createArrayLiteralExpression(stringParts.map((part) => ts.factory.createStringLiteral(part)));
    };

    const resolveStaticStringRegExpSearchCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "search") return [];
        const inputs = resolve(callee.expression);
        if (inputs.length === 0) return [];
        let regexps = resolveFreshStaticRegExpRecords(call.arguments[0]!);
        if (regexps.length === 0) {
            const patterns = resolve(call.arguments[0]!);
            if (patterns.length === 0) return [];
            try {
                regexps = patterns.map((pattern) => new RegExp(pattern));
            } catch {
                return [];
            }
        }
        if (regexps.length === 0) return [];

        const out: string[] = [];
        for (const input of inputs) {
            for (const regexp of regexps) {
                out.push(String(input.search(regexp)));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticObjectPrototypeValueOfReceiver = (call: ts.CallExpression): ts.Expression | null => {
        if (call.arguments.length < 1 || call.arguments.some(ts.isSpreadElement)) return null;
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "call") return null;
        const methodAccess = unwrapStaticExpression(callee.expression);
        if (!ts.isPropertyAccessExpression(methodAccess) || methodAccess.name.text !== "valueOf") return null;
        const prototypeAccess = unwrapStaticExpression(methodAccess.expression);
        if (!ts.isPropertyAccessExpression(prototypeAccess) || prototypeAccess.name.text !== "prototype") return null;
        const target = unwrapStaticExpression(prototypeAccess.expression);
        return ts.isIdentifier(target) && target.text === "Object" ? call.arguments[0]! : null;
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

    const resolveStaticEnumAccess = (
        enumExpr: ts.Expression,
        keyExpr: ts.Expression | ts.Identifier,
    ): string[] => {
        const target = unwrapStaticExpression(enumExpr);
        if (!ts.isIdentifier(target)) return [];
        const decl = visibleEnumDeclaration(target, enumExpr);
        if (!decl) return [];
        const keys = resolveKeyTexts(keyExpr);
        if (keys.length === 0) return [];
        const members = enumMemberStringValues(decl);
        if (!members) return [];
        const out: string[] = [];
        for (const key of keys) {
            const value = members.get(key);
            if (value === undefined) return [];
            out.push(value);
        }
        return dedupe(out);
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
        if (!ts.isIdentifier(target)) return [];
        const isObjectCall = target.text === "Object";
        const isReflectCall = target.text === "Reflect";
        const method = callee.name.text;
        const returnsKeys =
            (isObjectCall && (method === "keys" || method === "getOwnPropertyNames")) ||
            (isReflectCall && method === "ownKeys");
        const returnsValues = isObjectCall && method === "values";
        if (!returnsKeys && !returnsValues) return [];

        const buffers = resolveStaticBufferExpression(call.arguments[0]!);
        if (buffers.length > 0) {
            const slots: string[][] = [];
            for (const buffer of buffers) {
                for (const key of keys) {
                    if (key < 0 || key >= buffer.length) return [];
                    slots.push([returnsValues ? String(buffer[key]) : String(key)]);
                    if (slots.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
            return dedupe(slots.flat());
        }

        const object = resolveCollectionExpression(call.arguments[0]!);
        if (!object) return [];
        if (ts.isArrayLiteralExpression(object)) {
            const slots: string[][] = [];
            for (let index = 0; index < object.elements.length; index++) {
                const element = object.elements[index];
                if (!element || ts.isSpreadElement(element) || element.kind === ts.SyntaxKind.OmittedExpression) return [];
                if (returnsKeys) {
                    slots.push([String(index)]);
                    continue;
                }
                const values = resolve(element);
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
        }
        if (!ts.isObjectLiteralExpression(object)) return [];

        const slots: string[][] = [];
        for (const prop of object.properties) {
            if (ts.isSpreadAssignment(prop)) return [];
            const propName = prop.name ? staticPropertyName(prop.name) : null;
            if (propName === null) return [];
            if (returnsKeys) {
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

        const buffers = resolveStaticBufferExpression(call.arguments[0]!);
        if (buffers.length > 0) {
            const out: string[] = [];
            const slotIndex = tupleIndices[0]!;
            for (const buffer of buffers) {
                for (const index of entryIndices) {
                    if (index < 0 || index >= buffer.length) return [];
                    out.push(slotIndex === 0 ? String(index) : String(buffer[index]));
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
            return dedupe(out);
        }

        const object = resolveCollectionExpression(call.arguments[0]!);
        if (!object) return [];

        const slotIndex = tupleIndices[0]!;
        if (ts.isArrayLiteralExpression(object)) {
            const slots: string[][] = [];
            for (let index = 0; index < object.elements.length; index++) {
                const element = object.elements[index];
                if (!element || ts.isSpreadElement(element) || element.kind === ts.SyntaxKind.OmittedExpression) return [];
                if (slotIndex === 0) {
                    slots.push([String(index)]);
                    continue;
                }
                const values = resolve(element);
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
        }
        if (!ts.isObjectLiteralExpression(object)) return [];

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

    const resolveStaticUrlSearchParamsCall = (call: ts.CallExpression): string[] => {
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "toString" && method !== "get" && method !== "has") return [];
        if (
            (method === "toString" && call.arguments.length !== 0) ||
            (method === "get" && call.arguments.length !== 1) ||
            (method === "has" && (call.arguments.length < 1 || call.arguments.length > 2)) ||
            call.arguments.some(ts.isSpreadElement)
        ) {
            return [];
        }
        const values = resolveStaticUrlSearchParamsSourceTexts(callee.expression);
        if (values.length === 0) return [];
        const out: string[] = [];
        for (const value of values) {
            const params = new URLSearchParams(value);
            if (method === "toString") {
                out.push(params.toString());
                continue;
            }
            const names = resolve(call.arguments[0]!);
            if (names.length === 0) return [];
            if (method === "get") {
                for (const name of names) {
                    out.push(params.get(name) ?? "null");
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
                continue;
            }
            const expectedValues = call.arguments.length === 2
                ? resolve(call.arguments[1]!)
                : [undefined];
            if (expectedValues.length === 0) return [];
            for (const name of names) {
                for (const expectedValue of expectedValues) {
                    out.push(String(expectedValue === undefined
                        ? params.has(name)
                        : params.has(name, expectedValue)));
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
            if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
        }
        return dedupe(out);
    };

    const resolveStaticUrlSearchParamsSizeAccess = (expr: ts.PropertyAccessExpression): string[] => {
        if (expr.name.text !== "size") return [];
        const values = resolveStaticUrlSearchParamsSourceTexts(expr.expression);
        if (values.length === 0) return [];
        return dedupe(values.map((value) => String(new URLSearchParams(value).size)));
    };

    const resolveStaticJsonStringifyCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "stringify") return [];
        const target = unwrapStaticExpression(callee.expression);
        if (!ts.isIdentifier(target) || target.text !== "JSON") return [];
        const values = resolveStaticJsonStringifyValues(call.arguments[0]!);
        return values.length === 0 ? [] : dedupe(values);
    };

    const resolveStaticJsonStringifyValues = (expr: ts.Expression): string[] => {
        const value = resolveCollectionExpression(expr);
        if (!value) return [];
        if (value.kind === ts.SyntaxKind.NullKeyword) return ["null"];
        if (value.kind === ts.SyntaxKind.TrueKeyword) return ["true"];
        if (value.kind === ts.SyntaxKind.FalseKeyword) return ["false"];
        if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
            return [JSON.stringify(value.text)];
        }
        if (ts.isNumericLiteral(value)) {
            const num = Number(value.text);
            return Number.isFinite(num) ? [JSON.stringify(num)] : [];
        }
        if (
            ts.isPrefixUnaryExpression(value) &&
            value.operator === ts.SyntaxKind.MinusToken &&
            ts.isNumericLiteral(value.operand)
        ) {
            const num = -Number(value.operand.text);
            return Number.isFinite(num) ? [JSON.stringify(num)] : [];
        }
        if (
            value.kind === ts.SyntaxKind.UndefinedKeyword ||
            (ts.isIdentifier(value) && value.text === "undefined") ||
            ts.isVoidExpression(value) ||
            ts.isBigIntLiteral(value)
        ) {
            return [];
        }
        if (ts.isArrayLiteralExpression(value)) {
            let arrays = [""];
            for (const element of value.elements) {
                if (ts.isSpreadElement(element)) return [];
                const elementValues = element.kind === ts.SyntaxKind.OmittedExpression ||
                    isStaticUndefinedExpression(element)
                    ? ["null"]
                    : resolveStaticJsonStringifyValues(element);
                if (elementValues.length === 0) return [];
                const next: string[] = [];
                for (const prefix of arrays) {
                    for (const elementValue of elementValues) {
                        next.push(prefix === "" ? elementValue : `${prefix},${elementValue}`);
                        if (next.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                    }
                }
                arrays = dedupe(next);
            }
            return dedupe(arrays.map((body) => `[${body}]`));
        }
        if (ts.isObjectLiteralExpression(value)) {
            let objects = [""];
            for (const prop of value.properties) {
                if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) return [];
                const key = staticPropertyName(prop.name);
                if (key === null) return [];
                const valueExpr = ts.isPropertyAssignment(prop) ? prop.initializer : prop.name;
                if (isStaticUndefinedExpression(valueExpr)) continue;
                const propValues = resolveStaticJsonStringifyValues(valueExpr);
                if (propValues.length === 0) return [];
                const keyText = JSON.stringify(key);
                const next: string[] = [];
                for (const prefix of objects) {
                    for (const propValue of propValues) {
                        const entry = `${keyText}:${propValue}`;
                        next.push(prefix === "" ? entry : `${prefix},${entry}`);
                        if (next.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                    }
                }
                objects = dedupe(next);
            }
            return dedupe(objects.map((body) => `{${body}}`));
        }
        return [];
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

    const resolveStaticStringIndexCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "charAt" && method !== "at") return [];
        const values = resolve(callee.expression);
        const indices = resolveStaticIntegerKeys(call.arguments[0]!);
        if (values.length === 0 || indices.length === 0) return [];

        const out: string[] = [];
        for (const value of values) {
            for (const index of indices) {
                if (method === "at" && (index < -value.length || index >= value.length)) return [];
                out.push(method === "charAt" ? value.charAt(index) : value.at(index)!);
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticStringCodeCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "charCodeAt" && method !== "codePointAt") return [];
        const values = resolve(callee.expression);
        const indices = resolveStaticIntegerKeys(call.arguments[0]!);
        if (values.length === 0 || indices.length === 0) return [];

        const out: string[] = [];
        for (const value of values) {
            for (const index of indices) {
                if (index < 0 || index >= value.length) return [];
                const code = method === "charCodeAt"
                    ? value.charCodeAt(index)
                    : value.codePointAt(index);
                if (code === undefined || !Number.isFinite(code)) return [];
                out.push(String(code));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticStringSearchCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 1 || call.arguments.length > 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (
            method !== "indexOf" &&
            method !== "lastIndexOf" &&
            method !== "includes" &&
            method !== "startsWith" &&
            method !== "endsWith"
        ) {
            return [];
        }
        const values = resolve(callee.expression);
        const needles = resolve(call.arguments[0]!);
        const positions = call.arguments.length === 1 || isStaticUndefinedExpression(call.arguments[1]!)
            ? [undefined]
            : resolveStaticIntegerKeys(call.arguments[1]!);
        if (values.length === 0 || needles.length === 0 || positions.length === 0) return [];

        const out: string[] = [];
        for (const value of values) {
            for (const needle of needles) {
                for (const position of positions) {
                    let result: number | boolean;
                    if (method === "indexOf") {
                        result = value.indexOf(needle, position);
                    } else if (method === "lastIndexOf") {
                        result = value.lastIndexOf(needle, position);
                    } else if (method === "includes") {
                        result = value.includes(needle, position);
                    } else if (method === "startsWith") {
                        result = value.startsWith(needle, position);
                    } else {
                        result = value.endsWith(needle, position);
                    }
                    out.push(String(result));
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
        }
        return dedupe(out);
    };

    const resolveStaticStringLocaleCompareCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "localeCompare") return [];
        const values = resolve(callee.expression);
        const others = resolve(call.arguments[0]!);
        if (values.length === 0 || others.length === 0) return [];

        const out: string[] = [];
        for (const value of values) {
            for (const other of others) {
                const comparison = Buffer.compare(Buffer.from(value, "utf8"), Buffer.from(other, "utf8"));
                out.push(String(comparison < 0 ? -1 : comparison > 0 ? 1 : 0));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticStringIdentityCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 0) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "toString" && method !== "toLocaleString" && method !== "valueOf") return [];
        return resolve(callee.expression);
    };

    const resolveStaticStringLengthAccess = (access: ts.PropertyAccessExpression): string[] => {
        if (access.name.text !== "length") return [];
        const values = resolve(access.expression);
        if (values.length === 0) return [];
        return dedupe(values.map((value) => String(value.length)));
    };

    const resolveStaticStringElementAccess = (expr: ts.ElementAccessExpression): string[] => {
        if (!expr.argumentExpression) return [];
        const values = resolve(expr.expression);
        const keys = resolveStaticNumericKeys(expr.argumentExpression);
        if (values.length === 0 || keys.length === 0) return [];

        const out: string[] = [];
        for (const value of values) {
            for (const key of keys) {
                const char = value[key];
                if (char === undefined) return [];
                out.push(char);
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticStringConcatCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "concat") return [];
        let out = resolve(callee.expression);
        if (out.length === 0) return [];
        for (const argument of call.arguments) {
            const values = resolve(argument);
            if (values.length === 0) return [];
            out = concat(out, values);
            if (out.length === 0) return [];
        }
        return out;
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

    const resolveStaticStringNormalizeCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length > 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "normalize") return [];
        const values = resolve(callee.expression);
        if (values.length === 0) return [];
        const formArg = call.arguments[0];
        const forms = !formArg || isStaticUndefinedExpression(formArg)
            ? ["NFC"]
            : resolve(formArg);
        if (forms.length === 0 || forms.some((form) => !["NFC", "NFD", "NFKC", "NFKD"].includes(form))) {
            return [];
        }
        const out: string[] = [];
        for (const value of values) {
            for (const form of forms) {
                out.push(value.normalize(form));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticStringWellFormedCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 0) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "isWellFormed" && method !== "toWellFormed") return [];
        const values = resolve(callee.expression);
        if (values.length === 0) return [];
        return dedupe(values.map((value) => {
            const wellFormedValue = value as string & {
                isWellFormed(): boolean;
                toWellFormed(): string;
            };
            return method === "isWellFormed"
                ? String(wellFormedValue.isWellFormed())
                : wellFormedValue.toWellFormed();
        }));
    };

    const resolveStaticStringRepeatCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 1 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "repeat") return [];
        const values = resolve(callee.expression);
        const counts = resolveStaticIntegerKeys(call.arguments[0]!);
        if (values.length === 0 || counts.length === 0) return [];
        if (counts.some((count) => count < 0 || count > 256)) return [];
        const out: string[] = [];
        for (const value of values) {
            for (const count of counts) {
                if (value.length * count > 4096) return [];
                out.push(value.repeat(count));
                if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
            }
        }
        return dedupe(out);
    };

    const resolveStaticStringPadCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length < 1 || call.arguments.length > 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "padStart" && method !== "padEnd") return [];
        const values = resolve(callee.expression);
        const lengths = resolveStaticIntegerKeys(call.arguments[0]!);
        const fills = call.arguments.length === 1 ? [" "] : resolve(call.arguments[1]!);
        if (values.length === 0 || lengths.length === 0 || fills.length === 0) return [];
        if (lengths.some((length) => length < 0 || length > 4096)) return [];
        const out: string[] = [];
        for (const value of values) {
            for (const length of lengths) {
                for (const fill of fills) {
                    const padded = method === "padStart"
                        ? value.padStart(length, fill)
                        : value.padEnd(length, fill);
                    if (padded.length > 4096) return [];
                    out.push(padded);
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
        }
        return dedupe(out);
    };

    const resolveStaticStringRangeCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length > 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "slice" && method !== "substring" && method !== "substr") return [];
        const values = resolve(callee.expression);
        if (values.length === 0) return [];

        const startArg = call.arguments[0];
        const endArg = call.arguments[1];
        const starts = !startArg || isStaticUndefinedExpression(startArg)
            ? [undefined]
            : resolveStaticIntegerKeys(startArg);
        if (starts.length === 0) return [];
        const ends = !endArg || isStaticUndefinedExpression(endArg)
            ? [undefined]
            : resolveStaticIntegerKeys(endArg);
        if (ends.length === 0) return [];

        const out: string[] = [];
        for (const value of values) {
            for (const start of starts) {
                for (const end of ends) {
                    if (method === "slice") {
                        out.push(value.slice(start, end));
                    } else if (method === "substring") {
                        out.push(value.substring(start ?? 0, end));
                    } else {
                        out.push(value.substr(start ?? 0, end));
                    }
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
        }
        return dedupe(out);
    };

    const resolveStaticStringReplaceCall = (call: ts.CallExpression): string[] => {
        if (call.arguments.length !== 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee)) return [];
        const method = callee.name.text;
        if (method !== "replace" && method !== "replaceAll") return [];
        const values = resolve(callee.expression);
        if (values.length === 0) return [];

        const replacementArgument = unwrapStaticExpression(call.arguments[1]!);
        const replacementCallbackText = staticStringReplacementCallbackText(replacementArgument);
        const replacementCallback = replacementCallbackText !== null ||
            ts.isArrowFunction(replacementArgument) ||
            ts.isFunctionExpression(replacementArgument);
        if (replacementCallback && replacementCallbackText === null) return [];
        const replacementValues = replacementCallback
            ? [replacementCallbackText!]
            : resolve(call.arguments[1]!);
        if (replacementValues.length === 0) return [];
        const replaceValue = (value: string, search: string | RegExp, replacement: string): string => {
            if (replacementCallback) {
                return method === "replace"
                    ? value.replace(search, () => replacement)
                    : value.replaceAll(search, () => replacement);
            }
            return method === "replace"
                ? value.replace(search, replacement)
                : value.replaceAll(search, replacement);
        };

        const out: string[] = [];
        const regexps = resolveFreshStaticRegExpRecords(call.arguments[0]!);
        if (regexps.length > 0) {
            for (const value of values) {
                for (const regexp of regexps) {
                    for (const replacement of replacementValues) {
                        try {
                            out.push(replaceValue(value, regexp, replacement));
                        } catch {
                            return [];
                        }
                        if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                    }
                }
            }
            return dedupe(out);
        }

        const searchValues = resolve(call.arguments[0]!);
        if (searchValues.length === 0) return [];
        for (const value of values) {
            for (const search of searchValues) {
                for (const replacement of replacementValues) {
                    out.push(replaceValue(value, search, replacement));
                    if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                }
            }
        }
        return dedupe(out);
    };

    const resolveStaticStringSplitAccess = (expr: ts.ElementAccessExpression): string[] => {
        if (!expr.argumentExpression) return [];
        const keys = resolveStaticNumericKeys(expr.argumentExpression);
        if (keys.length === 0) return [];

        const call = unwrapStaticExpression(expr.expression);
        if (!ts.isCallExpression(call) || call.arguments.length > 2 || call.arguments.some(ts.isSpreadElement)) return [];
        const callee = unwrapStaticExpression(call.expression);
        if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "split") return [];

        const values = resolve(callee.expression);
        if (values.length === 0) return [];
        const separatorArg = call.arguments[0];
        const regexps = separatorArg && !isStaticUndefinedExpression(separatorArg)
            ? resolveFreshStaticRegExpRecords(separatorArg)
            : [];
        const separators: Array<string | RegExp | undefined> = !separatorArg || isStaticUndefinedExpression(separatorArg)
            ? [undefined]
            : regexps.length > 0
                ? regexps
                : resolve(separatorArg);
        if (separators.length === 0) return [];
        const limits = !call.arguments[1] || isStaticUndefinedExpression(call.arguments[1]!)
            ? [undefined]
            : resolveStaticIntegerKeys(call.arguments[1]!);
        if (limits.length === 0) return [];
        if (limits.some((limit) => limit !== undefined && (limit < 0 || !Number.isSafeInteger(limit)))) return [];

        const out: string[] = [];
        for (const value of values) {
            for (const separator of separators) {
                for (const limit of limits) {
                    const parts: unknown[] = separator === undefined
                        ? [value]
                        : value.split(separator, limit);
                    if (parts.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                    for (const key of keys) {
                        const part = parts[key];
                        if (typeof part !== "string") return [];
                        out.push(part);
                        if (out.length > MAX_STATIC_STRING_ALTERNATIVES) return [];
                    }
                }
            }
        }
        return dedupe(out);
    };

    const resolveStaticArrayAccess = (
        init: ts.ArrayLiteralExpression,
        keyExpr: ts.Expression | ts.Identifier,
    ): string[] => {
        const keyTexts = resolveKeyTexts(keyExpr);
        if (keyTexts.length === 1 && keyTexts[0] === "length") {
            return [String(init.elements.length)];
        }

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

    const resolveStaticNumberValues = (expr: ts.Expression): number[] => {
        const texts = resolve(expr);
        if (texts.length === 0) return [];
        const values: number[] = [];
        for (const text of texts) {
            const value = Number(text);
            if (!Number.isFinite(value)) return [];
            values.push(value);
        }
        return values;
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

export function staticStringReplacementCallbackText(
    expr: ts.Expression,
    seen: Set<ts.VariableDeclaration> = new Set(),
): string | null {
    const callback = unwrapStaticExpression(expr);
    if (ts.isIdentifier(callback)) {
        const decl = earlierConstStringDeclaration(callback) ?? topLevelConstStringDeclaration(callback);
        if (!decl?.initializer || seen.has(decl)) return null;
        seen.add(decl);
        const text = staticStringReplacementCallbackText(decl.initializer, seen);
        seen.delete(decl);
        return text;
    }
    if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) return null;
    if (
        callback.parameters.length !== 0 ||
        ts.getModifiers(callback)?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)
    ) {
        return null;
    }
    const body = ts.isBlock(callback.body)
        ? callback.body.statements.length === 1 && ts.isReturnStatement(callback.body.statements[0]!)
            ? callback.body.statements[0]!.expression
            : null
        : callback.body;
    return body ? staticStringExpressionText(body) : null;
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
        isCommonJsRequireThisArg(callee.expression, expr.arguments[0]!, moduleAliases)
    ) {
        return expr.arguments[1]!;
    }
    if (
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === "apply" &&
        isCommonJsRequireCallee(callee.expression, requireAliases, moduleAliases) &&
        expr.arguments.length === 2 &&
        isCommonJsRequireThisArg(callee.expression, expr.arguments[0]!, moduleAliases)
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
        isCommonJsRequireThisArg(expr.arguments[0]!, expr.arguments[1]!, moduleAliases)
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

function isCommonJsRequireThisArg(callee: ts.Expression, thisArg: ts.Expression, moduleAliases: Set<string>): boolean {
    const unwrappedCallee = unwrapStaticExpression(callee);
    const unwrappedThisArg = unwrapStaticExpression(thisArg);
    if (isCommonJsModuleRequireAccess(unwrappedCallee, moduleAliases)) {
        return isCommonJsModuleThisArg(unwrappedThisArg, moduleAliases);
    }
    return isCommonJsModuleThisArg(unwrappedThisArg, moduleAliases) ||
        unwrappedThisArg.kind === ts.SyntaxKind.NullKeyword ||
        (ts.isIdentifier(unwrappedThisArg) && unwrappedThisArg.text === "undefined");
}

function isCommonJsModuleRequireAccess(expr: ts.Expression, moduleAliases: Set<string>): boolean {
    return ts.isPropertyAccessExpression(expr) &&
        expr.name.text === "require" &&
        ts.isIdentifier(expr.expression) &&
        (expr.expression.text === "module" || moduleAliases.has(expr.expression.text));
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
            isCommonJsModuleRequireAccess(unwrapped, moduleAliases)
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
        if (!isCommonJsModuleRequireAccess(target, moduleAliases)) {
            return false;
        }
    }
    const thisArg = unwrapStaticExpression(unwrapped.arguments[0]!);
    return isCommonJsRequireThisArg(target, thisArg, moduleAliases);
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
        if (!alias) {
            const enumDecl = visibleEnumDeclaration(typeNode.typeName, typeNode);
            const enumValues = enumDecl ? enumStringValues(enumDecl) : [];
            return enumValues.length > 0 ? enumValues : [];
        }
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
        if (!alias) {
            const enumDecl = visibleEnumDeclaration(typeNode.typeName, typeNode);
            const enumValues = enumDecl ? enumStringValues(enumDecl) : [];
            return enumValues.length > 0 ? enumValues : [];
        }
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

function visibleEnumDeclaration(id: ts.Identifier, context: ts.Node): ts.EnumDeclaration | null {
    let cur: ts.Node | undefined = context;
    while (cur) {
        if (ts.isBlock(cur) || ts.isSourceFile(cur) || ts.isModuleBlock(cur)) {
            for (const stmt of cur.statements) {
                if (ts.isEnumDeclaration(stmt) && stmt.name.text === id.text) {
                    return stmt;
                }
            }
        }
        cur = cur.parent;
    }
    return null;
}

function enumStringValues(decl: ts.EnumDeclaration): string[] {
    const members = enumMemberStringValues(decl);
    return members ? dedupeStringAlternatives([...members.values()]) : [];
}

function enumMemberStringValues(decl: ts.EnumDeclaration): Map<string, string> | null {
    const values = new Map<string, string>();
    for (const member of decl.members) {
        const key = staticPropertyName(member.name);
        if (key === null || !member.initializer) return null;
        const memberValues = staticStringExpressionTexts(member.initializer);
        if (memberValues.length !== 1) return null;
        values.set(key, memberValues[0]!);
        if (values.size > MAX_STATIC_STRING_ALTERNATIVES) return null;
    }
    return values;
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

function isStringRawMember(expr: ts.Expression): boolean {
    const unwrapped = unwrapStaticExpression(expr);
    return ts.isPropertyAccessExpression(unwrapped) &&
        unwrapped.name.text === "raw" &&
        ts.isIdentifier(unwrapped.expression) &&
        unwrapped.expression.text === "String";
}

function isStringRawTag(expr: ts.Expression): boolean {
    return isStringRawMember(expr);
}

function templateRawText(node: ts.TemplateLiteralLikeNode): string {
    const rawText = (node as ts.TemplateLiteralLikeNode & { rawText?: string }).rawText;
    return rawText ?? node.text;
}

function staticPathCallName(call: ts.CallExpression): "join" | "resolve" | "normalize" | "basename" | "dirname" | "extname" | null {
    const callee = unwrapStaticExpression(call.expression);
    if (ts.isPropertyAccessExpression(callee)) {
        const name = callee.name.text;
        if (!isStaticPathStringMethod(name)) return null;
        const target = unwrapStaticExpression(callee.expression);
        return ts.isIdentifier(target) && isPathNamespaceIdentifier(target) ? name : null;
    }
    if (!ts.isIdentifier(callee)) return null;
    const imported = pathNamedImport(callee);
    return imported && isStaticPathStringMethod(imported) ? imported : null;
}

function isStaticPathStringMethod(
    name: string,
): name is "join" | "resolve" | "normalize" | "basename" | "dirname" | "extname" {
    return name === "join" ||
        name === "resolve" ||
        name === "normalize" ||
        name === "basename" ||
        name === "dirname" ||
        name === "extname";
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

function pathNamedImport(id: ts.Identifier): "join" | "resolve" | "normalize" | "basename" | "dirname" | "extname" | null {
    if (isIdentifierShadowedInLocalScope(id)) return null;
    const sf = id.getSourceFile();
    for (const stmt of sf.statements) {
        if (!ts.isImportDeclaration(stmt) || !isPathModuleSpecifier(stmt.moduleSpecifier)) continue;
        const bindings = stmt.importClause?.namedBindings;
        if (!bindings || !ts.isNamedImports(bindings)) continue;
        for (const element of bindings.elements) {
            if (element.name.text !== id.text) continue;
            const imported = element.propertyName?.text ?? element.name.text;
            if (isStaticPathStringMethod(imported)) return imported;
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

function staticQueryStringCallName(call: ts.CallExpression): "escape" | "unescape" | null {
    const callee = unwrapStaticExpression(call.expression);
    if (ts.isPropertyAccessExpression(callee)) {
        const name = callee.name.text;
        if (name !== "escape" && name !== "unescape") return null;
        const target = unwrapStaticExpression(callee.expression);
        return ts.isIdentifier(target) && isQueryStringNamespaceIdentifier(target) ? name : null;
    }
    if (!ts.isIdentifier(callee)) return null;
    const imported = queryStringNamedImport(callee);
    return imported === "escape" || imported === "unescape" ? imported : null;
}

function isQueryStringNamespaceIdentifier(id: ts.Identifier): boolean {
    if (isIdentifierShadowedInLocalScope(id)) return false;
    const sf = id.getSourceFile();
    for (const stmt of sf.statements) {
        if (ts.isImportDeclaration(stmt) && isQueryStringModuleSpecifier(stmt.moduleSpecifier)) {
            const bindings = stmt.importClause?.namedBindings;
            if (bindings && ts.isNamespaceImport(bindings) && bindings.name.text === id.text) return true;
            if (stmt.importClause?.name?.text === id.text) return true;
        }
    }
    return false;
}

function queryStringNamedImport(id: ts.Identifier): "escape" | "unescape" | null {
    if (isIdentifierShadowedInLocalScope(id)) return null;
    const sf = id.getSourceFile();
    for (const stmt of sf.statements) {
        if (!ts.isImportDeclaration(stmt) || !isQueryStringModuleSpecifier(stmt.moduleSpecifier)) continue;
        const bindings = stmt.importClause?.namedBindings;
        if (!bindings || !ts.isNamedImports(bindings)) continue;
        for (const element of bindings.elements) {
            if (element.name.text !== id.text) continue;
            const imported = element.propertyName?.text ?? element.name.text;
            if (imported === "escape" || imported === "unescape") return imported;
        }
    }
    return null;
}

function isQueryStringModuleSpecifier(node: ts.Node | undefined): boolean {
    return !!node &&
        ts.isStringLiteralLike(node) &&
        (node.text === "querystring" || node.text === "node:querystring");
}

function isStaticUtilFormatCall(call: ts.CallExpression): boolean {
    const callee = unwrapStaticExpression(call.expression);
    if (ts.isPropertyAccessExpression(callee)) {
        if (callee.name.text !== "format") return false;
        const target = unwrapStaticExpression(callee.expression);
        return ts.isIdentifier(target) && isUtilNamespaceIdentifier(target);
    }
    return ts.isIdentifier(callee) && utilNamedImport(callee) === "format";
}

function isUtilNamespaceIdentifier(id: ts.Identifier): boolean {
    if (isIdentifierShadowedInLocalScope(id)) return false;
    const sf = id.getSourceFile();
    for (const stmt of sf.statements) {
        if (ts.isImportDeclaration(stmt) && isUtilModuleSpecifier(stmt.moduleSpecifier)) {
            const bindings = stmt.importClause?.namedBindings;
            if (bindings && ts.isNamespaceImport(bindings) && bindings.name.text === id.text) return true;
            if (stmt.importClause?.name?.text === id.text) return true;
        }
    }
    return false;
}

function utilNamedImport(id: ts.Identifier): "format" | null {
    if (isIdentifierShadowedInLocalScope(id)) return null;
    const sf = id.getSourceFile();
    for (const stmt of sf.statements) {
        if (!ts.isImportDeclaration(stmt) || !isUtilModuleSpecifier(stmt.moduleSpecifier)) continue;
        const bindings = stmt.importClause?.namedBindings;
        if (!bindings || !ts.isNamedImports(bindings)) continue;
        for (const element of bindings.elements) {
            if (element.name.text !== id.text) continue;
            const imported = element.propertyName?.text ?? element.name.text;
            if (imported === "format") return imported;
        }
    }
    return null;
}

function isUtilModuleSpecifier(node: ts.Node | undefined): boolean {
    return !!node &&
        ts.isStringLiteralLike(node) &&
        (node.text === "util" || node.text === "node:util");
}

function jsonValueToStaticExpression(value: unknown): ts.Expression | null {
    if (value === null) return ts.factory.createNull();
    switch (typeof value) {
        case "string":
            return ts.factory.createStringLiteral(value);
        case "number":
            return Number.isFinite(value)
                ? value < 0
                    ? ts.factory.createPrefixUnaryExpression(
                        ts.SyntaxKind.MinusToken,
                        ts.factory.createNumericLiteral(String(-value)),
                    )
                    : ts.factory.createNumericLiteral(String(value))
                : null;
        case "boolean":
            return value ? ts.factory.createTrue() : ts.factory.createFalse();
        case "object": {
            if (Array.isArray(value)) {
                const elements: ts.Expression[] = [];
                for (const item of value) {
                    const expr = jsonValueToStaticExpression(item);
                    if (!expr) return null;
                    elements.push(expr);
                }
                return ts.factory.createArrayLiteralExpression(elements);
            }
            const entries = Object.entries(value as Record<string, unknown>);
            const props: ts.PropertyAssignment[] = [];
            for (const [key, item] of entries) {
                const expr = jsonValueToStaticExpression(item);
                if (!expr) return null;
                props.push(ts.factory.createPropertyAssignment(ts.factory.createStringLiteral(key), expr));
            }
            return ts.factory.createObjectLiteralExpression(props);
        }
        default:
            return null;
    }
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
