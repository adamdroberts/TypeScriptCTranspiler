import * as nodefs from "node:fs";
import { chownSync, lchownSync } from "node:fs";

const root = "/tmp/tsc2c-fs-lchown";
const syncTarget = root + "/sync-target.txt";
const syncLink = root + "/sync-link.txt";
const promiseTarget = root + "/promise-target.txt";
const promiseLink = root + "/promise-link.txt";
const missingLink = root + "/missing-link.txt";
const uid = process.getuid();
const gid = process.getgid();

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(syncTarget, "sync");
fs.writeFileSync(promiseTarget, "promise");
fs.symlinkSync(syncTarget, syncLink, "file");
fs.symlinkSync(promiseTarget, promiseLink, "file");

chownSync(syncTarget, uid, gid);
lchownSync(syncLink, uid, gid);
console.log("sync:", fs.lstatSync(syncLink).isSymbolicLink(), nodefs.readlinkSync(syncLink) === syncTarget);

nodefs.promises.lchown(promiseLink, uid, gid).then((_value: any): Promise<string> => {
    console.log("promise:", fs.lstatSync(promiseLink).isSymbolicLink(), fs.readlinkSync(promiseLink) === promiseTarget);
    return nodefs.promises.lchown(missingLink, uid, gid).then(
        (_unexpected: any): string => "unexpected success",
        (reason: string): string => reason,
    );
}).then((reason: string): void => {
    console.log("missing:", reason);
    fs.rmSync(root, { recursive: true, force: true });
});
