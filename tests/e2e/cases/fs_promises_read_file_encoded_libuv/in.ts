import { promises as fsp, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-read-file-encoded-libuv.bin";
const missing = path + "-missing";

rmSync(path, { force: true });
rmSync(missing, { force: true });
writeFileSync(path, Buffer.from([65, 0, 66, 255]));

let completed = false;
let hex = "pending";
let base64 = "pending";
let error = "pending";

fsp.readFile(path, "hex").then((value: string): void => {
    hex = value;
    fsp.readFile(path, { encoding: "base64" }).then((value: string): void => {
        base64 = value;
        fsp.readFile(missing, "hex").then(
            (_value: string): void => {
                error = "unexpected success";
            },
            (reason: string): void => {
                error = reason;
            },
        ).then((_value: any): void => {
            completed = true;
            console.log("completed:", completed);
            console.log("hex:", hex);
            console.log("base64:", base64);
            console.log("error:", error);
            rmSync(path, { force: true });
        });
    });
});

console.log("queued:", completed);
