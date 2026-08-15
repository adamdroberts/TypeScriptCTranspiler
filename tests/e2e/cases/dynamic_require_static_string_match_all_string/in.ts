// @ts-nocheck: dynamic require proof coverage intentionally exercises string-pattern matchAll collections.
const pattern = "([a-z])(\\d+)";
const matches = [..."a1 b22 c333".matchAll(pattern)];
const first = require("./mas_" + matches[0][0]);
const firstLetter = require("./mas_" + matches[0][1]);
const secondNumber = require("./mas_" + matches[1][2]);
const count = require("./mas_len_" + matches.length);

console.log(first.label, firstLetter.label, secondNumber.label, count.label);
