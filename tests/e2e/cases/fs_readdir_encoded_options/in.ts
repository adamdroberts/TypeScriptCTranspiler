import { mkdirSync, promises, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), ".tmp-fs-readdir-encoded-options");
const HEX = "hex";
const BASE64 = "base64";

rmSync(root, { recursive: true, force: true });
mkdirSync(join(root, "sub"), { recursive: true });
writeFileSync(join(root, "alpha.txt"), "a");
writeFileSync(join(root, "sub", "beta.txt"), "b");

const hexNames = readdirSync(root, HEX).sort();
const base64Names = fs.readdirSync(root, { encoding: BASE64 }).sort();
const recursiveHexNames = readdirSync(root, { encoding: HEX, recursive: true }).sort();

console.log("hex:", hexNames.join(","));
console.log("base64:", base64Names.join(","));
console.log("recursive hex:", recursiveHexNames.join(","));

promises.readdir(root, { encoding: BASE64 }).then((entries: string[]): void => {
    console.log("promise:", entries.sort().join(","));
    rmSync(root, { recursive: true, force: true });
});
