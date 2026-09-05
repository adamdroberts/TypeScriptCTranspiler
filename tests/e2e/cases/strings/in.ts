const s = "Hello, World!";
console.log("len:", s.length);
console.log("upper:", s.toUpperCase());
console.log("lower:", s.toLowerCase());
console.log("slice:", s.slice(7, 12));
console.log("slice undefined:", s.slice(undefined, undefined));
console.log("includes World:", s.includes("World"));
console.log("startsWith Hello:", s.startsWith("Hello"));
console.log("endsWith !:", s.endsWith("!"));
console.log("indexOf o:", s.indexOf("o"));
console.log("repeat 3:", "ab".repeat(3));
console.log("trim:", "  hi  ".trim());
console.log("trims:", "[" + "  hi  ".trimStart() + "]", "[" + "  hi  ".trimEnd() + "]", "[" + "  hi  ".trimLeft() + "]", "[" + "  hi  ".trimRight() + "]");
const parts: string[] = "a,b,c,d".split(",");
console.log("parts len:", parts.length);
for (const p of parts) console.log("  ", p);

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

console.log("ignored case:", s.toUpperCase(mark("u")), s.toLowerCase(mark("l")), "  hi  ".trim(mark("t")), seen);
console.log("ignored repeat/pad:", "ab".repeat(3, mark("r")), "go".padStart(4, ".", mark("p")), "go".padEnd(4, ".", mark("q")), seen);
console.log("undefined pad:", "[" + "go".padStart(4, undefined) + "]", "[" + "go".padEnd(4, undefined) + "]");
console.log("undefined pad ignored:", "[" + "go".padStart(4, undefined, mark("P")) + "]", "[" + "go".padEnd(4, undefined, mark("Q")) + "]", seen);
const limited = "a,b,c".split(",", 2, mark("s"));
console.log("ignored split:", limited.length, seen);
console.log("ignored replace:", "aba".replace("a", "x", mark("R")), "aba".replaceAll("a", "x", mark("A")), seen);
