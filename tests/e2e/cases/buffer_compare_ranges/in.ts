const a = Buffer.from("abcdef");
const b = Buffer.from("def");

// 1. Normal comparison with range bounds
console.log("normal [3,6) and [0,3):", a.compare(b, 0, 3, 3, 6));
console.log("normal [3,5) and [0,3):", a.compare(b, 0, 3, 3, 5));
console.log("normal [3,6) and [0,2):", a.compare(b, 0, 2, 3, 6));

// 2. Default/omitted ranges
console.log("defaults target:", a.compare(b, undefined, undefined, 3, 6));
console.log("defaults source:", a.compare(b, 0, 3, undefined, undefined));
console.log("all defaults:", a.compare(b));

// 3. start > end behavior (empty slice)
console.log("targetStart > targetEnd:", a.compare(b, 2, 1, 3, 6));
console.log("sourceStart > sourceEnd:", a.compare(b, 0, 3, 5, 4));

// 4. Ignored arguments
let seen = "";
function mark(label: string): number {
    seen += label + "|";
    return 0;
}
console.log("ignored args:", a.compare(b, 0, 3, 3, 6, mark("a"), mark("b")), seen);

// 5. Error bounds checks
function tryCompare(
    target: Buffer,
    targetStart: number,
    targetEnd: number,
    sourceStart: number,
    sourceEnd: number
): string {
    try {
        return String(a.compare(target, targetStart, targetEnd, sourceStart, sourceEnd));
    } catch (e) {
        return String(e);
    }
}

console.log("err negative targetStart:", tryCompare(b, -1, 3, 3, 6));
console.log("err out of bounds targetEnd:", tryCompare(b, 0, 10, 3, 6));
console.log("err negative sourceStart:", tryCompare(b, 0, 3, -1, 6));
console.log("err out of bounds sourceEnd:", tryCompare(b, 0, 3, 3, 10));

console.log("err NaN targetStart:", tryCompare(b, NaN, 3, 3, 6));
console.log("err NaN targetEnd:", tryCompare(b, 0, NaN, 3, 6));
console.log("err NaN sourceStart:", tryCompare(b, 0, 3, NaN, 6));
console.log("err NaN sourceEnd:", tryCompare(b, 0, 3, 3, NaN));
