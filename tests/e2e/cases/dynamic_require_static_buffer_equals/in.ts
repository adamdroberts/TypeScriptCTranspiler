const equal = require("./beq_" + Buffer.from("copy").equals(Buffer.from("copy")));
const unequal = require("./beq_" + Buffer.from("Copy").equals(Buffer.from("copy")));
const lengthMismatch = require("./beq_" + Buffer.from("copy").equals(Buffer.from("copy!")));
const decodedEqual = require("./beq_" + Buffer.from("YQ==", "base64").equals(Buffer.from("61", "hex")));
const allocEqual = require("./beq_" + Buffer.alloc(2, 65).equals(Buffer.from("AA")));

console.log(equal.label, unequal.label, lengthMismatch.label, decodedEqual.label, allocEqual.label);
