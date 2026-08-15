import { promises as fsp, rmSync, writeFileSync } from "node:fs";

declare const AbortController: { new(): any };

const path = "/tmp/tsc2c-fs-promises-file-handle-write-append-abort.bin";
writeFileSync(path, "seed");

let writePendingResult = "pending";
let appendPendingResult = "pending";
let writePreAbortedResult = "pending";
let appendPreAbortedResult = "pending";
let writeClosed = "pending";
let appendClosed = "pending";
let writePreAbortedClosed = "pending";
let appendPreAbortedClosed = "pending";
let error = "pending";

fsp.open(path, "r+")
    .then((handle: FSFileHandle): Promise<void> => {
        const controller: any = new AbortController();
        const write: Promise<void> = handle.writeFile(Buffer.alloc(4 * 1024 * 1024, 65), {
            signal: controller.signal,
        });
        controller.abort("write stop");
        return write
            .then(
                (_value: any): void => {
                    writePendingResult = "fulfilled";
                },
                (reason: any): void => {
                    writePendingResult = "rejected:" + String(reason);
                },
            )
            .then((_value: any): Promise<void> => handle.close())
            .then((_value: any): void => {
                writeClosed = "true";
            });
    })
    .then((_value: any): Promise<void> => fsp.open(path, "a+").then((handle: FSFileHandle): Promise<void> => {
        const controller: any = new AbortController();
        const append: Promise<void> = handle.appendFile(Buffer.alloc(4 * 1024 * 1024, 66), {
            signal: controller.signal,
        });
        controller.abort("append stop");
        return append
            .then(
                (_value: any): void => {
                    appendPendingResult = "fulfilled";
                },
                (reason: any): void => {
                    appendPendingResult = "rejected:" + String(reason);
                },
            )
            .then((_value: any): Promise<void> => handle.close())
            .then((_value: any): void => {
                appendClosed = "true";
            });
    }))
    .then((_value: any): Promise<void> => {
        const controller: any = new AbortController();
        controller.abort("pre-write stop");
        return fsp.open(path, "r+").then((handle: FSFileHandle): Promise<void> => {
            const write: Promise<void> = handle.writeFile("not written", {
                signal: controller.signal,
            });
            return write
                .then(
                    (_value: any): void => {
                        writePreAbortedResult = "fulfilled";
                    },
                    (reason: any): void => {
                        writePreAbortedResult = "rejected:" + String(reason);
                    },
                )
                .then((_value: any): Promise<void> => handle.close())
                .then((_value: any): void => {
                    writePreAbortedClosed = "true";
                });
        });
    })
    .then((_value: any): Promise<void> => {
        const controller: any = new AbortController();
        controller.abort("pre-append stop");
        return fsp.open(path, "a+").then((handle: FSFileHandle): Promise<void> => {
            const append: Promise<void> = handle.appendFile("not appended", {
                signal: controller.signal,
            });
            return append
                .then(
                    (_value: any): void => {
                        appendPreAbortedResult = "fulfilled";
                    },
                    (reason: any): void => {
                        appendPreAbortedResult = "rejected:" + String(reason);
                    },
                )
                .then((_value: any): Promise<void> => handle.close())
                .then((_value: any): void => {
                    appendPreAbortedClosed = "true";
                });
        });
    })
    .catch((reason: any): void => {
        error = String(reason);
    })
    .then((_value: any): void => {
        console.log("write pending:", writePendingResult);
        console.log("append pending:", appendPendingResult);
        console.log("write pre-aborted:", writePreAbortedResult);
        console.log("append pre-aborted:", appendPreAbortedResult);
        console.log("write closed:", writeClosed);
        console.log("append closed:", appendClosed);
        console.log("write pre-aborted closed:", writePreAbortedClosed);
        console.log("append pre-aborted closed:", appendPreAbortedClosed);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
