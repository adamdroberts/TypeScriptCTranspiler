const text: any = "bananana";
const values: any = ["a", "b", "a", "c"];

console.log("dyn index:", text.indexOf("na", 3));
console.log("dyn last:", text.lastIndexOf("na", 5));
console.log("dyn includes:", text.includes("na", 5));
console.log("dyn starts:", text.startsWith("nana", 2));
console.log("dyn ends:", text.endsWith("nana", 6));
console.log("dyn array index:", values.indexOf("a", 1));
console.log("dyn array includes:", values.includes("a", 3));
console.log("dyn array last:", values.lastIndexOf("a", -2));
