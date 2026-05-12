import { promises } from "node:fs";
import * as nodefs from "fs";

const tmpPath = "/tmp/tsc2c-fs-promises-import.txt";
const content = "imported fs promises\n";
let namedRead = "";
let namespaceRead = "";

promises.writeFile(tmpPath, content);
promises.readFile(tmpPath).then((text: string): string => {
    namedRead = text.trim();
    return namedRead;
});

nodefs.promises.readFile(tmpPath).then((text: string): string => {
    namespaceRead = text.trim();
    return namespaceRead;
});

console.log("named:", namedRead);
console.log("namespace:", namespaceRead);
