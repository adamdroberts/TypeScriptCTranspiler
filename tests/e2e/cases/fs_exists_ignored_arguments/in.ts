import { existsSync, rmSync, writeFileSync } from "node:fs";

const events: string[] = [];
const path = "/tmp/tsc2c-fs-exists-ignored.txt";

function mark(label: string): string {
    events.push(label);
    return label;
}

rmSync(path, { force: true });

console.log("missing:", fs.existsSync(path, mark("global-missing")));

writeFileSync(path, "ready");

console.log("global:", fs.existsSync(path, mark("global")));
console.log("named:", existsSync(path, mark("named")));

rmSync(path, { force: true });

console.log("after:", existsSync(path, mark("after")));
console.log("events:", events.join("|"));
