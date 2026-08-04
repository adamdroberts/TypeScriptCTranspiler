import { promises as fsp, readFileSync, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-sync.txt";
writeFileSync(path, "durable");

let syncDone = false;
let datasyncDone = false;
let content = "pending";
let closedError = "pending";
let error = "pending";

fsp.open(path, "r+")
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.sync()
            .then((_value: any): Promise<void> => {
                syncDone = true;
                return handle.datasync();
            })
            .then((_value: any): Promise<string> => {
                datasyncDone = true;
                return handle.close().then((_closed: any): string => readFileSync(path));
            })
            .then((value: string): Promise<string> => {
                content = value;
                return handle.sync()
                    .then((_result: any): string => "unexpected fulfillment")
                    .catch((reason: string): string => reason);
            });
    })
    .then((reason: string): void => {
        closedError = reason.indexOf("FileHandle is closed") >= 0 ? "true" : reason;
    })
    .catch((reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        console.log("sync:", syncDone);
        console.log("datasync:", datasyncDone);
        console.log("content:", content);
        console.log("closedError:", closedError);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
