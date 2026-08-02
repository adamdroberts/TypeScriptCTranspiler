import { promises as fsp, mkdirSync, rmSync } from "node:fs";

declare const AbortController: { new(): any };

const path = "/tmp/tsc2c-fs-promises-access-statfs-abort-libuv";
rmSync(path, { recursive: true, force: true });
mkdirSync(path);

const controller: any = new AbortController();
let completed = 0;

fsp.access(path, { signal: controller.signal }).then(
    (_value: any): void => { completed++; console.log("access completed"); },
    (reason: any): void => console.log("access abort:", reason),
);
fsp.statfs(path, { bigint: false, signal: controller.signal }).then(
    (_value: FSStatFs): void => { completed++; console.log("statfs completed"); },
    (reason: any): void => console.log("statfs abort:", reason),
);

console.log("queued");
controller.abort("access/statfs stop");

setImmediate((): void => {
    console.log("completed:", completed);
    rmSync(path, { recursive: true, force: true });
});
