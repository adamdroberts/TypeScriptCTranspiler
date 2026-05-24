import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-link-path-encoding";
const nested = path.join(root, "nested");
const target = path.join(root, "target.txt");
const link = path.join(root, "target-link");
const UTF8 = "utf8";
const UTF8_DASH = "utf-8";
const BUFFER_ENCODING = "buffer";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(target, "link target", UTF8);
fs.symlinkSync(target, link);

const syncRealpath = fs.realpathSync(path.join(nested, ".."), UTF8);
const syncReadlink = nodefs.readlinkSync(link, { encoding: UTF8_DASH });
console.log("sync:", syncRealpath === root, syncReadlink === target);

const syncRealpathBuffer = fs.realpathSync(path.join(nested, ".."), BUFFER_ENCODING);
const syncReadlinkBuffer = nodefs.readlinkSync(link, { encoding: BUFFER_ENCODING });
console.log("sync buffer:", Buffer.isBuffer(syncRealpathBuffer), syncRealpathBuffer.toString() === root, syncReadlinkBuffer.toString() === target);

const syncRealpathNull = fs.realpathSync(path.join(nested, ".."), { encoding: null });
const syncReadlinkNull = nodefs.readlinkSync(link, { encoding: null });
console.log("sync null:", Buffer.isBuffer(syncRealpathNull), syncRealpathNull.toString() === root, syncReadlinkNull.toString() === target);

fs.promises.realpath(path.join(nested, ".."), { encoding: UTF8 }).then((promiseRealpath) => {
    console.log("promise realpath:", promiseRealpath === root);
});

nodefs.promises.readlink(link, UTF8_DASH).then((promiseReadlink) => {
    console.log("promise readlink:", promiseReadlink === target);
});

fs.promises.realpath(path.join(nested, ".."), { encoding: BUFFER_ENCODING }).then((promiseRealpath: Buffer): void => {
    console.log("promise realpath buffer:", Buffer.isBuffer(promiseRealpath), promiseRealpath.toString() === root);
});

nodefs.promises.readlink(link, BUFFER_ENCODING).then((promiseReadlink: Buffer): void => {
    console.log("promise readlink buffer:", Buffer.isBuffer(promiseReadlink), promiseReadlink.toString() === target);
});

fs.promises.realpath(path.join(nested, ".."), { encoding: null }).then((promiseRealpath: Buffer): void => {
    console.log("promise realpath null:", Buffer.isBuffer(promiseRealpath), promiseRealpath.toString() === root);
});

nodefs.promises.readlink(link, { encoding: null }).then((promiseReadlink: Buffer): void => {
    console.log("promise readlink null:", Buffer.isBuffer(promiseReadlink), promiseReadlink.toString() === target);
});

fs.rmSync(root, { recursive: true, force: true });
