const n = 255;
const neg = -10;
const frac = 10.5;
const yes = true;
const no = false;
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

console.log("num:", n.toString(), n.toLocaleString(), n.valueOf() + 1);
console.log("hex:", n.toString(16));
console.log("bin:", neg.toString(2));
console.log("frac:", frac.toString(2));
console.log("bool:", yes.toString(), no.toLocaleString(), yes.valueOf() ? "yes" : "no");
console.log("own:", n.hasOwnProperty("toString"), yes.propertyIsEnumerable("valueOf"));
console.log("ignored num:", n.toString(16, mark("a")), n.toFixed(1, mark("b")), n.toExponential(1, mark("c")), n.toPrecision(3, mark("d")), n.toLocaleString(mark("e")), n.valueOf(mark("f")));
console.log("ignored bool:", yes.toString(mark("g")), no.toLocaleString(mark("h")), yes.valueOf(mark("i")), seen);
