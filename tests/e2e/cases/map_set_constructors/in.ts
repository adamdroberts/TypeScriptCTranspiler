interface Scores {
    a: number;
    b: number;
}

const scores: Scores = { a: 1, b: 2 };
const fromEntries = new Map(Object.entries(scores));
console.log("map:", fromEntries.size, fromEntries.get("a"), fromEntries.has("b"));

fromEntries.set("c", 3);
console.log("keys:", fromEntries.keys().join("|"), "values:", fromEntries.values().join("|"));

const fromArray = new Set([1, 2, 2, 3]);
console.log("set:", fromArray.size, fromArray.has(2), fromArray.values().join("|"));

const emptyMap = new Map<string, number>();
const emptySet = new Set<string>();
console.log("empty:", emptyMap.size, emptySet.size);
