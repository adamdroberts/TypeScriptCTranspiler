import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-recursive-options";
const nested = path.join(root, "a", "b");
const file = path.join(nested, "note.txt");
const sideFile = path.join(root, "side.txt");
const sideDir = path.join(root, "side-dir");
const promiseSideFile = path.join(root, "promise-side.txt");
const promiseSideDir = path.join(root, "promise-side-dir");
const RECURSIVE_TRUE = true;
const FORCE_TRUE = true;
const RETRIES_ZERO = 0;
const RETRIES_ONE = 1;
const DELAY_ZERO = 0;
const DELAY_ONE = 1;
const CLEANUP_OPTIONS = { recursive: RECURSIVE_TRUE, force: FORCE_TRUE, maxRetries: RETRIES_ZERO, retryDelay: DELAY_ZERO };
const REMOVE_OPTIONS = { recursive: RECURSIVE_TRUE, maxRetries: RETRIES_ONE, retryDelay: DELAY_ONE };
const FORCE_MISSING_OPTIONS = { force: FORCE_TRUE, maxRetries: RETRIES_ZERO, retryDelay: DELAY_ZERO };
const events: string[] = [];

function note(label: string): void {
    events.push(label);
}

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

fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(sideFile, "side");
fs.mkdirSync(sideDir);
fs.rmSync(sideFile, void note("rm-options"));
fs.rmdirSync(sideDir, void note("rmdir-options"));
console.log("default removed:", fs.existsSync(sideFile), fs.existsSync(sideDir));

nodefs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(file, "rmdir sync");
fs.rmdirSync(root, REMOVE_OPTIONS);
console.log("rmdir sync removed:", fs.existsSync(root));

fs.promises.mkdir(nested, { recursive: true });
fs.promises.writeFile(file, "rmdir promise");
fs.promises.rmdir(root, REMOVE_OPTIONS);
console.log("rmdir promise removed:", fs.existsSync(root));

fs.promises.mkdir(root, { recursive: true });
let promiseDefaultCleanup: Promise<any> = fs.promises.writeFile(promiseSideFile, "promise-side");
promiseDefaultCleanup = promiseDefaultCleanup.then((_value: any) => fs.promises.mkdir(promiseSideDir));
promiseDefaultCleanup = promiseDefaultCleanup.then((_value: any) => fs.promises.rm(promiseSideFile, void note("prm-options")));
promiseDefaultCleanup = promiseDefaultCleanup.then((_value: any) => fs.promises.rmdir(promiseSideDir, void note("prmdir-options")));
promiseDefaultCleanup.then((_value: any): void => {
    console.log("promise default removed:", fs.existsSync(promiseSideFile), fs.existsSync(promiseSideDir));
    console.log("events:", events.join("|"));
    fs.rmSync(root, CLEANUP_OPTIONS);
});
