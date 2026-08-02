import * as nodefs from "node:fs";
import { readdirSync } from "fs";
import { promises } from "node:fs";

const dirPath = "/tmp/tsc2c-fs-readdir-options";
const filePath = path.join(dirPath, "item.txt");
const RECURSIVE_FALSE = false;
const WITH_FILE_TYPES_FALSE = false;

if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
}
fs.writeFileSync(filePath, "ok");

const globalNames = fs.readdirSync(dirPath, "utf8");
const namespaceNames = nodefs.readdirSync(dirPath, { encoding: "utf-8", recursive: RECURSIVE_FALSE });
const namedNames = readdirSync(dirPath, { encoding: "utf8" });

let promiseNames = "";
promises.readdir(dirPath, { encoding: "utf8", recursive: RECURSIVE_FALSE, withFileTypes: WITH_FILE_TYPES_FALSE }).then((names: string[]): void => {
    promiseNames = names.join("|");
    console.log("promise:", promiseNames);
    fs.unlinkSync(filePath);
    fs.rmdirSync(dirPath);
});

console.log("global:", globalNames.join("|"));
console.log("namespace:", namespaceNames.join("|"));
console.log("named:", namedNames.join("|"));
