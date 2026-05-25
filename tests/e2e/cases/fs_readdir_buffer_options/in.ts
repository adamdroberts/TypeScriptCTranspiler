import { mkdirSync, promises, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), ".tmp-fs-readdir-buffer-options");
const BUFFER_ENCODING = "buffer";
const BUFFER_OPTIONS = { encoding: BUFFER_ENCODING } as const;
const RECURSIVE_BUFFER_OPTIONS = { encoding: BUFFER_ENCODING, recursive: true } as const;
rmSync(root, { recursive: true, force: true });
mkdirSync(join(root, "sub"), { recursive: true });
writeFileSync(join(root, "alpha.txt"), "a");
writeFileSync(join(root, "sub", "beta.txt"), "b");

const names = readdirSync(root, BUFFER_ENCODING).map((entry) => entry.toString()).sort();
const objectNames = readdirSync(root, BUFFER_OPTIONS).map((entry) => entry.toString()).sort();
const recursiveNames = readdirSync(root, RECURSIVE_BUFFER_OPTIONS).map((entry) => entry.toString()).sort();

console.log("names:", names.join(","));
console.log("object:", objectNames.join(","));
console.log("recursive:", recursiveNames.join(","));

promises.readdir(root, BUFFER_OPTIONS).then((entries: Buffer[]): void => {
    const promiseNames = entries.map((entry) => entry.toString()).sort();
    console.log("promise:", promiseNames.join(","));
    rmSync(root, { recursive: true, force: true });
});
