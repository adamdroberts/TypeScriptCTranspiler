#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parse as parseHtml } from "parse5";
import {
    argumentValue,
    complianceDir,
    defaultCacheRoot,
    hasArgument,
    loadBaseline,
    sha256File,
    sha256Text,
    stableJson,
    verifyPinnedCheckout,
} from "./model";

export type ClauseClassification = "required" | "normative-optional" | "informative" | "example";

export interface ClauseRecord {
    id: string;
    title: string;
    kind: "clause" | "annex";
    parentId: string | null;
    rootId: string;
    depth: number;
    classification: ClauseClassification;
    legacy: boolean;
    references: string[];
}

export interface ClauseCatalog {
    schemaVersion: 1;
    standard: "ECMA-262";
    edition: 17;
    commit: string;
    tree: string;
    specSourceSha256: string;
    clauseSetSha256: string;
    clauses: ClauseRecord[];
    anchors: ClauseAnchor[];
}

interface HtmlNode {
    tagName?: string;
    attrs?: Array<{ name: string; value: string }>;
    childNodes?: HtmlNode[];
    content?: HtmlNode;
}

export function independentlyExtractClauseIds(source: string): string[] {
    const document = parseHtml(source) as unknown as HtmlNode;
    const ids = new Set<string>();
    const worklist: HtmlNode[] = [document];
    while (worklist.length > 0) {
        const node = worklist.pop()!;
        if (node.tagName === "emu-clause" || node.tagName === "emu-annex") {
            const id = node.attrs?.find((attribute) => attribute.name === "id")?.value;
            if (!id) throw new Error(`independent HTML parser found ${node.tagName} without an id`);
            if (ids.has(id)) throw new Error(`independent HTML parser found duplicate clause id ${id}`);
            ids.add(id);
        }
        if (node.content) worklist.push(node.content);
        for (const child of node.childNodes ?? []) worklist.push(child);
    }
    return [...ids].sort();
}

export interface ClauseAnchor {
    id: string;
    clauseId: string;
    source: "canonical-clause" | "oldid" | "element" | "production";
}

interface OpenClause {
    record: ClauseRecord;
    attributes: string;
    annexNormative: boolean;
    namespace: string | null;
}

function hasAttribute(attributes: string, name: string): boolean {
    return new RegExp(`(?:^|\\s)${name}(?:\\s|$|=|>)`, "i").test(attributes);
}

function decodeHtml(text: string): string {
    const named: Record<string, string> = {
        amp: "&",
        apos: "'",
        gt: ">",
        lt: "<",
        nbsp: " ",
        quot: "\"",
    };
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (full, entity: string) => {
        if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
        if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
        return named[entity.toLowerCase()] ?? full;
    });
}

