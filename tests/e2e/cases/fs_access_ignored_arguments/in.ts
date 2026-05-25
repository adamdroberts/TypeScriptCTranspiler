import { accessSync, rmSync, writeFileSync } from "node:fs";

const events: string[] = [];
const path = "/tmp/tsc2c-fs-access-ignored.txt";
const defaultMode = undefined;

function mark(label: string): number {
    events.push(label);
    return 0;
}

rmSync(path, { force: true });
writeFileSync(path, "ok");

fs.accessSync(path, undefined, mark("global-default"));
fs.accessSync(path, void 0, mark("global-void-default"));
fs.accessSync(path, defaultMode, mark("global-alias-default"));
accessSync(path, fs.constants.F_OK, mark("named-mode"));

let missing = "";
try {
    fs.accessSync(path + ".missing", void 0, mark("missing"));
} catch (err: any) {
    missing = err;
}

rmSync(path, { force: true });

console.log("missing:", missing);
console.log("events:", events.join("|"));
