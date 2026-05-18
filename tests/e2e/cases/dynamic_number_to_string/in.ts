const n: any = 255;
const neg: any = -10;
const frac: any = 10.5;
const yes: any = true;
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("hex:", n.toString(16, mark("h")));
console.log("bin:", neg.toString(2, mark("b")));
console.log("frac:", frac.toString(2));
console.log("bool:", yes.toString(mark("t")));
console.log("value:", n.valueOf(mark("v")));
console.log("ignored:", seen);
