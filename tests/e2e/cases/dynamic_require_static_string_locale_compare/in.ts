// @ts-nocheck: dynamic require proof coverage intentionally exercises static localeCompare calls.
const lower = require("./lc_" + "a".localeCompare("b"));
const greater = require("./lc_" + "b".localeCompare("a"));
const equal = require("./lc_" + "same".localeCompare("same"));

console.log(lower.label, greater.label, equal.label);
