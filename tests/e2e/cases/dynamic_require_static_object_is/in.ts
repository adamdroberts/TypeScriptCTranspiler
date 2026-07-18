const fromNan = require("./" + Object.is(NaN, NaN).toString().replace("true", "nan"));
const fromZero = require("./" + Object.is(0, -0).toString().replace("false", "zero"));
const fromString = require("./" + Object.is("x", "x").toString().replace("true", "string"));
const fromBoolean = require("./" + Object.is(true, false).toString().replace("false", "boolean"));
const fromBigint = require("./" + Object.is(-2n, -2n).toString().replace("true", "bigint"));

console.log(fromNan.label, fromZero.label, fromString.label, fromBoolean.label, fromBigint.label);
