const seen = new Set<string>();
seen.add("red");
seen.add("blue");
seen.add("red");
let trace = "";

function mark(label: string): string {
    trace += label;
    return label;
}

console.log("keys:", Array.from(seen.keys()).join("|"));
console.log("values:", Array.from(seen.values()).join("|"));
console.log("same:", Array.from(seen.keys()).join(",") === Array.from(seen.values()).join(","));
console.log("ignored:", Array.from(seen.keys(mark("k"))).join("|"), Array.from(seen.values(mark("v"))).join("|"), trace);
