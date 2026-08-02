import { readFileSync, renameSync } from "node:fs";

const root = Buffer.from("/tmp/tsc2c-fs-buffer-path-like");
const file = Buffer.from("/tmp/tsc2c-fs-buffer-path-like/source.txt");
const renamed = Buffer.from("/tmp/tsc2c-fs-buffer-path-like/renamed.txt");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(file, "alpha");

console.log("sync:", fs.existsSync(file), fs.readFileSync(file), fs.statSync(file).isFile());
console.log("named:", readFileSync(file), fs.readdirSync(root).join(","));

renameSync(file, renamed);
fs.promises.readFile(renamed).then((text: string): void => {
    console.log("promise read:", text);
    fs.rmSync(root, { recursive: true, force: true });
});
console.log("after schedule:", fs.existsSync(renamed));
