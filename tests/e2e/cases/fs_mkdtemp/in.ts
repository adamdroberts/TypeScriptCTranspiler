import * as nodefs from "node:fs";

const syncPrefix = "/tmp/tsc2c-mkdtemp-sync-";
const promisePrefix = "/tmp/tsc2c-mkdtemp-promise-";
const syncDir = fs.mkdtempSync(syncPrefix);
let promiseDir = "";

nodefs.promises.mkdtemp(promisePrefix).then((dir: string): string => {
    promiseDir = dir;
    return dir;
});

console.log("sync:", syncDir.startsWith(syncPrefix), fs.statSync(syncDir).isDirectory());
console.log("promise:", promiseDir.startsWith(promisePrefix), nodefs.statSync(promiseDir).isDirectory());

fs.rmSync(syncDir, { recursive: true, force: true });
fs.rmSync(promiseDir, { recursive: true, force: true });
