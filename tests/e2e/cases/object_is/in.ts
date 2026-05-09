const a: any = { x: 1 };
const same: any = a;
const b: any = { x: 1 };

console.log("nan:", Object.is(NaN, NaN));
console.log("zero:", Object.is(0, -0));
console.log("string:", Object.is("x", "x"));
console.log("same object:", Object.is(a, same));
console.log("different object:", Object.is(a, b));
