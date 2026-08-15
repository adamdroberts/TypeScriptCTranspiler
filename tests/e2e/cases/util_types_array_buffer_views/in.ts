// @ts-nocheck: the extra arguments intentionally verify ignored-argument evaluation.
import utilDefault, { types as namedTypes } from "node:util";
import * as util from "util";

const storage = new ArrayBuffer(8);
const view = new DataView(storage, 2, 4);
const buffer = Buffer.from("x");
const date = new Date(0);

console.log(
    "arraybuffer:",
    util.types.isAnyArrayBuffer(storage),
    utilDefault.types.isAnyArrayBuffer(view),
    namedTypes.isAnyArrayBuffer(buffer),
    namedTypes.isAnyArrayBuffer(date),
);
console.log(
    "view:",
    util.types.isArrayBufferView(storage),
    utilDefault.types.isArrayBufferView(view),
    namedTypes.isArrayBufferView(buffer),
    namedTypes.isArrayBufferView(date),
);

let marker = "";
namedTypes.isAnyArrayBuffer(storage, marker += "a");
namedTypes.isArrayBufferView(view, marker += "v");
console.log("ignored:", marker);
