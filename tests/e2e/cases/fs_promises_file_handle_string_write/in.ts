import { promises as fsp, readFileSync, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-string-write.txt";
writeFileSync(path, "abcdef");

let summary = "pending";
let content = "pending";
let error = "pending";

fsp.open(path, "r+")
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.write("XY", 1, "utf8")
            .then((result: FSFileStringWriteResult): Promise<string> => {
                summary = `${result.bytesWritten}:${result.buffer}`;
                return handle.close().then((): string => readFileSync(path));
            });
    })
    .then((value: string): void => {
        content = value;
    })
    .catch((reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        console.log("write:", summary);
        console.log("content:", content);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
