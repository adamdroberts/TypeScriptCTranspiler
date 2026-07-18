const f32le = require("./bfwrite_" + Buffer.alloc(4).writeFloatLE(1.5));
const f32beOffset = require("./bfwrite_" + Buffer.alloc(8).writeFloatBE(-2.25, 4));
const f64le = require("./bfwrite_" + Buffer.alloc(8).writeDoubleLE(3.5));
const f64beOffset = require("./bfwrite_" + Buffer.alloc(24).writeDoubleBE(-4.75, 16));

console.log(f32le.label, f32beOffset.label, f64le.label, f64beOffset.label);
