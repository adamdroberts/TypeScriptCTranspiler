const direct = require(({ ...{ pick: "./spread_direct" } }).pick);
const merged = require("./" + ({ ...{ name: "spread_old" }, name: "spread_merged" })["name"]);
const key = require("./spread_key_" + Object.keys({ ...{ left: "value" }, ...{ right: "value" } })[1]);
const value = require("./spread_value_" + Object.values({ ...{ left: "old" }, ...{ left: "new" } })[0]);
const entry = require("./spread_entry_" + Object.entries({ ...{ entry: "old" }, entry: "value" })[0][1]);
const fromEntries = require("./" + ({ ...Object.fromEntries([["slot", "spread_from_entries"]]) } as { slot: string }).slot);
const reflect = require("./spread_has_" + Reflect.has({ ...(undefined as any), ref: "value" }, "ref"));

console.log(direct.label, merged.label, key.label, value.label, entry.label, fromEntries.label, reflect.label);
