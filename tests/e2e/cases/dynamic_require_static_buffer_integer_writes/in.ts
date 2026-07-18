const u8 = require("./bwrite_" + Buffer.alloc(1).writeUInt8(255));
const u16le = require("./bwrite_" + Buffer.alloc(2).writeUInt16LE(0x1234));
const u16beOffset = require("./bwrite_" + Buffer.alloc(4).writeUInt16BE(0xabcd, 2));
const u32be = require("./bwrite_" + Buffer.alloc(4).writeUInt32BE(0x01020304));
const i8 = require("./bwrite_" + Buffer.alloc(1).writeInt8(-1));
const i16beOffset = require("./bwrite_" + Buffer.alloc(5).writeInt16BE(-300, 3));
const i32leOffset = require("./bwrite_" + Buffer.alloc(8).writeInt32LE(-12345678, 4));

console.log(u8.label, u16le.label, u16beOffset.label, u32be.label, i8.label, i16beOffset.label, i32leOffset.label);
