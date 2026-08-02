import { promises as fsp, mkdirSync, rmSync, writeFileSync } from "node:fs";

declare const AbortController: { new(): any };

const base = "/tmp/tsc2c-fs-promises-mutation-abort-libuv";
const simpleMkdir = base + "-mkdir";
const recursiveMkdir = base + "-mkdir-recursive/a/b";
const rmFile = base + "-rm-file";
const rmRecursive = base + "-rm-recursive/child";
const rmdirEmpty = base + "-rmdir-empty";
const rmdirRecursive = base + "-rmdir-recursive/child";

rmSync(simpleMkdir, { recursive: true, force: true });
rmSync(base + "-mkdir-recursive", { recursive: true, force: true });
rmSync(rmFile, { recursive: true, force: true });
rmSync(base + "-rm-recursive", { recursive: true, force: true });
rmSync(rmdirEmpty, { recursive: true, force: true });
rmSync(base + "-rmdir-recursive", { recursive: true, force: true });
mkdirSync(base + "-rm-recursive");
mkdirSync(base + "-rmdir-recursive");
mkdirSync(rmdirEmpty);
mkdirSync(rmdirRecursive);
writeFileSync(rmFile, "pending");

const controller: any = new AbortController();
let completed = 0;

fsp.mkdir(simpleMkdir, { signal: controller.signal }).then(
    (_value: any): void => { completed++; console.log("mkdir completed"); },
    (reason: any): void => console.log("mkdir abort:", reason),
);
fsp.mkdir(recursiveMkdir, { recursive: true, signal: controller.signal }).then(
    (_value: any): void => { completed++; console.log("mkdir recursive completed"); },
    (reason: any): void => console.log("mkdir recursive abort:", reason),
);
fsp.rm(rmFile, { signal: controller.signal }).then(
    (_value: any): void => { completed++; console.log("rm completed"); },
    (reason: any): void => console.log("rm abort:", reason),
);
fsp.rm(rmRecursive, { recursive: true, signal: controller.signal }).then(
    (_value: any): void => { completed++; console.log("rm recursive completed"); },
    (reason: any): void => console.log("rm recursive abort:", reason),
);
fsp.rmdir(rmdirEmpty, { signal: controller.signal }).then(
    (_value: any): void => { completed++; console.log("rmdir completed"); },
    (reason: any): void => console.log("rmdir abort:", reason),
);
fsp.rmdir(rmdirRecursive, { recursive: true, signal: controller.signal }).then(
    (_value: any): void => { completed++; console.log("rmdir recursive completed"); },
    (reason: any): void => console.log("rmdir recursive abort:", reason),
);

console.log("queued");
controller.abort("mutation stop");

setImmediate((): void => {
    console.log("completed:", completed);
    rmSync(simpleMkdir, { recursive: true, force: true });
    rmSync(base + "-mkdir-recursive", { recursive: true, force: true });
    rmSync(rmFile, { recursive: true, force: true });
    rmSync(base + "-rm-recursive", { recursive: true, force: true });
    rmSync(rmdirEmpty, { recursive: true, force: true });
    rmSync(base + "-rmdir-recursive", { recursive: true, force: true });
});
