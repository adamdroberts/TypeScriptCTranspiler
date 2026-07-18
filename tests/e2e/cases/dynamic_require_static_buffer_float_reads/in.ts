const f32le = require("./bfread_" + Buffer.from("0000803f", "hex").readFloatLE());
const f32be = require("./bfread_" + Buffer.from("c0000000", "hex").readFloatBE());
const f32Offset = require("./bfread_" + Buffer.from("0000000040000000", "hex").readFloatBE(4));
const f64le = require("./bfread_" + Buffer.from("0000000000000840", "hex").readDoubleLE());
const f64be = require("./bfread_" + Buffer.from("c014000000000000", "hex").readDoubleBE());
const f64Offset = require("./bfread_" + Buffer.from("00004020000000000000", "hex").readDoubleBE(2));

console.log(f32le.label, f32be.label, f32Offset.label, f64le.label, f64be.label, f64Offset.label);
