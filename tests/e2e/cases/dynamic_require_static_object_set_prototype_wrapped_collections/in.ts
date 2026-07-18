const direct = require(Object.setPrototypeOf({ pick: "./wrapped_proto_direct" }, null).pick);
const bracket = require("./" + Object.setPrototypeOf({ name: "wrapped_proto_bracket" }, null)["name"]);
const key = require("./wrapped_proto_key_" + Object.keys(Object.setPrototypeOf({ left: "value" }, null))[0]);
const value = require("./wrapped_proto_value_" + Object.values(Object.setPrototypeOf({ left: "right" }, null))[0]);
const entry = require("./wrapped_proto_entry_" + Object.entries(Object.setPrototypeOf({ entry: "value" }, null))[0][1]);
const fromEntries = require("./" + (Object.setPrototypeOf(Object.fromEntries([["slot", "wrapped_proto_from_entries"]]), null) as { slot: string }).slot);
const reflect = require("./wrapped_proto_has_" + Reflect.has(Object.setPrototypeOf({ ref: "value" }, null), "ref"));

console.log(direct.label, bracket.label, key.label, value.label, entry.label, fromEntries.label, reflect.label);
