const bytes = Buffer.alloc(3);

console.log("write:", bytes.writeUInt8(255), bytes.writeUInt8(16, 2), bytes.toString("hex"));
console.log("read:", bytes.readUInt8(), bytes.readUInt8(1), bytes.readUInt8(2));
