const items: any = ["red", "blue", "green"];
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("keys:", items.keys(mark("k")).join("|"));
console.log("values:", items.values(mark("v")).join("|"));
console.log("entries:", items.entries(mark("e"))[1].join("|"), seen);

const values: any = items.values();
values[1] = "cyan";
console.log("copy:", values.join("|"));
console.log("source:", items.join("|"));
