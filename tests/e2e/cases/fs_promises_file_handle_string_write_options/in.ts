import { promises as fsp, readFileSync, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-string-write-options.txt";
writeFileSync(path, "abcdef");

let summary = "pending";
let content = "pending";
let error = "pending";

fsp.open(path, "r+")
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.write("4142", { position: 1, encoding: "hex" })
            .then((first: FSFileStringWriteResult): Promise<FSFileStringWriteResult> => {
                summary = `${first.bytesWritten}:${first.buffer}`;
                return handle.write("XY", { position: 3, encoding: "utf8" });
            })
            .then((second: FSFileStringWriteResult): Promise<string> => {
                summary += `|${second.bytesWritten}:${second.buffer}`;
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
