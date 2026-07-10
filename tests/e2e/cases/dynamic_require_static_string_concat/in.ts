// @ts-nocheck: dynamic require proof coverage intentionally exercises string concat calls.
const pkg = require("./" + "left".concat("-", "right"));

console.log(pkg.label);
