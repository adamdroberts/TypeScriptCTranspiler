const seen = new Set<string>();
seen.add("red");
seen.add("blue");
seen.add("red");
let trace = "";

function mark(label: string): string {
    trace += label;
    return label;
}

console.log("keys:", seen.keys().join("|"));
console.log("values:", seen.values().join("|"));
console.log("same:", seen.keys().join(",") === seen.values().join(","));
console.log("ignored:", seen.keys(mark("k")).join("|"), seen.values(mark("v")).join("|"), trace);