function titleText(html: string): string {
    return decodeHtml(
        html
            .replace(/<emu-xref\b[^>]*>([\s\S]*?)<\/emu-xref>/gi, "$1")
            .replace(/<[^>]+>/g, "")
            .replace(/\*([^*]+)\*/g, "$1")
            .replace(/`([^`]+)`/g, "$1")
            .replace(/\s+/g, " ")
            .trim(),
    );
}

export function extractClauseCatalog(source: string): { clauses: ClauseRecord[]; anchors: ClauseAnchor[] } {
    const token = /<\/?(?:emu-clause|emu-annex)\b[^>]*>|<h1\b[^>]*>[\s\S]*?<\/h1>|<emu-grammar\b[^>]*>[\s\S]*?<\/emu-grammar>|<emu-xref\b[^>]*>|<(?!\/)[a-z][a-z0-9-]*\b[^>]*(?:\bid|\boldids)="[^"]+"[^>]*>/gi;
    const stack: OpenClause[] = [];
    const records: ClauseRecord[] = [];
    const ids = new Set<string>();
    const anchorById = new Map<string, ClauseAnchor>();
    const referenceAnchors = new Map<string, Set<string>>();
    const addAnchor = (id: string, clauseId: string, anchorSource: ClauseAnchor["source"]): void => {
        const existing = anchorById.get(id);
        if (existing) {
            if (existing.clauseId !== clauseId) {
                throw new Error(`specification anchor ${id} belongs to both ${existing.clauseId} and ${clauseId}`);
            }
            return;
        }
        anchorById.set(id, { id, clauseId, source: anchorSource });
    };
    for (const match of source.matchAll(token)) {
        const value = match[0];
        if (/^<\//.test(value)) {
            if (stack.length === 0) throw new Error(`unbalanced clause close near source offset ${match.index}`);
            const closed = stack.pop()!;
            if (closed.record.title === "") throw new Error(`clause ${closed.record.id} has no h1 title`);
            continue;
        }
        if (/^<h1\b/i.test(value)) {
            const open = stack.at(-1);
            if (open && open.record.title === "") {
                open.record.title = titleText(value.replace(/^<h1\b[^>]*>/i, "").replace(/<\/h1>$/i, ""));
            }
            continue;
        }
        if (/^<emu-grammar\b/i.test(value)) {
            const open = stack.at(-1);
            if (!open || !/\btype="definition"/i.test(value) || hasAttribute(value, "example")) continue;
            const body = value.replace(/^<emu-grammar\b[^>]*>/i, "").replace(/<\/emu-grammar>$/i, "");
            const production = /^\s*([A-Za-z][A-Za-z0-9]*)\s*(?:\[[^\]]*\])?\s*:/gm;
            for (const productionMatch of body.matchAll(production)) {
                const prefix = open.namespace ? `${open.namespace}-` : "";
                addAnchor(`prod-${prefix}${productionMatch[1]!}`, open.record.id, "production");
            }
            continue;
        }
        if (/^<emu-xref\b/i.test(value)) {
            const open = stack.at(-1);
            const target = value.match(/\bhref="#([^"]+)"/i)?.[1];
            if (open && target) {
                const references = referenceAnchors.get(open.record.id) ?? new Set<string>();
                references.add(target);
                referenceAnchors.set(open.record.id, references);
            }
            continue;
        }
        const opening = value.match(/^<(emu-clause|emu-annex)\b([^>]*)>/i);
        if (!opening) {
            const open = stack.at(-1);
            if (!open) continue;
            const id = value.match(/\bid="([^"]+)"/i)?.[1];
            if (id) addAnchor(id, open.record.id, "element");
            const oldids = value.match(/\boldids="([^"]+)"/i)?.[1];
            if (oldids) {
                for (const oldid of oldids.split(",").map((entry) => entry.trim()).filter(Boolean)) {
                    addAnchor(oldid, open.record.id, "oldid");
                }
            }
            continue;
        }
        const kind = opening[1]!.toLowerCase() === "emu-clause" ? "clause" : "annex";
        const attributes = opening[2] ?? "";
        const id = attributes.match(/\bid="([^"]+)"/i)?.[1];
        if (!id) throw new Error(`${kind} near source offset ${match.index} has no id`);
        if (ids.has(id)) throw new Error(`duplicate specification clause id ${id}`);
        ids.add(id);
        const parent = stack.at(-1);
        const annexNormative = kind === "annex"
            ? hasAttribute(attributes, "normative") || parent?.annexNormative === true
            : parent?.annexNormative === true;
        let classification: ClauseClassification;
        if (hasAttribute(attributes, "example") || parent?.record.classification === "example") {
            classification = "example";
        } else if (hasAttribute(attributes, "normative-optional") || parent?.record.classification === "normative-optional") {
            classification = "normative-optional";
        } else if ((kind === "annex" && !annexNormative) || parent?.record.classification === "informative") {
            classification = "informative";
        } else {
            classification = "required";
        }
        const record: ClauseRecord = {
            id,
            title: "",
            kind,
            parentId: parent?.record.id ?? null,
            rootId: parent?.record.rootId ?? id,
            depth: stack.length,
            classification,
            legacy: hasAttribute(attributes, "legacy") || parent?.record.legacy === true,
            references: [],
        };
        records.push(record);
        addAnchor(id, id, "canonical-clause");
        const oldids = attributes.match(/\boldids="([^"]+)"/i)?.[1];
        if (oldids) {
            for (const oldid of oldids.split(",").map((entry) => entry.trim()).filter(Boolean)) {
                addAnchor(oldid, id, "oldid");
            }
        }
        const namespace = attributes.match(/\bnamespace="([^"]+)"/i)?.[1] ?? parent?.namespace ?? null;
        stack.push({ record, attributes, annexNormative, namespace });
    }
    if (stack.length !== 0) throw new Error(`unclosed clause ${stack.at(-1)!.record.id}`);
    for (const record of records) {
        const references = new Set<string>();
        for (const target of referenceAnchors.get(record.id) ?? []) {
            const targetClause = anchorById.get(target)?.clauseId;
            if (targetClause && targetClause !== record.id) references.add(targetClause);
        }
        record.references = [...references].sort();
    }
    return { clauses: records, anchors: [...anchorById.values()].sort((a, b) => a.id.localeCompare(b.id)) };
}

export async function buildCatalog(specCheckout: string): Promise<ClauseCatalog> {
    const baseline = await loadBaseline();
    await verifyPinnedCheckout("ECMA-262", specCheckout, baseline.ecma262);
    const specPath = path.join(specCheckout, baseline.ecma262.specSource);
    const digest = await sha256File(specPath);
    if (digest !== baseline.ecma262.specSourceSha256) {
        throw new Error(`ECMA-262 source digest ${digest} does not match ${baseline.ecma262.specSourceSha256}`);
    }
    const source = await fs.readFile(specPath, "utf8");
    const { clauses, anchors } = extractClauseCatalog(source);
    const primaryIds = clauses.map((clause) => clause.id).sort();
    const independentIds = independentlyExtractClauseIds(source);
    if (JSON.stringify(primaryIds) !== JSON.stringify(independentIds)) {
        throw new Error("canonical clause-tree extraction differs from the independent HTML clause set");
    }
    return {
        schemaVersion: 1,
        standard: "ECMA-262",
        edition: 17,
        commit: baseline.ecma262.commit,
        tree: baseline.ecma262.tree,
        specSourceSha256: digest,
        clauseSetSha256: sha256Text(JSON.stringify(independentIds)),
        clauses,
        anchors,
    };
}

async function main(): Promise<void> {
    const specCheckout = path.resolve(argumentValue("--ecma262") ?? path.join(defaultCacheRoot, "ecma262"));
    const output = path.resolve(argumentValue("--output") ?? path.join(complianceDir, "clauses.json"));
    const catalog = await buildCatalog(specCheckout);
    const rendered = stableJson(catalog);
    if (hasArgument("--check")) {
        const existing = await fs.readFile(output, "utf8");
        if (existing !== rendered) throw new Error(`${output} is stale; regenerate it from the pinned specification`);
        console.log(`Pinned clause catalog is current: ${output}`);
        return;
    }
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, rendered, "utf8");
    console.log(`Wrote pinned clause catalog to ${output}`);
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(`spec catalog: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
