const text = require("./bval_" + Buffer.from("hello").valueOf().toString());
const length = require("./bval_" + Buffer.from("abc").valueOf().length);
const index = require("./bval_" + Buffer.from("AZ").valueOf()[1]);
const swapped = require("./bval_" + Buffer.from("00112233", "hex").swap16().valueOf().toString("hex"));

console.log(text.label, length.label, index.label, swapped.label);
