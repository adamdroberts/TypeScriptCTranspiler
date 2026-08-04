import { promises as fsp, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-read.txt";
writeFileSync(path, "abcdef");

let defaultSummary = "pending";
let current = "pending";
let encoded = "pending";
let closedError = "pending";
let error = "pending";

fsp.open(path, "r")
    .then((handle: FSFileHandle): Promise<void> => {
        return handle.readFile()
            .then((value: Buffer): Promise<void> => {
                defaultSummary = `${Buffer.isBuffer(value)}:${value.toString()}`;
                return handle.writeFile("");
            });
    })
    .then((_value: any): Promise<FSFileHandle> => fsp.open(path, "r+"))
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.writeFile("ab")
            .then((_result: any): Promise<string> => handle.readFile("utf8"))
            .then((value: string): Promise<string> => {
                current = value;
                return handle.close().then((): string => current);
            });
    })
    .then((_value: string): Promise<FSFileHandle> => fsp.open(path, "r"))
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.readFile({ encoding: "base64" })
            .then((value: string): Promise<string> => {
                encoded = value;
                return handle.close().then((): string => encoded);
            });
    })
    .then((_value: string): Promise<FSFileHandle> => fsp.open(path, "r"))
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.close()
            .then((_closed: any): Promise<Buffer> => handle.readFile())
            .then((_value: Buffer): string => "unexpected fulfillment")
            .catch((reason: string): string => reason);
    })
    .then((reason: string): void => {
        closedError = reason.indexOf("FileHandle is closed") >= 0 ? "true" : reason;
    })
    .catch((reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        console.log("default:", defaultSummary);
        console.log("current:", current);
        console.log("encoded:", encoded);
        console.log("closedError:", closedError);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
