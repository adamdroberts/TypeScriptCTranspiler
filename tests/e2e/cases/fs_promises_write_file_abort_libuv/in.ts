import fs from "node:fs";

declare const AbortController: { new(): any };

const writePath = "/tmp/tsc2c-fs-promises-write-file-abort-libuv.bin";
const appendPath = "/tmp/tsc2c-fs-promises-append-file-abort-libuv.bin";
fs.writeFileSync(appendPath, "seed");

const writeController: any = new AbortController();
const appendController: any = new AbortController();
let completed = 0;

fs.promises.writeFile(writePath, Buffer.alloc(4 * 1024 * 1024, 65), { signal: writeController.signal }).then(
    (_value: any): void => {
        completed++;
        console.log("write completed");
    },
    (reason: any): void => {
        console.log("write abort:", reason);
    }
);
fs.promises.appendFile(appendPath, "append data", { signal: appendController.signal }).then(
    (_value: any): void => {
        completed++;
        console.log("append completed");
    },
    (reason: any): void => {
        console.log("append abort:", reason);
    }
);

console.log("queued");
writeController.abort("write stop");
appendController.abort("append stop");

setImmediate((): void => {
    console.log("completed:", completed);
    fs.rmSync(writePath, { force: true });
    fs.rmSync(appendPath, { force: true });
});
