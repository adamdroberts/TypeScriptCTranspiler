const u8 = require("./bread_" + Buffer.from([255, 16]).readUInt8());
const u16le = require("./bread_" + Buffer.from([0x34, 0x12]).readUInt16LE());
const u32be = require("./bread_" + Buffer.from([0x01, 0x02, 0x03, 0x04]).readUInt32BE());
const i8 = require("./bread_" + Buffer.from([255]).readInt8());
const i16be = require("./bread_" + Buffer.from([0xfe, 0xd4]).readInt16BE());
const i32le = require("./bread_" + Buffer.from([0xb2, 0x9e, 0x43, 0xff]).readInt32LE());
const offset = require("./bread_" + Buffer.from([0, 0xab, 0xcd]).readUInt16BE(1));

console.log(u8.label, u16le.label, u32be.label, i8.label, i16be.label, i32le.label, offset.label);
