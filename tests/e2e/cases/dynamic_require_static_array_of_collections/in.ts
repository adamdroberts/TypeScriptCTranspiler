const direct = require(Array.of("./array_of_direct")[0]);
const at = require("./array_of_at_" + Array.of("old", "value").at(1));
const join = require("./array_of_join_" + Array.of("x", "y").join(""));
const value = require("./array_of_value_" + Object.values(Array.of("old", "value"))[1]);
const entryKey = require("./array_of_entry_key_" + Object.entries(Array.of("value"))[0][0]);
const entryValue = require("./array_of_entry_value_" + Object.entries(Array.of("value"))[0][1]);

console.log(direct.label, at.label, join.label, value.label, entryKey.label, entryValue.label);
