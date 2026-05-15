const bytes = Buffer.alloc(24);

console.log("write:", bytes.writeFloatLE(1.5), bytes.writeFloatBE(-2.25, 4), bytes.writeDoubleLE(3.5, 8), bytes.writeDoubleBE(-4.75, 16));
console.log("hex:", bytes.toString("hex"));
console.log("read:", bytes.readFloatLE(), bytes.readFloatBE(4), bytes.readDoubleLE(8), bytes.readDoubleBE(16));
