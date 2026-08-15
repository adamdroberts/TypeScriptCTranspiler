// @ts-nocheck: dynamic require proof coverage intentionally exercises static String.toLocaleString.
const source = "locale";
const direct = require("./tls_" + source.toLocaleString());

console.log(direct.label);
