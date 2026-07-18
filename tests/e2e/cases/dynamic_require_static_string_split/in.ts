// @ts-nocheck: dynamic require proof coverage intentionally exercises string split calls.
const separator = "|";
const index = 1;

const direct = require("x|./split_a|z".split(separator)[index]);
const limited = require("left:./split_b:right".split(":")[1]);

type Choice = 1 | 2;
function load(choice: Choice): any {
    return require("skip,./split_c,./split_d".split(",", 3)[choice]);
}

console.log(direct.label, limited.label, load(1).label, load(2).label);
