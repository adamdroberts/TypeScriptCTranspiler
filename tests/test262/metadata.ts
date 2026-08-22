import { parse as parseYaml } from "yaml";

export type Test262Mode = "sloppy" | "strict" | "module" | "raw";
export type NegativePhase = "parse" | "resolution" | "runtime";

export interface Test262Metadata {
    esid?: string;
    es5id?: string;
    es6id?: string;
    features: string[];
    flags: string[];
    includes: string[];
    negative?: {
        phase: NegativePhase;
        type: string;
    };
}

export interface FeatureRegistry {
    proposed: Set<string>;
    standard: Set<string>;
    harness: Set<string>;
    all: Set<string>;
}

function stringArray(value: unknown, field: string, filename: string): string[] {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
        throw new Error(`${filename}: metadata ${field} must be an array of strings`);
    }
    return [...(value as string[])];
}

function optionalString(value: unknown, field: string, filename: string): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string" && typeof value !== "number") {
        throw new Error(`${filename}: metadata ${field} must be a scalar`);
    }
    return String(value);
}

export function parseTest262Metadata(source: string, filename: string): Test262Metadata {
    const match = source.match(/\/\*---([\s\S]*?)---\*\//);
    if (!match) throw new Error(`${filename}: missing Test262 YAML frontmatter`);
    let parsed: unknown;
    try {
        parsed = parseYaml(match[1]!.replace(/\r\n?/g, "\n"), { uniqueKeys: true });
    } catch (error) {
        throw new Error(`${filename}: invalid Test262 YAML frontmatter: ${String(error)}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`${filename}: Test262 frontmatter must be a YAML mapping`);
    }
    const record = parsed as Record<string, unknown>;
    let negative: Test262Metadata["negative"];
    if (record.negative !== undefined) {
        if (!record.negative || typeof record.negative !== "object" || Array.isArray(record.negative)) {
            throw new Error(`${filename}: negative metadata must be a mapping`);
        }
        const value = record.negative as Record<string, unknown>;
        const keyOrder = Object.keys(value);
        if (JSON.stringify([...keyOrder].sort()) !== JSON.stringify(["phase", "type"])) {
            throw new Error(`${filename}: negative metadata must contain exactly phase and type`);
        }
        if (keyOrder.indexOf("phase") > keyOrder.indexOf("type")) {
            throw new Error(`${filename}: negative phase must precede type under the pinned Test262 lint contract`);
        }
        if (!(["parse", "resolution", "runtime"] as unknown[]).includes(value.phase)) {
            throw new Error(`${filename}: invalid negative phase ${String(value.phase)}`);
        }
        if (typeof value.type !== "string" || value.type.length === 0) {
            throw new Error(`${filename}: negative type must be a non-empty constructor name`);
        }
        negative = { phase: value.phase as NegativePhase, type: value.type };
    }
    return {
        esid: optionalString(record.esid, "esid", filename),
        es5id: optionalString(record.es5id, "es5id", filename),
        es6id: optionalString(record.es6id, "es6id", filename),
        features: stringArray(record.features, "features", filename),
        flags: stringArray(record.flags, "flags", filename),
        includes: stringArray(record.includes, "includes", filename),
        negative,
    };
}

export function expandModes(metadata: Test262Metadata, filename: string): Test262Mode[] {
    const flags = new Set(metadata.flags);
    const known = new Set([
        "onlyStrict",
        "noStrict",
        "module",
        "raw",
        "async",
        "generated",
        "CanBlockIsFalse",
        "CanBlockIsTrue",
        "non-deterministic",
    ]);
    const unknown = [...flags].filter((flag) => !known.has(flag));
    if (unknown.length > 0) throw new Error(`${filename}: unknown Test262 flags: ${unknown.join(", ")}`);
    const exclusive = ["onlyStrict", "noStrict", "module"].filter((flag) => flags.has(flag));
    if (exclusive.length > 1) {
        throw new Error(`${filename}: contradictory Test262 execution flags: ${exclusive.join(", ")}`);
    }
    if (flags.has("raw") && flags.has("onlyStrict")) {
        throw new Error(`${filename}: raw cannot be combined with onlyStrict`);
    }
    if (flags.has("raw") && flags.has("noStrict")) {
        throw new Error(`${filename}: raw already implies noStrict and the pinned Test262 lint contract forbids the redundant combination`);
    }
    if (flags.has("raw") && flags.has("async")) {
        throw new Error(`${filename}: raw cannot be combined with async because raw forbids harness injection`);
    }
    if (flags.has("CanBlockIsFalse") && flags.has("CanBlockIsTrue")) {
        throw new Error(`${filename}: contradictory CanBlock flags`);
    }
    if (flags.has("module")) return ["module"];
    if (flags.has("raw")) return ["raw"];
    if (flags.has("onlyStrict")) return ["strict"];
    if (flags.has("noStrict")) return ["sloppy"];
    return ["sloppy", "strict"];
}

export function scenarioSource(source: string, mode: Test262Mode): string {
    return mode === "strict" ? `"use strict";\n${source}` : source;
}

export function parseFeatureRegistry(source: string): FeatureRegistry {
    let section: "proposed" | "standard" | "harness" | null = null;
    const proposed = new Set<string>();
    const standard = new Set<string>();
    const harness = new Set<string>();
    for (const rawLine of source.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (line.startsWith("## Proposed language features")) section = "proposed";
        else if (line.startsWith("## Standard language features")) section = "standard";
        else if (line.startsWith("## Test-Harness Features")) section = "harness";
        else if (line !== "" && !line.startsWith("#") && section) {
            const tag = line.replace(/\s+#.*$/, "").trim();
            if (tag === "") continue;
            if (/\s/.test(tag)) throw new Error(`invalid feature registry entry: ${rawLine}`);
            ({ proposed, standard, harness }[section]).add(tag);
        }
    }
    return { proposed, standard, harness, all: new Set([...proposed, ...standard, ...harness]) };
}
