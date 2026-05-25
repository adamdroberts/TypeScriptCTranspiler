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

fs.promises.realpath(path.join(nested, ".."), UTF8_OPTIONS).then((promiseRealpath) => {
    console.log("promise realpath:", promiseRealpath === root);
});

nodefs.promises.readlink(link, UTF8_DASH).then((promiseReadlink) => {
    console.log("promise readlink:", promiseReadlink === target);
});

fs.promises.realpath(path.join(nested, ".."), BUFFER_OPTIONS).then((promiseRealpath: Buffer): void => {
    console.log("promise realpath buffer:", Buffer.isBuffer(promiseRealpath), promiseRealpath.toString() === root);
});

nodefs.promises.readlink(link, BUFFER_ENCODING).then((promiseReadlink: Buffer): void => {
    console.log("promise readlink buffer:", Buffer.isBuffer(promiseReadlink), promiseReadlink.toString() === target);
});

fs.promises.realpath(path.join(nested, ".."), NULL_ENCODING).then((promiseRealpath: string): void => {
    console.log("promise realpath null:", Buffer.isBuffer(promiseRealpath as any), promiseRealpath === root);
});

nodefs.promises.readlink(link, NULL_OPTIONS).then((promiseReadlink: string): void => {
    console.log("promise readlink null:", Buffer.isBuffer(promiseReadlink as any), promiseReadlink === target);
});

fs.rmSync(root, { recursive: true, force: true });
