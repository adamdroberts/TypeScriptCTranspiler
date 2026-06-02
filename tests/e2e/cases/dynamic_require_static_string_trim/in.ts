// @ts-nocheck: dynamic require proof coverage intentionally exercises string trim calls.
const bothName = "  ./trim_both  ";
const startName = "  ./trim_start";
const endName = "./trim_end  ";
const leftName = "  ./trim_left";
const rightName = "./trim_right  ";

const both = require(bothName.trim());
const start = require(startName.trimStart());
const end = require(endName.trimEnd());
const left = require(leftName.trimLeft());
const right = require(rightName.trimRight());

console.log(both.label, start.label, end.label, left.label, right.label);
