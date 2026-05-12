const text = "bananana";

console.log("index from 3:", text.indexOf("na", 3));
console.log("index empty past end:", text.indexOf("", 99));
console.log("last from 5:", text.lastIndexOf("na", 5));
console.log("last negative:", text.lastIndexOf("ba", -1));
console.log("includes from 5:", text.includes("na", 5));
console.log("starts from 2:", text.startsWith("nana", 2));
console.log("ends at 6:", text.endsWith("nana", 6));
