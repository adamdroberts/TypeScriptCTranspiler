const all = require("./bfill_" + Buffer.alloc(3).fill(65).toString());
const middle = require("./bfill_" + Buffer.from("abcde").fill(88, 1, 4).toString());
const tail = require("./bfill_" + Buffer.from("abcde").fill(89, 3).toString());
const clipped = require("./bfill_" + Buffer.from("abcde").fill(90, 0, 2).toString());
const hex = require("./bfill_" + Buffer.from("000000", "hex").fill(255, 1, 2).toString("hex"));
const chained = require("./bfill_" + Buffer.from("abcde").slice(1, 4).fill(81, 1, 2).toString());

console.log(all.label, middle.label, tail.label, clipped.label, hex.label, chained.label);
