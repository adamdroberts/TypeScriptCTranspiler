import { chownSync, lchownSync } from "node:fs";

const events: string[] = [];
const root = "/tmp/tsc2c-fs-chown-ignored";
const syncTarget = path.join(root, "sync-target.txt");
const syncLink = path.join(root, "sync-link.txt");
const promiseTarget = path.join(root, "promise-target.txt");
const promiseLink = path.join(root, "promise-link.txt");
const uid = process.getuid();
const gid = process.getgid();

function mark(label: string): string {
    events.push(label);
    return label;
}

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(syncTarget, "sync");
fs.writeFileSync(promiseTarget, "promise");
fs.symlinkSync(syncTarget, syncLink, "file");
fs.symlinkSync(promiseTarget, promiseLink, "file");

fs.chownSync(syncTarget, uid, gid, mark("chown"));
lchownSync(syncLink, uid, gid, mark("lchown"));

fs.promises.chown(promiseTarget, uid, gid, mark("pchown")).then((_value: any): Promise<void> => {
    return fs.promises.lchown(promiseLink, uid, gid, mark("plchown"));
}).then((_value: any): void => {
    console.log("sync:", fs.statSync(syncTarget).uid === uid, fs.lstatSync(syncLink).isSymbolicLink());
    console.log("promise:", fs.statSync(promiseTarget).uid === uid, fs.lstatSync(promiseLink).isSymbolicLink());
    console.log("events:", events.join("|"));

    fs.rmSync(root, { recursive: true, force: true });
});
