import { readFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-read-file-buffer-options.bin";

fs.rmSync(path, { force: true });
fs.writeFileSync(path, Buffer.from([65, 0, 66]));

const bufferEncoding = "buffer";
const bufferOptions = { encoding: bufferEncoding } as const;

const direct = fs.readFileSync(path, bufferEncoding);
const object = readFileSync(path, bufferOptions);

console.log("direct:", Buffer.isBuffer(direct), direct.length, direct.readUInt8(0), direct.readUInt8(1), direct.readUInt8(2));
console.log("object:", Buffer.isBuffer(object), object.length, object.readUInt8(0), object.readUInt8(1), object.readUInt8(2));
fs.promises.readFile(path, bufferOptions).then((promise: Buffer): void => {
    console.log("promise:", Buffer.isBuffer(promise), promise.length, promise.readUInt8(0), promise.readUInt8(1), promise.readUInt8(2));
    fs.rmSync(path, { force: true });
});
