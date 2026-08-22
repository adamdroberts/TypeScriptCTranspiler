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
export type SpecificationChoiceKind = "implementation-defined" | "implementation-approximated" | "host-defined";

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
    schemaVersion: 4;
    standard: "ECMA-262";
    edition: 17;
    commit: string;
    tree: string;
    specSourceSha256: string;
    clauseSetSha256: string;
    choiceMarkerSetSha256: string;
    choiceObligationSetSha256: string;
    normativeOptionalMarkerSetSha256: string;
    normativeOptionalSiteSetSha256: string;
    normativeOptionalFamilySetSha256: string;
    xrefSetSha256: string;
    definitionSetSha256: string;
    clauses: ClauseRecord[];
    anchors: ClauseAnchor[];
    choiceObligations: ChoiceObligation[];
    normativeOptionalSubtrees: NormativeOptionalSubtree[];
    normativeOptionalSites: NormativeOptionalSite[];
    normativeOptionalFamilies: NormativeOptionalFamily[];
    xrefs: XrefRecord[];
    definitions: DefinitionRecord[];
}

export interface ChoiceObligation {
    id: string;
    kind: SpecificationChoiceKind;
    trigger: "marked-text" | "host-hook-declaration" | "host-layering-point";
    sourceClauseId: string;
    sourceAnchor: string;
    subjectClauseIds: string[];
    sourceOffset: number;
    endOffset: number;
    contextSha256: string;
}

export interface NormativeOptionalSubtree {
    rootClauseId: string;
    memberClauseIds: string[];
}

export interface NormativeOptionalSite {
    id: string;
    familyId: string;
    kind: "clause-subtree" | "html-subtree" | "algorithm-step";
    sourceClauseId: string;
    sourceAnchor: string;
    targetClauseIds: string[];
    affectedClauseIds: string[];
    sourceOffset: number;
    endOffset: number;
    contextSha256: string;
}

export interface NormativeOptionalFamily {
    id: string;
    kind: "normative-optional-clause" | "referenced-feature";
    featureClauseId: string;
    siteIds: string[];
    affectedClauseIds: string[];
    contextSha256: string;
}

export type NormativeProvenance = "normative" | "note" | "example" | "informative";

export interface XrefRecord {
    id: string;
    sourceClauseId: string;
    sourceAnchor: string;
    targetAnchor: string;
    targetClauseId: string | null;
    sourceOffset: number;
    endOffset: number;
    contextSha256: string;
    provenance: NormativeProvenance;
}

export interface DefinitionRecord {
    id: string;
    kind: "dfn" | "grammar-definition";
    sourceClauseId: string;
    sourceAnchor: string;
    sourceOffset: number;
    endOffset: number;
    contextStartOffset: number;
    contextEndOffset: number;
    contextSha256: string;
    provenance: NormativeProvenance;
}

export function isNormativeXrefBinding(
    xref: XrefRecord | undefined,
    sourceClauseId: string,
    targetClauseId: string,
): boolean {
    return xref?.provenance === "normative" &&
        xref.sourceClauseId === sourceClauseId &&
        xref.targetClauseId === targetClauseId;
}

export function isNormativeDefinitionBinding(
    definition: DefinitionRecord | undefined,
    sourceClauseId: string,
): boolean {
    return definition?.provenance === "normative" && definition.sourceClauseId === sourceClauseId;
}

