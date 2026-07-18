const objectKey = require("./bkeys_key_" + Object.keys(Buffer.from("Hi"))[0]);
const ownName = require("./bkeys_name_" + Object.getOwnPropertyNames(Buffer.from("Hi"))[1]);
const reflectKey = require("./bkeys_reflect_" + Reflect.ownKeys(Buffer.from("Hi"))[0]);
const objectValue = require("./bkeys_value_" + Object.values(Buffer.from("Hi"))[1]);
const entryKey = require("./bkeys_entry_key_" + Object.entries(Buffer.from("Hi"))[1][0]);
const entryValue = require("./bkeys_entry_value_" + Object.entries(Buffer.from("Hi"))[0][1]);

console.log(
    objectKey.label,
    ownName.label,
    reflectKey.label,
    objectValue.label,
    entryKey.label,
    entryValue.label,
);
