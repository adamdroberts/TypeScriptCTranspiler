const items: any = ["red", "blue", "green"];
const entries: any = items.entries();

console.log("entry0:", entries[0][0], entries[0][1]);
console.log("entry2:", entries[2][0], entries[2][1]);

entries[1][1] = "cyan";
console.log("copy:", entries[1][1]);
console.log("source:", items[1]);
