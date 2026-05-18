import { appendFileSync, readFileSync } from "node:fs";

const syncPath = "/tmp/tsc2c-fs-file-flag-options-sync.txt";
const promisePath = "/tmp/tsc2c-fs-file-flag-options-promise.txt";
const exclusivePath = "/tmp/tsc2c-fs-file-flag-options-exclusive.txt";

for (const file of [syncPath, promisePath, exclusivePath]) {
    fs.rmSync(file, { force: true });
}

fs.writeFileSync(syncPath, "alpha");
console.log("read flag:", fs.readFileSync(syncPath, { flag: "r" }));
console.log("read encoding flag:", readFileSync(syncPath, { encoding: "utf8", flag: "rs" }));

appendFileSync(syncPath, "-beta", { encoding: "utf8", flag: "a" });
fs.appendFileSync(syncPath, "-gamma", { flag: "as+" });
console.log("append flag:", fs.readFileSync(syncPath, { encoding: "utf8", flag: "r" }));

fs.appendFileSync(exclusivePath, "first", { flag: "ax+" });
try {
    fs.appendFileSync(exclusivePath, "second", { flag: "ax+" });
    console.log("sync append exclusive: wrote");
} catch (err: any) {
    console.log("sync append exclusive:", err);
}
console.log("sync append exclusive content:", fs.readFileSync(exclusivePath));

fs.promises.writeFile(promisePath, "one");
fs.promises.readFile(promisePath, { encoding: "utf-8", flag: "r" }).then((text) => {
    console.log("promise read flag:", text);
    return text;
});
fs.promises.appendFile(promisePath, "-two", { flag: "a" });
fs.promises.appendFile(promisePath, "-three", { flag: "a+" });
fs.promises.appendFile(promisePath, "-again", { flag: "ax+" }).catch((reason: string): any => {
    console.log("promise append exclusive:", reason);
});
console.log("promise append flag:", fs.readFileSync(promisePath));

for (const file of [syncPath, promisePath, exclusivePath]) {
    fs.rmSync(file, { force: true });
}
