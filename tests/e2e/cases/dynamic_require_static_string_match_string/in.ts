// @ts-nocheck: dynamic require proof coverage intentionally exercises string-pattern match collections.
const pattern = "([a-z])(\\d+)";
const matches = "a1 b22 c333".match(pattern);
const first = require("./ms_" + matches[0]);
const firstLetter = require("./ms_" + matches[1]);
const firstNumber = require("./ms_" + matches[2]);
const count = require("./ms_len_" + matches.length);

console.log(first.label, firstLetter.label, firstNumber.label, count.label);
