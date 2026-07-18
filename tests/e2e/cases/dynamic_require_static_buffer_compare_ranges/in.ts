const equalRange = require("./bcmpr_" + Buffer.from("abcdef").compare(Buffer.from("def"), 0, 3, 3, 6));
const sourceShort = require("./bcmpr_" + Buffer.from("abcdef").compare(Buffer.from("def"), 0, 3, 3, 5));
const targetShort = require("./bcmpr_" + Buffer.from("abcdef").compare(Buffer.from("def"), 0, 2, 3, 6));
const defaultsTarget = require("./bcmpr_" + Buffer.from("abcdef").compare(Buffer.from("def"), undefined, undefined, 3, 6));
const defaultsSource = require("./bcmpr_" + Buffer.from("abcdef").compare(Buffer.from("def"), 0, 3, undefined, undefined));
const targetEmpty = require("./bcmpr_" + Buffer.from("abcdef").compare(Buffer.from("def"), 2, 1, 3, 6));
const sourceEmpty = require("./bcmpr_" + Buffer.from("abcdef").compare(Buffer.from("def"), 0, 3, 5, 4));

console.log(equalRange.label, sourceShort.label, targetShort.label, defaultsTarget.label, defaultsSource.label, targetEmpty.label, sourceEmpty.label);
