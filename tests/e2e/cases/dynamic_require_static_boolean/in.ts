const fromEmpty = require("./" + Boolean("").toString().replace("false", "empty"));
const fromNumber = require("./" + Boolean(-2).toString().replace("true", "number"));
const fromNull = require("./" + Boolean(null).toString().replace("false", "nullish"));
const fromObject = require("./" + Boolean({ value: "x" }).toString().replace("true", "object"));
const fromString = require("./" + Boolean(`ok`).toString().replace("true", "string"));
const fromZero = require("./" + Boolean(0).toString().replace("false", "zero"));

console.log(fromEmpty.label, fromNumber.label, fromNull.label, fromObject.label, fromString.label, fromZero.label);
