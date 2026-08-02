import { mkdtempSync, readlinkSync } from "node:fs";

const events: string[] = [];
const root = "/tmp/tsc2c-fs-link-mkdtemp-ignored";
const nested = path.join(root, "nested");
const target = path.join(root, "target.txt");
const link = path.join(root, "target-link");
const syncPrefix = "/tmp/tsc2c-mkdtemp-ignored-sync-";
const promisePrefix = "/tmp/tsc2c-mkdtemp-ignored-promise-";

function mark(label: string): string {
    events.push(label);
    return label;
}

function note(label: string): void {
    events.push(label);
}

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(target, "target");
fs.symlinkSync(target, link);

const real = fs.realpathSync(path.join(nested, ".."), void note("real-options"), mark("real"));
const read = readlinkSync(link, void note("read-options"), mark("read"));
const made = mkdtempSync(syncPrefix, void note("mkd-options"), mark("mkd"));

let promiseReal = false;
let promiseRead = false;
let promiseMkd = false;
let promiseMkdDirectory = false;
let promiseMkdPath = "";
const promiseRealResult = fs.promises.realpath(path.join(nested, ".."), void note("preal-options"), mark("preal"));
const promiseReadResult = fs.promises.readlink(link, void note("pread-options"), mark("pread"));
const promiseMkdResult = fs.promises.mkdtemp(promisePrefix, void note("pmkd-options"), mark("pmkd"));

promiseRealResult.then((value: string): Promise<string> => {
    promiseReal = value === root;
    return promiseReadResult;
}).then((value: string): Promise<string> => {
    promiseRead = value === target;
    return promiseMkdResult;
}).then((value: string): void => {
    promiseMkd = value.indexOf(promisePrefix) === 0;
    promiseMkdDirectory = fs.statSync(value).isDirectory();
    promiseMkdPath = value;
    console.log("promise real:", promiseReal);
    console.log("promise read:", promiseRead);
    console.log("promise mkd:", promiseMkd, promiseMkdDirectory);
    console.log("sync:", real === root, read === target, made.indexOf(syncPrefix) === 0, fs.statSync(made).isDirectory());
    console.log("events:", events.join("|"));
    if (promiseMkdPath) fs.rmSync(promiseMkdPath, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(made, { recursive: true, force: true });
});
