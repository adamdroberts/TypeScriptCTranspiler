import * as fs from "fs";
import * as path from "path";

const root = fs.mkdtempSync(path.join("/tmp", "tsc2c-stat-async-"));
const file = path.join(root, "file.txt");
const missing = path.join(root, "missing.txt");
fs.writeFileSync(file, "ok");

console.log("before");

let statOk = false;
let lstatOk = false;
let missingOk = false;

fs.promises.stat(file).then((stat: FSStats): void => {
    statOk = stat.isFile();
});

fs.promises.lstat(file).then((stat: FSStats): void => {
    lstatOk = stat.isFile();
});

fs.promises.stat(missing).catch((reason: string): void => {
    missingOk = reason.indexOf("fs.statSync") >= 0;
});

Promise.resolve("microtask").then((value: string): void => {
    console.log(value);
});

setImmediate((): void => {
    console.log("stat:", statOk);
    console.log("lstat:", lstatOk);
    console.log("missing:", missingOk);
    console.log("immediate");
    fs.rmSync(root, { recursive: true, force: true });
});

console.log("after");
