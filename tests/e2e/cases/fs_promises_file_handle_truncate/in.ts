import { promises as fsp, readFileSync, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-truncate.txt";
writeFileSync(path, "abcdef");

let content = "pending";
let defaultEmpty = false;
let closedError = "pending";
let error = "pending";

fsp.open(path, "r+")
    .then((handle: FSFileHandle): Promise<FSFileHandle> => {
        return handle.truncate(3)
            .then((_value: any): Promise<void> => {
                return handle.close();
            })
            .then((_closed: any): Promise<FSFileHandle> => {
                content = readFileSync(path);
                return fsp.open(path, "r+");
            });
    })
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.truncate()
            .then((_value: any): Promise<string> => {
                return handle.close().then((_closed: any): string => readFileSync(path));
            })
            .then((value: string): Promise<string> => {
                defaultEmpty = value.length === 0;
                return handle.truncate(1)
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
        console.log("content:", content);
        console.log("defaultEmpty:", defaultEmpty);
        console.log("closedError:", closedError);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
