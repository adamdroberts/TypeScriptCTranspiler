const n = 255;
const neg = -10;
const frac = 10.5;
const yes = true;
const no = false;

console.log("num:", n.toString(), n.toLocaleString(), n.valueOf() + 1);
console.log("hex:", n.toString(16));
console.log("bin:", neg.toString(2));
console.log("frac:", frac.toString(2));
console.log("bool:", yes.toString(), no.toLocaleString(), yes.valueOf() ? "yes" : "no");
console.log("own:", n.hasOwnProperty("toString"), yes.propertyIsEnumerable("valueOf"));
