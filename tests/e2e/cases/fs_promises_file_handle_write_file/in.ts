import { promises as fsp, readFileSync, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-write.txt";
writeFileSync(path, "abcdef");

let content = "pending";
let closedError = "pending";
let error = "pending";

fsp.open(path, "r+")
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.writeFile("3132", "hex")
            .then((_value: any): Promise<void> => handle.writeFile(Buffer.from("XY"), { flush: true }))
            .then((_value: any): Promise<string> => handle.close().then((): string => readFileSync(path)))
            .then((value: string): Promise<string> => {
                content = value;
                return handle.writeFile("late")
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
        console.log("closedError:", closedError);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
