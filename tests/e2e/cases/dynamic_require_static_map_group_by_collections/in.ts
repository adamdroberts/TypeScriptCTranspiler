const direct = require("./map_group_by_" + new Map(Map.groupBy(["left", "right", "right"], (value) => value)).get("right")![1]);
const indexPick = require("./map_group_by_" + new Map(Map.groupBy(["zero", "one"], (_value, index) => "i" + index)).get("i1")![0]);

const sizePick = require("./map_group_by_size_" + new Map(Map.groupBy("aba", (value) => value)).size);
const arrayPick = require("./map_group_by_entry_" + Array.from(new Map(Map.groupBy(new Set(["old", "set", "set"]), (value) => value)))[1][1][0]);

console.log(direct.label, indexPick.label, sizePick.label, arrayPick.label);
