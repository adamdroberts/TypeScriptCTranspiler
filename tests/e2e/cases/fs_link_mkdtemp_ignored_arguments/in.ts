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

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(target, "target");
fs.symlinkSync(target, link);

const real = fs.realpathSync(path.join(nested, ".."), void 0, mark("real"));
const read = readlinkSync(link, void 0, mark("read"));
const made = mkdtempSync(syncPrefix, void 0, mark("mkd"));

fs.promises.realpath(path.join(nested, ".."), void 0, mark("preal")).then((value: string): void => {
    console.log("promise real:", value === root);
});

fs.promises.readlink(link, void 0, mark("pread")).then((value: string): void => {
    console.log("promise read:", value === target);
});

fs.promises.mkdtemp(promisePrefix, void 0, mark("pmkd")).then((value: string): void => {
    console.log("promise mkd:", value.indexOf(promisePrefix) === 0, fs.statSync(value).isDirectory());
    fs.rmSync(value, { recursive: true, force: true });
});

console.log("sync:", real === root, read === target, made.indexOf(syncPrefix) === 0, fs.statSync(made).isDirectory());
console.log("events:", events.join("|"));

fs.rmSync(root, { recursive: true, force: true });
fs.rmSync(made, { recursive: true, force: true });
