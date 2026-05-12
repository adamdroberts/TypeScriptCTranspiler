const scores = new Map<string, number>();
scores.set("a", 2);
scores.set("b", 3);

let mapTotal = 0;
let seen = "";

function collectScore(value: number, key: string, map: Map<string, number>): void {
    mapTotal += value + map.size;
    seen = seen + key + ":" + value + "|";
}

scores.forEach(collectScore);

const ids = new Set<number>();
ids.add(1);
ids.add(4);

let setTotal = 0;

function collectId(value: number, value2: number, set: Set<number>): void {
    setTotal += value + value2 + set.size;
}

ids.forEach(collectId);

console.log("map:", mapTotal, seen);
console.log("set:", setTotal);
