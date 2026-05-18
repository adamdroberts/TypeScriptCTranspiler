let seen = "";
function mark(label: string): number {
  seen += label;
  return 1;
}

console.log("cbrt", Math.cbrt(27, mark("c")));
console.log("hypot", Math.hypot(3, 4));
console.log("hypot variadic", Math.hypot(), Math.hypot(3, 4, 12));
console.log("log2", Math.log2(8, mark("l")));
console.log("log10", Math.log10(1000));
console.log("log1p", Math.round(Math.log1p(Math.E - 1) * 1000) / 1000);
console.log("expm1", Math.round(Math.expm1(1) * 1000) / 1000);
console.log("inverse trig", Math.asin(0, mark("i")), Math.acos(1), Math.round(Math.acos(0) * 1000) / 1000);
console.log("hyperbolic", Math.sinh(0), Math.cosh(0), Math.tanh(0));
console.log("inverse hyperbolic", Math.asinh(0), Math.acosh(1), Math.atanh(0));
console.log("ignored", seen);
