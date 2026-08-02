import { promises as fsp, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";

const root = "/tmp/tsc2c-fs-promises-stat-libuv";
const file = root + "/file.txt";
const link = root + "/file-link";
const missing = root + "/missing.txt";

rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });
writeFileSync(file, "libuv stat\n");
symlinkSync(file, link);

let statKind = "pending";
let lstatKind = "pending";
let missingOptional = "pending";
let missingError = "pending";

fsp.stat(file).then((value: FSStats): void => {
    statKind = value.isFile() ? "file" : "other";
});
fsp.lstat(link).then((value: FSStats): void => {
    lstatKind = value.isSymbolicLink() ? "symlink" : "other";
});
fsp.stat(missing, { throwIfNoEntry: false }).then((value: FSStats | undefined): void => {
    missingOptional = value === undefined ? "undefined" : "present";
});
fsp.stat(missing).catch((reason: any): void => {
    missingError = reason;
});

setImmediate((): void => {
    console.log("stat:", statKind);
    console.log("lstat:", lstatKind);
    console.log("missing optional:", missingOptional);
    console.log("missing error:", missingError.indexOf("fs.statSync") >= 0);
    rmSync(root, { recursive: true, force: true });
});
