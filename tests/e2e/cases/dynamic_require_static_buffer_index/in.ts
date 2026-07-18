const first = require("./bidx_" + Buffer.from("AZ")[0]);
const second = require("./bidx_" + Buffer.from("AZ")[1]);
const filled = require("./bidx_" + Buffer.alloc(2, 7)[1]);
const byte = require("./bidx_" + Buffer.from([255])[0]);
const missing = require("./bidx_" + Buffer.from("A")[3]);

console.log(first.label, second.label, filled.label, byte.label, missing.label);
