import { appendFileSync, writeFileSync } from "node:fs";

const syncWritePath = "/tmp/tsc2c-fs-write-mode-sync.txt";
const syncAppendPath = "/tmp/tsc2c-fs-append-mode-sync.txt";
const promiseWritePath = "/tmp/tsc2c-fs-write-mode-promise.txt";
const promiseAppendPath = "/tmp/tsc2c-fs-append-mode-promise.txt";

function fileMode(path: string): number {
    return fs.statSync(path).mode & 0o777;
}

for (const file of [syncWritePath, syncAppendPath, promiseWritePath, promiseAppendPath]) {
    fs.rmSync(file, { force: true });
}

const oldUmask = process.umask(0);
try {
    writeFileSync(syncWritePath, "alpha", { encoding: "utf8", mode: 0o640 });
    console.log("sync write:", fileMode(syncWritePath), fs.readFileSync(syncWritePath));

    appendFileSync(syncAppendPath, "one", { mode: 0o600 });
    appendFileSync(syncAppendPath, "-two", { mode: 0o777 });
    console.log("sync append:", fileMode(syncAppendPath), fs.readFileSync(syncAppendPath));

    fs.promises.writeFile(promiseWritePath, Buffer.from("promise"), { mode: 0o644 });
    console.log("promise write:", fileMode(promiseWritePath), fs.readFileSync(promiseWritePath));

    fs.promises.appendFile(promiseAppendPath, "append", { encoding: "utf-8", mode: 0o620 });
    fs.promises.appendFile(promiseAppendPath, "-again", { mode: 0o777 });
    console.log("promise append:", fileMode(promiseAppendPath), fs.readFileSync(promiseAppendPath));
} finally {
    process.umask(oldUmask);
    for (const file of [syncWritePath, syncAppendPath, promiseWritePath, promiseAppendPath]) {
        fs.rmSync(file, { force: true });
    }
}
