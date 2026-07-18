const hexIndex = require("./bsearch_enc_" + Buffer.from("Hi!").indexOf("69", 0, "hex"));
const hexIncludes = require("./bsearch_enc_" + Buffer.from("Hi!").includes("69", 0, "hex"));
const hexLast = require("./bsearch_enc_" + Buffer.from("Hi!").lastIndexOf("21", undefined, "hex"));
const asciiIndex = require("./bsearch_enc_" + Buffer.from("Hi!").indexOf("i", 0, "ascii"));
const latinMissing = require("./bsearch_enc_" + Buffer.from("Hi!").includes("z", 0, "latin1"));

console.log(hexIndex.label, hexIncludes.label, hexLast.label, asciiIndex.label, latinMissing.label);
