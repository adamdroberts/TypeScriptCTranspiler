import { randomBytes, randomBytes as randomBytesAlias } from "node:crypto";

const a = crypto.randomBytes(4);
const b = randomBytes(3);
const c = randomBytesAlias(2);

console.log("shape:", Buffer.isBuffer(a), a.length, Buffer.isBuffer(b), b.length, Buffer.isBuffer(c), c.length);
console.log("bytes:", a.readUInt8(0) >= 0, a.readUInt8(0) <= 255, b.readUInt8(2) >= 0, b.readUInt8(2) <= 255, c.readUInt8(1) >= 0, c.readUInt8(1) <= 255);
