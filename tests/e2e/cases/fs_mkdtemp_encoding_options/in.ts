import * as nodefs from "node:fs";

const syncPrefix = "/tmp/tsc2c-mkdtemp-sync-";
const promisePrefix = "/tmp/tsc2c-mkdtemp-promise-";
const UTF8 = "utf8";
const UTF8_DASH = "utf-8";
const BUFFER_ENCODING = "buffer";

const syncDir = fs.mkdtempSync(syncPrefix, UTF8);
console.log("sync:", syncDir.indexOf(syncPrefix) === 0, fs.statSync(syncDir).isDirectory());

const syncBufferDir = fs.mkdtempSync(syncPrefix, { encoding: BUFFER_ENCODING });
const syncBufferPath = syncBufferDir.toString();
console.log("sync buffer:", Buffer.isBuffer(syncBufferDir), syncBufferPath.indexOf(syncPrefix) === 0, fs.statSync(syncBufferPath).isDirectory());

const syncNullDir = fs.mkdtempSync(syncPrefix, null);
console.log("sync null:", Buffer.isBuffer(syncNullDir as any), syncNullDir.indexOf(syncPrefix) === 0, fs.statSync(syncNullDir).isDirectory());

nodefs.promises.mkdtemp(promisePrefix, { encoding: UTF8_DASH }).then((promiseDir: string): string => {
    console.log("promise:", promiseDir.indexOf(promisePrefix) === 0, fs.statSync(promiseDir).isDirectory());
    fs.rmSync(promiseDir, { recursive: true, force: true });
    return promiseDir;
});

nodefs.promises.mkdtemp(promisePrefix, BUFFER_ENCODING).then((promiseDir: Buffer): void => {
    const promisePath = promiseDir.toString();
    console.log("promise buffer:", Buffer.isBuffer(promiseDir), promisePath.indexOf(promisePrefix) === 0, fs.statSync(promisePath).isDirectory());
    fs.rmSync(promisePath, { recursive: true, force: true });
});

nodefs.promises.mkdtemp(promisePrefix, { encoding: null }).then((promiseDir: string): void => {
    console.log("promise null:", Buffer.isBuffer(promiseDir as any), promiseDir.indexOf(promisePrefix) === 0, fs.statSync(promiseDir).isDirectory());
    fs.rmSync(promiseDir, { recursive: true, force: true });
});

fs.rmSync(syncDir, { recursive: true, force: true });
fs.rmSync(syncBufferPath, { recursive: true, force: true });
fs.rmSync(syncNullDir, { recursive: true, force: true });
