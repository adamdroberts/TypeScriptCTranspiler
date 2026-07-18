const sliceDirect = require(["./array_copy_slice_direct", "./unused"].slice(0, 1)[0]);
const sliceNegative = require("./array_copy_slice_" + ["old", "negative", "tail"].slice(-2, -1)[0]);
const concatDirect = require("./array_copy_concat_" + ["left"].concat(["right"])[1]);
const concatScalar = require("./array_copy_concat_" + ["left"].concat("scalar")[1]);
const concatArrayOf = require("./array_copy_concat_" + Array.of("old").concat(Array.of("array_of"))[1]);
const concatArrayFrom = require("./array_copy_concat_" + Array.from(["old"]).concat(Array.from(["array_from"]))[1]);
const entry = require("./array_copy_entry_" + Object.entries(["drop", "value"].slice(1))[0][1]);

console.log(sliceDirect.label, sliceNegative.label, concatDirect.label, concatScalar.label, concatArrayOf.label, concatArrayFrom.label, entry.label);
