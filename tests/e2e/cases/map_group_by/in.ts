interface Person {
    name: string;
    age: number;
}

function joinNames(group: Person[]): string {
    let names = "";
    for (let i = 0; i < group.length; i++) {
        if (i > 0) names = names + ",";
        names = names + group[i]!.name;
    }
    return names;
}

function joinNumbers(group: number[]): string {
    let parts = "";
    for (let i = 0; i < group.length; i++) {
        if (i > 0) parts = parts + ",";
        parts = parts + group[i]!;
    }
    return parts;
}

function joinStrings(group: string[]): string {
    let parts = "";
    for (let i = 0; i < group.length; i++) {
        if (i > 0) parts = parts + ",";
        parts = parts + group[i]!;
    }
    return parts;
}

function joinEntries(group: ObjectEntry<number, string>[]): string {
    let parts = "";
    for (let i = 0; i < group.length; i++) {
        if (i > 0) parts = parts + ",";
        const entry = group[i]!;
        parts = parts + entry[0] + ":" + entry[1];
    }
    return parts;
}

function printPersonGroup(map: Map<string, Person[]>, key: string): void {
    const group = map.get(key);
    if (group === undefined) {
        console.log(key + ":", "(none)");
        return;
    }
    console.log(key + ":", joinNames(group));
}

function printNumberGroup(map: Map<number, number[]>, key: number): void {
    const group = map.get(key);
    if (group === undefined) {
        console.log("k=" + key + ":", "(none)");
        return;
    }
    console.log("k=" + key + ":", joinNumbers(group));
}

const people: Person[] = [
    { name: "ada", age: 36 },
    { name: "alan", age: 41 },
    { name: "grace", age: 85 },
    { name: "linus", age: 56 },
    { name: "rms", age: 71 },
    { name: "abby", age: 4 },
];

const byBand = Map.groupBy(people, (p) => p.age >= 60 ? "senior" : p.age >= 18 ? "adult" : "child");
console.log("bands:", byBand.size);
printPersonGroup(byBand, "senior");
printPersonGroup(byBand, "adult");
printPersonGroup(byBand, "child");

const byIndex = Map.groupBy(people, (_p, i) => {
    return i % 2 === 0 ? "even-index" : "odd-index";
});
console.log("index bands:", byIndex.size);
printPersonGroup(byIndex, "even-index");
printPersonGroup(byIndex, "odd-index");

const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const parity = Map.groupBy(nums, (n) => n % 2);
console.log("parities:", parity.size);
printNumberGroup(parity, 0);
printNumberGroup(parity, 1);

let ignoredOrder = "";
const ignoredGroups = Map.groupBy([1, 2], (n) => n > 1 ? "large" : "small", (ignoredOrder += "A", 1), (ignoredOrder += "B", 2));
console.log("ignored args:", ignoredGroups.size, ignoredOrder);
const ignoredSmall = ignoredGroups.get("small");
const ignoredLarge = ignoredGroups.get("large");
console.log("ignored small:", ignoredSmall === undefined ? "(none)" : joinNumbers(ignoredSmall));
console.log("ignored large:", ignoredLarge === undefined ? "(none)" : joinNumbers(ignoredLarge));

function classify(person: Person, index: number): string {
    return index < 3 ? "first-half" : "second-half";
}
const halves = Map.groupBy(people, classify);
console.log("halves:", halves.size);
printPersonGroup(halves, "first-half");
printPersonGroup(halves, "second-half");

const setNums = new Set([2, 3, 4, 5, 6, 7]);
const setBuckets = Map.groupBy(setNums, (n, index) => index < 2 ? "early" : (n % 2 === 0 ? "even" : "odd"));
console.log("set buckets:", setBuckets.size);
const earlySet = setBuckets.get("early");
const evenSet = setBuckets.get("even");
const oddSet = setBuckets.get("odd");
console.log("set early:", earlySet === undefined ? "(none)" : joinNumbers(earlySet));
console.log("set even:", evenSet === undefined ? "(none)" : joinNumbers(evenSet));
console.log("set odd:", oddSet === undefined ? "(none)" : joinNumbers(oddSet));

const charBuckets = Map.groupBy("abacad", (ch, index) => index < 2 ? "front" : ch);
console.log("string buckets:", charBuckets.size);
const frontChars = charBuckets.get("front");
const aChars = charBuckets.get("a");
const dChars = charBuckets.get("d");
console.log("string front:", frontChars === undefined ? "(none)" : joinStrings(frontChars));
console.log("string a:", aChars === undefined ? "(none)" : joinStrings(aChars));
console.log("string d:", dChars === undefined ? "(none)" : joinStrings(dChars));

const sourceMap = new Map<string, number>([
    ["red", 1],
    ["blue", 2],
    ["green", 3],
    ["gold", 4],
    ["gray", 0],
]);
const entryBuckets = Map.groupBy(sourceMap, (entry, index) => index < 2 ? "front" : entry[1] >= 3 ? "large" : "small");
console.log("map-source buckets:", entryBuckets.size);
const frontEntries = entryBuckets.get("front");
const largeEntries = entryBuckets.get("large");
const smallEntries = entryBuckets.get("small");
console.log("map-source front:", frontEntries === undefined ? "(none)" : joinEntries(frontEntries));
console.log("map-source large:", largeEntries === undefined ? "(none)" : joinEntries(largeEntries));
console.log("map-source small:", smallEntries === undefined ? "(none)" : joinEntries(smallEntries));
