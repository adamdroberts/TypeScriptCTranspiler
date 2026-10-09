const buf = Buffer.alloc(5);

console.log("all:", buf.fill(65).toString());
console.log("middle:", buf.fill(66, 1, 4).toString());
try { buf.fill(67, -2); } catch (error) { console.log("negative:", error instanceof RangeError); }
console.log("return:", buf.fill(68).toString());
