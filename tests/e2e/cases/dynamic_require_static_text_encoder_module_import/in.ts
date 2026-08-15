import utilDefault from "util";
import * as utilNamespace from "node:util";

const encodedLength = require("./tem_" + new utilDefault.TextEncoder().encode("Hi").length);
const encodedByte = require("./tem_" + new utilNamespace.TextEncoder().encode("Hi")[1]);
const decoded = require("./tdm_" + new utilNamespace.TextDecoder().decode(new utilDefault.TextEncoder().encode("trip")));
const decodedEmpty = require("./tdm_empty_" + new utilDefault.TextDecoder().decode());

console.log(encodedLength.label, encodedByte.label, decoded.label, decodedEmpty.label);
