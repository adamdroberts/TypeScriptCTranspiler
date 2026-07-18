const byValue = Object.groupBy(["left", "right", "right"], (value) => value) as { right: string[] };
const valuePick = require("./group_by_" + byValue.right[1]);

const byIndex = Object.groupBy(["zero", "one"], (_value, index) => "i" + index) as { i1: string[] };
const indexPick = require("./group_by_" + byIndex.i1[0]);

const byStringChar = Object.groupBy("aba", (value) => value) as { a: string[]; b: string[] };
const stringPick = require("./group_by_string_" + byStringChar.a[1]);

const bySetValue = Object.groupBy(new Set(["old", "set", "set"]), (value) => value) as { set: string[] };
const setPick = require("./group_by_" + bySetValue.set[0]);

console.log(valuePick.label, indexPick.label, stringPick.label, setPick.label);
