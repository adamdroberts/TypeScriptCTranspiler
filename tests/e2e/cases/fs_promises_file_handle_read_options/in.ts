import { promises as fsp, readFileSync, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-read-options.txt";
writeFileSync(path, Buffer.alloc(17000, 97));

const explicitBuffer = Buffer.from("....");
const defaultLengthBuffer = Buffer.from("....");
let explicitSummary = "pending";
let defaultLengthSummary = "pending";
let defaultBufferSummary = "pending";
let noOptionsSummary = "pending";
let explicitUndefinedSummary = "pending";
let content = "pending";
let error = "pending";

fsp.open(path, "r")
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.read({ buffer: explicitBuffer, offset: 1, length: 2, position: 0 })
            .then((result: FSFileReadResult): Promise<FSFileReadResult> => {
                explicitSummary = `${result.bytesRead}:${result.buffer.toString()}`;
                return handle.read({ buffer: defaultLengthBuffer, offset: 1, position: 0 });
            })
            .then((result: FSFileReadResult): Promise<FSFileReadResult> => {
                defaultLengthSummary = `${result.bytesRead}:${result.buffer.toString()}`;
                return handle.read({ position: 0 });
            })
            .then((result: FSFileReadResult): Promise<FSFileReadResult> => {
                defaultBufferSummary = `${result.bytesRead}:${result.buffer.toString().slice(0, 2)}`;
                return handle.read();
            })
            .then((result: FSFileReadResult): Promise<string> => {
                noOptionsSummary = `${result.bytesRead}:${result.buffer.toString().slice(0, 2)}`;
                return handle.read(undefined)
                    .then((next: FSFileReadResult): Promise<string> => {
                        explicitUndefinedSummary = `${next.bytesRead}:${next.buffer.toString().slice(0, 2)}`;
                        return handle.close().then((): string => `${readFileSync(path).length}`);
                    });
            });
    })
    .then((value: string): void => {
        content = value;
    })
    .catch((reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        console.log("explicit:", explicitSummary);
        console.log("default length:", defaultLengthSummary);
        console.log("default buffer:", defaultBufferSummary);
        console.log("no options:", noOptionsSummary);
        console.log("explicit undefined:", explicitUndefinedSummary);
        console.log("content length:", content);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
