// @ts-nocheck: dynamic require proof coverage intentionally exercises string indexing calls.
const charAt = require("./" + "alpha".charAt(0));
const at = require("./" + "bravo".at(-1));
const bracketIndex = 0;
const bracket = require("./" + "charlie"[bracketIndex]);
const charCode = require("./code_" + "AZ".charCodeAt(0));
const pointIndex = 1;
const codePoint = require("./point_" + "AΩ".codePointAt(pointIndex));

console.log(charAt.label, at.label, bracket.label, charCode.label, codePoint.label);
