const popValue = require("./array_stack_splice_pop_" + ["head", "tail"].pop());
const popEmpty = require("./array_stack_splice_pop_" + [].pop());
const shiftValue = require("./array_stack_splice_shift_" + ["head", "tail"].shift());
const shiftEmpty = require("./array_stack_splice_shift_" + [].shift());
const pushLength = require("./array_stack_splice_push_len_" + ["old"].push("new", "tail"));
const unshiftLength = require("./array_stack_splice_unshift_len_" + ["old"].unshift("head", "new"));
const spliceTail = require("./array_stack_splice_splice_" + ["head", "middle", "tail"].splice(1)[1]);
const spliceRange = require("./array_stack_splice_splice_" + ["head", "middle", "tail"].splice(1, 1)[0]);
const spliceUndefined = require("./array_stack_splice_splice_" + ["head", "tail"].splice(1, undefined, "insert").join("empty"));
const spliceEntry = require("./array_stack_splice_entry_" + Object.entries(["drop", "value"].splice(1))[0][1]);

console.log(popValue.label, popEmpty.label, shiftValue.label, shiftEmpty.label, pushLength.label, unshiftLength.label, spliceTail.label, spliceRange.label, spliceUndefined.label, spliceEntry.label);
