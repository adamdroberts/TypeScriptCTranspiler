// @ts-nocheck: dynamic require proof coverage intentionally exercises padding calls.
const start = require("./" + "pad".padStart(5, "."));
const end = require("./" + "pad".padEnd(7, "-"));

console.log(start.label, end.label);
