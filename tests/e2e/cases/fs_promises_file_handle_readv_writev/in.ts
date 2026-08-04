import { promises as fsp, readFileSync, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-readv-writev.txt";
writeFileSync(path, "abcdef");

const readBuffers: Buffer[] = [Buffer.alloc(2), Buffer.alloc(3)];
const writeBuffers: Buffer[] = [Buffer.from("XY"), Buffer.from("Z")];
let readSummary = "pending";
let writeSummary = "pending";
let content = "pending";
let closedError = "pending";
let error = "pending";

fsp.open(path, "r+")
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.readv(readBuffers, 1)
            .then((result: FSFileReadvResult): Promise<FSFileWritevResult> => {
                readSummary = `${result.bytesRead}:${readBuffers[0].toString()}${readBuffers[1].toString()}`;
                return handle.writev(writeBuffers);
            })
            .then((result: FSFileWritevResult): Promise<string> => {
                writeSummary = `${result.bytesWritten}:${writeBuffers[0].toString()}${writeBuffers[1].toString()}`;
                return handle.close().then((_closed: any): Promise<string> => {
                    content = readFileSync(path);
                    return handle.readv(readBuffers)
                        .then((_result: FSFileReadvResult): string => "unexpected fulfillment")
                        .catch((reason: string): string => reason);
                });
            });
    })
    .then((reason: string): void => {
        closedError = reason.indexOf("FileHandle is closed") >= 0 ? "true" : reason;
    })
    .catch((reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        console.log("read:", readSummary);
        console.log("write:", writeSummary);
        console.log("content:", content);
        console.log("closedError:", closedError);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
