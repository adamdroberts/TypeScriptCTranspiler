const original = new Set<number>([1, 2, 1]);
const copy = new Set<number>(original);

copy.add(3);

console.log("sizes:", original.size, copy.size);
console.log("original:", Array.from(original).join("|"));
console.log("copy:", Array.from(copy).join("|"));
console.log("has:", copy.has(1), copy.has(3), original.has(3));
