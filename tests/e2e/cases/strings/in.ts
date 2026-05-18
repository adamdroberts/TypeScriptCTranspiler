const s = "Hello, World!";
console.log("len:", s.length);
console.log("upper:", s.toUpperCase());
console.log("lower:", s.toLowerCase());
console.log("slice:", s.slice(7, 12));
console.log("includes World:", s.includes("World"));
console.log("startsWith Hello:", s.startsWith("Hello"));
console.log("endsWith !:", s.endsWith("!"));
console.log("indexOf o:", s.indexOf("o"));
console.log("repeat 3:", "ab".repeat(3));
console.log("trim:", "  hi  ".trim());
const parts: string[] = "a,b,c,d".split(",");
console.log("parts len:", parts.length);
for (const p of parts) console.log("  ", p);

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

console.log("ignored case:", s.toUpperCase(mark("u")), s.toLowerCase(mark("l")), "  hi  ".trim(mark("t")), seen);
