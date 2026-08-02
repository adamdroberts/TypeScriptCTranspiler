import { promises as fsp, mkdirSync, rmSync, writeFileSync } from "node:fs";

declare const AbortController: { new(): any };

const root = "/tmp/tsc2c-fs-promises-readdir-abort-libuv";
rmSync(root, { recursive: true, force: true });
mkdirSync(root + "/nested", { recursive: true });
writeFileSync(root + "/top.txt", "top");

const controller: any = new AbortController();
let completed = 0;

fsp.readdir(root, { signal: controller.signal }).then(
    (_entries: string[]): void => {
        completed++;
        console.log("utf8 completed");
    },
    (reason: any): void => console.log("utf8 abort:", reason),
);
fsp.readdir(root, { recursive: true, signal: controller.signal }).then(
    (_entries: string[]): void => {
        completed++;
        console.log("recursive completed");
    },
    (reason: any): void => console.log("recursive abort:", reason),
);
fsp.readdir(root, { encoding: "hex", signal: controller.signal }).then(
    (_entries: string[]): void => {
        completed++;
        console.log("hex completed");
    },
    (reason: any): void => console.log("hex abort:", reason),
);
fsp.readdir(root, { recursive: true, encoding: "base64", signal: controller.signal }).then(
    (_entries: string[]): void => {
        completed++;
        console.log("recursive base64 completed");
    },
    (reason: any): void => console.log("recursive base64 abort:", reason),
);
fsp.readdir(root, { withFileTypes: true, signal: controller.signal }).then(
    (_entries: FSDirent[]): void => {
        completed++;
        console.log("dirents completed");
    },
    (reason: any): void => console.log("dirents abort:", reason),
);
fsp.readdir(root, { withFileTypes: true, recursive: true, signal: controller.signal }).then(
    (_entries: FSDirent[]): void => {
        completed++;
        console.log("recursive dirents completed");
    },
    (reason: any): void => console.log("recursive dirents abort:", reason),
);

console.log("queued");
controller.abort("readdir stop");

setImmediate((): void => {
    console.log("completed:", completed);
    rmSync(root, { recursive: true, force: true });
});
