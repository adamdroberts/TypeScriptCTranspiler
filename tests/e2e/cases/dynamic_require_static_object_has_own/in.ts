const fromObjectOwn = require("./" + Object.hasOwn({ marker: true }, "marker").toString().replace("true", "object_own"));
const fromObjectMissing = require("./" + Object.hasOwn({ marker: true }, "missing").toString().replace("false", "object_missing"));
const fromArrayIndex = require("./" + Object.hasOwn(["x"], 0).toString().replace("true", "array_index"));
const fromArrayLength = require("./" + Object.hasOwn(["x"], "length").toString().replace("true", "array_length"));
const fromArrayHole = require("./" + Object.hasOwn([, "x"], "0").toString().replace("false", "array_hole"));
const fromStringIndex = require("./" + Object.hasOwn("xy", "1").toString().replace("true", "string_index"));

console.log(
    fromObjectOwn.label,
    fromObjectMissing.label,
    fromArrayIndex.label,
    fromArrayLength.label,
    fromArrayHole.label,
    fromStringIndex.label,
);
