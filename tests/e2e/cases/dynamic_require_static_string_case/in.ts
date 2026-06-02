// @ts-nocheck: dynamic require proof coverage intentionally exercises string case calls.
const lowerName = "./CASE_LOWER";
const upperName = "./case_upper";
const mixed = "./Case_Mix";

const lower = require(lowerName.toLowerCase());
const upper = require(upperName.toUpperCase());
const direct = require("./CASE_DIRECT".toLowerCase());

console.log(lower.label, upper.label, require(mixed.toLowerCase()).label, direct.label);
