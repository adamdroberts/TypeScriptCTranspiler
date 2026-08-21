interface AsyncLeadingAwaitChainSpec {
    generator: "async-leading-await-chain";
    awaitCount: number;
}

interface AsyncBindingDefaultDepthSpec {
    generator: "async-binding-default-depth";
    depth: number;
}

type GeneratedCaseSpec = AsyncLeadingAwaitChainSpec | AsyncBindingDefaultDepthSpec;

function parseSpec(raw: string, filename: string): GeneratedCaseSpec {
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

export function generateE2eCaseSource(raw: string, filename: string): string {
    const spec = parseSpec(raw, filename);
    switch (spec.generator) {
        case "async-leading-await-chain":
            return asyncLeadingAwaitChainSource(spec.awaitCount);
        case "async-binding-default-depth":
            return asyncBindingDefaultDepthSource(spec.depth);
    }
}
