const fromObjectValue = require("./" + (Object.getOwnPropertyDescriptor({ pick: "object_value" }, "pick") as any).value);
const fromObjectWritable = require("./object_writable_" + (Object.getOwnPropertyDescriptor({ pick: "x" }, "pick") as any).writable);
const fromArrayLength = require("./len_" + (Object.getOwnPropertyDescriptor(["x", "y"], "length") as any).value);
const fromArrayEnumerable = require("./array_enum_" + (Reflect.getOwnPropertyDescriptor(["x"], "0") as any).enumerable);
const fromStringValue = require("./char_" + (Object.getOwnPropertyDescriptor("go", "1") as any).value);
const fromStringLengthConfig = require("./strlen_config_" + (Object.getOwnPropertyDescriptor("go", "length") as any).configurable);

console.log(
    fromObjectValue.label,
    fromObjectWritable.label,
    fromArrayLength.label,
    fromArrayEnumerable.label,
    fromStringValue.label,
    fromStringLengthConfig.label,
);
