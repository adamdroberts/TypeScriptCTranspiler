import * as nodefs from "node:fs";

const syncPrefix = "/tmp/tsc2c-mkdtemp-sync-";
const promisePrefix = "/tmp/tsc2c-mkdtemp-promise-";

const syncDir = fs.mkdtempSync(syncPrefix, "utf8");
console.log("sync:", syncDir.indexOf(syncPrefix) === 0, fs.statSync(syncDir).isDirectory());

const syncBufferDir = fs.mkdtempSync(syncPrefix, { encoding: "buffer" });
const syncBufferPath = syncBufferDir.toString();
console.log("sync buffer:", Buffer.isBuffer(syncBufferDir), syncBufferPath.indexOf(syncPrefix) === 0, fs.statSync(syncBufferPath).isDirectory());

const syncNullDir = fs.mkdtempSync(syncPrefix, { encoding: null });
const syncNullPath = syncNullDir.toString();
console.log("sync null:", Buffer.isBuffer(syncNullDir), syncNullPath.indexOf(syncPrefix) === 0, fs.statSync(syncNullPath).isDirectory());

nodefs.promises.mkdtemp(promisePrefix, { encoding: "utf-8" }).then((promiseDir: string): string => {
    console.log("promise:", promiseDir.indexOf(promisePrefix) === 0, fs.statSync(promiseDir).isDirectory());
    fs.rmSync(promiseDir, { recursive: true, force: true });
    return promiseDir;
});

nodefs.promises.mkdtemp(promisePrefix, "buffer").then((promiseDir: Buffer): void => {
    const promisePath = promiseDir.toString();
    console.log("promise buffer:", Buffer.isBuffer(promiseDir), promisePath.indexOf(promisePrefix) === 0, fs.statSync(promisePath).isDirectory());
    fs.rmSync(promisePath, { recursive: true, force: true });
});

nodefs.promises.mkdtemp(promisePrefix, { encoding: null }).then((promiseDir: Buffer): void => {
    const promisePath = promiseDir.toString();
    console.log("promise null:", Buffer.isBuffer(promiseDir), promisePath.indexOf(promisePrefix) === 0, fs.statSync(promisePath).isDirectory());
    fs.rmSync(promisePath, { recursive: true, force: true });
});

fs.rmSync(syncDir, { recursive: true, force: true });
fs.rmSync(syncBufferPath, { recursive: true, force: true });
fs.rmSync(syncNullPath, { recursive: true, force: true });
