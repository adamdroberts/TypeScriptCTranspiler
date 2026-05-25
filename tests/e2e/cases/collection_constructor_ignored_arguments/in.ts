interface Box {
    name: string;
}

let marks = "";

function mark(label: string): string {
    marks += label;
    return label;
}

const entries: ObjectEntry<number>[] = [["a", 1], ["b", 2]];
const map = new Map(entries, mark("a"));
const mapCopy = new Map(map, mark("b"));
console.log("map:", map.size, map.get("a"), mapCopy.get("b"));

const set = new Set([1, 2, 2], mark("c"));
const setCopy = new Set(set, mark("d"));
console.log("set:", set.size, setCopy.has(2), setCopy.values().join("|"));

const alice: Box = { name: "alice" };
const bob: Box = { name: "bob" };
const weakEntries: ObjectEntry<string, Box>[] = [[alice, "admin"], [bob, "reader"]];
const weakMap = new WeakMap<Box, string>(weakEntries, mark("e"));
const weakMapSource = new Map<Box, string>(weakEntries);
const weakMapCopy = new WeakMap<Box, string>(weakMapSource, mark("f"));
console.log("weak map:", weakMap.get(alice), weakMapCopy.get(bob));

const weakSet = new WeakSet<Box>([alice], mark("g"));
const weakSetSource = new Set<Box>([bob]);
const weakSetCopy = new WeakSet<Box>(weakSetSource, mark("h"));
console.log("weak set:", weakSet.has(alice), weakSetCopy.has(bob));
console.log("marks:", marks);
