import { promises as fsp, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-read-additional-encodings.bin";
writeFileSync(path, Buffer.from([65, 0, 66, 233, 255]));

function codes(value: string): string {
    return `${value.charCodeAt(0)}|${value.charCodeAt(1)}|${value.charCodeAt(2)}|${value.charCodeAt(3)}|${value.charCodeAt(4)}`;
}

let asciiSummary = "pending";
let latin1Summary = "pending";
let binarySummary = "pending";
let error = "pending";

fsp.open(path, "r")
    .then((handle: FSFileHandle): Promise<void> => {
        return handle.readFile("ascii")
            .then((value: string): Promise<void> => {
                asciiSummary = codes(value);
                return handle.close();
            });
    })
    .then((_value: any): Promise<FSFileHandle> => fsp.open(path, "r"))
    .then((handle: FSFileHandle): Promise<void> => {
        return handle.readFile({ encoding: "latin1" })
            .then((value: string): Promise<void> => {
                latin1Summary = codes(value);
                return handle.close();
            });
    })
    .then((_value: any): Promise<FSFileHandle> => fsp.open(path, "r"))
    .then((handle: FSFileHandle): Promise<void> => {
        return handle.readFile({ encoding: "binary" })
            .then((value: string): Promise<void> => {
                binarySummary = codes(value);
                return handle.close();
            });
    })
    .catch((reason: any): void => {
        error = String(reason);
    })
    .then((_value: any): void => {
        console.log("ascii:", asciiSummary);
        console.log("latin1:", latin1Summary);
        console.log("binary:", binarySummary);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
