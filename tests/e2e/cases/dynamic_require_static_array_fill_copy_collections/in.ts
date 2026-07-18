const fillAll = require("./array_fill_copy_fill_" + ["old", "tail"].fill("all")[0]);
const fillRange = require("./array_fill_copy_fill_" + ["left", "old", "right"].fill("middle", 1, 2)[1]);
const fillNegative = require("./array_fill_copy_fill_" + ["left", "old"].fill("negative", -1)[1]);
const fillUndefined = require("./array_fill_copy_fill_" + ["old", "tail"].fill("undef", undefined, 1)[0]);
const copyForward = require("./array_fill_copy_copy_" + ["a", "b", "c"].copyWithin(0, 1)[1]);
const copyOverlap = require("./array_fill_copy_copy_" + ["a", "b", "c", "d"].copyWithin(1, 0, 3)[3]);
const copyNegative = require("./array_fill_copy_copy_" + ["a", "b", "c"].copyWithin(-2, 0, 1)[1]);
const entry = require("./array_fill_copy_entry_" + Object.entries(["drop", "old"].fill("value", 1))[1][1]);
const composed = require("./array_fill_copy_composed_" + Array.of("old").concat(["tail"]).copyWithin(0, 1)[0]);

console.log(fillAll.label, fillRange.label, fillNegative.label, fillUndefined.label, copyForward.label, copyOverlap.label, copyNegative.label, entry.label, composed.label);
