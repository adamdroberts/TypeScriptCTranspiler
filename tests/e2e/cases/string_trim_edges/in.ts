const padded = "  hello  ";
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

console.log("start:", "[" + padded.trimStart() + "]");
console.log("end:", "[" + padded.trimEnd() + "]");
console.log("both:", "[" + padded.trim() + "]");
console.log("ignored:", "[" + padded.trimStart(mark("s")) + "]", "[" + padded.trimEnd(mark("e")) + "]", "[" + padded.trim(mark("t")) + "]", seen);
