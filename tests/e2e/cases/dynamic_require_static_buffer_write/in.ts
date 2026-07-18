const full = require("./bwr_" + Buffer.alloc(4).write("abc"));
const offsetLength = require("./bwr_" + Buffer.alloc(5).write("abcdef", 1, 3));
const clipped = require("./bwr_" + Buffer.alloc(3).write("hello", 2));
const exactEnd = require("./bwr_" + Buffer.alloc(3).write("abc", 3));
const hex = require("./bwr_" + Buffer.alloc(4).write("4869", 0, 4, "hex"));
const base64 = require("./bwr_" + Buffer.alloc(4).write("aGk=", 0, 4, "base64"));

console.log(full.label, offsetLength.label, clipped.label, exactEnd.label, hex.label, base64.label);
