import { promises as fsp, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-async-dispose.txt";
writeFileSync(path, "dispose me");

let symbolSummary = "pending";
let resultSummary = "pending";
let closedError = "pending";
let idempotent = "pending";
let error = "pending";

fsp.open(path, "r")
    .then((handle: FSFileHandle): Promise<void> => {
        const disposer = handle[Symbol.asyncDispose];
        symbolSummary = `${typeof Symbol.asyncDispose}:${typeof disposer}`;
        return handle[Symbol.asyncDispose]()
            .then((value: any): Promise<Buffer> => {
                resultSummary = String(value === undefined);
                return handle.readFile();
            })
            .then((_value: Buffer): string => "unexpected fulfillment")
            .catch((reason: string): string => reason)
            .then((reason: string): void => {
                closedError = reason.indexOf("FileHandle is closed") >= 0 ? "true" : reason;
            })
            .then((): Promise<void> => handle[Symbol.asyncDispose]())
            .then((): void => {
                idempotent = "true";
            });
    })
    .catch((reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        console.log("symbol:", symbolSummary);
        console.log("result:", resultSummary);
        console.log("closedError:", closedError);
        console.log("idempotent:", idempotent);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
