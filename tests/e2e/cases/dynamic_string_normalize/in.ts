const decomposed: any = "e\u0301";
const composed: any = "\u00e9";
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("default:", decomposed.normalize(undefined, mark("d")) === composed);
console.log("nfd:", composed.normalize("NFD", mark("n")) === decomposed);
console.log("ignored:", seen);
