import { promises as fsp, rmSync, writeFileSync } from "node:fs";

declare const AbortController: { new(): any };

const path = "/tmp/tsc2c-fs-promises-file-handle-read-file-abort.bin";
writeFileSync(path, Buffer.alloc(4 * 1024 * 1024, 65));

let pendingResult = "pending";
let preAbortedResult = "pending";
let closedAfterAbort = "pending";
let error = "pending";

fsp.open(path, "r")
    .then((handle: FSFileHandle): Promise<void> => {
        const controller: any = new AbortController();
        const read: Promise<string> = handle.readFile({
            encoding: "utf8",
            signal: controller.signal,
        });
        controller.abort("pending stop");
        return read
            .then(
                (_value: string): void => {
                    pendingResult = "fulfilled";
                },
                (reason: any): void => {
                    pendingResult = "rejected:" + String(reason);
                },
            )
            .then((_value: any): Promise<void> => handle.close())
            .then((_value: any): void => {
                closedAfterAbort = "true";
            });
    })
    .then((_value: any): Promise<void> => {
        const controller: any = new AbortController();
        controller.abort("pre stop");
        return fsp.open(path, "r").then((handle: FSFileHandle): Promise<void> => {
            const read: Promise<Buffer> = handle.readFile({
                signal: controller.signal,
            });
            return read
                .then(
                    (_value: Buffer): void => {
                        preAbortedResult = "fulfilled";
                    },
                    (reason: any): void => {
                        preAbortedResult = "rejected:" + String(reason);
                    },
                )
                .then((_value: any): Promise<void> => handle.close());
        });
    })
    .catch((reason: any): void => {
        error = String(reason);
    })
    .then((_value: any): void => {
        console.log("pending:", pendingResult);
        console.log("pre-aborted:", preAbortedResult);
        console.log("closed-after-abort:", closedAfterAbort);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
