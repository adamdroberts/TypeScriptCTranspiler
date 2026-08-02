import { appendFileSync, readFileSync } from "node:fs";

const syncPath = "/tmp/tsc2c-fs-file-flag-options-sync.txt";
const promisePath = "/tmp/tsc2c-fs-file-flag-options-promise.txt";
const exclusivePath = "/tmp/tsc2c-fs-file-flag-options-exclusive.txt";
const UTF8 = "utf8";
const UTF8_DASH = "utf-8";
const READ = "r";
const READ_SYNC = "rs";
const APPEND = "a";
const APPEND_PLUS = "a+";
const APPEND_SYNC = "as+";
const APPEND_EXCLUSIVE = "ax+";
const READ_SYNC_OPTIONS = { encoding: UTF8, flag: READ_SYNC } as const;
const APPEND_OPTIONS = { encoding: UTF8, flag: APPEND } as const;
const APPEND_SYNC_OPTIONS = { flag: APPEND_SYNC } as const;
const APPEND_EXCLUSIVE_OPTIONS = { flag: APPEND_EXCLUSIVE } as const;
const PROMISE_READ_OPTIONS = { encoding: UTF8_DASH, flag: READ } as const;

for (const file of [syncPath, promisePath, exclusivePath]) {
    fs.rmSync(file, { force: true });
}

fs.writeFileSync(syncPath, "alpha");
console.log("read flag:", fs.readFileSync(syncPath, { flag: READ }));
console.log("read encoding flag:", readFileSync(syncPath, READ_SYNC_OPTIONS));

appendFileSync(syncPath, "-beta", APPEND_OPTIONS);
fs.appendFileSync(syncPath, "-gamma", APPEND_SYNC_OPTIONS);
console.log("append flag:", fs.readFileSync(syncPath, { encoding: UTF8, flag: READ }));

fs.appendFileSync(exclusivePath, "first", APPEND_EXCLUSIVE_OPTIONS);
try {
    fs.appendFileSync(exclusivePath, "second", APPEND_EXCLUSIVE_OPTIONS);
    console.log("sync append exclusive: wrote");
} catch (err: any) {
    console.log("sync append exclusive:", err);
}
console.log("sync append exclusive content:", fs.readFileSync(exclusivePath));

fs.promises.writeFile(promisePath, "one")
    .then((_value: any) => fs.promises.appendFile(promisePath, "-two", { flag: APPEND }))
    .then((_value: any) => fs.promises.appendFile(promisePath, "-three", { flag: APPEND_PLUS }))
    .then((_value: any) => fs.promises.readFile(promisePath, PROMISE_READ_OPTIONS))
    .then((text: string) => {
        console.log("promise append flag:", text);
        return fs.promises.appendFile(promisePath, "-again", APPEND_EXCLUSIVE_OPTIONS);
    })
    .catch((reason: string): void => {
        console.log("promise append exclusive:", reason);
    })
    .then((_value: any) => fs.promises.readFile(promisePath, PROMISE_READ_OPTIONS))
    .then((text: string): void => {
        console.log("promise read flag:", text);
        for (const file of [syncPath, promisePath, exclusivePath]) {
            fs.rmSync(file, { force: true });
        }
    });
