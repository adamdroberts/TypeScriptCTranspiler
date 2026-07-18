const fromObject = require("./tag_" + Object.prototype.toString.call({ pick: "x" }).slice(8, -1));
const fromArray = require("./tag_" + Object.prototype.toString.call(["x"]).slice(8, -1));
const fromString = require("./tag_" + Object.prototype.toString.call("x").slice(8, -1));
const fromNumber = require("./tag_" + Object.prototype.toString.call(-7).slice(8, -1));
const fromBoolean = require("./tag_" + Object.prototype.toString.call(true).slice(8, -1));
const fromNull = require("./tag_" + Object.prototype.toString.call(null).slice(8, -1));
const fromUndefined = require("./tag_" + Object.prototype.toString.call(undefined).slice(8, -1));
const fromBigInt = require("./tag_" + Object.prototype.toString.call(7n).slice(8, -1));

console.log(
    fromObject.label,
    fromArray.label,
    fromString.label,
    fromNumber.label,
    fromBoolean.label,
    fromNull.label,
    fromUndefined.label,
    fromBigInt.label,
);
