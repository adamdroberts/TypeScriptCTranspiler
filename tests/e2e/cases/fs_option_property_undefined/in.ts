import { readFileSync } from "node:fs";
import * as fs from "node:fs";

const root = "/tmp/tsc2c-fs-option-property-undefined";
const file = root + "/sync.txt";
const copy = root + "/copy.txt";
const promiseFile = root + "/promise.txt";
const defaultOption = undefined;
const defaultVoid = void 0;

fs.mkdirSync(root, { recursive: void 0, mode: undefined });

fs.writeFileSync(file, "alpha", { encoding: void 0, flag: undefined, mode: void 0, flush: undefined });
fs.appendFileSync(file, "-beta", { encoding: undefined, flag: void 0, mode: undefined, flush: void 0 });
console.log("sync read:", readFileSync(file, { encoding: void 0, flag: undefined }));
console.log("sync stat:", fs.statSync(file, { bigint: void 0, throwIfNoEntry: undefined }).isFile());

fs.cpSync(file, copy, {
    recursive: void 0,
    force: undefined,
    errorOnExist: void 0,
    dereference: undefined,
    verbatimSymlinks: void 0,
    mode: undefined,
    preserveTimestamps: void 0,
});
console.log("sync copy:", fs.readFileSync(copy, { encoding: void 0 }));
console.log("sync readdir:", fs.readdirSync(root, { encoding: defaultOption, recursive: defaultVoid, withFileTypes: defaultOption }).sort().join("|"));

fs.promises.writeFile(promiseFile, "promise", { encoding: void 0, flag: undefined, mode: void 0, flush: undefined })
    .then((_value: any) => fs.promises.appendFile(promiseFile, "-done", { encoding: undefined, flag: void 0, mode: undefined, flush: void 0 }))
    .then((_value: any) => fs.promises.readdir(root, { encoding: defaultOption, recursive: defaultVoid, withFileTypes: defaultOption }))
    .then((names: string[]) => {
        console.log("promise readdir:", names.sort().join("|"));
        return fs.promises.readFile(promiseFile, { encoding: void 0, flag: undefined });
    })
    .then((text: string): void => {
        console.log("promise read:", text);
        fs.rmSync(root, { recursive: true, force: true, maxRetries: void 0, retryDelay: undefined });
    });
