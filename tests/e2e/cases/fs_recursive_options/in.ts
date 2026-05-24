import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-recursive-options";
const nested = path.join(root, "a", "b");
const file = path.join(nested, "note.txt");
const RECURSIVE_TRUE = true;
const FORCE_TRUE = true;
const RETRIES_ZERO = 0;
const RETRIES_ONE = 1;
const DELAY_ZERO = 0;
const DELAY_ONE = 1;

fs.rmSync(root, { recursive: RECURSIVE_TRUE, force: FORCE_TRUE, maxRetries: RETRIES_ZERO, retryDelay: DELAY_ZERO });

nodefs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(file, "sync");
console.log("sync file:", fs.statSync(file).isFile());
fs.rmSync(root, { recursive: RECURSIVE_TRUE, maxRetries: RETRIES_ONE, retryDelay: DELAY_ONE });
console.log("sync removed:", fs.existsSync(root));

fs.promises.mkdir(nested, { recursive: true });
fs.promises.writeFile(file, "promise");
fs.promises.rm(root, { recursive: RECURSIVE_TRUE, force: FORCE_TRUE, maxRetries: RETRIES_ZERO, retryDelay: DELAY_ZERO });
console.log("promise removed:", fs.existsSync(root));

fs.promises.rm(root, { force: FORCE_TRUE, maxRetries: RETRIES_ZERO, retryDelay: DELAY_ZERO });
console.log("force missing:", fs.existsSync(root));

nodefs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(file, "rmdir sync");
fs.rmdirSync(root, { recursive: RECURSIVE_TRUE, maxRetries: RETRIES_ONE, retryDelay: DELAY_ONE });
console.log("rmdir sync removed:", fs.existsSync(root));

fs.promises.mkdir(nested, { recursive: true });
fs.promises.writeFile(file, "rmdir promise");
fs.promises.rmdir(root, { recursive: RECURSIVE_TRUE, maxRetries: RETRIES_ONE, retryDelay: DELAY_ONE });
console.log("rmdir promise removed:", fs.existsSync(root));
