import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const root = path.resolve(import.meta.dir, "../..");
type Probe = { pattern: string; flags: string; subject: string; start?: number };

// Independently combine matching semantics with subject/position partitions.
function probes(): Probe[] {
    const patterns = [
        "", "a", ".", "^a", "a$", "a|ab", "(?:a|ab)c", "(a|ab)c",
        "a*ab", "a*?ab", "a{2,3}a", "a{2,3}?a", "(?:a?)*b", "(?:a?)+b",
        "(a|(b))+", "(a)?(b)?", "(a)+a\\1", "(a|ab)\\1", "\\1(a)",
        "(?=(a+))a*b\\1", "(?!a)b", "a(?!b)", "a(?=b)b", "(?<!a)b",
        "(?<=([ab]+)([bc]+))$", "(?<=a|ab)c", "(?<=a*)b", "(?<x>a)\\k<x>",
        "[a-c]+", "[^a-c]+", "\\w+", "\\W+", "\\b[a-z]+\\b", "[\\d-]",
        "\\x61", "\\u0061", "a{0}", "(?:){2,}", "(?:a|)??b",
    ];
    const subjects = ["", "a", "b", "ab", "abc", "aabc", "aaabaaa", "abbc", " ba "];
    const result: Probe[] = patterns.flatMap((pattern) => subjects.flatMap((subject) =>
        [0, subject.length].map((start) => ({ pattern, flags: "", subject, start })),
    ));
    const unicodeSubjects = ["\u{1f600}", "\ud83d", "\ude00", "A\u{1f600}B", "\u212a\u017f", "\n\r\u2028\u2029"];
    for (const flags of ["", "u", "i", "iu", "m", "s"]) {
        for (const pattern of ["a", "A", "hello", ".", "..", "\\w", "\\W", "\\b\\w+", "[A-Z]", "[^a]", "\\ud83d", "\\ud83d\\ude00"]) {
            for (const subject of [...unicodeSubjects, "a", "A", "HELLO"]) result.push({ pattern, flags, subject });
        }
    }
    for (const [pattern, flags] of [["[", ""], ["*", ""], ["a{3,2}", ""], ["(?<=a)+", ""],
        ["\\a", "u"], ["a", "gg"], ["a", "uv"], ["(?<x>a)(?<x>b)", ""]]) {
        result.push({ pattern: pattern!, flags: flags!, subject: "ab" });
    }
    for (const flags of ["u", "iu", "v", "iv"]) {
        for (const pattern of ["\\p{L}+", "\\p{General_Category=Letter}", "\\p{Script=Greek}",
            "\\p{ASCII}", "\\p{Any}", "\\p{Assigned}", "\\P{Lowercase_Letter}", "[A-z]", "[a-z]"]) {
            for (const subject of ["abc", "A", "_", "α", "K", "ſ", "1", "\ud800"])
                result.push({ pattern, flags, subject });
        }
    }
    for (const pattern of ["[a&&a]", "[a--b]", "[[a-z]&&[^b]]", "[\\q{ab|a}]b",
        "[[\\q{ab|a}]]b", "([\\q{abc|ab|a}])(c|bc)", "[\\q{ab|a}--\\q{a}]", "(?<=[\\q{ab|b}])c", "[A-z]", "[^\\q{ab}]"]) {
        for (const subject of ["a", "b", "ab", "abc", "c", "_", ""]) result.push({ pattern, flags: "v", subject });
    }
    // Modifier lists vary independently of the body and ambient record.
    // Nested scopes force restoration after success, backtracking and assertions.
    for (const added of ["", "i", "m", "s", "im", "is", "ms", "ims"]) {
        for (const removed of ["", "i", "m", "s", "im", "is", "ms", "ims"]) {
            for (const flags of ["", "ims"]) {
                const pattern = `(?${added}-${removed}:^a.$)`;
                for (const subject of ["ab", "A\n", "\naB\n"])
                    result.push({ pattern, flags, subject });
            }
        }
    }
    for (const flags of ["", "i", "u", "iu", "v", "iv", "ims"]) {
        for (const pattern of ["(?i:a)b", "(?-i:a)b", "(?i:A(?-i:B)c)d", "(?i:a)|b",
            "(?i:(a|ab))c", "(?i:(a))(?-i:\\1)", "(?i:(a))\\1",
            "(?i:(?<=a)b)c", "(?i:(?=a)a)b", "(?s:.(?-s:.).).",
            "(?m:^a$)^b$", "(?i:[a-z])(?-i:[A-Z])", "(?i:\\w)(?-i:\\w)",
            "(?i:\\P{Lowercase_Letter})(?-i:\\P{Lowercase_Letter})"]) {
            for (const subject of ["Ab", "AB", "AbCd", "ABCd", "ABc", "Aa", "AA", "KA", "\nA\n", "\na\nb"])
                result.push({ pattern, flags, subject });
        }
    }
    for (const pattern of ["(?i:[[^a]&&\\w])(?-i:[[a-z]&&\\w])", "(?i:[\\q{ab|a}])b"])
        for (const subject of ["Ba", "BA", "AB", "Ab", "AbB", ""]) result.push({ pattern, flags: "v", subject });
    for (const header of ["ii", "i-i", "-ii", "ims-ms", "g", "u", "v", "y", "I", "\u0131", "i--m", "-", "i\\u006d"])
        result.push({ pattern: `(?${header}:a)`, flags: "", subject: "a" });
    // Name fanout is independent of ancestry, repetition, matching direction,
    // and the lexical record at the reference. Sequential names remain errors.
    for (const flags of ["", "i", "u", "v"])
        for (const pattern of ["(?<x>a)|(?<x>b)", "(?:(?<x>a)|(?<x>b))\\k<x>",
            "(?:(?:(?<x>a)|(?<x>b))\\k<x>){2}", "^(?:(?<x>a)|(?<x>b)|z){2}\\k<x>$",
            "(?:(?<x>a)|(?:(?<x>b)|(?<x>c)))\\k<x>", "\\k<x>(?:(?<x>a)|(?<x>b))",
            "(?<=(?:(?<x>a)|(?<x>b))\\k<x>)c", "(?:(?<x>a)|(?<x>b))(?i:\\k<x>)",
            "(?<x>a)(?<x>b)", "(?<x>(?<x>a)|b)", "(?:(?<x>a)|b)(?:(?<x>c)|d)",
            "(?:(?<x>a)|(?<x>b))(?<x>c)", "(?<x>a)\\k<missing>", "[\\k<missing>](?<x>a)"])
            for (const subject of ["", "a", "b", "aa", "bb", "aabb", "abab", "az", "bz", "zz", "bbcc", "bb c", "aA", "missing"])
                result.push({ pattern, flags, subject });
    for (const flags of ["", "u", "v"])
        for (const escape of ["\\k", "\\k<missing>", "\\k<>", "\\k<a", "\\k<\\u0061>", "[\\k<missing>]", "[\\k-a]"])
            for (const definition of ["", "(?<a>a)"])
                for (const subject of ["k", "k<missing>", "aa", "ka", "ma"])
                    for (const pattern of [escape + definition, definition + escape])
                        result.push({ pattern, flags, subject });
    for (const flags of ["", "u", "v"])
        for (const name of ["a", "$", "a0", "\u{1d49c}", "a\u200c", "\u200d", "\ud835", "1a", "\\u0061", "\\u{61}", "\\uD835\\uDC9C", "\\u{1D49C}"])
            for (const reference of [name, name === "a" ? "\\u0061" : name])
                for (const pattern of [`(?<${name}>a)\\k<${reference}>`, `\\k<${reference}>(?<${name}>a)`, `(?<${name}>a)|(?<${reference}>b)`])
                    result.push({ pattern, flags, subject: "aa" });
    return result;
}

