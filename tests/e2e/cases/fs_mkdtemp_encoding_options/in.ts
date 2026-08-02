import * as nodefs from "node:fs";

const syncPrefix = "/tmp/tsc2c-mkdtemp-sync-";
const promisePrefix = "/tmp/tsc2c-mkdtemp-promise-";
const UTF8 = "utf8";
const UTF8_DASH = "utf-8";
const BUFFER_ENCODING = "buffer";
const UTF8_DASH_OPTIONS = { encoding: UTF8_DASH } as const;
const BUFFER_OPTIONS = { encoding: BUFFER_ENCODING } as const;
const NULL_ENCODING = null;
const NULL_OPTIONS = { encoding: NULL_ENCODING } as const;

const syncDir = fs.mkdtempSync(syncPrefix, UTF8);
console.log("sync:", syncDir.indexOf(syncPrefix) === 0, fs.statSync(syncDir).isDirectory());

const syncBufferDir = fs.mkdtempSync(syncPrefix, BUFFER_OPTIONS);
const syncBufferPath = syncBufferDir.toString();
console.log("sync buffer:", Buffer.isBuffer(syncBufferDir), syncBufferPath.indexOf(syncPrefix) === 0, fs.statSync(syncBufferPath).isDirectory());

const syncNullDir = fs.mkdtempSync(syncPrefix, NULL_ENCODING);
console.log("sync null:", Buffer.isBuffer(syncNullDir as any), syncNullDir.indexOf(syncPrefix) === 0, fs.statSync(syncNullDir).isDirectory());

const syncNullObjectDir = fs.mkdtempSync(syncPrefix, { encoding: null });
console.log("sync null object:", Buffer.isBuffer(syncNullObjectDir as any), syncNullObjectDir.indexOf(syncPrefix) === 0, fs.statSync(syncNullObjectDir).isDirectory());

const syncUndefinedObjectDir = fs.mkdtempSync(syncPrefix, { encoding: undefined });
console.log("sync undefined object:", syncUndefinedObjectDir.indexOf(syncPrefix) === 0, fs.statSync(syncUndefinedObjectDir).isDirectory());

const syncDefaultObjectDir = fs.mkdtempSync(syncPrefix, {});
console.log("sync default object:", syncDefaultObjectDir.indexOf(syncPrefix) === 0, fs.statSync(syncDefaultObjectDir).isDirectory());

let promiseDir = "";
let promiseBufferDir = "";
let promiseNullDir = "";
let promiseNullObjectDir = "";
let promiseUndefinedObjectDir = "";
let promiseDefaultObjectDir = "";
nodefs.promises.mkdtemp(promisePrefix, UTF8_DASH_OPTIONS)
    .then((value: string): any => {
        promiseDir = value;
        return nodefs.promises.mkdtemp(promisePrefix, NULL_OPTIONS);
    })
    .then((value: string): any => {
        promiseNullDir = value;
        return nodefs.promises.mkdtemp(promisePrefix, { encoding: null });
    })
    .then((value: string): any => {
        promiseNullObjectDir = value;
        return nodefs.promises.mkdtemp(promisePrefix, { encoding: undefined });
    })
    .then((value: string): any => {
        promiseUndefinedObjectDir = value;
        return nodefs.promises.mkdtemp(promisePrefix, {});
    })
    .then((value: string): void => {
        promiseDefaultObjectDir = value;
        nodefs.promises.mkdtemp(promisePrefix, BUFFER_ENCODING).then((bufferValue: Buffer): void => {
            promiseBufferDir = bufferValue.toString();
    console.log("promise:", promiseDir.indexOf(promisePrefix) === 0, fs.statSync(promiseDir).isDirectory());
    console.log("promise buffer:", true, promiseBufferDir.indexOf(promisePrefix) === 0, fs.statSync(promiseBufferDir).isDirectory());
    console.log("promise null:", false, promiseNullDir.indexOf(promisePrefix) === 0, fs.statSync(promiseNullDir).isDirectory());
    console.log("promise null object:", false, promiseNullObjectDir.indexOf(promisePrefix) === 0, fs.statSync(promiseNullObjectDir).isDirectory());
    console.log("promise undefined object:", promiseUndefinedObjectDir.indexOf(promisePrefix) === 0, fs.statSync(promiseUndefinedObjectDir).isDirectory());
    console.log("promise default object:", promiseDefaultObjectDir.indexOf(promisePrefix) === 0, fs.statSync(promiseDefaultObjectDir).isDirectory());
    for (const dir of [syncDir, syncBufferPath, syncNullDir, syncNullObjectDir, syncUndefinedObjectDir, syncDefaultObjectDir, promiseDir, promiseBufferDir, promiseNullDir, promiseNullObjectDir, promiseUndefinedObjectDir, promiseDefaultObjectDir]) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
        });
    });
