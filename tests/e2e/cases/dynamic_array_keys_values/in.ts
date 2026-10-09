const items: any = ["red", "blue", "green"];
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("keys:", Array.from(items.keys(mark("k"))).join("|"));
console.log("values:", Array.from(items.values(mark("v"))).join("|"));
console.log("entries:", Array.from<any>(items.entries(mark("e")))[1].join("|"), seen);

const values: any = Array.from(items.values());
values[1] = "cyan";
console.log("copy:", values.join("|"));
console.log("source:", items.join("|"));

Object.defineProperty(items, "1", {
  get: function(this: any): string {
    seen += "g";
    return "get-" + this[0];
  },
  enumerable: true,
  configurable: true,
});
console.log("accessor values:", Array.from(items.values()).join("|"), seen);
const accessorEntries: any = Array.from(items.entries());
console.log("accessor entries:", accessorEntries[1].join("|"), seen);