interface HtmlNode {
    nodeName?: string;
    tagName?: string;
    attrs?: Array<{ name: string; value: string }>;
    childNodes?: HtmlNode[];
    content?: HtmlNode;
    value?: string;
    sourceCodeLocation?: {
        startOffset: number;
        endOffset: number;
        attrs?: Record<string, { startOffset: number; endOffset: number }>;
        startTag?: { startOffset: number; endOffset: number };
        endTag?: { startOffset: number; endOffset: number };
    };
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

interface ChoiceMarker {
    clauseId: string;
    kind: SpecificationChoiceKind;
    sourceOffset: number;
}

interface ChoiceMarkerDetail extends ChoiceMarker {
    endOffset: number;
    trigger: "marked-text" | "host-hook-declaration";
    sourceAnchor: string;
    contextSha256: string;
    underDefinition: boolean;
    underNote: boolean;
}

const choiceMarkerPattern = /\b(?:implementation-defined|implementation-approximated|host-defined)\b/gi;

function markerDetailsInSlice(
    source: string,
    startOffset: number,
    endOffset: number,
    clauseId: string,
    trigger: ChoiceMarkerDetail["trigger"],
    sourceAnchor: string,
    context: { startOffset: number; endOffset: number },
    underDefinition: boolean,
    underNote: boolean,
): ChoiceMarkerDetail[] {
    const markers: ChoiceMarkerDetail[] = [];
    const normalizedContext = source.slice(context.startOffset, context.endOffset).replace(/\s+/g, " ").trim();
    for (const match of source.slice(startOffset, endOffset).matchAll(choiceMarkerPattern)) {
        markers.push({
            clauseId,
            kind: match[0]!.toLowerCase() as SpecificationChoiceKind,
            sourceOffset: startOffset + match.index!,
            endOffset: startOffset + match.index! + match[0]!.length,
            trigger,
            sourceAnchor,
            contextSha256: sha256Text(normalizedContext),
            underDefinition,
            underNote,
        });
    }
    return markers;
}

function independentlyExtractChoiceMarkerDetails(source: string): ChoiceMarkerDetail[] {
    const document = parseHtml(source, { sourceCodeLocationInfo: true }) as unknown as HtmlNode;
    const markers: ChoiceMarkerDetail[] = [];
    const contextTags = new Set(["p", "li", "dd", "td", "emu-alg", "h1"]);
    const visit = (
        node: HtmlNode,
        containingClause: string | null,
        containingAnchor: string | null,
        context: { startOffset: number; endOffset: number } | null,
        underDefinition: boolean,
        underNote: boolean,
    ): void => {
        const isClause = node.tagName === "emu-clause" || node.tagName === "emu-annex";
        const clauseId = isClause
            ? node.attrs?.find((attribute) => attribute.name === "id")?.value ?? null
            : containingClause;
        if (isClause && !clauseId) throw new Error(`${node.tagName} has no id while extracting choice obligations`);
        const ownId = node.attrs?.find((attribute) => attribute.name === "id")?.value;
        const sourceAnchor = ownId ?? containingAnchor ?? clauseId;
        const nextContext = node.tagName && contextTags.has(node.tagName) && node.sourceCodeLocation
            ? { startOffset: node.sourceCodeLocation.startOffset, endOffset: node.sourceCodeLocation.endOffset }
            : context;
        const nextUnderDefinition = underDefinition || node.tagName === "dfn";
        const nextUnderNote = underNote || node.tagName === "emu-note";
        if (clauseId && isClause) {
            const typeLocation = node.sourceCodeLocation?.attrs?.type;
            if (typeLocation) markers.push(...markerDetailsInSlice(
                source,
                typeLocation.startOffset,
                typeLocation.endOffset,
                clauseId,
                "host-hook-declaration",
                sourceAnchor!,
                typeLocation,
                nextUnderDefinition,
                nextUnderNote,
            ));
        }
        if (clauseId && node.nodeName === "#text" && node.sourceCodeLocation) {
            markers.push(...markerDetailsInSlice(
                source,
                node.sourceCodeLocation.startOffset,
                node.sourceCodeLocation.endOffset,
                clauseId,
                "marked-text",
                sourceAnchor!,
                nextContext ?? node.sourceCodeLocation,
                nextUnderDefinition,
                nextUnderNote,
            ));
        }
        if (node.content) visit(node.content, clauseId, sourceAnchor, nextContext, nextUnderDefinition, nextUnderNote);
        for (const child of node.childNodes ?? []) {
            visit(child, clauseId, sourceAnchor, nextContext, nextUnderDefinition, nextUnderNote);
        }
    };
    visit(document, null, null, null, false, false);
    return markers.sort((left, right) => left.sourceOffset - right.sourceOffset || left.kind.localeCompare(right.kind));
}

export function independentlyExtractChoiceMarkers(source: string): ChoiceMarker[] {
    return independentlyExtractChoiceMarkerDetails(source).map(({ clauseId, kind, sourceOffset }) => ({
        clauseId,
        kind,
        sourceOffset,
    }));
}

export interface ClauseAnchor {
    id: string;
    clauseId: string;
    source: "canonical-clause" | "oldid" | "element" | "production" | "algorithm-step";
}

interface OpenClause {
    record: ClauseRecord;
    attributes: string;
    annexNormative: boolean;
    namespace: string | null;
    startOffset: number;
}

interface ClauseInterval {
    id: string;
    startOffset: number;
    endOffset: number;
}

interface AlgorithmStepInterval {
    id: string;
    clauseId: string;
    startOffset: number;
    endOffset: number;
}

function extractAlgorithmStepIntervals(
    source: string,
    clauseIntervals: readonly ClauseInterval[],
): AlgorithmStepInterval[] {
    const clausesByWidth = [...clauseIntervals].sort(
        (left, right) => (left.endOffset - left.startOffset) - (right.endOffset - right.startOffset),
    );
    const steps: AlgorithmStepInterval[] = [];
    const ids = new Set<string>();
    const annotation = /(?:^|<emu-alg\b[^>]*>)([ \t]*)(\d+\.\s+\[([^\]\r\n]*\bid="([^"]+)"[^\]\r\n]*)\])/gmi;
    for (const match of source.matchAll(annotation)) {
        const id = match[4]!;
        if (ids.has(id)) throw new Error(`duplicate algorithm step anchor ${id}`);
        ids.add(id);
        const stepStart = match.index! + match[0]!.lastIndexOf(match[2]!);
        const lineEndMatch = source.indexOf("\n", stepStart);
        const lineEnd = lineEndMatch < 0 ? source.length : lineEndMatch;
        const algorithmEndMatch = source.indexOf("</emu-alg", stepStart);
        if (algorithmEndMatch < 0) throw new Error(`algorithm step ${id} has no containing emu-alg end tag`);
        const indentation = match[1]!.replace(/\t/g, "    ").length;
        let endOffset = algorithmEndMatch;
        let cursor = lineEndMatch < 0 ? source.length : lineEndMatch + 1;
        while (cursor < algorithmEndMatch) {
            const nextLineEndMatch = source.indexOf("\n", cursor);
            const nextLineEnd = nextLineEndMatch < 0 ? source.length : Math.min(nextLineEndMatch, algorithmEndMatch);
            const nextStep = source.slice(cursor, nextLineEnd).match(/^([ \t]*)\d+\.\s+/);
            if (nextStep && nextStep[1]!.replace(/\t/g, "    ").length <= indentation) {
                endOffset = cursor;
                break;
            }
            if (nextLineEndMatch < 0 || nextLineEnd >= algorithmEndMatch) break;
            cursor = nextLineEndMatch + 1;
        }
        const containing = clausesByWidth.find(
            (interval) => interval.startOffset <= stepStart && stepStart < interval.endOffset,
        );
        if (!containing) throw new Error(`algorithm step ${id} is not contained by a clause`);
        steps.push({ id, clauseId: containing.id, startOffset: stepStart, endOffset });
    }
    return steps.sort((left, right) => left.startOffset - right.startOffset);
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

function primaryChoiceMarkers(source: string, intervals: readonly ClauseInterval[]): ChoiceMarker[] {
    const markers: ChoiceMarker[] = [];
    const clauseAt = (offset: number): string | null => {
        let selected: ClauseInterval | undefined;
        for (const interval of intervals) {
            if (interval.startOffset <= offset && offset < interval.endOffset && (!selected || interval.startOffset > selected.startOffset)) {
                selected = interval;
            }
        }
        return selected?.id ?? null;
    };
    const addSlice = (startOffset: number, endOffset: number): void => {
        for (const match of source.slice(startOffset, endOffset).matchAll(choiceMarkerPattern)) {
            const sourceOffset = startOffset + match.index!;
            const clauseId = clauseAt(sourceOffset);
            if (!clauseId) continue;
            markers.push({
                clauseId,
                kind: match[0]!.toLowerCase() as SpecificationChoiceKind,
                sourceOffset,
            });
        }
    };
    let cursor = 0;
    while (cursor < source.length) {
        if (source.startsWith("<!--", cursor)) {
            const end = source.indexOf("-->", cursor + 4);
            cursor = end < 0 ? source.length : end + 3;
            continue;
        }
        if (source[cursor] !== "<") {
            const end = source.indexOf("<", cursor);
            addSlice(cursor, end < 0 ? source.length : end);
            cursor = end < 0 ? source.length : end;
            continue;
        }
        let end = cursor + 1;
        let quote: string | null = null;
        while (end < source.length) {
            const character = source[end]!;
            if (quote) {
                if (character === quote) quote = null;
            } else if (character === "\"" || character === "'") {
                quote = character;
            } else if (character === ">") {
                end++;
                break;
            }
            end++;
        }
        const tag = source.slice(cursor, end);
        if (/^<emu-(?:clause|annex)\b/i.test(tag)) {
            const type = /\btype\s*=\s*(?:"[^"]*"|'[^']*')/i.exec(tag);
            if (type) addSlice(cursor + type.index, cursor + type.index + type[0].length);
        }
        cursor = end;
    }
    return markers.sort((left, right) => left.sourceOffset - right.sourceOffset || left.kind.localeCompare(right.kind));
}

function choiceObligationId(obligation: Omit<ChoiceObligation, "id">): string {
    return `choice-${sha256Text(JSON.stringify(obligation))}`;
}

function hostLayeringObligations(
    source: string,
    clauses: readonly ClauseRecord[],
    anchors: ReadonlyMap<string, ClauseAnchor>,
): ChoiceObligation[] {
    const document = parseHtml(source, { sourceCodeLocationInfo: true }) as unknown as HtmlNode;
    const clauseById = new Map(clauses.map((clause) => [clause.id, clause]));
    const clauseByLowerId = new Map(clauses.map((clause) => [clause.id.toLowerCase(), clause]));
    const clauseByOperation = new Map<string, ClauseRecord[]>();
    for (const clause of clauses) {
        const operation = clause.title.match(/^([A-Za-z][A-Za-z0-9]*)\b/)?.[1]?.toLowerCase();
        if (!operation) continue;
        const matches = clauseByOperation.get(operation) ?? [];
        matches.push(clause);
        clauseByOperation.set(operation, matches);
    }
    const obligations: ChoiceObligation[] = [];
    const collectXrefs = (node: HtmlNode, targets: Set<string>): void => {
        if (node.tagName === "emu-xref") {
            const href = node.attrs?.find((attribute) => attribute.name === "href")?.value;
            if (href?.startsWith("#")) {
                const target = anchors.get(href.slice(1))?.clauseId;
                const clause = target ? clauseById.get(target) : undefined;
                if (clause?.classification === "required" || clause?.classification === "normative-optional") {
                    targets.add(clause.id);
                }
            }
        }
        if (node.content) collectXrefs(node.content, targets);
        for (const child of node.childNodes ?? []) collectXrefs(child, targets);
    };
    const visit = (node: HtmlNode, clausePath: readonly string[]): void => {
        const isClause = node.tagName === "emu-clause" || node.tagName === "emu-annex";
        const ownClause = isClause ? node.attrs?.find((attribute) => attribute.name === "id")?.value : undefined;
        const nextPath = ownClause ? [...clausePath, ownClause] : clausePath;
        if (
            node.tagName === "p" &&
            nextPath.length === 2 &&
            nextPath[0] === "sec-host-layering-points" &&
            node.sourceCodeLocation
        ) {
            const targets = new Set<string>();
            collectXrefs(node, targets);
            const context = source.slice(node.sourceCodeLocation.startOffset, node.sourceCodeLocation.endOffset);
            const hook = context.match(/\b((?:Host|InitializeHostDefined)[A-Za-z0-9]+)\s*\(/)?.[1];
            if (hook) {
                const idTarget = clauseByLowerId.get(`sec-${hook.toLowerCase()}`);
                const operationTargets = clauseByOperation.get(hook.toLowerCase()) ?? [];
                const candidates = [...new Map(
                    [idTarget, ...operationTargets]
                        .filter((candidate): candidate is ClauseRecord => candidate !== undefined)
                        .map((candidate) => [candidate.id, candidate]),
                ).values()].filter((candidate) =>
                    candidate.classification === "required" || candidate.classification === "normative-optional",
                );
                if (candidates.length !== 1) {
                    throw new Error(`Host Layering Points entry ${hook} has no unique normative target clause`);
                }
                targets.add(candidates[0]!.id);
            }
            if (targets.size === 0) {
                throw new Error(`Host Layering Points entry at source offset ${node.sourceCodeLocation.startOffset} has no normative target`);
            }
            const withoutId: Omit<ChoiceObligation, "id"> = {
                kind: "host-defined",
                trigger: "host-layering-point",
                sourceClauseId: nextPath[1]!,
                sourceAnchor: nextPath[1]!,
                subjectClauseIds: [...targets].sort(),
                sourceOffset: node.sourceCodeLocation.startOffset,
                endOffset: node.sourceCodeLocation.endOffset,
                contextSha256: sha256Text(context.replace(/\s+/g, " ").trim()),
            };
            obligations.push({ id: choiceObligationId(withoutId), ...withoutId });
        }
        if (node.content) visit(node.content, nextPath);
        for (const child of node.childNodes ?? []) visit(child, nextPath);
    };
    visit(document, []);
    return obligations.sort((left, right) => left.sourceOffset - right.sourceOffset);
}

function normativeOptionalSubtrees(clauses: readonly ClauseRecord[]): NormativeOptionalSubtree[] {
    const clauseById = new Map(clauses.map((clause) => [clause.id, clause]));
    const rootFor = (clause: ClauseRecord): string | null => {
        if (clause.classification !== "normative-optional") return null;
        let current = clause;
        while (current.parentId && clauseById.get(current.parentId)?.classification === "normative-optional") {
            current = clauseById.get(current.parentId)!;
        }
        return current.id;
    };
    const members = new Map<string, string[]>();
    for (const clause of clauses) {
        const root = rootFor(clause);
        if (!root) continue;
        const values = members.get(root) ?? [];
        values.push(clause.id);
        members.set(root, values);
    }
    const result = [...members]
        .map(([rootClauseId, memberClauseIds]) => ({ rootClauseId, memberClauseIds: memberClauseIds.sort() }))
        .sort((left, right) => left.rootClauseId.localeCompare(right.rootClauseId));
    const accounted = new Set(result.flatMap((subtree) => subtree.memberClauseIds));
    const expected = clauses.filter((clause) => clause.classification === "normative-optional").map((clause) => clause.id);
    if (accounted.size !== expected.length || expected.some((clause) => !accounted.has(clause))) {
        throw new Error("normative-optional subtree extraction does not account for every optional clause exactly once");
    }
    return result;
}

interface OptionalMarkerAudit {
    sourceOffset: number;
    role: "site" | "example" | "identifier" | "non-normative";
}

type RawNormativeOptionalSite = Omit<NormativeOptionalSite, "familyId">;

function algorithmStepContext(
    source: string,
    sourceOffset: number,
    algorithm: { startOffset: number; endOffset: number },
): { sourceAnchor: string; startOffset: number; endOffset: number; context: string } {
    const lineStart = source.lastIndexOf("\n", sourceOffset) + 1;
    const lineEndMatch = source.indexOf("\n", sourceOffset);
    const lineEnd = lineEndMatch < 0 ? source.length : lineEndMatch;
    const stepSearchStart = Math.max(lineStart, algorithm.startOffset);
    const line = source.slice(stepSearchStart, lineEnd);
    const annotation = line.match(/^([ \t]*)\d+\.\s+\[([^\]]*\bnormative-optional\b[^\]]*)\]/i);
    const sourceAnchor = annotation?.[2]?.match(/\bid="([^"]+)"/i)?.[1];
    if (!annotation || !sourceAnchor) {
        throw new Error(`normative-optional algorithm step at ${sourceOffset} has no explicit step id`);
    }
    const indentation = annotation[1]!.replace(/\t/g, "    ").length;
    let endOffset = algorithm.endOffset;
    let cursor = lineEndMatch < 0 ? source.length : lineEndMatch + 1;
    while (cursor < algorithm.endOffset) {
        const nextLineEndMatch = source.indexOf("\n", cursor);
        const nextLineEnd = nextLineEndMatch < 0 ? source.length : Math.min(nextLineEndMatch, algorithm.endOffset);
        const nextLine = source.slice(cursor, nextLineEnd);
        const nextStep = nextLine.match(/^([ \t]*)\d+\.\s+/);
        if (nextStep && nextStep[1]!.replace(/\t/g, "    ").length <= indentation) {
            endOffset = cursor;
            break;
        }
        if (nextLineEndMatch < 0 || nextLineEnd >= algorithm.endOffset) break;
        cursor = nextLineEndMatch + 1;
    }
    const stepStart = stepSearchStart + (annotation.index ?? 0);
    const context = source.slice(stepStart, endOffset).trimEnd();
    return { sourceAnchor, startOffset: stepStart, endOffset: stepStart + context.length, context };
}

