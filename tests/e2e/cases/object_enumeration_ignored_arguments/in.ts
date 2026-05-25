interface Pair {
    x: number;
    y: number;
}

let marks = "";
function mark(label: string): string {
    marks += label;
    return label;
}

const pair: Pair = { x: 1, y: 2 };
console.log("typed keys:", Object.keys(pair, mark("a")).join("|"));
console.log("typed values:", Object.values(pair, mark("b")).join("|"));
const typedEntries = Object.entries(pair, mark("c"));
console.log("typed entry:", typedEntries[1][0], typedEntries[1][1]);

console.log("array keys:", Object.keys([10, 20], mark("d")).join("|"));
console.log("array values:", Object.values([10, 20], mark("e")).join("|"));
const arrayEntries = Object.entries([10, 20], mark("f"));
console.log("array entry:", arrayEntries[1][0], arrayEntries[1][1]);

console.log("string keys:", Object.keys("hi", mark("g")).join("|"));
console.log("string values:", Object.values("hi", mark("h")).join("|"));
const stringEntries = Object.entries("hi", mark("i"));
console.log("string entry:", stringEntries[1][0], stringEntries[1][1]);

console.log(
    "primitive:",
    Object.keys(7, mark("j")).length,
    Object.values(7, mark("k")).length,
    Object.entries(7, mark("l")).length,
);

const dynamicObj: any = { alpha: "A", beta: "B" };
console.log("dynamic keys:", Object.keys(dynamicObj, mark("m")).join("|"));
console.log("dynamic values:", Object.values(dynamicObj, mark("n")).join("|"));
const dynamicEntries: any = Object.entries(dynamicObj, mark("o"));
console.log("dynamic entry:", dynamicEntries[1][0], dynamicEntries[1][1]);
console.log("marks:", marks);
