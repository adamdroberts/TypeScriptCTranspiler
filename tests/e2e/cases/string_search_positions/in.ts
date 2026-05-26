const text = "bananana";
let seen = "";
function mark(label: string, value: number): number {
    seen += label;
    return value;
}

console.log("index from 3:", text.indexOf("na", 3));
console.log("index empty past end:", text.indexOf("", 99));
console.log("last from 5:", text.lastIndexOf("na", 5));
console.log("last negative:", text.lastIndexOf("ba", -1));
console.log("includes from 5:", text.includes("na", 5));
console.log("starts from 2:", text.startsWith("nana", 2));
console.log("ends at 6:", text.endsWith("nana", 6));
console.log("ignored index:", text.indexOf("na", mark("i", 3), mark("I", 0)));
console.log("ignored last:", text.lastIndexOf("na", mark("l", 5), mark("L", 0)));
console.log("ignored includes:", text.includes("na", mark("c", 5), mark("C", 0)));
console.log("ignored starts:", text.startsWith("nana", mark("s", 2), mark("S", 0)));
console.log("ignored ends:", text.endsWith("nana", mark("e", 6), mark("E", 0)));
console.log("undefined index:", text.indexOf("na", undefined, mark("u", 0)));
console.log("undefined last:", text.lastIndexOf("na", undefined, mark("v", 0)));
console.log("undefined includes:", text.includes("ba", undefined, mark("w", 0)));
console.log("undefined starts:", text.startsWith("ba", undefined, mark("x", 0)));
console.log("undefined ends:", text.endsWith("na", undefined, mark("y", 0)));
console.log("ignored seen:", seen);
