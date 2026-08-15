// @ts-nocheck: dynamic require proof coverage intentionally exercises string-pattern search calls.
const digits = "\\d+";
const position = "Ada Lovelace 1843".search(digits);
const phrase = "alphabet".search("ph");
const fromDigits = require("./sss_" + position);
const fromPhrase = require("./sss_" + phrase);

console.log(fromDigits.label, fromPhrase.label);
