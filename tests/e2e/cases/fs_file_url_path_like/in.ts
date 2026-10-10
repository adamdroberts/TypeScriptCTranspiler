import { readFileSync, renameSync } from "node:fs";

const root = new URL("file:///tmp/tsc2c-fs-file-url-path-like");
const file = new URL("file:///tmp/tsc2c-fs-file-url-path-like/source.txt");
const renamed = new URL("file:///tmp/tsc2c-fs-file-url-path-like/renamed.txt");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(file, "alpha");

const stats = fs.statSync(file);
console.log("sync:", fs.existsSync(file), fs.readFileSync(file, "utf8"), stats.isFile());
console.log("stat owner:", stats.valueOf() === stats, Reflect.apply(stats.isFile, stats, []), Number.isFinite(stats.mtime.getTime()));
console.log("named:", readFileSync(file, "utf8"), fs.readdirSync(root).join(","));

renameSync(file, renamed);
fs.promises.readFile(renamed, "utf8").then((text: string): void => {
    console.log("promise read:", text);
    fs.rmSync(root, { recursive: true, force: true });
});
console.log("after schedule:", fs.existsSync(renamed));
