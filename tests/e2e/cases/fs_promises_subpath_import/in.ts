import fsp from "fs/promises";
import { readFile, writeFile } from "node:fs/promises";
import * as nodeFsp from "node:fs/promises";

const namedPath = "/tmp/tsc2c-fs-promises-subpath-named.txt";
const namespacePath = "/tmp/tsc2c-fs-promises-subpath-namespace.txt";
const defaultPath = "/tmp/tsc2c-fs-promises-subpath-default.txt";
let namedRead = "";
let namespaceRead = "";
let defaultRead = "";

writeFile(namedPath, "named import\n");
readFile(namedPath).then((text: string): string => {
    namedRead = text.trim();
    return namedRead;
});

nodeFsp.writeFile(namespacePath, "namespace import\n");
nodeFsp.readFile(namespacePath).then((text: string): string => {
    namespaceRead = text.trim();
    return namespaceRead;
});

fsp.writeFile(defaultPath, "default import\n");
fsp.readFile(defaultPath).then((text: string): string => {
    defaultRead = text.trim();
    return defaultRead;
});

console.log("named:", namedRead);
console.log("namespace:", namespaceRead);
console.log("default:", defaultRead);
