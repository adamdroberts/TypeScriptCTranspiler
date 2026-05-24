class Token {
    label: string;
    constructor(label: string) {
        this.label = label;
    }
}

const primary = new Token("primary");
const secondary = new Token("secondary");
const objectEntries: ObjectEntry<string, Token>[] = [
    [primary, "alpha"],
    [secondary, "beta"],
];

const objectMap = new Map<Token, string>(objectEntries);
console.log("object map:", objectMap.get(primary), objectMap.get(secondary));

const fromObjectMap = Array.from(objectMap);
console.log("array from object map:", fromObjectMap[0][0] === primary, fromObjectMap[1][1]);

const objectMapEntries = objectMap.entries();
console.log("object entries:", objectMapEntries[1][0].label, objectMapEntries[0][1]);

const weakFromEntries = new WeakMap<Token, string>(objectEntries);
console.log("weak entries:", weakFromEntries.get(primary), weakFromEntries.has(secondary));

const numberEntries: ObjectEntry<string, number>[] = [
    [1, "one"],
    [2, "two"],
];
const numberMap = new Map<number, string>(numberEntries);
const numberMapEntries = numberMap.entries();
console.log("number map:", numberMap.get(2), numberMapEntries[0][0] + 1, numberMapEntries[1][1]);
