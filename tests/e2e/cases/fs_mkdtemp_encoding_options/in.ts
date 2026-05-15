import * as nodefs from "node:fs";

const syncPrefix = "/tmp/tsc2c-mkdtemp-sync-";
const promisePrefix = "/tmp/tsc2c-mkdtemp-promise-";

const syncDir = fs.mkdtempSync(syncPrefix, "utf8");
console.log("sync:", syncDir.indexOf(syncPrefix) === 0, fs.statSync(syncDir).isDirectory());

nodefs.promises.mkdtemp(promisePrefix, { encoding: "utf-8" }).then((promiseDir: string): string => {
    console.log("promise:", promiseDir.indexOf(promisePrefix) === 0, fs.statSync(promiseDir).isDirectory());
    fs.rmSync(promiseDir, { recursive: true, force: true });
    return promiseDir;
});

fs.rmSync(syncDir, { recursive: true, force: true });
