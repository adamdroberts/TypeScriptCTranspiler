const unionPick = require("./set_comp_" + Array.from(new Set(["left", "middle"]).union(new Set(["middle", "right"])))[2]);
const intersectionPick = require("./set_comp_" + Array.from(new Set(["left", "middle"]).intersection(new Set(["middle", "right"])))[0]);
const differencePick = require("./set_comp_" + Array.from(new Set(["left", "middle"]).difference(new Set(["middle", "right"])))[0]);
const symmetricPick = require("./set_comp_" + Array.from(new Set(["left", "middle"]).symmetricDifference(new Set(["middle", "right"])))[1]);
const chainedPick = require("./set_comp_" + new Set(new Set(["head"]).union(new Set(["tail"]))).values()[1]);
const subsetTrue = require("./set_rel_subset_" + new Set(["left"]).isSubsetOf(new Set(["left", "right"])));
const subsetFalse = require("./set_rel_subset_" + new Set(["left", "missing"]).isSubsetOf(new Set(["left", "right"])));
const supersetTrue = require("./set_rel_superset_" + new Set(["left", "right"]).isSupersetOf(new Set(["left"])));
const supersetFalse = require("./set_rel_superset_" + new Set(["left"]).isSupersetOf(new Set(["left", "right"])));
const disjointTrue = require("./set_rel_disjoint_" + new Set(["left"]).isDisjointFrom(new Set(["right"])));
const disjointFalse = require("./set_rel_disjoint_" + new Set(["left"]).isDisjointFrom(new Set(["left", "right"])));

console.log(
    unionPick.label,
    intersectionPick.label,
    differencePick.label,
    symmetricPick.label,
    chainedPick.label,
    subsetTrue.label,
    subsetFalse.label,
    supersetTrue.label,
    supersetFalse.label,
    disjointTrue.label,
    disjointFalse.label,
);
