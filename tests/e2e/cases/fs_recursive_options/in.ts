import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-recursive-options";
const nested = path.join(root, "a", "b");
const file = path.join(nested, "note.txt");

fs.rmSync(root, { recursive: true, force: true });

nodefs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(file, "sync");
console.log("sync file:", fs.statSync(file).isFile());
fs.rmSync(root, { recursive: true });
console.log("sync removed:", fs.existsSync(root));

fs.promises.mkdir(nested, { recursive: true });
fs.promises.writeFile(file, "promise");
fs.promises.rm(root, { recursive: true, force: true });
console.log("promise removed:", fs.existsSync(root));

fs.promises.rm(root, { force: true });
console.log("force missing:", fs.existsSync(root));

nodefs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(file, "rmdir sync");
fs.rmdirSync(root, { recursive: true });
console.log("rmdir sync removed:", fs.existsSync(root));

fs.promises.mkdir(nested, { recursive: true });
fs.promises.writeFile(file, "rmdir promise");
fs.promises.rmdir(root, { recursive: true });
console.log("rmdir promise removed:", fs.existsSync(root));
