const direct = require(Array.from(["./array_from_direct"])[0]);
const stringJoin = require("./array_from_string_" + Array.from("xy").join(""));
const setValue = require("./array_from_set_" + Array.from(new Set(["old", "value", "value"]))[1]);
const mapValue = require("./array_from_map_" + Array.from(new Map([["name", "old"], ["name", "overwrite"]]))[0][1]);
const mapEntries = require("./" + Array.from(new Map(Object.entries({ slot: "array_from_entries" })))[0][1]);
const nullishSet = require("./array_from_empty" + Array.from(new Set(undefined as any)).join(""));

console.log(direct.label, stringJoin.label, setValue.label, mapValue.label, mapEntries.label, nullishSet.label);
