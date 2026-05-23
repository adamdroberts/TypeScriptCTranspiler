import { readFileSync } from "node:fs";
import * as fs from "node:fs";

const root = "/tmp/tsc2c-fs-option-property-undefined";
const file = root + "/sync.txt";
const copy = root + "/copy.txt";
const promiseFile = root + "/promise.txt";

fs.rmSync(root, { recursive: true, force: true, maxRetries: undefined, retryDelay: undefined });
fs.mkdirSync(root, { recursive: undefined, mode: undefined });

fs.writeFileSync(file, "alpha", { encoding: undefined, flag: undefined, mode: undefined, flush: undefined });
fs.appendFileSync(file, "-beta", { encoding: undefined, flag: undefined, mode: undefined, flush: undefined });
console.log("sync read:", readFileSync(file, { encoding: undefined, flag: undefined }));
console.log("sync stat:", fs.statSync(file, { bigint: undefined, throwIfNoEntry: undefined }).isFile());

fs.cpSync(file, copy, {
    recursive: undefined,
    force: undefined,
    errorOnExist: undefined,
    dereference: undefined,
    verbatimSymlinks: undefined,
    mode: undefined,
    preserveTimestamps: undefined,
});
console.log("sync copy:", fs.readFileSync(copy, { encoding: undefined }));
console.log("sync readdir:", fs.readdirSync(root, { encoding: undefined, recursive: undefined, withFileTypes: undefined }).sort().join("|"));

fs.promises.writeFile(promiseFile, "promise", { encoding: undefined, flag: undefined, mode: undefined, flush: undefined });
fs.promises.appendFile(promiseFile, "-done", { encoding: undefined, flag: undefined, mode: undefined, flush: undefined });
fs.promises.readFile(promiseFile, { encoding: undefined, flag: undefined }).then((text: string): void => {
    console.log("promise read:", text);
});
fs.promises.readdir(root, { encoding: undefined, recursive: undefined, withFileTypes: undefined }).then((names: string[]): void => {
    console.log("promise readdir:", names.sort().join("|"));
});

fs.rmSync(root, { recursive: true, force: true, maxRetries: undefined, retryDelay: undefined });