const driver = String.raw`
#define _POSIX_C_SOURCE 200809L
#include "tsc_internal.h"
#include <sys/types.h>
static uint16_t* read_units(size_t* len) {
    char* line = NULL; size_t capacity = 0;
    if (getline(&line, &capacity, stdin) < 0) { free(line); return NULL; }
    size_t cap = 16; *len = 0;
    uint16_t* units = malloc(cap * sizeof(*units));
    char* cursor = line;
    while (*cursor && *cursor != '\n') {
        char* end; unsigned long value = strtoul(cursor, &end, 10);
        if (end == cursor) break;
        if (*len == cap) { cap *= 2; units = realloc(units, cap * sizeof(*units)); }
        units[(*len)++] = (uint16_t)value;
        cursor = *end == ',' ? end + 1 : end;
    }
    free(line); return units;
}
int main(void) {
    for (;;) {
        size_t pn, fn, sn;
        uint16_t* pattern = read_units(&pn); if (!pattern) break;
        uint16_t* flags = read_units(&fn); uint16_t* subject = read_units(&sn);
        char* start_line = NULL; size_t start_capacity = 0;
        if (getline(&start_line, &start_capacity, stdin) < 0) return 2;
        size_t start = strtoull(start_line, NULL, 10); free(start_line);
        tsc_re_flags_t options; tsc_re_error_t error;
        tsc_re_compiled_t* re = tsc_re_parse_flags(flags, fn, &options) == TSC_RE_OK
            ? tsc_re_compile(pattern, pn, options, &error) : NULL;
        if (!re) puts("syntax");
        else {
            size_t slots = 2 * (tsc_re_group_count(re) + 1);
            size_t* captures = malloc(slots * sizeof(*captures)); size_t a, b;
            if (!tsc_re_match_at(re, subject, sn, start, captures, &a, &b)) puts("null");
            else {
                for (size_t i = 0; i < slots; i++) {
                    if (i) putchar(',');
                    if (captures[i] == SIZE_MAX) putchar('x'); else printf("%zu", captures[i]);
                }
                putchar('\n');
            }
            free(captures);
        }
        free(pattern); free(flags); free(subject);
    }
    return 0;
}
`;

