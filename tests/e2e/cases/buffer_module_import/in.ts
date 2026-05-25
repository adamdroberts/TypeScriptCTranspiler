import bufferDefault from "node:buffer";
import * as bufferNs from "buffer";
import { Buffer as NodeBuffer } from "node:buffer";

const named = NodeBuffer.from("4869", "hex");
const namespace = bufferNs.Buffer.alloc(3, 65);
const defaultBuf = bufferDefault.Buffer.concat([named, NodeBuffer.from("!")]);

console.log("named:", named.toString(), NodeBuffer.isBuffer(named));
console.log("namespace:", namespace.toString(), bufferNs.Buffer.byteLength(namespace));
console.log("default:", defaultBuf.toString(), bufferDefault.Buffer.compare(named, NodeBuffer.from("Hi")));
console.log("encoding:", NodeBuffer.isEncoding("utf-8"), bufferDefault.Buffer.isEncoding("bogus"));
