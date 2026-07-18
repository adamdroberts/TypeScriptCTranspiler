const staticLess = require("./bcmp_" + Buffer.compare(Buffer.from("aa"), Buffer.from("ab")));
const staticGreater = require("./bcmp_" + Buffer.compare(Buffer.from("ab"), Buffer.from("aa")));
const staticEqual = require("./bcmp_" + Buffer.compare(Buffer.from("aa"), Buffer.from("aa")));
const staticPrefix = require("./bcmp_" + Buffer.compare(Buffer.from("aa"), Buffer.from("aaa")));
const instanceLess = require("./bcmp_" + Buffer.from("aa").compare(Buffer.from("ab")));
const instanceGreater = require("./bcmp_" + Buffer.from("ab").compare(Buffer.from("aa")));
const instanceEqual = require("./bcmp_" + Buffer.from("aa").compare(Buffer.from("aa")));

console.log(
    staticLess.label,
    staticGreater.label,
    staticEqual.label,
    staticPrefix.label,
    instanceLess.label,
    instanceGreater.label,
    instanceEqual.label,
);
