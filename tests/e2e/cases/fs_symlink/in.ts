import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-symlink-root";
const target = root + "/target.txt";
const syncLink = root + "/sync-link";
const promiseLink = root + "/promise-link";
const missingLink = root + "/missing-parent/promise-link";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(target, "linked");

fs.symlinkSync(target, syncLink);

console.log("sync:", fs.lstatSync(syncLink).isSymbolicLink(), fs.readlinkSync(syncLink) === target);
nodefs.promises.symlink(target, promiseLink).then((_value: any): Promise<string> => {
    console.log("promise:", fs.lstatSync(promiseLink).isSymbolicLink(), nodefs.readlinkSync(promiseLink) === target);
    return nodefs.promises.symlink(target, missingLink).then(
        (_unexpected: any): string => "unexpected success",
        (reason: string): string => reason,
    );
}).then((reason: string): void => {
    console.log("missing:", reason);
    fs.rmSync(root, { recursive: true, force: true });
});
