const padded: any = "  hello  ";
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("start:", "[" + padded.trimStart(mark("s")) + "]");
console.log("end:", "[" + padded.trimEnd(mark("e")) + "]");
console.log("both:", "[" + padded.trim(mark("t")) + "]", seen);
