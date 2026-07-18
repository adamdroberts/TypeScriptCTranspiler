const fromStringDecimal = require("./big_" + BigInt("123"));
const fromStringHex = require("./big_" + BigInt("0x10"));
const fromNumber = require("./big_" + BigInt(42));
const fromNegative = require("./big_neg_" + BigInt(-7));
const fromTrue = require("./big_" + BigInt(true));
const fromFalse = require("./big_" + BigInt(false));
const fromLiteral = require("./big_" + BigInt(77n as any));

console.log(
    fromStringDecimal.label,
    fromStringHex.label,
    fromNumber.label,
    fromNegative.label,
    fromTrue.label,
    fromFalse.label,
    fromLiteral.label,
);
