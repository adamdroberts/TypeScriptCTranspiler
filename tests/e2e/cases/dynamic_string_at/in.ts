const text: any = "abcdef";
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("first:", text.at(0));
console.log("middle:", text.at(2, mark("a")));
console.log("last:", text.at(-1));
console.log("missing:", text.at(9));
console.log("ignored:", seen);
