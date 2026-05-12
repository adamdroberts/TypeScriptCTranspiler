const items = ["red", "blue", "green"];

console.log("keys:", items.keys().join("|"));
console.log("values:", items.values().join("|"));

const values = items.values();
values[1] = "cyan";
console.log("copy:", values.join("|"));
console.log("source:", items.join("|"));
