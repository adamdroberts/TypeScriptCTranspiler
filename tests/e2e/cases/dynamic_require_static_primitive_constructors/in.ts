const fromStringNumber = require("./str_" + String(42));
const fromStringBool = require("./str_" + String(false));
const fromStringNull = require("./str_" + String(null));
const fromStringUndefined = require("./str_" + String(undefined));
const fromStringBigInt = require("./str_" + String(77n));
const fromNumberString = require("./num_" + Number("42"));
const fromNumberBool = require("./num_" + Number(true));
const fromNumberNull = require("./num_" + Number(null));
const fromNumberBadString = require("./num_" + Number("bad"));

console.log(
    fromStringNumber.label,
    fromStringBool.label,
    fromStringNull.label,
    fromStringUndefined.label,
    fromStringBigInt.label,
    fromNumberString.label,
    fromNumberBool.label,
    fromNumberNull.label,
    fromNumberBadString.label,
);
