import { promises as fsp, appendFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const syncPath = "/tmp/tsc2c-fs-write-append-additional-encodings-sync.bin";
const promisePath = "/tmp/tsc2c-fs-write-append-additional-encodings-promise.bin";
const handlePath = "/tmp/tsc2c-fs-write-append-additional-encodings-handle.bin";
const source = "A\u00e9";
const high = "\u00ff";

rmSync(syncPath, { force: true });
rmSync(promisePath, { force: true });
rmSync(handlePath, { force: true });

writeFileSync(syncPath, source, "ascii");
appendFileSync(syncPath, high, { encoding: "latin1" });
appendFileSync(syncPath, "B", { encoding: "binary" });
const syncSummary = readFileSync(syncPath, "buffer").toString("hex");

let promiseSummary = "pending";
let handleSummary = "pending";
let error = "pending";

fsp.writeFile(promisePath, source, { encoding: "binary" })
    .then((_value: any): Promise<void> => fsp.appendFile(promisePath, high, "ascii"))
    .then((_value: any): Promise<void> => fsp.appendFile(promisePath, "B", { encoding: "latin1" }))
    .then((_value: any): Promise<Buffer> => fsp.readFile(promisePath, "buffer"))
    .then((bytes: Buffer): Promise<FSFileHandle> => {
        promiseSummary = bytes.toString("hex");
        return fsp.open(handlePath, "w+");
    })
    .then((handle: FSFileHandle): Promise<void> => {
        return handle.writeFile(source, { encoding: "latin1" })
            .then((_value: any): Promise<void> => handle.close());
    })
    .then((_value: any): Promise<FSFileHandle> => fsp.open(handlePath, "a"))
    .then((handle: FSFileHandle): Promise<void> => {
        return handle.appendFile(high, "binary")
            .then((_value: any): Promise<void> => handle.appendFile("B", { encoding: "ascii" }))
            .then((_value: any): Promise<void> => handle.close());
    })
    .then((_value: any): Promise<Buffer> => fsp.readFile(handlePath, "buffer"))
    .then((bytes: Buffer): void => {
        handleSummary = bytes.toString("hex");
    })
    .catch((reason: any): void => {
        error = String(reason);
    })
    .then((_value: any): void => {
        console.log("sync:", syncSummary);
        console.log("promise:", promiseSummary);
        console.log("handle:", handleSummary);
        console.log("error:", error);
        rmSync(syncPath, { force: true });
        rmSync(promisePath, { force: true });
        rmSync(handlePath, { force: true });
    });
