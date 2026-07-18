const direct = require(Object.assign({ pick: "./assign_direct" }).pick);
const merged = require("./" + Object.assign({ name: "assign_old" }, { name: "assign_merged" })["name"]);
const key = require("./assign_key_" + Object.keys(Object.assign({ left: "value" }, { right: "value" }))[1]);
const value = require("./assign_value_" + Object.values(Object.assign({ left: "old" }, { left: "new" }))[0]);
const entry = require("./assign_entry_" + Object.entries(Object.assign({ entry: "old" }, { entry: "value" }))[0][1]);
const fromEntries = require("./" + (Object.assign(Object.fromEntries([["slot", "assign_from_entries"]]), { extra: "x" }) as { slot: string; extra: string }).slot);
const reflect = require("./assign_has_" + Reflect.has(Object.assign({ ref: "value" }, null, undefined), "ref"));

console.log(direct.label, merged.label, key.label, value.label, entry.label, fromEntries.label, reflect.label);
