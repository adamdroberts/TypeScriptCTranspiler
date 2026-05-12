const fromArray: any = {};
const colors: any = ["red", "blue"];
Object.assign(fromArray, colors);
console.log("array", fromArray["0"], fromArray["1"], Object.keys(fromArray).join(","));

const fromString: any = {};
const text: any = "hi";
Object.assign(fromString, text);
console.log("string", fromString["0"], fromString["1"], Object.keys(fromString).join(","));
