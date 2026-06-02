// @ts-nocheck: dynamic require proof coverage intentionally exercises Array.join.
const pieces = ["./join", "_a"] as const;
const alias = pieces;
const emptySeparator = "";
const undefinedSeparator = undefined;

const first = require(alias.join(emptySeparator));
const second = require([".", "join_b"].join("/"));
const third = require(["./join_c"].join(undefinedSeparator));
const fourth = require(["./join_d", undefined].join(""));

console.log(first.label, second.label, third.label, fourth.label);
