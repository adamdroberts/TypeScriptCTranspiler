import { readFileSync, renameSync } from "node:fs";

const root = new URL("file:///tmp/tsc2c-fs-file-url-path-like");
const file = new URL("file:///tmp/tsc2c-fs-file-url-path-like/source.txt");
const renamed = new URL("file:///tmp/tsc2c-fs-file-url-path-like/renamed.txt");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(file, "alpha");

console.log("sync:", fs.existsSync(file), fs.readFileSync(file), fs.statSync(file).isFile());
console.log("named:", readFileSync(file), fs.readdirSync(root).join(","));

renameSync(file, renamed);
fs.promises.readFile(renamed).then((text: string): void => {
    console.log("promise read:", text);
});
fs.promises.unlink(renamed);
console.log("after unlink:", fs.existsSync(renamed));

fs.rmSync(root, { recursive: true, force: true });
