const full = require("./bcpy_" + Buffer.from("abc").copy(Buffer.alloc(3)));
const offset = require("./bcpy_" + Buffer.from("abc").copy(Buffer.alloc(4), 1));
const range = require("./bcpy_" + Buffer.from("abcdef").copy(Buffer.alloc(4), 0, 2, 5));
const clippedTarget = require("./bcpy_" + Buffer.from("abcd").copy(Buffer.alloc(2)));
const emptySource = require("./bcpy_" + Buffer.from("abc").copy(Buffer.alloc(3), 0, 2, 2));
const exactEnd = require("./bcpy_" + Buffer.from("abc").copy(Buffer.alloc(3), 3));

console.log(full.label, offset.label, range.label, clippedTarget.label, emptySource.label, exactEnd.label);
