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

function classify(person: Person, index: number): string {
    return index < 3 ? "first-half" : "second-half";
}
const halves = Map.groupBy(people, classify);
console.log("halves:", halves.size);
printPersonGroup(halves, "first-half");
printPersonGroup(halves, "second-half");
