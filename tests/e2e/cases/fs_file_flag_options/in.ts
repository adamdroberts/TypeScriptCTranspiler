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

for (const file of [syncPath, promisePath, exclusivePath]) {
    fs.rmSync(file, { force: true });
}

fs.writeFileSync(syncPath, "alpha");
console.log("read flag:", fs.readFileSync(syncPath, { flag: READ }));
console.log("read encoding flag:", readFileSync(syncPath, { encoding: UTF8, flag: READ_SYNC }));

appendFileSync(syncPath, "-beta", { encoding: UTF8, flag: APPEND });
fs.appendFileSync(syncPath, "-gamma", { flag: APPEND_SYNC });
console.log("append flag:", fs.readFileSync(syncPath, { encoding: UTF8, flag: READ }));

fs.appendFileSync(exclusivePath, "first", { flag: APPEND_EXCLUSIVE });
try {
    fs.appendFileSync(exclusivePath, "second", { flag: APPEND_EXCLUSIVE });
    console.log("sync append exclusive: wrote");
} catch (err: any) {
    console.log("sync append exclusive:", err);
}
console.log("sync append exclusive content:", fs.readFileSync(exclusivePath));

fs.promises.writeFile(promisePath, "one");
fs.promises.readFile(promisePath, { encoding: UTF8_DASH, flag: READ }).then((text) => {
    console.log("promise read flag:", text);
    return text;
});
fs.promises.appendFile(promisePath, "-two", { flag: APPEND });
fs.promises.appendFile(promisePath, "-three", { flag: APPEND_PLUS });
fs.promises.appendFile(promisePath, "-again", { flag: APPEND_EXCLUSIVE }).catch((reason: string): any => {
    console.log("promise append exclusive:", reason);
});
console.log("promise append flag:", fs.readFileSync(promisePath));

for (const file of [syncPath, promisePath, exclusivePath]) {
    fs.rmSync(file, { force: true });
}
