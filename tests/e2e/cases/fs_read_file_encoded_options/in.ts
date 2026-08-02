import * as nodefs from "node:fs";
import { promises as fsp, readFileSync } from "fs";

const path = "/tmp/tsc2c-fs-read-file-encoded-options.bin";
const HEX = "hex";
const BASE64 = "base64";

fs.rmSync(path, { force: true });
fs.writeFileSync(path, Buffer.from([65, 0, 66, 255]));

console.log("global hex:", fs.readFileSync(path, "hex"));
console.log("object hex:", fs.readFileSync(path, { encoding: HEX, flag: "r" }));
console.log("named base64:", readFileSync(path, BASE64));
console.log("namespace base64:", nodefs.readFileSync(path, { encoding: "base64" }));

fs.promises.readFile(path, "hex").then((text: string): void => {
    console.log("promise hex:", text);
    fsp.readFile(path, { encoding: BASE64 }).then((text: string): void => {
        console.log("named promise base64:", text);
        nodefs.promises.readFile(path, { encoding: "base64" }).then((text: string): void => {
            console.log("namespace promise base64:", text);
            fs.rmSync(path, { force: true });
        });
    });
});
