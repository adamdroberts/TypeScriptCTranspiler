/* Generates the pinned Unicode property tables the RegExp engine uses for
 * \p{...} escapes from the Unicode Character Database, so property data no
 * longer depends on the host ICU version. Usage:
 *   bun src/tools/generate-unicode-tables.ts --ucd <dir> --out runtime/tsc_unicode_data.h
 * The UCD directory holds the files listed in UCD_FILES at their UCD paths;
 * every file must match its pinned SHA-256. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const UNICODE_VERSION = "17.0.0";
export const UCD_FILES: Record<string, string> = {
    "PropList.txt": "130dcddcaadaf071008bdfce1e7743e04fdfbc910886f017d9f9ac931d8c64dd",
    "DerivedCoreProperties.txt": "24c7fed1195c482faaefd5c1e7eb821c5ee1fb6de07ecdbaa64b56a99da22c08",
    "DerivedNormalizationProps.txt": "71fd6a206a2c0cdd41feb6b7f656aa31091db45e9cedc926985d718397f9e488",
    "PropertyAliases.txt": "4441f573caf952ffece1d7c892e7715bd7136dfc26f96eb6f268bf1e474715fb",
    "PropertyValueAliases.txt": "64e9a5f76f7a1e8b5a47d6a1f9a26522a251208f5276bdfa1559dac7cf2e827a",
    "Scripts.txt": "9f5e50d3abaee7d6ce09480f325c706f485ae3240912527e651954d2d6b035bf",
    "ScriptExtensions.txt": "ec2107e58825a1586acee8e0911ce18260394ac8b87e535ca325f1ccbeb06bc6",
    "extracted/DerivedGeneralCategory.txt": "d62e5bab70ca74f099343f71224fa051cb1fdd61a1ab45c0488c44cfc0b6102e",
    "extracted/DerivedBinaryProperties.txt": "13dd09d35a9377e33eb388a01e6581d4bfec6b2685316078c341982fa444071a",
    "emoji/emoji-data.txt": "2cb2bb9455cda83e8481541ecf5b6dfda66a3bb89efa3fa7c5297eccf607b72b",
    "emoji/emoji-sequences.txt": "12cc8267dc33cbd11ed32bcf6fc5dc2ad9c7a77bae1bdfba2f41b1b9b3ead8dd",
    "emoji/emoji-zwj-sequences.txt": "5b25441daed2322b068c5e70cda522946a4f0274df864445a1965a92e5fc5cad",
};

/* ECMA-262 table "Binary Unicode property aliases": canonical names. */
const BINARY_PROPERTIES = ["ASCII_Hex_Digit", "Alphabetic", "Bidi_Control", "Bidi_Mirrored", "Case_Ignorable", "Cased",
    "Changes_When_Casefolded", "Changes_When_Casemapped", "Changes_When_Lowercased", "Changes_When_NFKC_Casefolded",
    "Changes_When_Titlecased", "Changes_When_Uppercased", "Dash", "Default_Ignorable_Code_Point", "Deprecated", "Diacritic",
    "Emoji", "Emoji_Component", "Emoji_Modifier", "Emoji_Modifier_Base", "Emoji_Presentation", "Extended_Pictographic",
    "Extender", "Grapheme_Base", "Grapheme_Extend", "Hex_Digit", "IDS_Binary_Operator", "IDS_Trinary_Operator", "ID_Continue",
    "ID_Start", "Ideographic", "Join_Control", "Logical_Order_Exception", "Lowercase", "Math", "Noncharacter_Code_Point",
    "Pattern_Syntax", "Pattern_White_Space", "Quotation_Mark", "Radical", "Regional_Indicator", "Sentence_Terminal",
    "Soft_Dotted", "Terminal_Punctuation", "Unified_Ideograph", "Uppercase", "Variation_Selector", "White_Space",
    "XID_Continue", "XID_Start"] as const;
const STRING_PROPERTIES = ["Basic_Emoji", "Emoji_Keycap_Sequence", "RGI_Emoji_Modifier_Sequence", "RGI_Emoji_Flag_Sequence",
    "RGI_Emoji_Tag_Sequence", "RGI_Emoji_ZWJ_Sequence"] as const;

type Range = [number, number];

