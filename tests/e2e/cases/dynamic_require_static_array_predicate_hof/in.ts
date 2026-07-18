const someTrue = require("./array_predicate_hof_some_" + ["drop", "keep"].some((value) => value === "keep"));
const someFalse = require("./array_predicate_hof_some_" + ["drop"].some((value) => value === "keep"));
const everyTrue = require("./array_predicate_hof_every_" + ["a", "b"].every((value) => value !== "drop"));
const everyFalse = require("./array_predicate_hof_every_" + ["a", "drop"].every((value) => value !== "drop"));
const findValue = require("./array_predicate_hof_find_" + ["drop", "keep"].find((value) => value === "keep"));
const findMissing = require("./array_predicate_hof_find_" + ["drop"].find((value) => value === "keep"));
const findIndex = require("./array_predicate_hof_find_index_" + ["drop", "keep"].findIndex((value, index) => index === 1));
const findLast = require("./array_predicate_hof_find_last_" + ["keep", "drop", "keep"].findLast((value) => value === "keep"));
const findLastIndex = require("./array_predicate_hof_find_last_index_" + ["keep", "drop", "keep"].findLastIndex((value) => value === "keep"));

console.log(someTrue.label, someFalse.label, everyTrue.label, everyFalse.label, findValue.label, findMissing.label, findIndex.label, findLast.label, findLastIndex.label);
