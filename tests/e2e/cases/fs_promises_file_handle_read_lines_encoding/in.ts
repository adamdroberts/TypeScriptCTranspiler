import { promises as fsp, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-read-lines-encoding.txt";
writeFileSync(path, Buffer.from([233, 10, 255, 10]));

function readCodes(iterator: any): Promise<string> {
    return iterator.next().then((first: any): Promise<string> => {
        return iterator.next().then((second: any): string => {
            return `${first.value.charCodeAt(0)}|${second.value.charCodeAt(0)}`;
        });
    });
}

function readEncoded(iterator: any): Promise<string> {
    return iterator.next().then((first: any): Promise<string> => {
        return iterator.next().then((finished: any): string => `${first.value}:${finished.done}`);
    });
}

let asciiSummary = "pending";
let latin1Summary = "pending";
let binarySummary = "pending";
let hexSummary = "pending";
let base64Summary = "pending";
let error = "pending";

fsp.open(path, "r")
    .then((handle: FSFileHandle): Promise<void> => {
        return readCodes(handle.readLines({ encoding: "ascii" }))
            .then((value: string): Promise<void> => {
                asciiSummary = value;
                return handle.close();
            });
    })
    .then((_value: any): Promise<FSFileHandle> => fsp.open(path, "r"))
    .then((handle: FSFileHandle): Promise<void> => {
        return readCodes(handle.readLines({ encoding: "latin1" }))
            .then((value: string): Promise<void> => {
                latin1Summary = value;
                return handle.close();
            });
    })
    .then((_value: any): Promise<FSFileHandle> => fsp.open(path, "r"))
    .then((handle: FSFileHandle): Promise<void> => {
        return readCodes(handle.readLines({ encoding: "binary" }))
            .then((value: string): Promise<void> => {
                binarySummary = value;
                return handle.close();
            });
    })
    .then((_value: any): Promise<FSFileHandle> => fsp.open(path, "r"))
    .then((handle: FSFileHandle): Promise<void> => {
        return readEncoded(handle.readLines({ encoding: "hex" }))
            .then((value: string): Promise<void> => {
                hexSummary = value;
                return handle.close();
            });
    })
    .then((_value: any): Promise<FSFileHandle> => fsp.open(path, "r"))
    .then((handle: FSFileHandle): Promise<void> => {
        return readEncoded(handle.readLines({ encoding: "base64" }))
            .then((value: string): Promise<void> => {
                base64Summary = value;
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
        console.log("hex:", hexSummary);
        console.log("base64:", base64Summary);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