function argumentValue(flag: string): string | undefined {
    const index = process.argv.indexOf(flag);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

/* Emoji sequence files live beside the UCD rather than inside it. */
function sourceUrl(name: string): string {
    const base = `https://www.unicode.org/Public/${UNICODE_VERSION}/`;
    return name === "emoji/emoji-sequences.txt" || name === "emoji/emoji-zwj-sequences.txt"
        ? `${base}${name}` : `${base}ucd/${name}`;
}

async function fetchMissing(root: string): Promise<void> {
    for (const name of Object.keys(UCD_FILES)) {
        const file = path.join(root, name);
        if (fs.existsSync(file)) continue;
        const response = await fetch(sourceUrl(name));
        if (!response.ok) throw new Error(`${sourceUrl(name)}: HTTP ${response.status}`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    }
}

function readUcd(root: string, name: string): string[][] {
    const file = path.join(root, name);
    const bytes = fs.readFileSync(file);
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");
    const pinned = UCD_FILES[name];
    if (pinned !== digest) throw new Error(`${name}: SHA-256 ${digest} does not match the pinned ${pinned}`);
    const rows: string[][] = [];
    for (const raw of bytes.toString("utf8").split("\n")) {
        const line = raw.replace(/#.*/, "").trim();
        if (!line) continue;
        rows.push(line.split(";").map((field) => field.trim()));
    }
    return rows;
}

function parseRange(text: string): Range {
    const [lo, hi] = text.split("..");
    const first = parseInt(lo!, 16);
    const last = hi ? parseInt(hi, 16) : first;
    if (!Number.isInteger(first) || !Number.isInteger(last) || first > last || last > 0x10ffff) throw new Error(`bad range ${text}`);
    return [first, last];
}

/** Sorted, merged, non-overlapping ranges. */
function normalize(ranges: readonly Range[]): Range[] {
    const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const out: Range[] = [];
    for (const [lo, hi] of sorted) {
        const last = out[out.length - 1];
        if (last && lo <= last[1] + 1) last[1] = Math.max(last[1], hi);
        else out.push([lo, hi]);
    }
    return out;
}
function complement(ranges: readonly Range[]): Range[] {
    const out: Range[] = [];
    let next = 0;
    for (const [lo, hi] of normalize(ranges)) {
        if (lo > next) out.push([next, lo - 1]);
        next = hi + 1;
    }
    if (next <= 0x10ffff) out.push([next, 0x10ffff]);
    return out;
}
function union(...sets: readonly (readonly Range[])[]): Range[] {
    return normalize(sets.flat());
}
function difference(a: readonly Range[], b: readonly Range[]): Range[] {
    return normalize([...complement(union(complement(a), b))]);
}

const MAX_SEQUENCE = 16;

async function main(): Promise<void> {
    const root = argumentValue("--ucd") ?? path.join(process.cwd(), "cache", "compliance", `unicode-${UNICODE_VERSION}`);
    const out = argumentValue("--out");
    if (!out) throw new Error("usage: [--fetch] [--ucd <dir>] --out <file>");
    if (process.argv.includes("--fetch")) await fetchMissing(root);

    const binary = new Map<string, Range[]>();
    const addBinary = (name: string, range: Range): void => {
        if (!binary.has(name)) binary.set(name, []);
        binary.get(name)!.push(range);
    };
    const wanted = new Set<string>(BINARY_PROPERTIES);
    for (const file of ["PropList.txt", "DerivedCoreProperties.txt", "DerivedNormalizationProps.txt", "extracted/DerivedBinaryProperties.txt", "emoji/emoji-data.txt"]) {
        for (const row of readUcd(root, file)) {
            if (row.length !== 2 || !wanted.has(row[1]!)) continue;
            addBinary(row[1]!, parseRange(row[0]!));
        }
    }
    // General categories: every code point has exactly one short value.
    const gc = new Map<string, Range[]>();
    for (const row of readUcd(root, "extracted/DerivedGeneralCategory.txt")) {
        if (row.length !== 2) continue;
        if (!gc.has(row[1]!)) gc.set(row[1]!, []);
        gc.get(row[1]!)!.push(parseRange(row[0]!));
    }
    const gcNames = new Map<string, string[]>(); // short value -> all admitted names
    const gcGroups = new Map<string, string[]>(); // group short value -> member short values
    for (const raw of fs.readFileSync(path.join(root, "PropertyValueAliases.txt"), "utf8").split("\n")) {
        const line = raw.trim();
        if (!line.startsWith("gc ;")) continue;
        const [body, comment] = line.split("#");
        const fields = body!.split(";").map((field) => field.trim()).slice(1);
        gcNames.set(fields[0]!, fields);
        if (comment) gcGroups.set(fields[0]!, comment.split("|").map((member) => member.trim()).filter(Boolean));
    }
    for (const [group, members] of gcGroups) gc.set(group, union(...members.map((member) => gc.get(member) ?? [])));
    for (const short of gcNames.keys()) if (!gc.has(short)) throw new Error(`General_Category value ${short} has no code points`);
    binary.set("ASCII", [[0, 0x7f]]);
    binary.set("Any", [[0, 0x10ffff]]);
    binary.set("Assigned", complement(gc.get("Cn")!));
    for (const name of BINARY_PROPERTIES) if (!binary.has(name)) throw new Error(`binary property ${name} missing from the UCD`);
    const binaryNames = new Map<string, string[]>([["ASCII", ["ASCII"]], ["Any", ["Any"]], ["Assigned", ["Assigned"]]]);
    for (const name of BINARY_PROPERTIES) binaryNames.set(name, [name]);
    for (const row of readUcd(root, "PropertyAliases.txt")) {
        const long = row[1]!;
        if (!binaryNames.has(long)) continue;
        for (const alias of [row[0]!, ...row.slice(2)]) if (!binaryNames.get(long)!.includes(alias)) binaryNames.get(long)!.push(alias);
    }

    // Scripts: long names in Scripts.txt; unlisted code points are Unknown.
    const script = new Map<string, Range[]>();
    for (const row of readUcd(root, "Scripts.txt")) {
        if (row.length !== 2) continue;
        if (!script.has(row[1]!)) script.set(row[1]!, []);
        script.get(row[1]!)!.push(parseRange(row[0]!));
    }
    script.set("Unknown", complement(union(...script.values())));
    const scriptNames = new Map<string, string[]>(); // long -> all admitted names
    const shortToLong = new Map<string, string>();
    for (const row of readUcd(root, "PropertyValueAliases.txt")) {
        if (row[0] !== "sc") continue;
        const [short, long, ...rest] = row.slice(1) as [string, string, ...string[]];
        scriptNames.set(long, [long, short, ...rest]);
        shortToLong.set(short, long);
    }
    for (const long of script.keys()) if (!scriptNames.has(long)) throw new Error(`script ${long} has no aliases`);
    // ECMA-262's Script table omits registered values with no code points
    // (Katakana_Or_Hiragana), so they are not admitted.
    for (const long of [...scriptNames.keys()]) if (!script.has(long)) scriptNames.delete(long);
    const listed: Range[] = [];
    const extensionMembers = new Map<string, Range[]>();
    for (const row of readUcd(root, "ScriptExtensions.txt")) {
        if (row.length !== 2) continue;
        const range = parseRange(row[0]!);
        listed.push(range);
        for (const short of row[1]!.split(/\s+/)) {
            const long = shortToLong.get(short);
            if (!long) throw new Error(`unknown script ${short} in ScriptExtensions.txt`);
            if (!extensionMembers.has(long)) extensionMembers.set(long, []);
            extensionMembers.get(long)!.push(range);
        }
    }
    const scx = new Map<string, Range[]>();
    for (const [long, ranges] of script) scx.set(long, union(difference(ranges, listed), extensionMembers.get(long) ?? []));

    // Properties of strings: single code points become ranges, sequences strings.
    const stringSingles = new Map<string, Range[]>();
    const stringSequences = new Map<string, number[][]>();
    for (const name of STRING_PROPERTIES) { stringSingles.set(name, []); stringSequences.set(name, []); }
    for (const file of ["emoji/emoji-sequences.txt", "emoji/emoji-zwj-sequences.txt"]) {
        for (const row of readUcd(root, file)) {
            const name = row[1]!;
            if (!stringSingles.has(name)) throw new Error(`unexpected string property ${name} in ${JSON.stringify(row)}`);
            const text = row[0]!;
            if (text.includes("..")) stringSingles.get(name)!.push(parseRange(text));
            else {
                const points = text.split(/\s+/).map((hex) => parseInt(hex, 16));
                if (points.length > MAX_SEQUENCE) throw new Error(`${name}: sequence ${text} exceeds ${MAX_SEQUENCE} code points`);
                if (points.length === 1) stringSingles.get(name)!.push([points[0]!, points[0]!]);
                else stringSequences.get(name)!.push(points);
            }
        }
    }
    stringSingles.set("RGI_Emoji", union(...STRING_PROPERTIES.map((name) => stringSingles.get(name)!)));
    stringSequences.set("RGI_Emoji", STRING_PROPERTIES.flatMap((name) => stringSequences.get(name)!));

    // Range pool with identical sets shared.
    const pool: number[] = [];
    const sets: { offset: number; count: number }[] = [];
    const setIndex = new Map<string, number>();
    const intern = (ranges: readonly Range[]): number => {
        const merged = normalize(ranges);
        const key = merged.map(([lo, hi]) => `${lo}-${hi}`).join(",");
        const existing = setIndex.get(key);
        if (existing !== undefined) return existing;
        const index = sets.length;
        sets.push({ offset: pool.length / 2, count: merged.length });
        for (const [lo, hi] of merged) pool.push(lo, hi);
        setIndex.set(key, index);
        return index;
    };
    const nameRows = (entries: Map<string, string[]>, data: Map<string, Range[]>): string[] => {
        const rows: string[] = [];
        for (const [canonical, names] of entries) {
            const index = intern(data.get(canonical)!);
            for (const name of names) rows.push(`    { "${name}", ${index} },`);
        }
        return rows.sort();
    };
    const gcEntries = new Map<string, string[]>();
    for (const [short, names] of gcNames) gcEntries.set(short, names);
    const binaryRows = nameRows(binaryNames, binary);
    const gcRows = nameRows(gcEntries, gc);
    const scriptRows = nameRows(scriptNames, script);
    const scxRows = nameRows(scriptNames, scx);
    const stringPool: number[] = [];
    const stringRows: string[] = [];
    for (const name of [...STRING_PROPERTIES, "RGI_Emoji"]) {
        const singles = intern(stringSingles.get(name)!);
        const sequences = [...stringSequences.get(name)!].sort((a, b) => a.length - b.length || a.join(",").localeCompare(b.join(",")));
        const offset = stringPool.length;
        for (const points of sequences) stringPool.push(points.length, ...points);
        stringRows.push(`    { "${name}", ${singles}, ${offset}, ${sequences.length} },`);
    }

    const hex = (value: number): string => `0x${value.toString(16)}`;
    const lines: string[] = [];
    lines.push(`/* Generated by src/tools/generate-unicode-tables.ts from the Unicode ${UNICODE_VERSION} Character Database. Do not edit. */`);
    for (const [name, digest] of Object.entries(UCD_FILES)) lines.push(` * ${name} sha256 ${digest}`.replace(/^ \*/, "/*") + " */");
    lines.push(`#ifndef TSC_UNICODE_DATA_H`, `#define TSC_UNICODE_DATA_H`, `#include <stdint.h>`, `#include <stddef.h>`);
    lines.push(`#define TSC_UNICODE_VERSION "${UNICODE_VERSION}"`);
    lines.push(`#define TSC_UCD_MAX_SEQUENCE ${MAX_SEQUENCE}`);
    lines.push(`typedef struct { uint32_t lo; uint32_t hi; } tsc_ucd_range_t;`);
    lines.push(`typedef struct { uint32_t offset; uint32_t count; } tsc_ucd_set_t;`);
    lines.push(`typedef struct { const char* name; uint16_t set; } tsc_ucd_name_t;`);
    lines.push(`typedef struct { const char* name; uint16_t set; uint32_t strings; uint32_t nstrings; } tsc_ucd_string_property_t;`);
    lines.push(`static const tsc_ucd_range_t tsc_ucd_ranges[] = {`);
    for (let index = 0; index < pool.length; index += 16) {
        const chunk: string[] = [];
        for (let at = index; at < Math.min(index + 16, pool.length); at += 2) chunk.push(`{${hex(pool[at]!)},${hex(pool[at + 1]!)}}`);
        lines.push(`    ${chunk.join(",")},`);
    }
    lines.push(`};`);
    lines.push(`static const tsc_ucd_set_t tsc_ucd_sets[] = {`);
    for (let index = 0; index < sets.length; index += 8) lines.push(`    ${sets.slice(index, index + 8).map((set) => `{${set.offset},${set.count}}`).join(",")},`);
    lines.push(`};`);
    const emitNames = (name: string, rows: string[]): void => { lines.push(`static const tsc_ucd_name_t ${name}[] = {`, ...rows, `};`); };
    emitNames("tsc_ucd_binary_names", binaryRows);
    emitNames("tsc_ucd_general_category_names", gcRows);
    emitNames("tsc_ucd_script_names", scriptRows);
    emitNames("tsc_ucd_script_extension_names", scxRows);
    lines.push(`/* Sequences of two or more code points as length-prefixed runs. */`);
    lines.push(`static const uint32_t tsc_ucd_strings[] = {`);
    for (let index = 0; index < stringPool.length; index += 24) lines.push(`    ${stringPool.slice(index, index + 24).map(hex).join(",")},`);
    lines.push(`};`);
    lines.push(`static const tsc_ucd_string_property_t tsc_ucd_string_properties[] = {`, ...stringRows, `};`);
    lines.push(`#endif`);
    fs.writeFileSync(out, lines.join("\n") + "\n");
    console.log(`sets ${sets.length}, ranges ${pool.length / 2}, strings ${stringRows.length} properties, ${stringPool.length} words, names ${binaryRows.length}/${gcRows.length}/${scriptRows.length}/${scxRows.length}`);
}

await main();
