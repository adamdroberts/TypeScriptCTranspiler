const text: any = "go";
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("repeat:", text.repeat(3, mark("r")), text.repeat(0, mark("z")).length);
console.log("pad:", text.padStart(5, ".", mark("s")), text.padEnd(5, 1, mark("e")), text.padStart(4, undefined, mark("u")));
console.log("pad null:", text.padStart(6, null, mark("n")), text.padEnd(6, null, mark("m")));
console.log("ignored:", seen);
