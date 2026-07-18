const defaultUtf8 = require("./buf_" + Buffer.from("Hi").toString());
const hexToText = require("./buf_" + Buffer.from("4869", "hex").toString());
const textToHex = require("./buf_" + Buffer.from("Hi").toString("hex"));
const base64ToText = require("./buf_" + Buffer.from("SGk=", "base64").toString());
const textToBase64 = require("./buf_" + Buffer.from("Hi").toString("base64"));
const latin1ToHex = require("./buf_" + Buffer.from("hé", "latin1").toString("hex"));
const asciiToHex = require("./buf_" + Buffer.from("h😀", "ascii").toString("hex"));

console.log(
    defaultUtf8.label,
    hexToText.label,
    textToHex.label,
    base64ToText.label,
    textToBase64.label,
    latin1ToHex.label,
    asciiToHex.label,
);