function buildNormativeOptionalFamilies(
    rawSites: readonly RawNormativeOptionalSite[],
    clauses: readonly ClauseRecord[],
): { sites: NormativeOptionalSite[]; families: NormativeOptionalFamily[] } {
    const clauseById = new Map(clauses.map((clause) => [clause.id, clause]));
    const sitesByFeature = new Map<string, RawNormativeOptionalSite[]>();
    for (const site of rawSites) {
        if (site.targetClauseIds.length !== 1) {
            throw new Error(`normative-optional site ${site.id} does not identify one exact feature clause`);
        }
        const featureClauseId = site.targetClauseIds[0]!;
        const familySites = sitesByFeature.get(featureClauseId) ?? [];
        familySites.push(site);
        sitesByFeature.set(featureClauseId, familySites);
    }
    const families: NormativeOptionalFamily[] = [];
    const familyBySite = new Map<string, string>();
    for (const [featureClauseId, unorderedSites] of sitesByFeature) {
        const familySites = [...unorderedSites].sort((left, right) => left.sourceOffset - right.sourceOffset);
        const siteIds = familySites.map((site) => site.id);
        const affectedClauseIds = [...new Set(familySites.flatMap((site) => site.affectedClauseIds))].sort();
        const withoutId: Omit<NormativeOptionalFamily, "id"> = {
            kind: clauseById.get(featureClauseId)?.classification === "normative-optional"
                ? "normative-optional-clause"
                : "referenced-feature",
            featureClauseId,
            siteIds,
            affectedClauseIds,
            contextSha256: sha256Text(JSON.stringify(familySites.map((site) => ({
                id: site.id,
                contextSha256: site.contextSha256,
            })))),
        };
        const id = `optional-family-${sha256Text(JSON.stringify(withoutId))}`;
        families.push({ id, ...withoutId });
        for (const site of familySites) {
            if (familyBySite.has(site.id)) throw new Error(`normative-optional site ${site.id} belongs to multiple families`);
            familyBySite.set(site.id, id);
        }
    }
    const sites = rawSites.map((site) => {
        const familyId = familyBySite.get(site.id);
        if (!familyId) throw new Error(`normative-optional site ${site.id} has no atomic family`);
        return { ...site, familyId };
    }).sort((left, right) => left.id.localeCompare(right.id));
    families.sort((left, right) => left.id.localeCompare(right.id));
    if (new Set(families.flatMap((family) => family.siteIds)).size !== sites.length) {
        throw new Error("normative-optional families do not exactly partition the site set");
    }
    return { sites, families };
}

