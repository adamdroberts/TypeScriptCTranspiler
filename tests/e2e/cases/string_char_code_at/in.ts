const text = "A😀Z";
const dynamicText: any = text;

console.log("A:", text.charCodeAt(0));
console.log("hi:", text.charCodeAt(1));
console.log("lo:", text.charCodeAt(2));
console.log("Z:", text.charCodeAt(3));
console.log("missing:", text.charCodeAt(9));
console.log("dyn:", dynamicText.charCodeAt(3));
