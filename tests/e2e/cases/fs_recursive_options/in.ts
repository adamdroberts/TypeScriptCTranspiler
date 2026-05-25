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
const CLEANUP_OPTIONS = { recursive: RECURSIVE_TRUE, force: FORCE_TRUE, maxRetries: RETRIES_ZERO, retryDelay: DELAY_ZERO };
const REMOVE_OPTIONS = { recursive: RECURSIVE_TRUE, maxRetries: RETRIES_ONE, retryDelay: DELAY_ONE };
const FORCE_MISSING_OPTIONS = { force: FORCE_TRUE, maxRetries: RETRIES_ZERO, retryDelay: DELAY_ZERO };

fs.rmSync(root, CLEANUP_OPTIONS);

nodefs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(file, "sync");
console.log("sync file:", fs.statSync(file).isFile());
fs.rmSync(root, REMOVE_OPTIONS);
console.log("sync removed:", fs.existsSync(root));

fs.promises.mkdir(nested, { recursive: true });
fs.promises.writeFile(file, "promise");
fs.promises.rm(root, CLEANUP_OPTIONS);
console.log("promise removed:", fs.existsSync(root));

fs.promises.rm(root, FORCE_MISSING_OPTIONS);
console.log("force missing:", fs.existsSync(root));

nodefs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(file, "rmdir sync");
fs.rmdirSync(root, REMOVE_OPTIONS);
console.log("rmdir sync removed:", fs.existsSync(root));

fs.promises.mkdir(nested, { recursive: true });
fs.promises.writeFile(file, "rmdir promise");
fs.promises.rmdir(root, REMOVE_OPTIONS);
console.log("rmdir promise removed:", fs.existsSync(root));
