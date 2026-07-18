const ownTrue = require("./bown_" + Object.hasOwn(Buffer.from("Hi"), "0"));
const ownFalse = require("./bown_" + Object.hasOwn(Buffer.from("Hi"), "length"));
const instanceOwn = require("./bown_" + Buffer.from("Hi").hasOwnProperty("1"));
const instanceEnum = require("./bown_" + Buffer.from("Hi").propertyIsEnumerable("1"));
const callOwn = require("./bown_" + Object.prototype.hasOwnProperty.call(Buffer.from("Hi"), "0"));
const callEnum = require("./bown_" + Object.prototype.propertyIsEnumerable.call(Buffer.from("Hi"), "1"));
const missing = require("./bown_" + Object.prototype.hasOwnProperty.call(Buffer.from("Hi"), "2"));

console.log(
    ownTrue.label,
    ownFalse.label,
    instanceOwn.label,
    instanceEnum.label,
    callOwn.label,
    callEnum.label,
    missing.label,
);
