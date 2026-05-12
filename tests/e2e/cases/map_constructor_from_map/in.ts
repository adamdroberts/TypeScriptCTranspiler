const original = new Map<string, number>();
original.set("a", 1);
original.set("b", 2);

const copy = new Map<string, number>(original);
copy.set("c", 3);

console.log("sizes:", original.size, copy.size);
console.log("original:", original.get("a"), original.has("c"));
console.log("copy:", copy.get("a"), copy.get("b"), copy.get("c"));

const numeric = new Map<number, string>();
numeric.set(NaN, "nan");
numeric.set(-0, "zero");

const numericCopy = new Map<number, string>(numeric);
console.log("numeric:", numericCopy.size, numericCopy.get(NaN), numericCopy.get(0));
