const fromString = require("./isbuf_" + Buffer.isBuffer(Buffer.from("Hi")));
const fromArray = require("./isbuf_" + Buffer.isBuffer(Buffer.from([1, 2, 3])));
const alloc = require("./isbuf_" + Buffer.isBuffer(Buffer.alloc(2)));
const allocUnsafe = require("./isbuf_" + Buffer.isBuffer(Buffer.allocUnsafe(2)));
const allocUnsafeSlow = require("./isbuf_" + Buffer.isBuffer(Buffer.allocUnsafeSlow(2)));
const concat = require("./isbuf_" + Buffer.isBuffer(Buffer.concat([Buffer.from("A")])));
const stringValue = require("./isbuf_" + Buffer.isBuffer("x"));
const arrayValue = require("./isbuf_" + Buffer.isBuffer([]));
const objectValue = require("./isbuf_" + Buffer.isBuffer({ value: "x" }));

console.log(
    fromString.label,
    fromArray.label,
    alloc.label,
    allocUnsafe.label,
    allocUnsafeSlow.label,
    concat.label,
    stringValue.label,
    arrayValue.label,
    objectValue.label,
);
