const fromObjectValue = require("./" + (Object.getOwnPropertyDescriptors({ pick: "map_object_value" }).pick as any).value);
const fromObjectEnumerable = require("./object_enum_" + (Object.getOwnPropertyDescriptors({ pick: "x" })["pick"] as any).enumerable);
const fromArrayLength = require("./array_len_" + (Object.getOwnPropertyDescriptors(["x", "y"]).length as any).value);
const fromArrayIndexWritable = require("./array_writable_" + (Object.getOwnPropertyDescriptors(["x"])["0"] as any).writable);
const fromStringValue = require("./string_char_" + (Object.getOwnPropertyDescriptors("go")["1"] as any).value);
const fromStringLengthWritable = require("./string_len_writable_" + (Object.getOwnPropertyDescriptors("go").length as any).writable);

console.log(
    fromObjectValue.label,
    fromObjectEnumerable.label,
    fromArrayLength.label,
    fromArrayIndexWritable.label,
    fromStringValue.label,
    fromStringLengthWritable.label,
);
