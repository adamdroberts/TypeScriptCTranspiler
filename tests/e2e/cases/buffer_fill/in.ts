const buf = Buffer.alloc(5);

console.log("all:", buf.fill(65).toString());
console.log("middle:", buf.fill(66, 1, 4).toString());
console.log("tail:", buf.fill(67, -2).toString());
console.log("return:", buf.fill(68).toString());
