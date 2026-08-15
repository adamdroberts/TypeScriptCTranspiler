// @ts-nocheck: dynamic require proof coverage intentionally exercises matchAll collections.
const matches = Array.from("a1 b22 c333".matchAll(/([a-z])(\d+)/g));
const first = require("./ma_" + matches[0][0]);
const firstLetter = require("./ma_" + matches[0][1]);
const secondNumber = require("./ma_" + matches[1][2]);
const count = require("./ma_len_" + matches.length);

console.log(first.label, firstLetter.label, secondNumber.label, count.label);
