import { promises as fsp, rmSync, writeFileSync } from "node:fs";

declare const AbortController: { new(): any };

const path = "/tmp/tsc2c-fs-promises-file-handle-read-lines-abort.txt";
writeFileSync(path, "first\nsecond\n");

let pendingResult = "pending";
let preAbortedResult = "pending";
let error = "pending";

fsp.open(path, "r")
    .then((handle: FSFileHandle): Promise<void> => {
        const controller: any = new AbortController();
        const iterator: any = handle.readLines({ signal: controller.signal });
        const next: Promise<any> = iterator.next();
        controller.abort("pending stop");
        return next
            .then(
                (_result: any): void => {
                    pendingResult = "fulfilled";
                },
                (reason: any): void => {
                    pendingResult = `rejected:${reason}`;
                },
            )
            .then((_value: any): Promise<void> => handle.close());
    })
    .then((_value: any): Promise<void> => {
        const controller: any = new AbortController();
        controller.abort("pre stop");
        return fsp.open(path, "r").then((handle: FSFileHandle): Promise<void> => {
            const iterator: any = handle.readLines({ signal: controller.signal });
            return iterator.next().then(
                (_result: any): void => {
                    preAbortedResult = "fulfilled";
                },
                (reason: any): void => {
                    preAbortedResult = `rejected:${reason}`;
                },
            ).then((_value: any): Promise<void> => handle.close());
        });
    })
    .catch((reason: any): void => {
        error = String(reason);
    })
    .then((_value: any): void => {
        console.log("pending:", pendingResult);
        console.log("pre-aborted:", preAbortedResult);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
