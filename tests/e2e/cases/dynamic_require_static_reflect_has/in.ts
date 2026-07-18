const fromObjectOwn = require("./" + Reflect.has({ marker: true }, "marker").toString().replace("true", "object_own"));
const fromArrayIndex = require("./" + Reflect.has(["x"], "0").toString().replace("true", "array_index"));
const fromArrayLength = require("./" + Reflect.has(["x"], "length").toString().replace("true", "array_length"));
const fromArrayHole = require("./" + Reflect.has([, "x"], "0").toString().replace("false", "array_hole"));
const fromStringIndex = require("./" + Reflect.has("xy", "1").toString().replace("true", "string_index"));
const fromStringMissing = require("./" + Reflect.has("xy", "2").toString().replace("false", "string_missing"));

console.log(
    fromObjectOwn.label,
    fromArrayIndex.label,
    fromArrayLength.label,
    fromArrayHole.label,
    fromStringIndex.label,
    fromStringMissing.label,
);
