import { promises as fsp, readFileSync, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-open.txt";
writeFileSync(path, "opened\n");

let fd = -1;
let closed = false;
let numericClosed = false;
let content = "pending";
let error = "pending";

fsp.open(path, "r", 0o644)
    .then((handle: FSFileHandle): Promise<FSFileHandle> => {
        fd = handle.fd;
        return handle.close().then((): Promise<FSFileHandle> => {
            closed = true;
            return fsp.open(path, 0);
        });
    })
    .then((handle: FSFileHandle): Promise<string> => {
        numericClosed = handle.fd >= 0;
        return handle.close().then((): string => readFileSync(path));
    })
    .then((value: string): void => {
        content = value.replace(/\n/g, "|");
    })
    .catch((reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        console.log("fd:", fd >= 0);
        console.log("closed:", closed);
        console.log("numericClosed:", numericClosed);
        console.log("content:", content);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
