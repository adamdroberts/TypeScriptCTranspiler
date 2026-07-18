const frozen = require(Object.freeze({ pick: "./wrapped_freeze_direct" }).pick);
const sealed = require("./" + Object.seal({ name: "wrapped_seal_bracket" })["name"]);
const preventedKey = require("./wrapped_prevent_key_" + Object.keys(Object.preventExtensions({ left: "value" }))[0]);
const frozenValue = require("./wrapped_freeze_value_" + Object.values(Object.freeze({ left: "right" }))[0]);
const sealedEntry = require("./wrapped_seal_entry_" + Object.entries(Object.seal({ entry: "value" }))[0][1]);
const fromEntries = require("./" + Object.freeze(Object.fromEntries([["slot", "wrapped_from_entries"]]) as { slot: string }).slot);
const reflect = require("./wrapped_reflect_" + Reflect.get(Object.preventExtensions({ ref: "value" }), "ref"));

console.log(frozen.label, sealed.label, preventedKey.label, frozenValue.label, sealedEntry.label, fromEntries.label, reflect.label);
