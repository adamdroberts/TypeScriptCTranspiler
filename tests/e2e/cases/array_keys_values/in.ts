const items = ["red", "blue", "green"];
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

console.log("keys:", Array.from(items.keys()).join("|"));
console.log("values:", Array.from(items.values()).join("|"));

const values = Array.from(items.values());
values[1] = "cyan";
console.log("copy:", values.join("|"));
console.log("source:", items.join("|"));

const ignoredKeys = Array.from(items.keys(mark("k")));
const ignoredValues = Array.from(items.values(mark("v")));
const ignoredEntries = Array.from(items.entries(mark("e")));
const firstEntry = ignoredEntries[0];
console.log("ignored:", ignoredKeys.join("|"), ignoredValues.join("|"), firstEntry[0] + ":" + firstEntry[1], seen);