function units(value: string): string {
    return Array.from({ length: value.length }, (_, index) => value.charCodeAt(index)).join(",");
}
function input(cases: Probe[]): string {
    return cases.map(({ pattern, flags, subject, start = 0 }) =>
        `${units(pattern)}\n${units(flags)}\n${units(subject)}\n${start}\n`,
    ).join("");
}

test("RegExp continuation graph preserves branches, captures, assertions and UTF-16 positions", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-regexp-engine-"));
    try {
        const entry = path.join(temporary, "driver.c");
        const executable = path.join(temporary, "engine");
        await fs.writeFile(entry, driver);
        const compiler = Bun.spawnSync(["gcc", "-std=c11", "-O1", "-g", "-Wall", "-Wextra", "-Werror",
            "-Wno-unused-parameter", "-DTSC_NO_GC", "-ffunction-sections", "-fdata-sections", "-Wl,--gc-sections", "-I", path.join(root, "runtime"), entry,
            path.join(root, "runtime/tsc_regexp.c"), "-licuuc", "-licudata", "-o", executable],
        { stdout: "pipe", stderr: "pipe" });
        expect(compiler.stderr.toString()).toBe("");
        expect(compiler.exitCode).toBe(0);
        const cases = probes();
        const expected = cases.map(({ pattern, flags, subject, start = 0 }) => {
            try {
                new RegExp(pattern, flags);
                const re = new RegExp(pattern, flags.replace(/[dy]/g, "") + "dy");
                re.lastIndex = start;
                const hit = re.exec(subject);
                return hit ? hit.indices!.flatMap((span) => span ?? ["x", "x"]).join(",") : "null";
            } catch (error) {
                if (!(error instanceof SyntaxError)) throw error;
                return "syntax";
            }
        });
        const native = Bun.spawnSync([executable], { stdin: Buffer.from(input(cases)), stdout: "pipe", stderr: "pipe" });
        expect(native.stderr.toString()).toBe("");
        expect(native.exitCode).toBe(0);
        const actual = native.stdout.toString().trimEnd().split("\n");
        const mismatches = cases.flatMap((probe, index) => actual[index] === expected[index] ? [] :
            [{ ...probe, actual: actual[index], expected: expected[index] }]);
        expect(mismatches.slice(0, 12)).toEqual([]);
        expect(actual.length).toBe(expected.length);

    } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}, 90_000);
