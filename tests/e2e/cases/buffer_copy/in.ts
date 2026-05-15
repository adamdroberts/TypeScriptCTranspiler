const source = Buffer.from("abcdef");
const target = Buffer.alloc(6, 45);

console.log("first:", source.copy(target, 1, 2, 5), target.toString());
console.log("clip:", source.copy(target, 5, 0, 4), target.toString());

const full = Buffer.alloc(4, 46);
console.log("full:", Buffer.from("xy").copy(full), full.toString());
