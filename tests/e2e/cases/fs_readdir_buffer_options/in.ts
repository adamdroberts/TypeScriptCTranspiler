import { mkdirSync, promises, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), ".tmp-fs-readdir-buffer-options");
const BUFFER_ENCODING = "buffer";
rmSync(root, { recursive: true, force: true });
mkdirSync(join(root, "sub"), { recursive: true });
writeFileSync(join(root, "alpha.txt"), "a");
writeFileSync(join(root, "sub", "beta.txt"), "b");

const names = readdirSync(root, BUFFER_ENCODING).map((entry) => entry.toString()).sort();
const objectNames = readdirSync(root, { encoding: BUFFER_ENCODING }).map((entry) => entry.toString()).sort();
const recursiveNames = readdirSync(root, { encoding: BUFFER_ENCODING, recursive: true }).map((entry) => entry.toString()).sort();

console.log("names:", names.join(","));
console.log("object:", objectNames.join(","));
console.log("recursive:", recursiveNames.join(","));

promises.readdir(root, { encoding: BUFFER_ENCODING }).then((entries: Buffer[]): void => {
    const promiseNames = entries.map((entry) => entry.toString()).sort();
    console.log("promise:", promiseNames.join(","));
    rmSync(root, { recursive: true, force: true });
});
