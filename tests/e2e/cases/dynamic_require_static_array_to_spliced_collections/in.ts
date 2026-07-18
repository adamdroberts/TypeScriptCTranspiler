const noArgs = require(["./array_to_spliced_copy"].toSpliced()[0]);
const deleteTail = require("./array_to_spliced_" + ["tail", "drop"].toSpliced(1)[0]);
const replaceMiddle = require("./array_to_spliced_" + ["left", "old", "right"].toSpliced(1, 1, "middle")[1]);
const insertOnly = require("./array_to_spliced_" + ["left", "right"].toSpliced(1, 0, "insert")[1]);
const negative = require("./array_to_spliced_" + ["left", "old"].toSpliced(-1, 1, "negative")[1]);
const undefinedDelete = require("./array_to_spliced_" + ["left", "right"].toSpliced(1, undefined, "undef")[1]);
const entry = require("./array_to_spliced_entry_" + Object.entries(["drop"].toSpliced(0, 1, "value"))[0][1]);

console.log(noArgs.label, deleteTail.label, replaceMiddle.label, insertOnly.label, negative.label, undefinedDelete.label, entry.label);
