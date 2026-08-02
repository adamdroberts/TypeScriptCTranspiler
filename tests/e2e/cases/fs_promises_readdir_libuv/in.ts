import { promises as fsp, mkdirSync, rmSync, writeFileSync } from "node:fs";

const root = "/tmp/tsc2c-fs-promises-readdir-libuv";
const missing = root + "-missing";
rmSync(root, { recursive: true, force: true });
rmSync(missing, { recursive: true, force: true });
mkdirSync(root);
writeFileSync(root + "/a.txt", "a");
mkdirSync(root + "/sub");

let names = "pending";
let byteSummary = "pending";
let error = "pending";
let completed = false;

fsp.readdir(root)
    .then((entries: string[]): Promise<Buffer[]> => {
        names = entries.sort().join("|");
        return fsp.readdir(root, "buffer");
    })
    .then((entries: Buffer[]): Promise<string[]> => {
        byteSummary = `${entries.length}:${entries.reduce((total: number, entry: Buffer): number => total + entry.length, 0)}`;
        return fsp.readdir(missing);
    })
    .catch((reason: string): string[] => {
        error = reason;
        return [];
    })
    .then((_entries: string[]): void => {
        completed = true;
    });

setImmediate((): void => {
    console.log("completed:", completed);
    console.log("names:", names);
    console.log("bytes:", byteSummary);
    console.log("error:", error);
    rmSync(root, { recursive: true, force: true });
});
