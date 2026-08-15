// @ts-nocheck: dynamic require proof coverage intentionally exercises split collections.
const separator = "|";
const limit = 3;

const fromSplit = require(Array.from("skip|./split_collection_a|./split_collection_b".split(separator, limit))[1]);
const spreadSplit = require([..."skip:./split_collection_c:./split_collection_d".split(":")][2]);
const splitAlias = "skip|./split_collection_e".split(separator);
const fromAlias = require(Array.from(splitAlias)[1]);
const omittedSeparator = require(Array.from("./split_collection_f".split())[0]);

console.log(fromSplit.label, spreadSplit.label, fromAlias.label, omittedSeparator.label);
