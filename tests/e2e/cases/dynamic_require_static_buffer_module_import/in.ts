import bufferDefault from "node:buffer";
import * as bufferNamespace from "buffer";

const fromDefault = require("./bmi_" + bufferDefault.Buffer.from("Hi").toString());
const allocatedNamespace = require("./bmi_" + bufferNamespace.Buffer.alloc(2, 65).toString("hex"));
const concatenated = require("./bmi_" + bufferDefault.Buffer.concat([
    bufferNamespace.Buffer.from("A"),
    bufferDefault.Buffer.from("B"),
]).toString());
const byteLength = require("./bmi_" + bufferNamespace.Buffer.byteLength("Hi"));
const compared = require("./bmi_" + bufferDefault.Buffer.compare(
    bufferNamespace.Buffer.from("A"),
    bufferDefault.Buffer.from("A"),
));
const isBuffer = require("./bmi_" + bufferNamespace.Buffer.isBuffer(bufferDefault.Buffer.from("A")));

console.log(
    fromDefault.label,
    allocatedNamespace.label,
    concatenated.label,
    byteLength.label,
    compared.label,
    isBuffer.label,
);
