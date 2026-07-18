const fromFirst = require("./uspall_" + new URLSearchParams("a=1&a=2&b=three").getAll("a")[0]);
const fromSecond = require("./uspall_" + new URLSearchParams("a=1&a=2&b=three").getAll("a").at(1));
const fromJoin = require("./uspall_" + new URLSearchParams("a=1&a=2&b=three").getAll("a").join("-"));
const fromEmptyJoin = require("./uspall_" + new URLSearchParams("a=1").getAll("missing").join("-"));

console.log(fromFirst.label, fromSecond.label, fromJoin.label, fromEmptyJoin.label);
