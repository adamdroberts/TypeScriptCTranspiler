const reverseDirect = require("./array_mutating_reverse_" + ["head", "tail"].reverse()[0]);
const reverseJoin = require("./array_mutating_reverse_join_" + ["x", "y"].reverse().join(""));
const sortedDirect = require("./array_mutating_sort_" + ["beta", "alpha"].sort()[0]);
const sortedNumeric = require("./array_mutating_sort_numeric_" + [10, 2, 1].sort().join("_"));
const sortedStable = require("./array_mutating_sort_stable_" + ["same", "same"].sort()[1]);

const reverseAliasSource = ["left", "right"];
const reverseAlias = require("./array_mutating_reverse_alias_" + reverseAliasSource.reverse()[0]);
const sortedEntry = require("./array_mutating_sort_entry_" + Object.entries(["beta", "alpha"].sort())[1][1]);
const composed = require("./array_mutating_sort_composed_" + Array.of("tail", "head").concat(["middle"]).sort()[0]);

console.log(reverseDirect.label, reverseJoin.label, sortedDirect.label, sortedNumeric.label, sortedStable.label, reverseAlias.label, sortedEntry.label, composed.label);
