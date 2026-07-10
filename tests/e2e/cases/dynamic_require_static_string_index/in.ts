// @ts-nocheck: dynamic require proof coverage intentionally exercises string indexing calls.
const charAt = require("./" + "alpha".charAt(0));
const at = require("./" + "bravo".at(-1));

console.log(charAt.label, at.label);
