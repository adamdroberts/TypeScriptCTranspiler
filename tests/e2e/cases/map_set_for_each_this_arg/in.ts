let seen = "";

function mark(label: string, value: any): any {
    seen += label;
    return value;
}

const scores = new Map<string, number>();
scores.set("a", 2);
scores.set("bb", 3);

let mapTotal = 0;
function collectScore(this: any, value: number, key: string, map: Map<string, number>): void {
    seen += this;
    mapTotal += value + key.length + map.size;
}
scores.forEach(collectScore, mark("m", "M"));

let mapInlineTotal = 0;
scores.forEach(function (this: any, value, key, map) {
    return seen += this + key;
}, mark("i", "I"));
scores.forEach(function (this: any, value, key, map) {
    return mapInlineTotal += value + key.length + map.size;
}, mark("j", "J"));

const ids = new Set<number>();
ids.add(1);
ids.add(4);

let setTotal = 0;
function collectId(this: any, value: number, value2: number, set: Set<number>): void {
    seen += this;
    setTotal += value + value2 + set.size;
}
ids.forEach(collectId, mark("s", "S"));

let setInlineTotal = 0;
ids.forEach(function (this: any, value, value2, set) {
    return seen += this + value;
}, mark("t", "T"));
ids.forEach(function (this: any, value, value2, set) {
    return setInlineTotal += value + value2 + set.size;
}, mark("u", "U"));

let arrowTotal = 0;
ids.forEach((value, value2, set) => arrowTotal += value + value2 + set.size, mark("a", { ignored: true }));

console.log("map:", mapTotal, mapInlineTotal);
console.log("set:", setTotal, setInlineTotal, arrowTotal);
console.log("seen:", seen);
