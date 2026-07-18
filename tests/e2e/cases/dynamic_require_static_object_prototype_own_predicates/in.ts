const fromObjectHasOwn = require("./object_has_" + Object.prototype.hasOwnProperty.call({ pick: "x" }, "pick"));
const fromObjectEnumerable = require("./object_enum_" + Object.prototype.propertyIsEnumerable.call({ pick: "x" }, "pick"));
const fromObjectMissing = require("./object_missing_" + Object.prototype.hasOwnProperty.call({ pick: "x" }, "missing"));
const fromArrayLength = require("./array_length_enum_" + Object.prototype.propertyIsEnumerable.call(["x", "y"], "length"));
const fromArrayIndex = require("./array_index_has_" + Object.prototype.hasOwnProperty.call(["x"], "0"));
const fromStringIndex = require("./string_index_enum_" + Object.prototype.propertyIsEnumerable.call("go", "1"));
const fromStringLength = require("./string_length_has_" + Object.prototype.hasOwnProperty.call("go", "length"));

console.log(
    fromObjectHasOwn.label,
    fromObjectEnumerable.label,
    fromObjectMissing.label,
    fromArrayLength.label,
    fromArrayIndex.label,
    fromStringIndex.label,
    fromStringLength.label,
);
