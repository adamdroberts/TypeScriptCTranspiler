const text: any = "A" + String.fromCodePoint(0x1f600) + "Z";
const nonString: any = 12;
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("points", text.codePointAt(), text.codePointAt(0, mark("p")), text.codePointAt(1), text.codePointAt(2), text.codePointAt(3));
console.log("missing", text.codePointAt(9), text.codePointAt(-1));
console.log("non-string", String.prototype.codePointAt.call(nonString, 0));
console.log("ignored", seen);
