import { promises as fsp, readFileSync, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-io-options.txt";
writeFileSync(path, "abcdef");

const readBuffer = Buffer.from("....");
const writeBuffer = Buffer.from("WXYZ");
const defaultReadBuffer = Buffer.from("....");
let readSummary = "pending";
let writeSummary = "pending";
let defaultReadSummary = "pending";
let content = "pending";
let error = "pending";

fsp.open(path, "r+")
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.read(readBuffer, { offset: 1, length: 2, position: null })
            .then((result: FSFileReadResult): Promise<FSFileWriteResult> => {
                readSummary = `${result.bytesRead}:${result.buffer.toString()}`;
                return handle.write(writeBuffer, { offset: 1, length: 2, position: 4 });
            })
            .then((result: FSFileWriteResult): Promise<FSFileReadResult> => {
                writeSummary = `${result.bytesWritten}:${result.buffer.toString()}`;
                return handle.read(defaultReadBuffer, { offset: 1, position: 0 });
            })
            .then((result: FSFileReadResult): Promise<string> => {
                defaultReadSummary = `${result.bytesRead}:${result.buffer.toString()}`;
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
        console.log("default read:", defaultReadSummary);
        console.log("content:", content);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
