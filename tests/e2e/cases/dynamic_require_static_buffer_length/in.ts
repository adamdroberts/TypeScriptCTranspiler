const fromText = require("./blen_" + Buffer.from("abc").length);
const fromAlloc = require("./blen_" + Buffer.alloc(5).length);
const fromEmpty = require("./blen_" + Buffer.from("").length);
const fromConcatLimit = require("./blen_" + Buffer.concat([Buffer.from("ab"), Buffer.from("cd")], 2).length);

console.log(fromText.label, fromAlloc.label, fromEmpty.label, fromConcatLimit.label);
