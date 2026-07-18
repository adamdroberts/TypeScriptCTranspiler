const reduceJoin = require("./array_reduce_hof_" + ["a", "b"].reduce((acc, value) => acc + value, ""));
const reduceIndex = require("./array_reduce_hof_" + ["a", "b"].reduce((acc, value, index) => acc + value + index, ""));
const reduceBlock = require("./array_reduce_hof_" + ["x"].reduce((acc, value) => {
    return acc + value + "_block";
}, ""));
const reduceEmpty = require("./array_reduce_hof_" + ([] as string[]).reduce((acc, value) => acc + value, "empty"));
const reduceRightJoin = require("./array_reduce_hof_" + ["a", "b"].reduceRight((acc, value) => acc + value, ""));
const reduceRightIndex = require("./array_reduce_hof_" + ["a", "b"].reduceRight((acc, value, index) => acc + value + index, ""));

console.log(reduceJoin.label, reduceIndex.label, reduceBlock.label, reduceEmpty.label, reduceRightJoin.label, reduceRightIndex.label);
