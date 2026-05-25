interface Pair {
    x: number;
    y: number;
}

let marks = "";

function mark(label: string): string {
    marks += label;
    return label;
}

const entries: ObjectEntry<number>[] = [["x", 3], ["y", 4]];
const pair: Pair = Object.fromEntries<Pair>(entries, mark("a"));
console.log("typed array:", pair.x, pair.y);

const map = new Map<string, number>();
map.set("x", 5);
map.set("y", 6);
const fromMap: Pair = Object.fromEntries<Pair>(map, mark("b"), mark("c"));
console.log("typed map:", fromMap.x, fromMap.y);

const dynamicEntries: any = [["alpha", "A"], ["beta", "B"]];
const dynamicObj: any = Object.fromEntries(dynamicEntries, mark("d"));
console.log("dynamic:", dynamicObj.alpha, dynamicObj.beta);
console.log("marks:", marks);
