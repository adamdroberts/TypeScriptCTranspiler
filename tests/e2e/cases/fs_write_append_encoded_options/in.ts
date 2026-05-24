import * as nodefs from "node:fs";
import { appendFileSync, promises as fsp, writeFileSync } from "fs";

const path = "/tmp/tsc2c-fs-write-append-encoded-options.bin";
const namedPath = "/tmp/tsc2c-fs-write-append-encoded-options-named.bin";
const promisePath = "/tmp/tsc2c-fs-write-append-encoded-options-promise.bin";
const HEX = "hex";
const BASE64 = "base64";

fs.rmSync(path, { force: true });
fs.rmSync(namedPath, { force: true });
fs.rmSync(promisePath, { force: true });

fs.writeFileSync(path, "4100ff", HEX);
fs.appendFileSync(path, "QkM=", { encoding: BASE64 });

const direct = fs.readFileSync(path, "buffer");
console.log("direct:", direct.length, direct.readUInt8(0), direct.readUInt8(1), direct.readUInt8(2), direct.readUInt8(3), direct.readUInt8(4));

writeFileSync(namedPath, "6869", { encoding: HEX });
appendFileSync(namedPath, "IQ==", BASE64);
nodefs.appendFileSync(namedPath, "2e", { encoding: "hex" });

const named = fs.readFileSync(namedPath, "buffer");
console.log("named:", named.length, named.readUInt8(0), named.readUInt8(1), named.readUInt8(2), named.readUInt8(3));

fs.promises.writeFile(promisePath, "SGk=", BASE64);
fsp.appendFile(promisePath, "21", { encoding: HEX });
nodefs.promises.appendFile(promisePath, "Kw==", { encoding: "base64" });

const promise = fs.readFileSync(promisePath, "buffer");
console.log("promise:", promise.length, promise.readUInt8(0), promise.readUInt8(1), promise.readUInt8(2), promise.readUInt8(3));

fs.rmSync(path, { force: true });
fs.rmSync(namedPath, { force: true });
fs.rmSync(promisePath, { force: true });
