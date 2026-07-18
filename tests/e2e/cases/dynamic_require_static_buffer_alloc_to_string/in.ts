const zeroHex = require("./balloc_" + Buffer.alloc(3).toString("hex"));
const filledText = require("./balloc_" + Buffer.alloc(3, 65).toString());
const filledHex = require("./balloc_" + Buffer.alloc(2, 67).toString("hex"));
const wrappedHex = require("./balloc_" + Buffer.alloc(2, 256 + 68).toString("hex"));
const defaultFill = require("./balloc_" + Buffer.alloc(2, undefined).toString("hex"));

console.log(zeroHex.label, filledText.label, filledHex.label, wrappedHex.label, defaultFill.label);
