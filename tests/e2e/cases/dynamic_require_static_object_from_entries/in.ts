const direct = require((Object.fromEntries([["pick", "./from_entries_direct"]]) as { pick: string }).pick);
const bracket = require("./" + (Object.fromEntries([["name", "from_entries_bracket"]]) as { name: string })["name"]);
const key = require("./from_entries_key_" + Object.keys(Object.fromEntries([["left", "value"]]))[0]);
const value = require("./from_entries_value_" + Object.values(Object.fromEntries([["left", "right"]]))[0]);
const entryKey = require("./from_entries_entry_key_" + Object.entries(Object.fromEntries([["entry", "value"]]))[0][0]);
const reflect = require("./" + Reflect.get(Object.fromEntries([["slot", "from_entries_reflect"]]), "slot"));

console.log(direct.label, bracket.label, key.label, value.label, entryKey.label, reflect.label);
