import { promises as fsp, readFileSync, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-io.txt";
writeFileSync(path, "abcdef");

const readBuffer = Buffer.alloc(3);
const writeBuffer = Buffer.from("XY");
let readSummary = "pending";
let writeSummary = "pending";
let content = "pending";
let error = "pending";

fsp.open(path, "r+")
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.read(readBuffer, 0, 3, 1)
            .then((result: FSFileReadResult): Promise<FSFileWriteResult> => {
                readSummary = `${result.bytesRead}:${result.buffer.toString()}`;
                return handle.write(writeBuffer, 0, 2, 0);
            })
            .then((result: FSFileWriteResult): Promise<string> => {
                writeSummary = `${result.bytesWritten}:${result.buffer.toString()}`;
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
        console.log("read:", readSummary);
        console.log("write:", writeSummary);
        console.log("content:", content);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
