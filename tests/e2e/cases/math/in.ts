let seen = "";
function mark(label: string): number {
  seen += label;
  return 1;
}

console.log("floor", Math.floor(3.7));
console.log("ceil", Math.ceil(3.2));
console.log("round", Math.round(3.5));
console.log("round negative zero:", 1 / Math.round(-0.5));
console.log("abs", Math.abs(-7, mark("a")));
console.log("sqrt", Math.sqrt(16, mark("s")));
console.log("pow", Math.pow(2, 10, mark("p")));
console.log("min", Math.min(3, 1, 4, 1, 5, 9));
console.log("max", Math.max(2, 7, 1, 8, 2));
console.log("minmax nan:", Math.min(1, NaN, 2), Math.max(1, NaN, 2));
console.log("PI*2 rounded:", Math.round(Math.PI * 2 * 1000) / 1000);
console.log("atan2", Math.round(Math.atan2(1, 1, mark("t")) * 1000) / 1000);
const randomValue = Math.random(mark("r"));
console.log("random range", randomValue >= 0 && randomValue < 1);
console.log("ignored", seen);
