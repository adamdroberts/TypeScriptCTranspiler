// @ts-nocheck: dynamic require proof coverage intentionally exercises RegExp split calls.
const indexed = require("skip,./split_regex_a,./split_regex_b".split(/,/)[1]);
const constructed = require(Array.from("skip|./split_regex_c|./split_regex_d".split(new RegExp("\\|")))[2]);
const limited = require([..."skip|./split_regex_e|./split_regex_f".split(/\|/, 2)][1]);

console.log(indexed.label, constructed.label, limited.label);
