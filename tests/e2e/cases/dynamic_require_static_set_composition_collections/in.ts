const unionPick = require("./set_comp_" + Array.from(new Set(["left", "middle"]).union(new Set(["middle", "right"])))[2]);
const intersectionPick = require("./set_comp_" + Array.from(new Set(["left", "middle"]).intersection(new Set(["middle", "right"])))[0]);
const differencePick = require("./set_comp_" + Array.from(new Set(["left", "middle"]).difference(new Set(["middle", "right"])))[0]);
const symmetricPick = require("./set_comp_" + Array.from(new Set(["left", "middle"]).symmetricDifference(new Set(["middle", "right"])))[1]);
const chainedPick = require("./set_comp_" + new Set(new Set(["head"]).union(new Set(["tail"]))).values()[1]);

console.log(unionPick.label, intersectionPick.label, differencePick.label, symmetricPick.label, chainedPick.label);
