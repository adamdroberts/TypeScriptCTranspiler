import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-mkdir-mode";
const syncDir = path.join(root, "sync");
const promiseDir = path.join(root, "promise", "nested");
const RECURSIVE_TRUE = true;
const MODE_700 = 0o700;
const MODE_750 = 0o750;
const SYNC_OPTIONS = { mode: MODE_700 };
const PROMISE_OPTIONS = { recursive: RECURSIVE_TRUE, mode: MODE_750 };

fs.rmSync(root, { recursive: true, force: true });
const oldUmask = process.umask(0);

fs.mkdirSync(root, 0o755);
nodefs.mkdirSync(syncDir, SYNC_OPTIONS);
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

process.umask(oldUmask);
fs.rmSync(root, { recursive: true, force: true });
