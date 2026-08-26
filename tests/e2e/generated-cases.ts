export interface AsyncLeadingAwaitChainSpec {
    generator: "async-leading-await-chain";
    awaitCount: number;
}

export interface AsyncBindingDefaultDepthSpec {
    generator: "async-binding-default-depth";
    depth: number;
}

export interface AsyncLogicalExpressionDepthSpec {
    generator: "async-logical-expression-depth";
    depth: number;
}

export interface DispatchCaptureWorklistWidthSpec {
    generator: "dispatch-capture-worklist-width";
    width: number;
}

export interface DnsLookupOptionAliasDepthSpec {
    generator: "dns-lookup-option-alias-depth";
    depth: number;
}

export interface StrictEqualityExpressionDepthSpec {
    generator: "strict-equality-expression-depth";
    depth: number;
}

export interface ModuleNamespaceExportWidthSpec {
    generator: "module-namespace-export-width";
    width: number;
}

export interface ModuleStaticSemanticsWidthSpec {
    generator: "module-static-semantics-width";
    width: number;
}

export interface ModuleStaticSemanticsDepthSpec {
    generator: "module-static-semantics-depth";
    depth: number;
}

export interface ClassExpressionMethodWidthSpec {
    generator: "class-expression-method-width";
    width: number;
}

export interface GlobalNumberParseLengthSpec {
    generator: "global-number-parse-length";
    length: number;
}

export interface UriPercentCodecLengthSpec {
    generator: "uri-percent-codec-length";
    length: number;
}

export interface StringCodeUnitListWidthSpec {
    generator: "string-code-unit-list-width";
    width: number;
}

export interface StringCodePointListWidthSpec {
    generator: "string-code-point-list-width";
    width: number;
}

export interface ReflectConstructArgumentWidthSpec {
    generator: "reflect-construct-argument-width";
    width: number;
}

export interface ArrowFormalBindingTreeDepthSpec {
    generator: "arrow-formal-binding-tree-depth";
    depth: number;
    sourceKind: "javascript";
}

export interface ArrayStaticFactoryItemWidthSpec {
    generator: "array-static-factory-item-width";
    width: number;
}

export interface SwitchClauseWorklistWidthSpec {
    generator: "switch-clause-worklist-width";
    width: number;
}

export interface SwitchCaseBlockEnvironmentDepthSpec {
    generator: "switch-caseblock-environment-depth";
    depth: number;
}

export interface SwitchCaseBlockBindingDepthSpec {
    generator: "switch-caseblock-binding-depth";
    depth: number;
}

export interface SwitchCaseBlockFunctionWorklistWidthSpec {
    generator: "switch-caseblock-function-worklist-width";
    width: number;
}

export interface SwitchCaseBlockGeneratorCaptureWidthSpec {
    generator: "switch-caseblock-generator-capture-width";
    width: number;
}

export interface SwitchCaseBlockAsyncCaptureWidthSpec {
    generator: "switch-caseblock-async-capture-width";
    width: number;
}

export interface SwitchCaseBlockClassWorklistWidthSpec {
    generator: "switch-caseblock-class-worklist-width";
    width: number;
}

export type GeneratedCaseSpec =
    | AsyncLeadingAwaitChainSpec
    | AsyncBindingDefaultDepthSpec
    | AsyncLogicalExpressionDepthSpec
    | DispatchCaptureWorklistWidthSpec
    | DnsLookupOptionAliasDepthSpec
    | StrictEqualityExpressionDepthSpec
    | ModuleNamespaceExportWidthSpec
    | ModuleStaticSemanticsWidthSpec
    | ModuleStaticSemanticsDepthSpec
    | ClassExpressionMethodWidthSpec
    | GlobalNumberParseLengthSpec
    | UriPercentCodecLengthSpec
    | StringCodeUnitListWidthSpec
    | StringCodePointListWidthSpec
    | ReflectConstructArgumentWidthSpec
    | ArrowFormalBindingTreeDepthSpec
    | ArrayStaticFactoryItemWidthSpec
    | SwitchClauseWorklistWidthSpec
    | SwitchCaseBlockEnvironmentDepthSpec
    | SwitchCaseBlockBindingDepthSpec
    | SwitchCaseBlockFunctionWorklistWidthSpec
    | SwitchCaseBlockGeneratorCaptureWidthSpec
    | SwitchCaseBlockAsyncCaptureWidthSpec
    | SwitchCaseBlockClassWorklistWidthSpec;

