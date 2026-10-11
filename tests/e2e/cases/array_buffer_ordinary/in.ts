"use strict";
const buffer = new ArrayBuffer(8, { maxByteLength: 16 });
const tracking = new DataView(buffer, 2);
const fixed = new DataView(buffer, 2, 4);
tracking.setUint32(0, 0x12345678, true);
console.log("owners", buffer instanceof ArrayBuffer, buffer.constructor === ArrayBuffer, Object.getPrototypeOf(buffer) === ArrayBuffer.prototype, Object.keys(buffer).length);
console.log("initial", buffer.byteLength, buffer.maxByteLength, buffer.resizable, buffer.detached, tracking.byteLength, fixed.byteLength);
buffer.resize(4);
let bounded = false; try { fixed.getUint8(0); } catch (error) { bounded = error instanceof TypeError; }
console.log("shrink", buffer.byteLength, tracking.byteLength, bounded, tracking.getUint16(0, true));
buffer.resize(12);
console.log("grow", tracking.byteLength, fixed.byteLength, tracking.getUint32(0, true), tracking.getUint8(8));
const copy = buffer.slice(2, 6);
console.log("slice", copy.byteLength, copy.resizable, new DataView(copy).getUint16(0, true));
const moved = buffer.transfer(10);
console.log("transfer", buffer.byteLength, buffer.maxByteLength, buffer.resizable, buffer.detached, moved.byteLength, moved.maxByteLength, moved.resizable);
const final = moved.transferToFixedLength(4);
console.log("fixed transfer", moved.detached, final.byteLength, final.maxByteLength, final.resizable, new DataView(final).getUint32(0, true));
console.log("views", ArrayBuffer.isView(tracking), ArrayBuffer.isView({}), ArrayBuffer.isView(new DataView(final)));
