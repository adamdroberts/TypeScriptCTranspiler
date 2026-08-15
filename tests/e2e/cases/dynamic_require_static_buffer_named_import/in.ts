import { Buffer as BufferFrom } from "buffer";
import { Buffer as NodeBuffer } from "node:buffer";

const fromHex = require("./bn_" + BufferFrom.from("4869", "hex").toString());
const allocated = require("./bn_" + NodeBuffer.alloc(2, 65).toString("hex"));
const concatenated = require("./bn_" + BufferFrom.concat([
    BufferFrom.from("A"),
    NodeBuffer.from("B"),
]).toString());
const byteLength = require("./bn_" + NodeBuffer.byteLength("Hi"));
const encoding = require("./bn_" + BufferFrom.isEncoding("hex").toString());

console.log(fromHex.label, allocated.label, concatenated.label, byteLength.label, encoding.label);
