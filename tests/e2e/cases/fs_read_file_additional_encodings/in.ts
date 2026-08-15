import { promises as fsp, readFileSync, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-read-file-additional-encodings.bin";
writeFileSync(path, Buffer.from([65, 0, 66, 233, 255]));

function codes(value: string): string {
    return `${value.charCodeAt(0)}|${value.charCodeAt(1)}|${value.charCodeAt(2)}|${value.charCodeAt(3)}|${value.charCodeAt(4)}`;
}

const ascii = readFileSync(path, "ascii");
const latin1 = readFileSync(path, { encoding: "latin1" });
const binary = readFileSync(path, "binary");

let promiseAscii = "pending";
let promiseLatin1 = "pending";
let promiseBinary = "pending";
let error = "pending";

fsp.readFile(path, "ascii")
    .then((value: string): Promise<string> => {
        promiseAscii = codes(value);
        return fsp.readFile(path, { encoding: "latin1" });
    })
    .then((value: string): Promise<string> => {
        promiseLatin1 = codes(value);
        return fsp.readFile(path, "binary");
    })
    .then((value: string): void => {
        promiseBinary = codes(value);
        console.log("sync ascii:", codes(ascii));
        console.log("sync latin1:", codes(latin1));
        console.log("sync binary:", codes(binary));
        console.log("promise ascii:", promiseAscii);
        console.log("promise latin1:", promiseLatin1);
        console.log("promise binary:", promiseBinary);
        console.log("error:", error);
        rmSync(path, { force: true });
    })
    .catch((reason: any): void => {
        error = String(reason);
        console.log("sync ascii:", codes(ascii));
        console.log("sync latin1:", codes(latin1));
        console.log("sync binary:", codes(binary));
        console.log("promise ascii:", promiseAscii);
        console.log("promise latin1:", promiseLatin1);
        console.log("promise binary:", promiseBinary);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
