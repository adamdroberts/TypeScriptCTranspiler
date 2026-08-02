import { promises as fsp, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-read-file-libuv.txt";
const missing = "/tmp/tsc2c-fs-promises-read-file-libuv-missing.txt";

writeFileSync(path, "libuv read\n");
rmSync(missing, { force: true });

let text = "pending";
let bytes = -1;
let error = "pending";
fsp.readFile(path).then((value: string): string => {
    text = value;
    return value;
});
fsp.readFile(path, "buffer").then((value: Buffer): Buffer => {
    bytes = value.length;
    return value;
});
fsp.readFile(missing).catch((reason: any): any => {
    error = reason;
    return reason;
});

setImmediate((): void => {
    console.log("text:", text.trim());
    console.log("bytes:", bytes);
    console.log("error:", error);
});
