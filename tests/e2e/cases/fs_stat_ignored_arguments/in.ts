import { lstatSync, rmSync, statSync, writeFileSync } from "node:fs";

const events: string[] = [];
const path = "/tmp/tsc2c-fs-stat-ignored.txt";

function mark(label: string): string {
    events.push(label);
    return label;
}

rmSync(path, { force: true });
writeFileSync(path, "stats");

const stat = fs.statSync(path, undefined, mark("stat"));
const lstat = lstatSync(path, undefined, mark("lstat"));
const missing = statSync(path + ".missing", { throwIfNoEntry: false }, mark("missing"));

rmSync(path, { force: true });

console.log("stats:", stat.isFile(), lstat.isFile(), stat.size, missing === undefined);
console.log("events:", events.join("|"));
