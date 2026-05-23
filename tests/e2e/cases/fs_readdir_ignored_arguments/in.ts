import { readdirSync } from "node:fs";

const events: string[] = [];
const root = "/tmp/tsc2c-fs-readdir-ignored";

function mark(label: string): string {
    events.push(label);
    return label;
}

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(path.join(root, "b.txt"), "b");
fs.writeFileSync(path.join(root, "a.txt"), "a");

const names = fs.readdirSync(root, undefined, mark("global")).sort();
const buffers = readdirSync(root, "buffer", mark("named")).map((entry: Buffer): string => entry.toString()).sort();

fs.promises.readdir(root, undefined, mark("promise")).then((promiseNames: string[]): void => {
    console.log("promise:", promiseNames.sort().join("|"));
});

console.log("sync:", names.join("|"), buffers.join("|"));
console.log("events:", events.join("|"));

fs.rmSync(root, { recursive: true, force: true });
