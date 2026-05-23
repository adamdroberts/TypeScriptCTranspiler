import { appendFileSync, writeFileSync } from "node:fs";

const events: string[] = [];
const syncFile = "/tmp/tsc2c-fs-write-append-ignored-sync.txt";
const promiseFile = "/tmp/tsc2c-fs-write-append-ignored-promise.txt";

function mark(label: string): string {
    events.push(label);
    return label;
}

writeFileSync(syncFile, "sync", undefined, mark("write"));
appendFileSync(syncFile, "+append", undefined, mark("append"));

fs.promises.writeFile(promiseFile, "promise", undefined, mark("pwrite"));
console.log("promise write:", fs.readFileSync(promiseFile).trim());

fs.promises.appendFile(promiseFile, "+append", undefined, mark("pappend"));
console.log("promise append:", fs.readFileSync(promiseFile).trim());

console.log("sync:", fs.readFileSync(syncFile).trim());
console.log("events:", events.join("|"));

fs.rmSync(syncFile, { force: true });
fs.rmSync(promiseFile, { force: true });
