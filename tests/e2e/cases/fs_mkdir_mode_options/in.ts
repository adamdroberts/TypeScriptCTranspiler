import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-mkdir-mode";
const syncDir = path.join(root, "sync");
const promiseDir = path.join(root, "promise", "nested");
const sideSyncDir = path.join(root, "sync-side");
const sidePromiseDir = path.join(root, "promise-side");
const RECURSIVE_TRUE = true;
const MODE_700 = 0o700;
const MODE_750 = 0o750;
const SYNC_OPTIONS = { mode: MODE_700 };
const PROMISE_OPTIONS = { recursive: RECURSIVE_TRUE, mode: MODE_750 };
const PROMISE_SIMPLE_OPTIONS = { mode: MODE_700 };
const events: string[] = [];

function note(label: string): void {
    events.push(label);
}

fs.rmSync(root, { recursive: true, force: true });
const oldUmask = process.umask(0);

fs.mkdirSync(root, 0o755);
nodefs.mkdirSync(syncDir, SYNC_OPTIONS);
nodefs.mkdirSync(sideSyncDir, void note("sync-options"));
console.log("sync:", fs.statSync(syncDir).mode % 512);

fs.promises.mkdir(promiseDir, PROMISE_OPTIONS).then((value: any): string => {
    console.log(
        "promise: " +
            (fs.statSync(path.join(root, "promise")).mode % 512).toString() +
            "/" +
            (fs.statSync(promiseDir).mode % 512).toString(),
    );
    return "done";
});

fs.promises.mkdir(sidePromiseDir, PROMISE_SIMPLE_OPTIONS, void note("promise-options")).then((_value: any): Promise<string> => {
    console.log("side:", fs.statSync(sideSyncDir).isDirectory(), fs.statSync(sidePromiseDir).mode % 512);
    return fs.promises.mkdir(path.join(root, "missing", "leaf"), 0o755).then(
        (_unexpected: any): string => "unexpected success",
        (reason: string): string => reason,
    );
}).then((reason: string): void => {
    console.log("missing:", reason);
    process.umask(oldUmask);
    fs.rmSync(root, { recursive: true, force: true });
});

console.log("events:", events.join("|"));
