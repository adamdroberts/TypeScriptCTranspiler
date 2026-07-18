const sliced = require("./bslice_" + Buffer.from("abcdef").slice(1, 4).toString());
const subarray = require("./bslice_" + Buffer.from("abcdef").subarray(2, 5).toString());
const negative = require("./bslice_" + Buffer.from("abcdef").slice(-3, -1).toString());
const defaultEnd = require("./bslice_" + Buffer.from("abcdef").subarray(3).toString());
const concatSlice = require("./bslice_" + Buffer.concat([Buffer.from("ab"), Buffer.from("cd")]).slice(1, 3).toString("hex"));
const allocSlice = require("./bslice_" + Buffer.alloc(4, 65).slice(1, 3).toString());

console.log(sliced.label, subarray.label, negative.label, defaultEnd.label, concatSlice.label, allocSlice.label);
