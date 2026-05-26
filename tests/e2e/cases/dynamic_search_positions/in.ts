const text: any = "bananana";
const values: any = ["a", "b", "a", "c"];
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("dyn index:", text.indexOf("na", 3, mark("i")));
console.log("dyn last:", text.lastIndexOf("na", 5, mark("l")));
console.log("dyn includes:", text.includes("na", 5, mark("n")));
console.log("dyn starts:", text.startsWith("nana", 2, mark("s")));
console.log("dyn ends:", text.endsWith("nana", 6, mark("e")));
console.log("dyn array index:", values.indexOf("a", 1, mark("x")));
console.log("dyn array includes:", values.includes("a", 3, mark("c")));
console.log("dyn array last:", values.lastIndexOf("a", -2, mark("a")));
console.log("dyn last null:", text.lastIndexOf("na", null, mark("p")));
console.log("dyn ends null:", text.endsWith("ba", null, mark("q")));
console.log("dyn array last null:", values.lastIndexOf("a", null, mark("r")));
console.log("ignored:", seen);
