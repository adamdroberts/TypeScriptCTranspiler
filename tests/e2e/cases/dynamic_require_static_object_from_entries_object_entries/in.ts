const rebuilt = Object.fromEntries(Object.entries({
    pick: "./from_entries_entries_direct",
    name: "from_entries_entries_name",
})) as { pick: string; name: string };

const direct = require(rebuilt.pick);
const bracket = require("./" + rebuilt["name"]);
const key = require("./from_entries_entries_key_" + Object.keys(Object.fromEntries(Object.entries({ left: "value" })))[0]);
const value = require("./from_entries_entries_value_" + Object.values(Object.fromEntries(Object.entries({ left: "right" })))[0]);
const entryValue = require("./from_entries_entries_entry_value_" + Object.entries(Object.fromEntries(Object.entries({ entry: "value" })))[0][1]);
const reflectHas = require("./from_entries_entries_has_" + Reflect.has(Object.fromEntries(Object.entries({ slot: "x" })), "slot"));

console.log(direct.label, bracket.label, key.label, value.label, entryValue.label, reflectHas.label);