function extractSpecificationRecords(
    source: string,
    clauses: readonly ClauseRecord[],
    anchors: ReadonlyMap<string, ClauseAnchor>,
    algorithmSteps: readonly AlgorithmStepInterval[],
    clauseIntervals: readonly ClauseInterval[],
): { xrefs: XrefRecord[]; definitions: DefinitionRecord[] } {
    const document = parseHtml(source, { sourceCodeLocationInfo: true }) as unknown as HtmlNode;
    const clauseById = new Map(clauses.map((clause) => [clause.id, clause]));
    const stepsByWidth = [...algorithmSteps].sort(
        (left, right) => (left.endOffset - left.startOffset) - (right.endOffset - right.startOffset),
    );
    const xrefs: XrefRecord[] = [];
    const definitions: DefinitionRecord[] = [];
    const contextTags = new Set(["p", "li", "dd", "td", "emu-alg", "h1"]);
    const provenanceFor = (clauseId: string, underNote: boolean, underExample: boolean): NormativeProvenance => {
        if (underExample || clauseById.get(clauseId)?.classification === "example") return "example";
        if (underNote) return "note";
        if (clauseById.get(clauseId)?.classification === "informative") return "informative";
        return "normative";
    };
    const visit = (
        node: HtmlNode,
        containingClause: string | null,
        containingAnchor: string | null,
        context: { startOffset: number; endOffset: number } | null,
        underNote: boolean,
        underExample: boolean,
    ): void => {
        const isClause = node.tagName === "emu-clause" || node.tagName === "emu-annex";
        const clauseId = isClause
            ? node.attrs?.find((attribute) => attribute.name === "id")?.value ?? null
            : containingClause;
        const ownId = node.attrs?.find((attribute) => attribute.name === "id")?.value;
        const sourceAnchor = ownId ?? containingAnchor ?? clauseId;
        const nextContext = node.tagName && contextTags.has(node.tagName) && node.sourceCodeLocation
            ? { startOffset: node.sourceCodeLocation.startOffset, endOffset: node.sourceCodeLocation.endOffset }
            : context;
        const nextUnderNote = underNote || node.tagName === "emu-note";
        const nextUnderExample = underExample ||
            node.attrs?.some((attribute) => attribute.name === "example") === true;
        if (clauseId && sourceAnchor && node.sourceCodeLocation) {
            const step = stepsByWidth.find((candidate) =>
                candidate.startOffset <= node.sourceCodeLocation!.startOffset &&
                node.sourceCodeLocation!.endOffset <= candidate.endOffset
            );
            const exactAnchor = step?.id ?? sourceAnchor;
            const exactContext = step ?? nextContext ?? node.sourceCodeLocation;
            const provenance = provenanceFor(clauseId, nextUnderNote, nextUnderExample);
            if (node.tagName === "emu-xref") {
                const href = node.attrs?.find((attribute) => attribute.name === "href")?.value;
                if (href?.startsWith("#")) {
                    const targetAnchor = href.slice(1);
                    const withoutId: Omit<XrefRecord, "id"> = {
                        sourceClauseId: clauseId,
                        sourceAnchor: exactAnchor,
                        targetAnchor,
                        targetClauseId: anchors.get(targetAnchor)?.clauseId ?? null,
                        sourceOffset: node.sourceCodeLocation.startOffset,
                        endOffset: node.sourceCodeLocation.endOffset,
                        contextSha256: sha256Text(
                            source.slice(exactContext.startOffset, exactContext.endOffset).replace(/\s+/g, " ").trim(),
                        ),
                        provenance,
                    };
                    xrefs.push({ id: `xref-${sha256Text(JSON.stringify(withoutId))}`, ...withoutId });
                }
            }
            const grammarDefinition = node.tagName === "emu-grammar" &&
                node.attrs?.some((attribute) => attribute.name === "type" && attribute.value === "definition");
            if (node.tagName === "dfn" || grammarDefinition) {
                const definitionContext = node.tagName === "dfn" ? exactContext : node.sourceCodeLocation;
                const withoutId: Omit<DefinitionRecord, "id"> = {
                    kind: node.tagName === "dfn" ? "dfn" : "grammar-definition",
                    sourceClauseId: clauseId,
                    sourceAnchor: exactAnchor,
                    sourceOffset: node.sourceCodeLocation.startOffset,
                    endOffset: node.sourceCodeLocation.endOffset,
                    contextStartOffset: definitionContext.startOffset,
                    contextEndOffset: definitionContext.endOffset,
                    contextSha256: sha256Text(
                        source.slice(definitionContext.startOffset, definitionContext.endOffset)
                            .replace(/\s+/g, " ")
                            .trim(),
                    ),
                    provenance,
                };
                definitions.push({ id: `definition-${sha256Text(JSON.stringify(withoutId))}`, ...withoutId });
            }
        }
        if (node.content) visit(node.content, clauseId, sourceAnchor, nextContext, nextUnderNote, nextUnderExample);
        for (const child of node.childNodes ?? []) {
            visit(child, clauseId, sourceAnchor, nextContext, nextUnderNote, nextUnderExample);
        }
    };
    visit(document, null, null, null, false, false);
    xrefs.sort((left, right) => left.sourceOffset - right.sourceOffset);
    definitions.sort((left, right) => left.sourceOffset - right.sourceOffset);
    const lexicalXrefs = [...source.matchAll(/<emu-xref\b[^>]*\bhref="#[^"]+"[^>]*>/gi)]
        .map((match) => match.index!)
        .filter((offset) => clauseIntervals.some((interval) =>
            interval.startOffset <= offset && offset < interval.endOffset
        ));
    const lexicalDefinitions = [
        ...[...source.matchAll(/<dfn\b[^>]*>/gi)].map((match) => match.index!),
        ...[...source.matchAll(/<emu-grammar\b[^>]*\btype="definition"[^>]*>/gi)].map((match) => match.index!),
    ].sort((left, right) => left - right);
    if (
        xrefs.length !== lexicalXrefs.length ||
        xrefs.some((xref, index) => xref.sourceOffset !== lexicalXrefs[index])
    ) {
        throw new Error("HTML xref extraction differs from the independent lexical xref set");
    }
    if (
        definitions.length !== lexicalDefinitions.length ||
        definitions.some((definition, index) => definition.sourceOffset !== lexicalDefinitions[index])
    ) {
        throw new Error("HTML definition extraction differs from the independent lexical definition set");
    }
    if (new Set(xrefs.map((xref) => xref.id)).size !== xrefs.length) throw new Error("xref record IDs are not unique");
    if (new Set(definitions.map((definition) => definition.id)).size !== definitions.length) {
        throw new Error("definition record IDs are not unique");
    }
    return { xrefs, definitions };
}

function normativeOptionalCatalog(
    source: string,
    clauses: readonly ClauseRecord[],
    anchors: ReadonlyMap<string, ClauseAnchor>,
    optionalSubtrees: readonly NormativeOptionalSubtree[],
): { markerAudit: OptionalMarkerAudit[]; sites: NormativeOptionalSite[]; families: NormativeOptionalFamily[] } {
    const document = parseHtml(source, { sourceCodeLocationInfo: true }) as unknown as HtmlNode;
    const clauseById = new Map(clauses.map((clause) => [clause.id, clause]));
    const optionalSubtreeByRoot = new Map(optionalSubtrees.map((subtree) => [subtree.rootClauseId, subtree]));
    const descendants = (root: string): string[] => clauses
        .filter((candidate) => {
            let current: ClauseRecord | undefined = candidate;
            while (current) {
                if (current.id === root) return true;
                current = current.parentId ? clauseById.get(current.parentId) : undefined;
            }
            return false;
        })
        .filter((candidate) => candidate.classification === "required" || candidate.classification === "normative-optional")
        .map((candidate) => candidate.id);
    const targetClauses = (context: string): string[] => {
        const targets = new Set<string>();
        for (const match of context.matchAll(/<emu-xref\b[^>]*\bhref="#([^"]+)"[^>]*>/gi)) {
            const target = anchors.get(match[1]!)?.clauseId;
            const clause = target ? clauseById.get(target) : undefined;
            if (clause?.classification === "required" || clause?.classification === "normative-optional") {
                targets.add(clause.id);
            }
        }
        return [...targets].sort();
    };
    const markerAudit: OptionalMarkerAudit[] = [];
    const sites: RawNormativeOptionalSite[] = [];
    const addSite = (withoutId: Omit<RawNormativeOptionalSite, "id">): void => {
        const id = `optional-${sha256Text(JSON.stringify(withoutId))}`;
        sites.push({ id, ...withoutId });
    };
    const visit = (
        node: HtmlNode,
        containingClause: string | null,
        containingAnchor: string | null,
        containingAlgorithm: { startOffset: number; endOffset: number } | null,
        inStyle: boolean,
        containingBlock: { startOffset: number; endOffset: number } | null,
    ): void => {
        const isClause = node.tagName === "emu-clause" || node.tagName === "emu-annex";
        const ownClause = isClause ? node.attrs?.find((attribute) => attribute.name === "id")?.value : undefined;
        const clauseId = ownClause ?? containingClause;
        const ownId = node.attrs?.find((attribute) => attribute.name === "id")?.value;
        const sourceAnchor = ownId ?? containingAnchor ?? clauseId;
        const clause = clauseId ? clauseById.get(clauseId) : undefined;
        const example = clause?.classification === "example";
        const currentBlock = node.tagName && ["p", "li"].includes(node.tagName) && node.sourceCodeLocation
            ? { startOffset: node.sourceCodeLocation.startOffset, endOffset: node.sourceCodeLocation.endOffset }
            : containingBlock;
        for (const attribute of node.attrs ?? []) {
            const location = node.sourceCodeLocation?.attrs?.[attribute.name];
            if (!location) continue;
            for (const match of source.slice(location.startOffset, location.endOffset).matchAll(/\bnormative-optional\b/gi)) {
                const sourceOffset = location.startOffset + match.index!;
                if (attribute.name !== "normative-optional") {
                    markerAudit.push({ sourceOffset, role: "identifier" });
                    continue;
                }
                if (example) {
                    markerAudit.push({ sourceOffset, role: "example" });
                    continue;
                }
                if (!clauseId || !sourceAnchor || !node.sourceCodeLocation) {
                    throw new Error(`normative-optional attribute at ${sourceOffset} has no exact clause/anchor context`);
                }
                markerAudit.push({ sourceOffset, role: "site" });
                const subtree = isClause ? optionalSubtreeByRoot.get(clauseId) : undefined;
                const contextLocation = isClause
                    ? node.sourceCodeLocation
                    : currentBlock ?? node.sourceCodeLocation;
                const context = source.slice(contextLocation.startOffset, contextLocation.endOffset);
                const targets = targetClauses(context);
                if (!isClause && targets.length !== 1) {
                    throw new Error(`inline normative-optional site at ${sourceOffset} does not have one exact normative target in its enclosing block`);
                }
                const targetClauseIds = isClause ? [clauseId] : targets;
                const affected = new Set<string>(subtree?.memberClauseIds ?? [
                    clauseId,
                    ...targetClauseIds.flatMap((target) => descendants(target)),
                ]);
                addSite({
                    kind: isClause ? "clause-subtree" : "html-subtree",
                    sourceClauseId: clauseId,
                    sourceAnchor,
                    targetClauseIds,
                    affectedClauseIds: [...affected].sort(),
                    sourceOffset,
                    endOffset: contextLocation.endOffset,
                    contextSha256: sha256Text(context.replace(/\s+/g, " ").trim()),
                });
            }
        }
        if ((node.nodeName === "#text" || node.nodeName === "#comment") && node.sourceCodeLocation) {
            const start = node.sourceCodeLocation.startOffset;
            const end = node.sourceCodeLocation.endOffset;
            for (const match of source.slice(start, end).matchAll(/\bnormative-optional\b/gi)) {
                const sourceOffset = start + match.index!;
                if (example) {
                    markerAudit.push({ sourceOffset, role: "example" });
                    continue;
                }
                if (inStyle || node.nodeName === "#comment" || !clauseId) {
                    markerAudit.push({ sourceOffset, role: "non-normative" });
                    continue;
                }
                const lineStart = source.lastIndexOf("\n", sourceOffset) + 1;
                const lineEndMatch = source.indexOf("\n", sourceOffset);
                const lineEnd = lineEndMatch < 0 ? source.length : lineEndMatch;
                const line = source.slice(Math.max(lineStart, containingAlgorithm?.startOffset ?? lineStart), lineEnd);
                if (!containingAlgorithm || !/^\s*\d+\.\s+\[[^\]]*\bnormative-optional\b[^\]]*\]/i.test(line)) {
                    throw new Error(`unclassified normative-optional marker at source offset ${sourceOffset}`);
                }
                markerAudit.push({ sourceOffset, role: "site" });
                const targets = targetClauses(line);
                if (targets.length !== 1) {
                    throw new Error(`normative-optional algorithm step at ${sourceOffset} does not have one exact normative target`);
                }
                const step = algorithmStepContext(source, sourceOffset, containingAlgorithm);
                if (anchors.get(step.sourceAnchor)?.clauseId !== clauseId) {
                    throw new Error(`normative-optional algorithm step anchor ${step.sourceAnchor} is not bound to ${clauseId}`);
                }
                const affected = new Set([clauseId, ...targets.flatMap((target) => descendants(target))]);
                addSite({
                    kind: "algorithm-step",
                    sourceClauseId: clauseId,
                    sourceAnchor: step.sourceAnchor,
                    targetClauseIds: targets,
                    affectedClauseIds: [...affected].sort(),
                    sourceOffset,
                    endOffset: step.endOffset,
                    contextSha256: sha256Text(step.context.replace(/\s+/g, " ").trim()),
                });
            }
        }
        const nextAlgorithm = node.tagName === "emu-alg" && node.sourceCodeLocation
            ? {
                startOffset: node.sourceCodeLocation.startTag?.endOffset ?? node.sourceCodeLocation.startOffset,
                endOffset: node.sourceCodeLocation.endTag?.startOffset ?? node.sourceCodeLocation.endOffset,
            }
            : containingAlgorithm;
        const nextInStyle = inStyle || node.tagName === "style";
        if (node.content) visit(node.content, clauseId, sourceAnchor, nextAlgorithm, nextInStyle, currentBlock);
        for (const child of node.childNodes ?? []) {
            visit(child, clauseId, sourceAnchor, nextAlgorithm, nextInStyle, currentBlock);
        }
    };
    visit(document, null, null, null, false, null);
    markerAudit.sort((left, right) => left.sourceOffset - right.sourceOffset);
    const lexicalOffsets = [...source.matchAll(/\bnormative-optional\b/gi)].map((match) => match.index!);
    if (
        markerAudit.length !== lexicalOffsets.length ||
        markerAudit.some((marker, index) => marker.sourceOffset !== lexicalOffsets[index])
    ) {
        throw new Error("HTML/algorithm normative-optional extraction differs from the independent lexical marker set");
    }
    if (new Set(sites.map((site) => site.id)).size !== sites.length) {
        throw new Error("normative-optional site IDs are not unique");
    }
    const familyCatalog = buildNormativeOptionalFamilies(sites, clauses);
    return { markerAudit, ...familyCatalog };
}

