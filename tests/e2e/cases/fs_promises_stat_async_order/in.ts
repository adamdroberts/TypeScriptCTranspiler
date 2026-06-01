import * as fs from "fs";
import * as path from "path";

const root = fs.mkdtempSync(path.join("/tmp", "tsc2c-stat-async-"));
const file = path.join(root, "file.txt");
const missing = path.join(root, "missing.txt");
fs.writeFileSync(file, "ok");

console.log("before");

fs.promises.stat(file).then((stat: FSStats): void => {
    console.log("stat:", stat.isFile());
});

fs.promises.lstat(file).then((stat: FSStats): void => {
    console.log("lstat:", stat.isFile());
});

fs.promises.stat(missing).catch((reason: string): void => {
    console.log("missing:", reason.indexOf("fs.statSync") >= 0);
});

Promise.resolve("microtask").then((value: string): void => {
    console.log(value);
});

setImmediate((): void => {
    console.log("immediate");
});

console.log("after");
