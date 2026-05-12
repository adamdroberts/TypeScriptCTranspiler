const text: any = "A" + String.fromCodePoint(0x1f600) + "Z";
const nonString: any = 12;

console.log("points", text.codePointAt(), text.codePointAt(0), text.codePointAt(1), text.codePointAt(2), text.codePointAt(3));
console.log("missing", text.codePointAt(9), text.codePointAt(-1));
console.log("non-string", nonString.codePointAt(0));
