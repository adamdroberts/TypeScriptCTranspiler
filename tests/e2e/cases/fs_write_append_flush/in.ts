import { appendFileSync, promises as fsp, readFileSync, rmSync, writeFileSync } from "node:fs";

const syncPath = "/tmp/tsc2c-fs-write-append-flush-sync";
const promisePath = "/tmp/tsc2c-fs-write-append-flush-promise";

rmSync(syncPath, { force: true });
rmSync(promisePath, { force: true });

writeFileSync(syncPath, "sync", { flush: true });
appendFileSync(syncPath, "-append", { flush: true });
console.log("sync:", readFileSync(syncPath));

fsp.writeFile(promisePath, "promise", { flush: true })
    .then((_value: any) => fsp.appendFile(promisePath, "-append", { flush: true }))
    .then((_value: any) => {
        console.log("promise:", readFileSync(promisePath));
        rmSync(syncPath, { force: true });
        rmSync(promisePath, { force: true });
    });
