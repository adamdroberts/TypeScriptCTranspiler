const items: any = ["red", "blue", "green"];
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}
const entries: any = items.entries(mark("e"));

console.log("entry0:", entries[0][0], entries[0][1]);
console.log("entry2:", entries[2][0], entries[2][1]);

entries[1][1] = "cyan";
console.log("copy:", entries[1][1]);
console.log("source:", items[1]);
console.log("ignored:", seen);
