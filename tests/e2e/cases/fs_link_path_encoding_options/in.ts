import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-link-path-encoding";
const nested = path.join(root, "nested");
const target = path.join(root, "target.txt");
const link = path.join(root, "target-link");
const UTF8 = "utf8";
const UTF8_DASH = "utf-8";
const BUFFER_ENCODING = "buffer";
const UTF8_OPTIONS = { encoding: UTF8_DASH } as const;
const BUFFER_OPTIONS = { encoding: BUFFER_ENCODING } as const;
const NULL_ENCODING = null;
const NULL_OPTIONS = { encoding: NULL_ENCODING } as const;

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(target, "link target", UTF8);
fs.symlinkSync(target, link);

const syncRealpath = fs.realpathSync(path.join(nested, ".."), UTF8);
const syncReadlink = nodefs.readlinkSync(link, UTF8_OPTIONS);
console.log("sync:", syncRealpath === root, syncReadlink === target);

const syncRealpathBuffer = fs.realpathSync(path.join(nested, ".."), BUFFER_ENCODING);
const syncReadlinkBuffer = nodefs.readlinkSync(link, BUFFER_OPTIONS);
console.log("sync buffer:", Buffer.isBuffer(syncRealpathBuffer), syncRealpathBuffer.toString() === root, syncReadlinkBuffer.toString() === target);

const syncRealpathNull = fs.realpathSync(path.join(nested, ".."), NULL_ENCODING);
const syncReadlinkNull = nodefs.readlinkSync(link, NULL_OPTIONS);
console.log("sync null:", Buffer.isBuffer(syncRealpathNull as any), syncRealpathNull === root, syncReadlinkNull === target);

const syncRealpathNullObject = fs.realpathSync(path.join(nested, ".."), { encoding: null });
const syncReadlinkNullObject = nodefs.readlinkSync(link, { encoding: null });
console.log("sync null object:", Buffer.isBuffer(syncRealpathNullObject as any), syncRealpathNullObject === root, syncReadlinkNullObject === target);

const syncRealpathUndefinedObject = fs.realpathSync(path.join(nested, ".."), { encoding: undefined });
const syncReadlinkUndefinedObject = nodefs.readlinkSync(link, { encoding: undefined });
console.log("sync undefined object:", syncRealpathUndefinedObject === root, syncReadlinkUndefinedObject === target);

const syncRealpathDefaultObject = fs.realpathSync(path.join(nested, ".."), {});
const syncReadlinkDefaultObject = nodefs.readlinkSync(link, {});
console.log("sync default object:", syncRealpathDefaultObject === root, syncReadlinkDefaultObject === target);

let promiseRealpath = false;
let promiseReadlink = false;
let promiseRealpathBuffer = false;
let promiseReadlinkBuffer = false;
let promiseRealpathNull = false;
let promiseReadlinkNull = false;
let promiseRealpathNullObject = false;
let promiseReadlinkNullObject = false;
let promiseRealpathUndefinedObject = false;
let promiseReadlinkUndefinedObject = false;
let promiseRealpathDefaultObject = false;
let promiseReadlinkDefaultObject = false;

fs.promises.realpath(path.join(nested, ".."), UTF8_OPTIONS).then((value: string): void => {
    promiseRealpath = value === root;
});
nodefs.promises.readlink(link, UTF8_DASH).then((value: string): void => {
    promiseReadlink = value === target;
});
fs.promises.realpath(path.join(nested, ".."), BUFFER_OPTIONS).then((value: Buffer): void => {
    promiseRealpathBuffer = Buffer.isBuffer(value) && value.toString() === root;
});
nodefs.promises.readlink(link, BUFFER_ENCODING).then((value: Buffer): void => {
    promiseReadlinkBuffer = Buffer.isBuffer(value) && value.toString() === target;
});
fs.promises.realpath(path.join(nested, ".."), NULL_ENCODING).then((value: string): void => {
    promiseRealpathNull = !Buffer.isBuffer(value as any) && value === root;
});
nodefs.promises.readlink(link, NULL_OPTIONS).then((value: string): void => {
    promiseReadlinkNull = !Buffer.isBuffer(value as any) && value === target;
});
fs.promises.realpath(path.join(nested, ".."), { encoding: null }).then((value: string): void => {
    promiseRealpathNullObject = !Buffer.isBuffer(value as any) && value === root;
});
nodefs.promises.readlink(link, { encoding: null }).then((value: string): void => {
    promiseReadlinkNullObject = !Buffer.isBuffer(value as any) && value === target;
});
fs.promises.realpath(path.join(nested, ".."), { encoding: undefined }).then((value: string): void => {
    promiseRealpathUndefinedObject = value === root;
});
nodefs.promises.readlink(link, { encoding: undefined }).then((value: string): void => {
    promiseReadlinkUndefinedObject = value === target;
});
fs.promises.realpath(path.join(nested, ".."), {}).then((value: string): void => {
    promiseRealpathDefaultObject = value === root;
});
nodefs.promises.readlink(link, {}).then((value: string): void => {
    promiseReadlinkDefaultObject = value === target;
});

setImmediate((): void => {
    console.log("promise realpath:", promiseRealpath);
    console.log("promise readlink:", promiseReadlink);
    console.log("promise realpath buffer:", promiseRealpathBuffer, promiseRealpathBuffer);
    console.log("promise readlink buffer:", promiseReadlinkBuffer, promiseReadlinkBuffer);
    console.log("promise realpath null:", false, promiseRealpathNull);
    console.log("promise readlink null:", false, promiseReadlinkNull);
    console.log("promise realpath null object:", false, promiseRealpathNullObject);
    console.log("promise readlink null object:", false, promiseReadlinkNullObject);
    console.log("promise realpath undefined object:", promiseRealpathUndefinedObject);
    console.log("promise readlink undefined object:", promiseReadlinkUndefinedObject);
    console.log("promise realpath default object:", promiseRealpathDefaultObject);
    console.log("promise readlink default object:", promiseReadlinkDefaultObject);
    fs.rmSync(root, { recursive: true, force: true });
});
