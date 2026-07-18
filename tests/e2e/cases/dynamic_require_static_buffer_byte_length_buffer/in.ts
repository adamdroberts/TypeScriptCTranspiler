const fromString = require("./blenbuf_" + Buffer.byteLength(Buffer.from("hé")));
const fromArray = require("./blenbuf_" + Buffer.byteLength(Buffer.from([0, 15, 255])));
const alloc = require("./blenbuf_" + Buffer.byteLength(Buffer.alloc(4, 65)));
const concat = require("./blenbuf_" + Buffer.byteLength(Buffer.concat([Buffer.from([1]), Buffer.from([2, 3])])));
const slice = require("./blenbuf_" + Buffer.byteLength(Buffer.from("abcdef").slice(1, 4)));
const filled = require("./blenbuf_" + Buffer.byteLength(Buffer.from("abcde").fill(88, 1, 4), "hex"));

console.log(fromString.label, fromArray.label, alloc.label, concat.label, slice.label, filled.label);
