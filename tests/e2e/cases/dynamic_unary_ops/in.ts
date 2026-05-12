const text: any = "5";
const bad: any = "x";
const truthy: any = true;
const neg: any = -1;

console.log("plus:", +text, +truthy);
console.log("minus:", -text, -truthy);
console.log("bitnot:", ~text, ~neg);
console.log("bad:", +bad, -bad, ~bad);
