import { transcode } from "buffer";
import { transcode as transcodeAlias } from "node:buffer";
import bufferDefault from "buffer";
import * as bufferNs from "node:buffer";

// Let's create some buffers
const bufAsciiHex = Buffer.from("48656c6c6f20576f726c64", "utf8"); // ASCII characters for hex digits of "Hello World"
const bufBytes = Buffer.from("Hello World", "utf8");               // raw bytes of "Hello World"
const bufAsciiBase64 = Buffer.from("SGVsbG8gV29ybGQ=", "utf8");    // ASCII characters for base64 of "Hello World"

console.log("--- Named Import ---");
// utf8 -> hex: decodes bufBytes (raw bytes of "Hello World") as utf8, then encodes it to hex characters
const t1 = transcode(bufBytes, "utf8", "hex");
console.log("utf8 -> hex:", t1.toString()); // "48656c6c6f20576f726c64"

// hex -> utf8: decodes bufAsciiHex (hex characters) as hex, then encodes it to raw bytes of "Hello World"
const t2 = transcode(bufAsciiHex, "hex", "utf8");
console.log("hex -> utf8:", t2.toString()); // "Hello World"

console.log("--- Alias Import ---");
// utf8 -> base64: decodes bufBytes (raw bytes of "Hello World") as utf8, then encodes it to base64 characters
const t3 = transcodeAlias(bufBytes, "utf8", "base64");
console.log("utf8 -> base64:", t3.toString()); // "SGVsbG8gV29ybGQ="

// base64 -> utf8: decodes bufAsciiBase64 as base64, then encodes it to raw bytes of "Hello World"
const t4 = transcodeAlias(bufAsciiBase64, "base64", "utf8");
console.log("base64 -> utf8:", t4.toString()); // "Hello World"

console.log("--- Default Import ---");
// hex -> base64: decodes bufAsciiHex as hex, then encodes as base64 characters
const t5 = bufferDefault.transcode(bufAsciiHex, "hex", "base64");
console.log("hex -> base64:", t5.toString()); // "SGVsbG8gV29ybGQ="

console.log("--- Namespace Import ---");
// base64 -> hex: decodes bufAsciiBase64 as base64, then encodes as hex characters
const t6 = bufferNs.transcode(bufAsciiBase64, "base64", "hex");
console.log("base64 -> hex:", t6.toString()); // "48656c6c6f20576f726c64"

console.log("--- Ignored arguments side effects ---");
let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
const t7 = transcode(bufBytes, "utf-8", "hex", mark("x"));
console.log("utf-8 -> hex:", t7.toString(), "seen:", seen);
