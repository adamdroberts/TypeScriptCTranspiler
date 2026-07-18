const arrayLength = require("./abdv_ab_len_" + new ArrayBuffer(8).byteLength);
const defaultArrayLength = require("./abdv_ab_len_" + new ArrayBuffer(undefined).byteLength);
const viewLength = require("./abdv_dv_len_" + new DataView(new ArrayBuffer(8), 2).byteLength);
const explicitViewLength = require("./abdv_dv_len_" + new DataView(new ArrayBuffer(8), 2, 3).byteLength);
const defaultOffsetViewLength = require("./abdv_dv_len_" + new DataView(new ArrayBuffer(8), undefined, 2).byteLength);
const viewOffset = require("./abdv_dv_offset_" + new DataView(new ArrayBuffer(8), 2, 3).byteOffset);
const viewBufferLength = require("./abdv_ab_len_" + new DataView(new ArrayBuffer(12), 4, 3).buffer.byteLength);

console.log(
    arrayLength.label,
    defaultArrayLength.label,
    viewLength.label,
    explicitViewLength.label,
    defaultOffsetViewLength.label,
    viewOffset.label,
    viewBufferLength.label,
);
