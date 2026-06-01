const empty = new ArrayBuffer();
console.log("empty:", empty.byteLength);

const buffer = new ArrayBuffer(8);
const view = new DataView(buffer, 2, 4);
console.log("view:", buffer.byteLength, view.byteOffset, view.byteLength, view.buffer.byteLength);

const tail = new DataView(buffer, 3);
console.log("tail:", tail.byteOffset, tail.byteLength);

const defaultOffset = new DataView(buffer, undefined, 2);
console.log("default offset:", defaultOffset.byteOffset, defaultOffset.byteLength);

console.log(
    "empty keys:",
    Object.keys(buffer).length,
    Object.values(view).length,
    Object.entries(buffer).length,
    Reflect.ownKeys(view).length,
    Reflect.getOwnPropertyDescriptor(buffer, "byteLength") === undefined,
);

try {
    console.log("bad buffer:", new ArrayBuffer(-1).byteLength);
} catch (err: any) {
    console.log("bad buffer:", err);
}

try {
    console.log("bad offset:", new DataView(buffer, 9).byteLength);
} catch (err: any) {
    console.log("bad offset:", err);
}

try {
    console.log("bad length:", new DataView(buffer, 7, 2).byteLength);
} catch (err: any) {
    console.log("bad length:", err);
}