export function extractClauseCatalog(source: string): {
    clauses: ClauseRecord[];
    anchors: ClauseAnchor[];
    choiceObligations: ChoiceObligation[];
    choiceMarkerSetSha256: string;
    normativeOptionalSubtrees: NormativeOptionalSubtree[];
    normativeOptionalMarkerSetSha256: string;
    normativeOptionalSites: NormativeOptionalSite[];
    normativeOptionalFamilies: NormativeOptionalFamily[];
    xrefs: XrefRecord[];
    definitions: DefinitionRecord[];
} {
    const token = /<\/?(?:emu-clause|emu-annex)\b[^>]*>|<h1\b[^>]*>[\s\S]*?<\/h1>|<emu-grammar\b[^>]*>[\s\S]*?<\/emu-grammar>|<emu-xref\b[^>]*>|<(?!\/)[a-z][a-z0-9-]*\b[^>]*(?:\bid|\boldids)="[^"]+"[^>]*>/gi;
    const stack: OpenClause[] = [];
    const records: ClauseRecord[] = [];
    const ids = new Set<string>();
    const anchorById = new Map<string, ClauseAnchor>();
    const intervals: ClauseInterval[] = [];
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
            intervals.push({ id: closed.record.id, startOffset: closed.startOffset, endOffset: match.index! + value.length });
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
        stack.push({ record, attributes, annexNormative, namespace, startOffset: match.index! });
    }
    if (stack.length !== 0) throw new Error(`unclosed clause ${stack.at(-1)!.record.id}`);
    const algorithmSteps = extractAlgorithmStepIntervals(source, intervals);
    for (const step of algorithmSteps) addAnchor(step.id, step.clauseId, "algorithm-step");
    const specificationRecords = extractSpecificationRecords(source, records, anchorById, algorithmSteps, intervals);
    for (const record of records) {
        const references = new Set(specificationRecords.xrefs
            .filter((xref) =>
                xref.provenance === "normative" &&
                xref.sourceClauseId === record.id &&
                xref.targetClauseId !== null &&
                xref.targetClauseId !== record.id
            )
            .map((xref) => xref.targetClauseId!));
        record.references = [...references].sort();
    }
    const primaryMarkers = primaryChoiceMarkers(source, intervals);
    const independentMarkerDetails = independentlyExtractChoiceMarkerDetails(source);
    const independentMarkers = independentMarkerDetails.map(({ clauseId, kind, sourceOffset }) => ({ clauseId, kind, sourceOffset }));
    if (JSON.stringify(primaryMarkers) !== JSON.stringify(independentMarkers)) {
        throw new Error("canonical specification-choice extraction differs from the independent HTML tree set");
    }
    const clauseById = new Map(records.map((record) => [record.id, record]));
    const definitionClauses = new Set([
        "sec-conformance",
        "sec-hosts-and-implementations",
        "sec-terms-and-definitions-implementation-approximated",
        "sec-terms-and-definitions-implementation-defined",
        "sec-terms-and-definitions-host-defined",
    ]);
    const markerAudit = independentMarkerDetails.map((marker) => {
        const classification = clauseById.get(marker.clauseId)?.classification;
        const role = marker.underDefinition || definitionClauses.has(marker.clauseId)
            ? "definition"
            : marker.underNote || classification === "informative" || classification === "example"
                ? "informative"
                : "obligation";
        return { ...marker, role };
    });
    const markedObligations = markerAudit
        .filter((marker) => marker.role === "obligation")
        .map((marker) => {
            const withoutId: Omit<ChoiceObligation, "id"> = {
                kind: marker.kind,
                trigger: marker.trigger,
                sourceClauseId: marker.clauseId,
                sourceAnchor: marker.sourceAnchor,
                subjectClauseIds: [marker.clauseId],
                sourceOffset: marker.sourceOffset,
                endOffset: marker.endOffset,
                contextSha256: marker.contextSha256,
            };
            return { id: choiceObligationId(withoutId), ...withoutId };
        });
    const anchors = [...anchorById.values()].sort((a, b) => a.id.localeCompare(b.id));
    const choiceObligations = [
        ...markedObligations,
        ...hostLayeringObligations(source, records, anchorById),
    ].sort((left, right) => left.id.localeCompare(right.id));
    if (new Set(choiceObligations.map((obligation) => obligation.id)).size !== choiceObligations.length) {
        throw new Error("specification choice obligation IDs are not unique");
    }
    const optionalSubtrees = normativeOptionalSubtrees(records);
    const optionalCatalog = normativeOptionalCatalog(source, records, anchorById, optionalSubtrees);
    return {
        clauses: records,
        anchors,
        choiceObligations,
        choiceMarkerSetSha256: sha256Text(JSON.stringify(markerAudit)),
        normativeOptionalSubtrees: optionalSubtrees,
        normativeOptionalMarkerSetSha256: sha256Text(JSON.stringify(optionalCatalog.markerAudit)),
        normativeOptionalSites: optionalCatalog.sites,
        normativeOptionalFamilies: optionalCatalog.families,
        xrefs: specificationRecords.xrefs,
        definitions: specificationRecords.definitions,
    };
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
    const {
        clauses,
        anchors,
        choiceObligations,
        choiceMarkerSetSha256,
        normativeOptionalSubtrees: optionalSubtrees,
        normativeOptionalMarkerSetSha256,
        normativeOptionalSites,
        normativeOptionalFamilies,
        xrefs,
        definitions,
    } = extractClauseCatalog(source);
    const primaryIds = clauses.map((clause) => clause.id).sort();
    const independentIds = independentlyExtractClauseIds(source);
    if (JSON.stringify(primaryIds) !== JSON.stringify(independentIds)) {
        throw new Error("canonical clause-tree extraction differs from the independent HTML clause set");
    }
    return {
        schemaVersion: 4,
        standard: "ECMA-262",
        edition: 17,
        commit: baseline.ecma262.commit,
        tree: baseline.ecma262.tree,
        specSourceSha256: digest,
        clauseSetSha256: sha256Text(JSON.stringify(independentIds)),
        choiceMarkerSetSha256,
        choiceObligationSetSha256: sha256Text(JSON.stringify(choiceObligations)),
        normativeOptionalMarkerSetSha256,
        normativeOptionalSiteSetSha256: sha256Text(JSON.stringify(normativeOptionalSites)),
        normativeOptionalFamilySetSha256: sha256Text(JSON.stringify(normativeOptionalFamilies)),
        xrefSetSha256: sha256Text(JSON.stringify(xrefs)),
        definitionSetSha256: sha256Text(JSON.stringify(definitions)),
        clauses,
        anchors,
        choiceObligations,
        normativeOptionalSubtrees: optionalSubtrees,
        normativeOptionalSites,
        normativeOptionalFamilies,
        xrefs,
        definitions,
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
