import { appendFileSync, writeFileSync } from "node:fs";

const events: string[] = [];
const syncFile = "/tmp/tsc2c-fs-write-append-ignored-sync.txt";
const promiseFile = "/tmp/tsc2c-fs-write-append-ignored-promise.txt";

function mark(label: string): string {
    events.push(label);
    return label;
}

function note(label: string): void {
    events.push(label);
}

writeFileSync(syncFile, "sync", void note("write-options"), mark("write"));
appendFileSync(syncFile, "+append", void note("append-options"), mark("append"));

fs.promises.writeFile(promiseFile, "promise", void note("pwrite-options"), mark("pwrite"));
console.log("promise write:", fs.readFileSync(promiseFile).trim());

fs.promises.appendFile(promiseFile, "+append", void note("pappend-options"), mark("pappend"));
console.log("promise append:", fs.readFileSync(promiseFile).trim());

console.log("sync:", fs.readFileSync(syncFile).trim());
console.log("events:", events.join("|"));

fs.rmSync(syncFile, { force: true });
fs.rmSync(promiseFile, { force: true });
