import { TextEncoder as UtilEncoder } from "util";
import { TextDecoder as NodeDecoder } from "node:util";

const encodedLength = require("./tei_" + new UtilEncoder().encode("Hi").length);
const encodedByte = require("./tei_" + new UtilEncoder().encode("Hi")[1]);
const decoded = require("./tdi_" + new NodeDecoder().decode(new UtilEncoder().encode("trip")));
const decodedEmpty = require("./tdi_empty_" + new NodeDecoder().decode());

console.log(encodedLength.label, encodedByte.label, decoded.label, decodedEmpty.label);
