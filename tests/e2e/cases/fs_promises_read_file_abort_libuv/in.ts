import fs from "node:fs";

declare const AbortController: { new(): any };

const path = "/tmp/tsc2c-fs-promises-read-file-abort-libuv.bin";
fs.writeFileSync(path, Buffer.alloc(1024 * 1024, 65));

const utf8Controller: any = new AbortController();
const encodedController: any = new AbortController();
const bufferController: any = new AbortController();
let completed = 0;

fs.promises.readFile(path, { encoding: "utf8", signal: utf8Controller.signal }).then(
    (_value: string): void => {
        completed++;
        console.log("utf8 completed");
    },
    (reason: any): void => {
        console.log("utf8 abort:", reason);
    }
);
fs.promises.readFile(path, { encoding: "hex", signal: encodedController.signal }).then(
    (_value: string): void => {
        completed++;
        console.log("encoded completed");
    },
    (reason: any): void => {
        console.log("encoded abort:", reason);
    }
);
fs.promises.readFile(path, { encoding: "buffer", signal: bufferController.signal }).then(
    (_value: Buffer): void => {
        completed++;
        console.log("buffer completed");
    },
    (reason: any): void => {
        console.log("buffer abort:", reason);
    }
);

console.log("queued");
utf8Controller.abort("utf8 stop");
encodedController.abort("encoded stop");
bufferController.abort("buffer stop");

setImmediate((): void => {
    console.log("completed:", completed);
    fs.unlinkSync(path);
});
