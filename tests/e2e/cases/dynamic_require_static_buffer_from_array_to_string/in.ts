const ascii = require("./barr_" + Buffer.from([65, 66, 67]).toString());
const hex = require("./barr_" + Buffer.from([0, 15, 255]).toString("hex"));
const wrapped = require("./barr_" + Buffer.from([256, -1, 65]).toString("hex"));
const empty = require("./barr_" + Buffer.from([]).toString("hex"));
const concat = require("./barr_" + Buffer.concat([Buffer.from([65]), Buffer.from("B")]).toString());
const slice = require("./barr_" + Buffer.from([65, 66, 67, 68]).slice(1, 3).toString());

console.log(ascii.label, hex.label, wrapped.label, empty.label, concat.label, slice.label);
