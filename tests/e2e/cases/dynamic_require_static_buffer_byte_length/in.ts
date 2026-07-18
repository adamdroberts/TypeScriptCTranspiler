const utf8Default = require("./blen_" + Buffer.byteLength("hé"));
const utf8Alias = require("./blen_" + Buffer.byteLength("hé", "utf-8"));
const hex = require("./blen_" + Buffer.byteLength("486900", "hex"));
const base64 = require("./blen_" + Buffer.byteLength("SGk=", "base64"));
const latin1 = require("./blen_" + Buffer.byteLength("hé", "latin1"));
const ascii = require("./blen_" + Buffer.byteLength("h😀", "ascii"));

console.log(
    utf8Default.label,
    utf8Alias.label,
    hex.label,
    base64.label,
    latin1.label,
    ascii.label,
);
