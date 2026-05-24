import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-recursive-options";
const nested = path.join(root, "a", "b");
const file = path.join(nested, "note.txt");
const RECURSIVE_TRUE = true;
const FORCE_TRUE = true;

fs.rmSync(root, { recursive: RECURSIVE_TRUE, force: FORCE_TRUE, maxRetries: 0, retryDelay: 0 });

nodefs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(file, "sync");
console.log("sync file:", fs.statSync(file).isFile());
fs.rmSync(root, { recursive: RECURSIVE_TRUE, maxRetries: 1, retryDelay: 1 });
console.log("sync removed:", fs.existsSync(root));

fs.promises.mkdir(nested, { recursive: true });
fs.promises.writeFile(file, "promise");
fs.promises.rm(root, { recursive: RECURSIVE_TRUE, force: FORCE_TRUE, maxRetries: 0, retryDelay: 0 });
console.log("promise removed:", fs.existsSync(root));

fs.promises.rm(root, { force: FORCE_TRUE, maxRetries: 0, retryDelay: 0 });
console.log("force missing:", fs.existsSync(root));

nodefs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(file, "rmdir sync");
fs.rmdirSync(root, { recursive: RECURSIVE_TRUE, maxRetries: 1, retryDelay: 1 });
console.log("rmdir sync removed:", fs.existsSync(root));

fs.promises.mkdir(nested, { recursive: true });
fs.promises.writeFile(file, "rmdir promise");
fs.promises.rmdir(root, { recursive: RECURSIVE_TRUE, maxRetries: 1, retryDelay: 1 });
console.log("rmdir promise removed:", fs.existsSync(root));
