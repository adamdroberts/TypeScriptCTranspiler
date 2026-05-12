const seen = new Set<string>();
seen.add("red");
seen.add("blue");
seen.add("red");

console.log("keys:", seen.keys().join("|"));
console.log("values:", seen.values().join("|"));
console.log("same:", seen.keys().join(",") === seen.values().join(","));
