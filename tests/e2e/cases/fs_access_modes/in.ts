import * as nodefs from "node:fs";
import { accessSync, constants } from "fs";

const path = "/tmp/tsc2c-fs-access-modes.txt";
fs.writeFileSync(path, "mode");
fs.chmodSync(path, 0o600);

let globalOk = false;
let namespaceOk = false;
let namedOk = false;
let promiseOk = "pending";
let denied = "";

fs.accessSync(path, fs.constants.F_OK | fs.constants.R_OK);
globalOk = true;

nodefs.accessSync(path, nodefs.constants.W_OK);
namespaceOk = true;

accessSync(path, constants.R_OK | constants.W_OK);
namedOk = true;

fs.promises.access(path, fs.constants.R_OK).then((value: any): string => {
    value;
    promiseOk = "ok";
    return promiseOk;
});

try {
    fs.accessSync(path, fs.constants.X_OK);
} catch (err: any) {
    denied = err;
}

fs.unlinkSync(path);

console.log("modes:", globalOk, namespaceOk, namedOk, promiseOk);
console.log("denied:", denied);
console.log("constants:", fs.constants.F_OK, constants.X_OK);
