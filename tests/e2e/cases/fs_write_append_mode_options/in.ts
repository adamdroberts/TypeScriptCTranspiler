import { appendFileSync, writeFileSync } from "node:fs";

const syncWritePath = "/tmp/tsc2c-fs-write-mode-sync.txt";
const syncAppendPath = "/tmp/tsc2c-fs-append-mode-sync.txt";
const promiseWritePath = "/tmp/tsc2c-fs-write-mode-promise.txt";
const promiseAppendPath = "/tmp/tsc2c-fs-append-mode-promise.txt";
const FLUSH_TRUE = true;
const FLUSH_FALSE = false;
const WRITE_MODE = 0o640;
const APPEND_MODE = 0o600;
const PROMISE_WRITE_MODE = 0o644;
const PROMISE_APPEND_MODE = 0o620;
const SYNC_WRITE_OPTIONS = { encoding: "utf8", mode: WRITE_MODE, flush: FLUSH_TRUE } as const;
const SYNC_APPEND_OPTIONS = { mode: APPEND_MODE, flush: FLUSH_TRUE } as const;
const SYNC_APPEND_LATER_OPTIONS = { mode: 0o777, flush: FLUSH_FALSE } as const;
const PROMISE_WRITE_OPTIONS = { mode: PROMISE_WRITE_MODE, flush: FLUSH_TRUE } as const;
const PROMISE_APPEND_OPTIONS = { encoding: "utf-8", mode: PROMISE_APPEND_MODE, flush: FLUSH_TRUE } as const;
const PROMISE_APPEND_LATER_OPTIONS = { mode: 0o777, flush: FLUSH_FALSE } as const;

function fileMode(path: string): number {
    return fs.statSync(path).mode & 0o777;
}

for (const file of [syncWritePath, syncAppendPath, promiseWritePath, promiseAppendPath]) {
    fs.rmSync(file, { force: true });
}

const oldUmask = process.umask(0);
try {
    writeFileSync(syncWritePath, "alpha", SYNC_WRITE_OPTIONS);
    console.log("sync write:", fileMode(syncWritePath), fs.readFileSync(syncWritePath));

    appendFileSync(syncAppendPath, "one", SYNC_APPEND_OPTIONS);
    appendFileSync(syncAppendPath, "-two", SYNC_APPEND_LATER_OPTIONS);
    console.log("sync append:", fileMode(syncAppendPath), fs.readFileSync(syncAppendPath));

} finally {
    process.umask(oldUmask);
}

process.umask(0);
fs.promises.writeFile(promiseWritePath, Buffer.from("promise"), PROMISE_WRITE_OPTIONS)
    .then((_value: any) => {
        console.log("promise write:", fileMode(promiseWritePath), fs.readFileSync(promiseWritePath));
        return fs.promises.appendFile(promiseAppendPath, "append", PROMISE_APPEND_OPTIONS);
    })
    .then((_value: any) => fs.promises.appendFile(promiseAppendPath, "-again", PROMISE_APPEND_LATER_OPTIONS))
    .then((_value: any) => {
        console.log("promise append:", fileMode(promiseAppendPath), fs.readFileSync(promiseAppendPath));
        process.umask(oldUmask);
        for (const file of [syncWritePath, syncAppendPath, promiseWritePath, promiseAppendPath]) {
            fs.rmSync(file, { force: true });
        }
    });
