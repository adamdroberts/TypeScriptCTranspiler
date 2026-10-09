import { expect, test } from "bun:test";
import { mangleIdent, mangleQualifiedIdent } from "../../src/emit/mangle";

// Decode framed names independently, using the original UTF-16 lengths to
// consume each component. This proves reversibility, rather than counting
// selected spelling families that happen not to collide.
function decode(encoded: string): string[] {
    expect(encoded.startsWith("tsc_js")).toBe(true);
    const parts: string[] = [];
    let offset = "tsc_js".length;
    while (offset < encoded.length) {
        expect(encoded[offset++]).toBe("_");
        const end = encoded.indexOf("_", offset);
        const length = Number(encoded.slice(offset, end));
        expect(Number.isSafeInteger(length) && length >= 0).toBe(true);
        offset = end + 1;
        let part = "";
        while (part.length < length) {
            if (encoded[offset] === "_") {
                expect(encoded[offset + 5]).toBe("_");
                part += String.fromCharCode(Number.parseInt(encoded.slice(offset + 1, offset + 5), 16));
                offset += 6;
            } else part += encoded[offset++];
        }
        parts.push(part);
    }
    return parts;
}

test("C identifier encoding is reversible for UTF-16 component Lists", () => {
    const partitions: string[][] = [[], [""], ["A", "b_c"], ["A_b", "c"], ["A_b_c"],
        ["log"], ["nan"], ["int"], ["tsc_js"], ["$"], ["_"], ["_0024_"],
        ["λ", "变量", "𐐀"], ["\ud800", "\udfff", "\0"], ["__tsc_type", "__tsc_root_value"]];
    let state = 0x7319a45b;
    const next = (): number => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };
    const alphabet = [0x41, 0x7a, 0x30, 0x39, 0x5f, 0x24, 0, 0x3bb, 0x53d8, 0xd801, 0xdc00, 0xffff];
    for (let sample = 0; sample < 257; sample++) {
        const parts: string[] = [];
        const width = next() % 9;
        for (let index = 0; index < width; index++) {
            let name = "";
            const length = next() % 17;
            for (let unit = 0; unit < length; unit++) name += String.fromCharCode(alphabet[next() % alphabet.length]!);
            parts.push(name);
        }
        partitions.push(parts);
    }
    const names = new Map<string, string>();
    for (const parts of partitions) {
        const encoded = mangleQualifiedIdent(parts), source = JSON.stringify(parts);
        expect(encoded).toMatch(/^[A-Za-z][A-Za-z0-9_]*$/);
        expect(decode(encoded)).toEqual(parts);
        expect(names.get(encoded) ?? source).toBe(source);
        names.set(encoded, source);
        if (parts.length === 1) expect(mangleIdent(parts[0]!)).toBe(encoded);
    }
    // One representative deep qualification List reaches the same encoder
    // and decoder without a namespace-depth cap or recursive traversal.
    const deep = Array.from({ length: 4096 }, (_, index) => "λ_" + index);
    expect(decode(mangleQualifiedIdent(deep))).toEqual(deep);
});
