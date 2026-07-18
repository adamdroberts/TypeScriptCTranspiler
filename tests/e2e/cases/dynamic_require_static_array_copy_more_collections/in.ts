const reversedDirect = require(["./array_copy_more_reverse_direct"].toReversed()[0]);
const reversedJoin = require("./array_copy_more_reverse_" + ["x", "y"].toReversed().join(""));
const withDirect = require("./array_copy_more_with_" + ["old", "value"].with(0, "head")[0]);
const withNegative = require("./array_copy_more_with_" + ["old", "tail"].with(-1, "negative")[1]);
const withEntry = require("./array_copy_more_entry_" + Object.entries(["drop", "old"].with(1, "value"))[1][1]);
const composed = require("./array_copy_more_composed_" + Array.of("old").concat(["middle"]).toReversed().with(1, "value")[1]);

console.log(reversedDirect.label, reversedJoin.label, withDirect.label, withNegative.label, withEntry.label, composed.label);
