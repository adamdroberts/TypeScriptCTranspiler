const direct = require((Object.defineProperty({}, "pick", { value: "./descriptor_direct", writable: true, enumerable: true, configurable: true }) as { pick: string }).pick);
const bracket = require("./" + (Object.defineProperties({}, { name: { value: "descriptor_bracket", writable: true, enumerable: true, configurable: true } }) as { name: string })["name"]);
const key = require("./descriptor_key_" + Object.keys(Object.create(null, {
    left: { value: "value", writable: true, enumerable: true, configurable: true },
    right: { value: "value", writable: true, enumerable: true, configurable: true },
}))[1]);
const value = require("./descriptor_value_" + Object.values(Object.defineProperty({ left: "old" }, "left", { value: "new", writable: true, enumerable: true, configurable: true }))[0]);
const entry = require("./descriptor_entry_" + Object.entries(Object.defineProperties({}, { entry: { value: "value", writable: true, enumerable: true, configurable: true } }))[0][1]);
const fromEntries = require("./" + (Object.defineProperties({}, Object.fromEntries([["slot", { value: "descriptor_from_entries", writable: true, enumerable: true, configurable: true }]])) as { slot: string }).slot);
const reflect = require("./descriptor_has_" + Reflect.has(Object.defineProperty({}, "ref", { value: "value", writable: true, enumerable: true, configurable: true }), "ref"));

console.log(direct.label, bracket.label, key.label, value.label, entry.label, fromEntries.label, reflect.label);
