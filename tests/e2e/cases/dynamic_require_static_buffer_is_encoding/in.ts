const utf8 = require("./enc_" + Buffer.isEncoding("utf8"));
const utf8Alias = require("./enc_" + Buffer.isEncoding("utf-8"));
const hex = require("./enc_" + Buffer.isEncoding("hex"));
const base64 = require("./enc_" + Buffer.isEncoding("base64"));
const latin1 = require("./enc_" + Buffer.isEncoding("latin1"));
const binary = require("./enc_" + Buffer.isEncoding("binary"));
const ascii = require("./enc_" + Buffer.isEncoding("ascii"));
const bogus = require("./enc_" + Buffer.isEncoding("bogus"));

console.log(
    utf8.label,
    utf8Alias.label,
    hex.label,
    base64.label,
    latin1.label,
    binary.label,
    ascii.label,
    bogus.label,
);
