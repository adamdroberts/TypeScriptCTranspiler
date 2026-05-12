const text = "Ada";

console.log("string:", text.toString());
console.log("locale:", text.toLocaleString());
console.log("value:", text.valueOf() + "!");
console.log("own:", text.hasOwnProperty("0"), text.hasOwnProperty("length"), text.hasOwnProperty("3"));
console.log("enum:", text.propertyIsEnumerable("0"), text.propertyIsEnumerable("length"));