export function parseGeneratedCaseSpec(raw: string, filename: string): GeneratedCaseSpec {
    let value: unknown;
    try {
        value = JSON.parse(raw);
    } catch (error) {
        throw new Error(`invalid generated case spec ${filename}: ${String(error)}`);
    }
    if (!value || typeof value !== "object") {
        throw new Error(`invalid generated case spec ${filename}: expected an object`);
    }
    const spec = value as Record<string, unknown>;
    if (spec.generator === "async-leading-await-chain") {
        const awaitCount = spec.awaitCount;
        if (typeof awaitCount !== "number" || !Number.isInteger(awaitCount) || awaitCount < 2) {
            throw new Error(`invalid generated case spec ${filename}: awaitCount must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            awaitCount,
        };
    }
    if (spec.generator === "async-binding-default-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "async-logical-expression-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "dispatch-capture-worklist-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "dns-lookup-option-alias-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "strict-equality-expression-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "module-namespace-export-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "module-static-semantics-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "module-static-semantics-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "class-expression-method-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "global-number-parse-length") {
        const length = spec.length;
        if (typeof length !== "number" || !Number.isInteger(length) || length < 2) {
            throw new Error(`invalid generated case spec ${filename}: length must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            length,
        };
    }
    if (spec.generator === "uri-percent-codec-length") {
        const length = spec.length;
        if (typeof length !== "number" || !Number.isInteger(length) || length < 2) {
            throw new Error(`invalid generated case spec ${filename}: length must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            length,
        };
    }
    if (spec.generator === "string-code-unit-list-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "string-code-point-list-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "reflect-construct-argument-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "arrow-formal-binding-tree-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        if (spec.sourceKind !== "javascript") {
            throw new Error(`invalid generated case spec ${filename}: sourceKind must be javascript`);
        }
        return {
            generator: spec.generator,
            depth,
            sourceKind: spec.sourceKind,
        };
    }
    if (spec.generator === "array-static-factory-item-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "switch-clause-worklist-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "switch-caseblock-environment-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "switch-caseblock-binding-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "switch-caseblock-function-worklist-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "switch-caseblock-generator-capture-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "switch-caseblock-async-capture-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "switch-caseblock-class-worklist-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    throw new Error(`invalid generated case spec ${filename}: unknown generator ${String(spec.generator)}`);
}

function leadingAwaitChain(indent: string, seed: string, awaitCount: number): string[] {
    const lines = [
        `${indent}const value0 = await delay(0, ${JSON.stringify(seed)});`,
        `${indent}let marker = value0;`,
        `${indent}if (marker.length === 0) {`,
        `${indent}    marker = "unreachable";`,
        `${indent}}`,
        `${indent}for (let index = 0; index < 1; index++) {`,
        `${indent}    marker = value0;`,
        `${indent}}`,
        `${indent}try {`,
        `${indent}    marker = value0;`,
        `${indent}} finally {`,
        `${indent}    marker = value0;`,
        `${indent}}`,
    ];
    for (let index = 1; index < awaitCount; index++) {
        const markerCheck = index === 1 ? ' + (marker === value0 ? "" : "bad")' : "";
        lines.push(
            `${indent}const value${index} = await delay(0, value${index - 1} + "${index % 10}"${markerCheck});`,
        );
    }
    lines.push(`${indent}return value${awaitCount - 1}.length;`);
    return lines;
}

function asyncLeadingAwaitChainSource(awaitCount: number): string {
    const straightBody = (indent: string, seed: string): string =>
        leadingAwaitChain(indent, seed, awaitCount).join("\n");
    const conditionalBody = (indent: string, trueSeed: string, falseSeed: string): string => [
        `${indent}if (flag) {`,
        straightBody(`${indent}    `, trueSeed),
        `${indent}} else {`,
        straightBody(`${indent}    `, falseSeed),
        `${indent}}`,
    ].join("\n");

    return [
        'import { setTimeout as delay } from "node:timers/promises";',
        "",
        "async function declaration(): Promise<number> {",
        straightBody("    ", "d"),
        "}",
        "",
        "class Chain {",
        "    async method(): Promise<number> {",
        straightBody("        ", "m"),
        "    }",
        "}",
        "",
        "const value = async (): Promise<number> => {",
        straightBody("    ", "v"),
        "};",
        "",
        "async function branch(flag: boolean): Promise<number> {",
        conditionalBody("    ", "t", "f"),
        "}",
        "",
        "class BranchChain {",
        "    async method(flag: boolean): Promise<number> {",
        conditionalBody("        ", "a", "b"),
        "    }",
        "}",
        "",
        "const branchValue = async (flag: boolean): Promise<number> => {",
        conditionalBody("    ", "x", "y"),
        "};",
        "",
        'declaration().then((result) => console.log("declaration:", result));',
        'new Chain().method().then((result) => console.log("method:", result));',
        'value().then((result) => console.log("value:", result));',
        'branch(true).then((result) => console.log("branch-true:", result));',
        'branch(false).then((result) => console.log("branch-false:", result));',
        'new BranchChain().method(true).then((result) => console.log("method-branch-true:", result));',
        'new BranchChain().method(false).then((result) => console.log("method-branch-false:", result));',
        'branchValue(true).then((result) => console.log("value-branch-true:", result));',
        'branchValue(false).then((result) => console.log("value-branch-false:", result));',
        "",
    ].join("\n");
}

function asyncBindingDefaultDepthSource(depth: number): string {
    let pattern = "leaf = await leafValue()";
    for (let index = depth - 1; index >= 0; index--) {
        pattern = `level${index}: { ${pattern} } = await objectValue()`;
    }
    return [
        "let calls = 0;",
        "",
        "function objectValue(): Promise<any> {",
        "    calls++;",
        "    return Promise.resolve({});",
        "}",
        "",
        "function leafValue(): Promise<number> {",
        "    calls++;",
        "    return Promise.resolve(73);",
        "}",
        "",
        "async function bindingDepth(): Promise<boolean> {",
        `    const { ${pattern} }: any = {};`,
        `    return leaf === 73 && calls === ${depth + 1};`,
        "}",
        "",
        'bindingDepth().then((result) => console.log("binding depth:", result));',
        "",
    ].join("\n");
}

function asyncLogicalExpressionDepthSource(depth: number): string {
    let expression = "await finish()";
    for (let index = depth - 1; index >= 0; index--) {
        const partition = index % 3;
        const operator = partition === 0 ? "&&" : partition === 1 ? "||" : "??";
        const value = partition === 0 ? "objectValue" : partition === 1 ? "0" : "undefined";
        expression = `mark(${index}, ${value}) ${operator} (${expression})`;
    }
    return [
        `const depth = ${depth};`,
        "const objectValue = { marker: 'truthy' };",
        "let calls = 0;",
        "let ordered = true;",
        "let finishCalls = 0;",
        "function mark(index: number, value: any): any {",
        "    ordered = ordered && index === calls;",
        "    calls++;",
        "    return value;",
        "}",
        "async function finish(): Promise<number> {",
        "    finishCalls++;",
        "    return await Promise.resolve(197);",
        "}",
        "async function logicalDepth(): Promise<boolean> {",
        `    const result = ${expression};`,
        "    return result === 197 && calls === depth && ordered && finishCalls === 1;",
        "}",
        'logicalDepth().then((result) => console.log("async logical expression depth:", result));',
        "",
    ].join("\n");
}

function dispatchCaptureWorklistWidthSource(width: number): string {
    const declarations = Array.from(
        { length: width },
        (_, index) => `const capture_${index}: number[] = [${index}];`,
    );
    const observations = Array.from(
        { length: width },
        (_, index) => `        total += capture_${index}[0];`,
    );
    const mutations = Array.from(
        { length: width },
        (_, index) => `capture_${index}[0] = ${width + index};`,
    );
    return [
        "const queue = new DispatchQueue('capture-worklist');",
        ...declarations,
        "const pending = dispatch.async(queue, () => {",
        "    let total = 0;",
        ...observations,
        "    return total;",
        "});",
        ...mutations,
        `pending.then((result) => console.log("dispatch capture worklist:", result === ${(width * (width - 1)) / 2}));`,
        "",
    ].join("\n");
}

function dnsLookupOptionAliasDepthSource(depth: number): string {
    const aliases = Array.from(
        { length: depth },
        (_, index) => `const lookupOptions_${index + 1} = lookupOptions_${index};`,
    );
    return [
        'import { ALL, V4MAPPED, lookup, promises } from "dns";',
        "const lookupOptions_0 = { family: 6, hints: V4MAPPED | ALL } as const;",
        ...aliases,
        `lookup("127.0.0.1", lookupOptions_${depth}, (error: any, address: string, family: number): void => {`,
        '    console.log("dns alias stress callback:", error === null, address.indexOf("127.0.0.1") >= 0, family);',
        "});",
        `promises.lookup("127.0.0.1", lookupOptions_${depth}).then((result: any): void => {`,
        '    console.log("dns alias stress promise:", result.address.indexOf("127.0.0.1") >= 0, result.family);',
        "});",
        'console.log("dns alias stress sync");',
        "",
    ].join("\n");
}

function strictEqualityExpressionDepthSource(depth: number): string {
    let expression = `mark(${depth})`;
    for (let index = depth - 1; index >= 0; index--) {
        expression = `mark(${index}) === (${expression})`;
    }
    const expected = depth % 2 === 1 ? "true" : "false";
    return [
        "let calls = 0;",
        "let ordered = true;",
        "",
        "function mark(index: number): any {",
        "    ordered = ordered && index === calls;",
        "    calls++;",
        "    return false;",
        "}",
        "",
        "function strictEqualityExpressionDepth(): boolean {",
        `    const result = ${expression};`,
        `    return result === ${expected} && calls === ${depth + 1} && ordered;`,
        "}",
        "",
        'console.log("strict equality depth:", strictEqualityExpressionDepth());',
        "",
    ].join("\n");
}

function moduleNamespaceExportWidthSource(width: number): string {
    const exportedValues = Array.from(
        { length: width },
        (_, index) => `export const value${index.toString().padStart(3, "0")} = ${index};`,
    );
    const lastName = `value${(width - 1).toString().padStart(3, "0")}`;
    return [
        'import * as namespace from "./module_namespace_export_width";',
        "",
        ...exportedValues,
        "export let live = 0;",
        "export function update(value: number): void { live = value; }",
        "",
        "const names = Object.getOwnPropertyNames(namespace);",
        "const sorted = names.slice().sort();",
        "namespace.update(211);",
        "const valid =",
        `    names.length === ${width + 2} &&`,
        '    names.join("|") === sorted.join("|") &&',
        `    namespace.${lastName} === ${width - 1} &&`,
        "    namespace.live === 211 &&",
        "    namespace === namespace;",
        'console.log("module namespace width:", valid);',
        "",
    ].join("\n");
}

function globalNumberParseLengthSource(length: number): string {
    const whitespace = " ".repeat(length);
    const zeros = "0".repeat(length);
    return [
        `const integerSource = ${JSON.stringify(`${whitespace}${zeros}42tail`)};`,
        `const decimalSource = ${JSON.stringify(`${whitespace}${zeros}1.25tail`)};`,
        `const numericSource = ${JSON.stringify(`${whitespace}${zeros}1${whitespace}`)};`,
        "const valid =",
        "    parseInt(integerSource, 10) === 42 &&",
        "    parseFloat(decimalSource) === 1.25 &&",
        "    Number(numericSource) === 1 &&",
        "    isFinite(numericSource) && !isNaN(numericSource);",
        'console.log("global number parse length:", valid);',
        "",
    ].join("\n");
}

function uriPercentCodecLengthSource(length: number): string {
    return [
        `const length = ${length};`,
        `const unit = "a b;/?:@&=+$,#\\u03a9\\u{1f600}";`,
        "const source = unit.repeat(length);",
        "const reserved = \"%23\".repeat(length);",
        "let malformedTail = false;",
        "let surrogateTail = false;",
        "try { decodeURIComponent(\"%41\".repeat(length) + \"%C2\"); }",
        "catch (error) { malformedTail = error instanceof URIError; }",
        "try { encodeURI(\"a\".repeat(length) + String.fromCharCode(0xd800)); }",
        "catch (error) { surrogateTail = error instanceof URIError; }",
        "const valid =",
        "    decodeURI(encodeURI(source)) === source &&",
        "    decodeURIComponent(encodeURIComponent(source)) === source &&",
        "    decodeURI(reserved) === reserved &&",
        "    decodeURIComponent(reserved) === \"#\".repeat(length) &&",
        "    malformedTail && surrogateTail;",
        'console.log("URI percent codec length:", valid);',
        "",
    ].join("\n");
}

function stringCodeUnitListWidthSource(width: number): string {
    return [
        `const width = ${width};`,
        "const units: number[] = [];",
        "for (let index = 0; index < width; index++) units.push(65 + index % 26);",
        "const chars = String.fromCharCode(...units);",
        "const points = String.fromCodePoint(...units);",
        "const valid =",
        "    chars === points &&",
        "    chars.length === width &&",
        "    chars.charCodeAt(0) === 65 &&",
        "    chars.charCodeAt(width - 1) === units[width - 1];",
        'console.log("string code-unit list width:", valid);',
        "",
    ].join("\n");
}

function stringCodePointListWidthSource(width: number): string {
    return [
        `const width = ${width};`,
        "const codePoints: number[] = [];",
        "for (let index = 0; index < width; index++) {",
        "    const partition = index % 4;",
        "    const codePoint = partition === 0",
        "        ? 65 + index % 26",
        "        : partition === 1",
        "            ? 0x80 + index % 0x700",
        "            : partition === 2",
        "                ? 0x800 + index % 0x5000",
        "                : 0x10000 + index % 0x10000;",
        "    codePoints.push(codePoint);",
        "}",
        "const text = String.fromCodePoint(...codePoints);",
        "let codeUnitIndex = 0;",
        "let codeUnitsMatch = true;",
        "for (const codePoint of codePoints) {",
        "    if (codePoint <= 0xffff) {",
        "        if (text.charCodeAt(codeUnitIndex) !== codePoint) codeUnitsMatch = false;",
        "        codeUnitIndex++;",
        "    } else {",
        "        const scalar = codePoint - 0x10000;",
        "        const lead = 0xd800 + (scalar >> 10);",
        "        const trail = 0xdc00 + (scalar & 0x3ff);",
        "        if (text.charCodeAt(codeUnitIndex) !== lead || text.charCodeAt(codeUnitIndex + 1) !== trail) {",
        "            codeUnitsMatch = false;",
        "        }",
        "        codeUnitIndex += 2;",
        "    }",
        "}",
        "if (!Number.isNaN(text.charCodeAt(codeUnitIndex))) codeUnitsMatch = false;",
        "let observed = 0;",
        "let valuesMatch = true;",
        "for (const value of text) {",
        "    const actual = value.codePointAt(0);",
        "    if (actual !== codePoints[observed]) valuesMatch = false;",
        "    observed++;",
        "}",
        "const valid = codeUnitsMatch && valuesMatch && observed === width;",
        'console.log("string code-point list width:", valid);',
        "",
    ].join("\n");
}

function reflectConstructArgumentWidthSource(width: number): string {
    return [
        `const width = ${width};`,
        "const reflectObject = Reflect;",
        "const argumentsList: any = { length: width };",
        "for (let index = 0; index < width; index++) argumentsList[index] = index;",
        "function Target(this: any, ...values: any[]): void {",
        "    this.count = values.length;",
        "    this.first = values[0];",
        "    this.middle = values[Math.floor(values.length / 2)];",
        "    this.last = values[values.length - 1];",
        "}",
        "const result: any = Reflect.construct(Target as any, argumentsList);",
        "const valid =",
        "    result.count === width &&",
        "    result.first === 0 &&",
        "    result.middle === Math.floor(width / 2) &&",
        "    result.last === width - 1 &&",
        "    result instanceof Target &&",
        "    Reflect === reflectObject &&",
        "    Object.getPrototypeOf(Reflect) === Object.prototype;",
        'console.log("reflect construct argument worklist:", valid);',
        "",
    ].join("\n");
}

function arrowFormalBindingTreeDepthSource(depth: number): string {
    let pattern = "leaf";
    let value = "41";
    let lexicalChain = "() => [this, arguments, new.target]";
    for (let level = 0; level < depth; level++) {
        if (level % 2 === 0) {
            pattern = `[${pattern}]`;
            value = `[${value}]`;
        } else {
            pattern = `{ value: ${pattern} }`;
            value = `{ value: ${value} }`;
        }
        lexicalChain = `() => (${lexicalChain})`;
    }
    const directivePrefix = Array.from(
        { length: depth },
        (_, index) => `    "directive-${index}";`,
    );
    return [
        "function makeArrow() {",
        `    return (${pattern}, prior = leaf, ...rest) =>`,
        "        this.base + leaf + prior + rest.length;",
        "}",
        "var directiveProbe = (value = 1) => {",
        ...directivePrefix,
        "    0;",
        '    "use strict";',
        "    return value;",
        "};",
        "function AlternateTarget() {}",
        "function makeLexicalChain(marker) {",
        `    return ${lexicalChain};`,
        "}",
        "var lexicalResult = Reflect.construct(makeLexicalChain, [43], AlternateTarget);",
        `for (var level = 0; level <= ${depth}; level++) {`,
        "    lexicalResult = lexicalResult.call({ wrong: true }, level);",
        "}",
        "var lexicalValid = lexicalResult[0] instanceof AlternateTarget &&",
        "    lexicalResult[1][0] === 43 &&",
        "    lexicalResult[2] === AlternateTarget;",
        "var arrow = makeArrow.call({ base: 1 });",
        `var result = arrow.call({ base: 999 }, ${value}, undefined, 7, 8);`,
        'console.log("arrow formal binding tree:", result === 85 && directiveProbe() === 1 && lexicalValid);',
        "",
    ].join("\n");
}

function switchClauseWorklistWidthSource(width: number): string {
    const cases = Array.from({ length: width - 1 }, (_, index) =>
        `    case select(${index + 1}, ${index + 2}): result = "wrong"; break;`,
    );
    return [
        "let evaluations = 0;",
        "let ordered = true;",
        "let result = \"unselected\";",
        "function select(index: number, value: any): any {",
        "    ordered = ordered && index === evaluations;",
        "    evaluations++;",
        "    return value;",
        "}",
        "",
        "switch (\"1\") {",
        "    case select(0, 1): result = \"coerced\"; break;",
        ...cases,
        `    case select(${width}, "1"): result = "strict"; break;`,
        "    default: result = \"default\";",
        "}",
        `const valid = result === "strict" && ordered && evaluations === ${width + 1};`,
        'console.log("switch clause worklist:", valid);',
        "",
    ].join("\n");
}

function switchCaseBlockEnvironmentDepthSource(depth: number): string {
    const lines = [
        "function verifyCaseBlockEnvironments(): boolean {",
        "    let valid = true;",
        `    let ${Array.from({ length: depth }, (_, index) => `selector_${index}: (() => number) | undefined`).join(", ")};`,
    ];
    for (let index = 0; index < depth; index++) {
        lines.push(
            `${"    ".repeat(index + 1)}switch (0 as any) {`,
            `${"    ".repeat(index + 2)}case (selector_${index} = function() { return binding_${index}; }, 0):`,
            `${"    ".repeat(index + 3)}let binding_${index} = ${index};`,
        );
    }
    for (let index = depth - 1; index >= 0; index--) {
        lines.push(
            `${"    ".repeat(index + 3)}if (!selector_${index} || selector_${index}() !== binding_${index}) valid = false;`,
            `${"    ".repeat(index + 3)}break;`,
            `${"    ".repeat(index + 1)}}`,
        );
    }
    lines.push(
        "    return valid;",
        "}",
        'console.log("switch CaseBlock environment:", verifyCaseBlockEnvironments());',
        "",
    );
    return lines.join("\n");
}

function switchCaseBlockBindingDepthSource(depth: number): string {
    let binding = "deepBinding";
    let value = "197";
    for (let index = 0; index < depth; index++) {
        if (index % 2 === 0) {
            binding = `{ value: ${binding} }`;
            value = `{ value: ${value} }`;
        } else {
            binding = `[${binding}]`;
            value = `[${value}]`;
        }
    }
    return [
        "function verifyCaseBlockBindingTree(): boolean {",
        "    let before: (() => any) | undefined;",
        "    let after: (() => any) | undefined;",
        "    switch (0 as any) {",
        "        case (before = function() { return deepBinding; }, 0):",
        `            const ${binding} = (${value}) as any;`,
        "            after = function() { return deepBinding; };",
        "            break;",
        "    }",
        "    return !!before && !!after && before() === 197 && after() === 197;",
        "}",
        'console.log("switch CaseBlock binding tree:", verifyCaseBlockBindingTree());',
        "",
    ].join("\n");
}

function switchCaseBlockFunctionWorklistWidthSource(width: number): string {
    const declarations = Array.from({ length: width }, (_, index) => {
        const result = index === width - 1
            ? "1"
            : `caseFunction_${index + 1}() + 1`;
        return `            function caseFunction_${index}(): number { return ${result}; }`;
    });
    return [
        "function verifyCaseBlockFunctionWorklist(): boolean {",
        "    let selected: (() => number) | undefined;",
        "    switch (0 as any) {",
        "        case (selected = function() { return caseFunction_0(); }, 0):",
        ...declarations,
        "            break;",
        "    }",
        `    return !!selected && selected() === ${width};`,
        "}",
        'console.log("switch CaseBlock function worklist:", verifyCaseBlockFunctionWorklist());',
        "",
    ].join("\n");
}

function switchCaseBlockGeneratorCaptureWidthSource(width: number): string {
    const yields = Array.from({ length: width }, (_, index) =>
        `                yield caseGeneratorCapture_${index};`,
    );
    const declarations = Array.from({ length: width }, (_, index) =>
        `            let caseGeneratorCapture_${index}: number = ${index};`,
    );
    return [
        "function verifyCaseBlockGeneratorCaptures(): boolean {",
        "    let selected: any;",
        "    switch (0 as any) {",
        "        case (selected = caseGeneratorCaptureWorklist, 0):",
        "            function* caseGeneratorCaptureWorklist(): Generator<number, string, undefined> {",
        ...yields,
        `                yield caseGeneratorCaptureWorklist === selected ? ${width} : -1;`,
        '                return "done";',
        "            }",
        ...declarations,
        "            break;",
        "    }",
        "    if (!selected) return false;",
        "    const iterator = selected();",
        `    for (let index = 0; index <= ${width}; index++) {`,
        "        const step: any = iterator.next();",
        "        if (step.done || step.value !== index) return false;",
        "    }",
        "    const done: any = iterator.next();",
        '    return done.done === true && done.value === "done";',
        "}",
        'console.log("switch CaseBlock generator captures:", verifyCaseBlockGeneratorCaptures());',
        "",
    ].join("\n");
}

function switchCaseBlockAsyncCaptureWidthSource(width: number): string {
    const declarations = Array.from({ length: width }, (_, index) =>
        `            let caseAsyncCapture_${index}: number = ${index};`,
    );
    const captures = Array.from({ length: width }, (_, index) =>
        `caseAsyncCapture_${index}`,
    );
    return [
        "let selectedCaseAsyncCaptureWorklist: any;",
        "switch (0 as any) {",
        "    case (selectedCaseAsyncCaptureWorklist = caseAsyncCaptureWorklist, 0):",
        "        async function caseAsyncCaptureWorklist(): Promise<any> {",
        "            await Promise.resolve();",
        `            return [${captures.join(", ")}];`,
        "        }",
        ...declarations,
        "        break;",
        "}",
        "selectedCaseAsyncCaptureWorklist().then(",
        "    function(values: any[]): void {",
        `        let valid = values.length === ${width};`,
        "        for (let index = 0; index < values.length; index++) {",
        "            if (values[index] !== index) valid = false;",
        "        }",
        '        console.log("switch CaseBlock async captures:", valid);',
        "    },",
        '    function(error: any): void { console.log("switch CaseBlock async captures error:", String(error)); },',
        ");",
        "",
    ].join("\n");
}

function switchCaseBlockClassWorklistWidthSource(width: number): string {
    const declarations = Array.from({ length: width }, (_, index) => [
        `            class CaseBlockClass_${index} {}`,
        `            constructors.push(CaseBlockClass_${index});`,
    ]).flat();
    return [
        "function verifyCaseBlockClassWorklist(): boolean {",
        "    const constructors: any[] = [];",
        "    switch (0 as any) {",
        "        case 0:",
        ...declarations,
        "            break;",
        "    }",
        `    for (let index = 0; index < ${width}; index++) {`,
        "        const constructor = constructors[index];",
        "        if (constructor.name !== \"CaseBlockClass_\" + index || constructor.length !== 0) return false;",
        "        const instance: any = new constructor();",
        "        if (!(instance instanceof constructor) || instance.constructor !== constructor) return false;",
        "        if (index > 0 && constructor === constructors[index - 1]) return false;",
        "    }",
        "    return true;",
        "}",
        'console.log("switch CaseBlock class worklist:", verifyCaseBlockClassWorklist());',
        "",
    ].join("\n");
}

function arrayStaticFactoryItemWidthSource(width: number): string {
    return [
        "const source: any[] = [];",
        `for (let index = 0; index < ${width}; index++) source.push(index);`,
        "const dynamicSource: any = source;",
        "const copied: any = (Array.from as any).call(Array, dynamicSource, function(value: any, index: number): number {",
        "    return value + index;",
        "});",
        "const collected: any = (Array.of as any).call(Array, ...dynamicSource);",
        `let valid = copied.length === ${width} && collected.length === ${width};`,
        `for (let index = 0; index < ${width}; index++) {`,
        "    if (copied[index] !== index * 2 || collected[index] !== index) valid = false;",
        "}",
        'console.log("array static factory item worklist:", valid);',
        "",
    ].join("\n");
}

function moduleStaticSemanticsWidthSource(width: number): string {
    const declarations: string[] = [];
    const observations: string[] = [];
    for (let index = 0; index < width; index++) {
        declarations.push(`export const lexical_${index}: number = ${index};`);
        observations.push(`lexical_${index}`);
    }
    return [
        ...declarations,
        `const observations: number[] = [${observations.join(", ")}];`,
        `let valid = observations.length === ${width};`,
        `for (let index = 0; index < ${width}; index++) {`,
        "    if (observations[index] !== index) valid = false;",
        "}",
        'console.log("module static semantics width:", valid);',
        "",
    ].join("\n");
}

function moduleStaticSemanticsDepthSource(depth: number): string {
    let nested = "observed = nestedVar;";
    for (let index = 0; index < depth; index++) nested = `{ ${nested} }`;
    return [
        "export const lexical: number = 1;",
        "var nestedVar: number = 41;",
        "let observed: number = 0;",
        nested,
        "class OuterPrivateEnvironment {",
        "    #value = 42;",
        "    make(this: any): any {",
        "        const receiver: any = this;",
        "        return class InnerPrivateEnvironment {",
        "            read(this: any): any { return receiver.#value; }",
        "        };",
        "    }",
        "}",
        "const Inner: any = new OuterPrivateEnvironment().make();",
        'console.log("module static semantics depth:", observed === 41 && new Inner().read() === 42);',
        "",
    ].join("\n");
}

function classExpressionMethodWidthSource(width: number): string {
    const methods = Array.from(
        { length: width },
        (_, index) => `        method_${index}(this: any): any { return captured + ${index}; }`,
    );
    const observations = Array.from(
        { length: width },
        (_, index) => `if (instance.method_${index}() !== ${1000 + index}) valid = false;`,
    );
    return [
        "function makeMethodWorklistClass(captured: any): any {",
        "    return class MethodWorklistClass {",
        ...methods,
        "    };",
        "}",
        "const Constructor: any = makeMethodWorklistClass(1000);",
        "const instance: any = new Constructor();",
        "let valid = true;",
        ...observations,
        'console.log("class expression method worklist:", valid);',
        "",
    ].join("\n");
}

export function generateE2eCaseSource(raw: string, filename: string): string {
    const spec = parseGeneratedCaseSpec(raw, filename);
    switch (spec.generator) {
        case "async-leading-await-chain":
            return asyncLeadingAwaitChainSource(spec.awaitCount);
        case "async-binding-default-depth":
            return asyncBindingDefaultDepthSource(spec.depth);
        case "async-logical-expression-depth":
            return asyncLogicalExpressionDepthSource(spec.depth);
        case "dispatch-capture-worklist-width":
            return dispatchCaptureWorklistWidthSource(spec.width);
        case "dns-lookup-option-alias-depth":
            return dnsLookupOptionAliasDepthSource(spec.depth);
        case "strict-equality-expression-depth":
            return strictEqualityExpressionDepthSource(spec.depth);
        case "module-namespace-export-width":
            return moduleNamespaceExportWidthSource(spec.width);
        case "module-static-semantics-width":
            return moduleStaticSemanticsWidthSource(spec.width);
        case "module-static-semantics-depth":
            return moduleStaticSemanticsDepthSource(spec.depth);
        case "class-expression-method-width":
            return classExpressionMethodWidthSource(spec.width);
        case "global-number-parse-length":
            return globalNumberParseLengthSource(spec.length);
        case "uri-percent-codec-length":
            return uriPercentCodecLengthSource(spec.length);
        case "string-code-unit-list-width":
            return stringCodeUnitListWidthSource(spec.width);
        case "string-code-point-list-width":
            return stringCodePointListWidthSource(spec.width);
        case "reflect-construct-argument-width":
            return reflectConstructArgumentWidthSource(spec.width);
        case "arrow-formal-binding-tree-depth":
            return arrowFormalBindingTreeDepthSource(spec.depth);
        case "array-static-factory-item-width":
            return arrayStaticFactoryItemWidthSource(spec.width);
        case "switch-clause-worklist-width":
            return switchClauseWorklistWidthSource(spec.width);
        case "switch-caseblock-environment-depth":
            return switchCaseBlockEnvironmentDepthSource(spec.depth);
        case "switch-caseblock-binding-depth":
            return switchCaseBlockBindingDepthSource(spec.depth);
        case "switch-caseblock-function-worklist-width":
            return switchCaseBlockFunctionWorklistWidthSource(spec.width);
        case "switch-caseblock-generator-capture-width":
            return switchCaseBlockGeneratorCaptureWidthSource(spec.width);
        case "switch-caseblock-async-capture-width":
            return switchCaseBlockAsyncCaptureWidthSource(spec.width);
        case "switch-caseblock-class-worklist-width":
            return switchCaseBlockClassWorklistWidthSource(spec.width);
    }
}
