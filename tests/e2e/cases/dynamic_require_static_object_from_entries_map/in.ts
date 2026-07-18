const direct = require((Object.fromEntries(new Map([["pick", "./from_entries_map_direct"]])) as { pick: string }).pick);
const bracket = require("./" + (Object.fromEntries(new Map([["name", "from_entries_map_name"]])) as { name: string })["name"]);
const objectEntries = require("./" + (Object.fromEntries(new Map(Object.entries({
    slot: "from_entries_map_object_entries",
}))) as { slot: string }).slot);
const key = require("./from_entries_map_key_" + Object.keys(Object.fromEntries(new Map([["left", "value"]])))[0]);
const value = require("./from_entries_map_value_" + Object.values(Object.fromEntries(new Map([["left", "right"]])))[0]);
const reflect = require("./" + Reflect.get(Object.fromEntries(new Map([["ref", "from_entries_map_reflect"]])), "ref"));

console.log(direct.label, bracket.label, objectEntries.label, key.label, value.label, reflect.label);
