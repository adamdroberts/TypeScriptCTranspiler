const small = Buffer.alloc(8);

console.log("small write:", small.writeInt8(-1), small.writeInt16LE(-2, 1), small.writeInt16BE(-300, 3));
console.log("small hex:", small.toString("hex"));
console.log("small read:", small.readInt8(), small.readInt16LE(1), small.readInt16BE(3));

const wide = Buffer.alloc(8);
console.log("wide write:", wide.writeInt32LE(-12345678), wide.writeInt32BE(-12345678, 4));
console.log("wide:", wide.toString("hex"), wide.readInt32LE(), wide.readInt32BE(4));
