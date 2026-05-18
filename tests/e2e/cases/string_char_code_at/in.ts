const text = "A😀Z";
const dynamicText: any = text;
let seen = "";
function mark(label: string, value: number): number {
    seen += label;
    return value;
}

console.log("A:", text.charCodeAt(0));
console.log("hi:", text.charCodeAt(1));
console.log("lo:", text.charCodeAt(2));
console.log("Z:", text.charCodeAt(3));
console.log("missing:", text.charCodeAt(9));
console.log("dyn:", dynamicText.charCodeAt(3));
console.log(
    "ignored:",
    text.charAt(mark("a", 0), mark("b", 0)),
    text.at(mark("c", 3), mark("d", 0)),
    text.charCodeAt(mark("e", 0), mark("f", 0)),
    text.codePointAt(mark("g", 0), mark("h", 0)),
    seen,
);
