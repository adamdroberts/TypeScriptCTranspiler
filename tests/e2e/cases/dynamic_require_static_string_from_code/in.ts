const fromChar = require("./from_" + String.fromCharCode(65));
const fromPair = require("./from_" + String.fromCharCode(65, 66));
const point = 66;
const fromPoint = require("./from_" + String.fromCodePoint(point));

console.log(fromChar.label, fromPair.label, fromPoint.label);
