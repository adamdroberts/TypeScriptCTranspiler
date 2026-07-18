const setHas = require("./map_set_frag_set_has_" + new Set(["old", "value", "value"]).has("value"));
const setMissing = require("./map_set_frag_set_has_" + new Set(["old"]).has("value"));
const mapHas = require("./map_set_frag_map_has_" + new Map([["name", "old"], ["name", "overwrite"]]).has("name"));
const mapMissing = require("./map_set_frag_map_has_" + new Map([["name", "old"]]).has("missing"));
const mapGet = require("./map_set_frag_map_get_" + new Map([["name", "old"], ["name", "overwrite"]]).get("name"));
const mapGetMissing = require("./map_set_frag_map_get_" + new Map([["name", "old"]]).get("missing"));
const mapEntriesGet = require("./map_set_frag_map_get_" + new Map(Object.entries({ slot: "entry" })).get("slot"));
const setSize = require("./map_set_frag_set_size_" + new Set(["old", "value", "value"]).size);
const mapSize = require("./map_set_frag_map_size_" + new Map([["name", "old"], ["name", "overwrite"], ["slot", "entry"]]).size);
const setKey = require("./map_set_frag_set_key_" + new Set(["old", "value", "value"]).keys()[1]);
const setValue = require("./map_set_frag_set_value_" + new Set(["old", "value", "value"]).values()[1]);
const setEntry = require("./map_set_frag_set_entry_" + new Set(["old", "value", "value"]).entries()[1][1]);
const mapKey = require("./map_set_frag_map_key_" + new Map([["name", "old"], ["name", "overwrite"], ["slot", "entry"]]).keys()[1]);
const mapValue = require("./map_set_frag_map_value_" + new Map([["name", "old"], ["name", "overwrite"], ["slot", "entry"]]).values()[1]);
const mapEntry = require("./map_set_frag_map_entry_" + new Map([["name", "old"], ["name", "overwrite"], ["slot", "entry"]]).entries()[1][1]);

console.log(
    setHas.label,
    setMissing.label,
    mapHas.label,
    mapMissing.label,
    mapGet.label,
    mapGetMissing.label,
    mapEntriesGet.label,
    setSize.label,
    mapSize.label,
    setKey.label,
    setValue.label,
    setEntry.label,
    mapKey.label,
    mapValue.label,
    mapEntry.label,
);
