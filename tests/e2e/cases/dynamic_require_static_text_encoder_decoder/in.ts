const encodedLength = require("./ted_len_" + new TextEncoder().encode("Hi").length);
const encodedByte = require("./ted_byte_" + new TextEncoder().encode("Hi")[1]);
const encodedEmpty = require("./ted_empty_" + new TextEncoder().encode().length);
const decoded = require("./ted_decode_" + new TextDecoder().decode(new TextEncoder().encode("round")));
const decodedUtf8 = require("./ted_decode_" + new TextDecoder("utf-8").decode(Buffer.from("trip")));
const decodedEmpty = require("./ted_empty_decode_" + new TextDecoder().decode());

console.log(encodedLength.label, encodedByte.label, encodedEmpty.label, decoded.label, decodedUtf8.label, decodedEmpty.label);
