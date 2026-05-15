import * as nodefs from "node:fs";
import { accessSync } from "fs";

const path = "/tmp/tsc2c-fs-access-sync.txt";
fs.writeFileSync(path, "ok");

let globalOk = false;
let namespaceOk = false;
let namedOk = false;
let missing = "";

fs.accessSync(path);
globalOk = true;

nodefs.accessSync(path);
namespaceOk = true;

accessSync(path);
namedOk = true;

try {
    fs.accessSync(path + ".missing");
} catch (err: any) {
    missing = err;
}

fs.unlinkSync(path);

console.log("ok:", globalOk, namespaceOk, namedOk);
console.log("missing:", missing);
