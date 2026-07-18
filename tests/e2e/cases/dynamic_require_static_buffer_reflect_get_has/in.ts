const byteZero = require("./bget_" + Reflect.get(Buffer.from("Hi"), "0"));
const byteOne = require("./bget_" + Reflect.get(Buffer.from("Hi"), 1));
const length = require("./bget_len_" + Reflect.get(Buffer.from("Hi"), "length"));
const hasIndex = require("./bhas_" + Reflect.has(Buffer.from("Hi"), "1"));
const hasMissing = require("./bhas_" + Reflect.has(Buffer.from("Hi"), "2"));
const hasLength = require("./bhas_len_" + Reflect.has(Buffer.from("Hi"), "length"));

console.log(
    byteZero.label,
    byteOne.label,
    length.label,
    hasIndex.label,
    hasMissing.label,
    hasLength.label,
);
