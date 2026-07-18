const idxBuf = require("./bsearch_" + Buffer.from("abcabc").indexOf(Buffer.from("bc")));
const lastBuf = require("./bsearch_" + Buffer.from("abcabc").lastIndexOf(Buffer.from("bc")));
const incBuf = require("./bsearch_" + Buffer.from("abcabc").includes(Buffer.from("ca")));
const missingBuf = require("./bsearch_" + Buffer.from("abcabc").includes(Buffer.from("zz")));
const idxString = require("./bsearch_" + Buffer.from("abcabc").indexOf("ca"));
const idxByte = require("./bsearch_" + Buffer.from("abcabc").indexOf(99));
const lastOffset = require("./bsearch_" + Buffer.from("abcabc").lastIndexOf(Buffer.from("bc"), 3));

console.log(idxBuf.label, lastBuf.label, incBuf.label, missingBuf.label, idxString.label, idxByte.label, lastOffset.label);
