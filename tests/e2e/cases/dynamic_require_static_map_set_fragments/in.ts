const setHas = require("./map_set_frag_set_has_" + new Set(["old", "value", "value"]).has("value"));
const setMissing = require("./map_set_frag_set_has_" + new Set(["old"]).has("value"));
const mapHas = require("./map_set_frag_map_has_" + new Map([["name", "old"], ["name", "overwrite"]]).has("name"));
const mapMissing = require("./map_set_frag_map_has_" + new Map([["name", "old"]]).has("missing"));
const mapGet = require("./map_set_frag_map_get_" + new Map([["name", "old"], ["name", "overwrite"]]).get("name"));
const mapGetMissing = require("./map_set_frag_map_get_" + new Map([["name", "old"]]).get("missing"));
const mapEntriesGet = require("./map_set_frag_map_get_" + new Map(Object.entries({ slot: "entry" })).get("slot"));

console.log(
    setHas.label,
    setMissing.label,
    mapHas.label,
    mapMissing.label,
    mapGet.label,
    mapGetMissing.label,
    mapEntriesGet.label,
);
