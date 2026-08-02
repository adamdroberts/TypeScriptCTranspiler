import { promises as fsp, mkdirSync, rmSync, symlinkSync } from "node:fs";

declare const AbortController: { new(): any };

const root = "/tmp/tsc2c-fs-promises-metadata-abort-libuv";
const link = root + "-link";
const prefix = root + "-dir-";
rmSync(root, { recursive: true, force: true });
rmSync(link, { recursive: true, force: true });
mkdirSync(root);
symlinkSync(root, link, "dir");

const controller: any = new AbortController();
let completed = 0;

fsp.stat(root, { signal: controller.signal }).then(
    (_value: FSStats): void => {
        completed++;
        console.log("stat completed");
    },
    (reason: any): void => console.log("stat abort:", reason),
);
fsp.lstat(link, { signal: controller.signal }).then(
    (_value: FSStats): void => {
        completed++;
        console.log("lstat completed");
    },
    (reason: any): void => console.log("lstat abort:", reason),
);
fsp.realpath(root, { signal: controller.signal }).then(
    (_value: string): void => {
        completed++;
        console.log("realpath completed");
    },
    (reason: any): void => console.log("realpath abort:", reason),
);
fsp.readlink(link, { signal: controller.signal }).then(
    (_value: string): void => {
        completed++;
        console.log("readlink completed");
    },
    (reason: any): void => console.log("readlink abort:", reason),
);
fsp.mkdtemp(prefix, { signal: controller.signal }).then(
    (_value: string): void => {
        completed++;
        console.log("mkdtemp completed");
    },
    (reason: any): void => console.log("mkdtemp abort:", reason),
);

console.log("queued");
controller.abort("metadata stop");

setImmediate((): void => {
    console.log("completed:", completed);
    rmSync(root, { recursive: true, force: true });
    rmSync(link, { recursive: true, force: true });
});
