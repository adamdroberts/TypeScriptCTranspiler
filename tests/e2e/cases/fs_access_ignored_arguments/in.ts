import { accessSync, rmSync, writeFileSync } from "node:fs";

const events: string[] = [];
const path = "/tmp/tsc2c-fs-access-ignored.txt";

function mark(label: string): number {
    events.push(label);
    return 0;
}

rmSync(path, { force: true });
writeFileSync(path, "ok");

fs.accessSync(path, undefined, mark("global-default"));
accessSync(path, fs.constants.F_OK, mark("named-mode"));

let missing = "";
try {
    fs.accessSync(path + ".missing", undefined, mark("missing"));
} catch (err: any) {
    missing = err;
}

rmSync(path, { force: true });

console.log("missing:", missing);
console.log("events:", events.join("|"));
