const text = "Ada";
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

console.log("string:", text.toString());
console.log("locale:", text.toLocaleString());
console.log("value:", text.valueOf() + "!");
console.log("own:", text.hasOwnProperty("0"), text.hasOwnProperty("length"), text.hasOwnProperty("3"));
console.log("enum:", text.propertyIsEnumerable("0"), text.propertyIsEnumerable("length"));
console.log("ignored own:", text.hasOwnProperty("1", mark("a")), text.propertyIsEnumerable("length", mark("b")), seen);
console.log("ignored value:", text.toString(mark("c")), text.toLocaleString(mark("d")), text.valueOf(mark("e")), seen);
