// @ts-nocheck: dynamic require proof coverage intentionally exercises well-formed string calls.
const well = require("./well_" + "ok".isWellFormed());
const ill = require("./well_" + String.fromCharCode(0xd800).isWellFormed());
const repaired = require("./fixed_" + String.fromCharCode(0xd800).toWellFormed().codePointAt(0));

console.log(well.label, ill.label, repaired.label);
