const text = "A" + String.fromCodePoint(0x1f600);
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

console.log("well", text.isWellFormed());
console.log("same", text.toWellFormed().codePointAt(1));
console.log("ignored", text.isWellFormed(mark("i")), text.toWellFormed(mark("w")).codePointAt(1), seen);
