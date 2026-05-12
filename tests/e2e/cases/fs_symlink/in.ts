import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-symlink-root";
const target = root + "/target.txt";
const syncLink = root + "/sync-link";
const promiseLink = root + "/promise-link";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(target, "linked");

fs.symlinkSync(target, syncLink);
nodefs.promises.symlink(target, promiseLink);

console.log("sync:", fs.lstatSync(syncLink).isSymbolicLink(), fs.readlinkSync(syncLink) === target);
console.log("promise:", fs.lstatSync(promiseLink).isSymbolicLink(), nodefs.readlinkSync(promiseLink) === target);

fs.rmSync(root, { recursive: true, force: true });
