const directValue = require("./bdesc_value_" + (Object.getOwnPropertyDescriptor(Buffer.from("Hi"), "0") as any).value);
const directWritable = require("./bdesc_writable_" + (Object.getOwnPropertyDescriptor(Buffer.from("Hi"), "1") as any).writable);
const reflectEnumerable = require("./bdesc_enum_" + (Reflect.getOwnPropertyDescriptor(Buffer.from("Hi"), "0") as any).enumerable);
const reflectConfigurable = require("./bdesc_config_" + (Reflect.getOwnPropertyDescriptor(Buffer.from("Hi"), "1") as any).configurable);
const mapValue = require("./bdesc_map_value_" + (Object.getOwnPropertyDescriptors(Buffer.from("Hi"))["1"] as any).value);
const mapWritable = require("./bdesc_map_writable_" + (Object.getOwnPropertyDescriptors(Buffer.from("Hi"))["0"] as any).writable);

console.log(
    directValue.label,
    directWritable.label,
    reflectEnumerable.label,
    reflectConfigurable.label,
    mapValue.label,
    mapWritable.label,
);
