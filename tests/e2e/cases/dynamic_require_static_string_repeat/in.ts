// @ts-nocheck: dynamic require proof coverage intentionally exercises repeat calls.
const count = 1;
const repeated = require("./repeat".repeat(count));

console.log(repeated.label);
