import { expect, test } from "bun:test";
import { jsonSyntaxLineAndColumn, validateJsonSyntax } from "../../src/json-syntax";

test("strict JSON syntax follows the canonical lexical and container partitions", () => {
    const valid = [
        "null",
        "true",
        "false",
        '"plain"',
        '"\\\"\\\\\\/\\b\\f\\n\\r\\t\\u0000\\uD800"',
        "0",
        "-0",
        "12",
        "-12.5e+3",
        "[ ]",
        "{\"key\": 1}",
        "\t\r\n { \"nested\": [null, true, {\"duplicate\": 1, \"duplicate\": 2}] } \x20",
    ];
    for (const source of valid) expect(validateJsonSyntax(source)).toBeNull();

    const invalid = [
        "",
        "+1",
        ".1",
        "01",
        "1.",
        "1e",
        "[1,]",
        '{"key":}',
        "{key: 1}",
        '"\\x20"',
        '"raw\u0001control"',
        "true false",
        "\vnull",
        "\fnull",
        "\u00a0null",
        "\ufeffnull",
    ];
    for (const source of invalid) expect(validateJsonSyntax(source)).not.toBeNull();

    const multiline = "{\r\n  unquoted: true\n}";
    const failure = validateJsonSyntax(multiline);
    expect(failure).not.toBeNull();
    expect(jsonSyntaxLineAndColumn(multiline, failure!)).toEqual({ line: 1, column: 2 });
});

test("strict JSON syntax uses one representative deep container worklist", () => {
    const depth = 4096;
    const source = "[".repeat(depth) + "null" + "]".repeat(depth);
    expect(validateJsonSyntax(source)).toBeNull();
    expect(validateJsonSyntax(source.slice(0, -1))).toMatchObject({
        message: "unterminated JSON array",
    });
});
