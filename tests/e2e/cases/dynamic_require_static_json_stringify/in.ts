const fromBool = require("./json_" + JSON.stringify(true));
const fromNumber = require("./json_" + JSON.stringify(-7));
const fromNull = require("./json_" + JSON.stringify(null));
const fromArray = require("./json_" + JSON.stringify([1, true, null]));
const fromObject = require("./json_" + JSON.stringify({ a: 1, b: false, omitted: undefined }));

console.log(
    fromBool.label,
    fromNumber.label,
    fromNull.label,
    fromArray.label,
    fromObject.label,
);
