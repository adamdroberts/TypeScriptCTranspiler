// @ts-nocheck: dynamic require proof coverage intentionally exercises string indexing calls.
const charAt = require("./" + "alpha".charAt(0));
const at = require("./" + "bravo".at(-1));
const bracketIndex = 0;
const bracket = require("./" + "charlie"[bracketIndex]);

console.log(charAt.label, at.label, bracket.label);
