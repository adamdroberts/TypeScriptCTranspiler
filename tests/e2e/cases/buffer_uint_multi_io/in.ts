const bytes = Buffer.alloc(8);

console.log("write:", bytes.writeUInt16LE(0x1234), bytes.writeUInt16BE(0xabcd, 2), bytes.writeUInt32LE(0x01020304, 4));
console.log("hex:", bytes.toString("hex"));
console.log("read:", bytes.readUInt16LE(), bytes.readUInt16BE(2), bytes.readUInt32LE(4));

const be = Buffer.alloc(4);
console.log("be:", be.writeUInt32BE(0x01020304), be.toString("hex"), be.readUInt32BE());
