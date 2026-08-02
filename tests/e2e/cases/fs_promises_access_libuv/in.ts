import { constants, promises as fsp, rmSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-access-libuv.txt";
const missing = "/tmp/tsc2c-fs-promises-access-libuv-missing.txt";

writeFileSync(path, "libuv access\n");
rmSync(missing, { force: true });

let defaultResult = "pending";
let modeResult = "pending";
let missingResult = "pending";

fsp.access(path).then((_value: any): void => {
    defaultResult = "ok";
});
fsp.access(path, constants.R_OK | constants.W_OK).then((_value: any): void => {
    modeResult = "ok";
});
fsp.access(missing).catch((reason: any): void => {
    missingResult = reason;
});

setImmediate((): void => {
    console.log("default:", defaultResult);
    console.log("mode:", modeResult);
    console.log("missing:", missingResult.indexOf("fs.access") >= 0);
    rmSync(path, { force: true });
});
