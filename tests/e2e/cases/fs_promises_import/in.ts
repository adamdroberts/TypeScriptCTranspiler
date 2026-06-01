import { promises, promises as promisesAlias } from "node:fs";
import * as nodefs from "fs";

const tmpPath = "/tmp/tsc2c-fs-promises-import.txt";
const aliasPath = "/tmp/tsc2c-fs-promises-import-alias.txt";
const content = "imported fs promises\n";
let namedRead = "";
let aliasRead = "";
let namespaceRead = "";

promises.writeFile(tmpPath, content);
promises.readFile(tmpPath).then((text: string): string => {
    namedRead = text.trim();
    return namedRead;
});

promisesAlias.writeFile(aliasPath, "aliased fs promises\n");
promisesAlias.readFile(aliasPath).then((text: string): string => {
    aliasRead = text.trim();
    return aliasRead;
});

nodefs.promises.readFile(tmpPath).then((text: string): string => {
    namespaceRead = text.trim();
    return namespaceRead;
});

setImmediate((): void => {
    console.log("named:", namedRead);
    console.log("alias:", aliasRead);
    console.log("namespace:", namespaceRead);
});
