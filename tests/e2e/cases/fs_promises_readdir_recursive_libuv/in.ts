import { promises as fsp, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";

const root = "/tmp/tsc2c-fs-promises-readdir-recursive-libuv";
const missing = root + "-missing";
const nested = root + "/a/b";

rmSync(root, { recursive: true, force: true });
rmSync(missing, { recursive: true, force: true });
mkdirSync(nested, { recursive: true });
writeFileSync(root + "/top.txt", "top");
writeFileSync(root + "/a/file.txt", "file");
writeFileSync(nested + "/deep.txt", "deep");
symlinkSync("a", root + "/link", "dir");

let completed = false;
let stringNames = "pending";
let bufferNames = "pending";
let error = "pending";

fsp.readdir(root, { recursive: true })
    .then((entries: string[]): Promise<Buffer[]> => {
        stringNames = entries.sort().join("|");
        return fsp.readdir(root, { recursive: true, encoding: "buffer" });
    })
    .then((entries: Buffer[]): Promise<string[]> => {
        bufferNames = entries.map((entry: Buffer): string => entry.toString()).sort().join("|");
        return fsp.readdir(missing, { recursive: true });
    })
    .catch((reason: string): string[] => {
        error = reason;
        return [];
    })
    .then((_entries: string[]): void => {
        completed = true;
        console.log("completed:", completed);
        console.log("strings:", stringNames);
        console.log("buffers:", bufferNames);
        console.log("error:", error);
        rmSync(root, { recursive: true, force: true });
    });

console.log("queued:", completed);
