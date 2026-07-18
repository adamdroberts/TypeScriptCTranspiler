const direct = require("./array_to_sorted_" + ["beta", "alpha"].toSorted()[0]);
const joined = require("./array_to_sorted_join_" + ["b", "a", "c"].toSorted().join(""));
const numeric = require("./array_to_sorted_numeric_" + [10, 2, 1].toSorted().join("_"));
const stable = require("./array_to_sorted_stable_" + ["same", "same"].toSorted()[1]);
const entry = require("./array_to_sorted_entry_" + Object.entries(["beta", "alpha"].toSorted())[1][1]);
const composed = require("./array_to_sorted_composed_" + Array.of("tail", "head").concat(["middle"]).toSorted()[0]);

console.log(direct.label, joined.label, numeric.label, stable.label, entry.label, composed.label);
