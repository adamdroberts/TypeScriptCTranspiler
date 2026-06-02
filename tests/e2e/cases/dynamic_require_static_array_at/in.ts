// @ts-nocheck: dynamic require proof coverage intentionally exercises Array.at.
const modules = ["./at_a", "./at_b"] as const;
const alias = modules;
const lastIndex = -1;

const first = require(modules.at(0));
const second = require(alias.at(1));
const last = require(modules.at(lastIndex));

console.log(first.label, second.label, last.label);
