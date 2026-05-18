const items = ["red", "blue", "green"];
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

console.log("keys:", items.keys().join("|"));
console.log("values:", items.values().join("|"));

const values = items.values();
values[1] = "cyan";
console.log("copy:", values.join("|"));
console.log("source:", items.join("|"));

const ignoredKeys = items.keys(mark("k"));
const ignoredValues = items.values(mark("v"));
const ignoredEntries = items.entries(mark("e"));
const firstEntry = ignoredEntries[0];
console.log("ignored:", ignoredKeys.join("|"), ignoredValues.join("|"), firstEntry[0] + ":" + firstEntry[1], seen);
