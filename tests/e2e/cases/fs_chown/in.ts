import * as nodefs from "node:fs";

const syncPath = "/tmp/tsc2c-fs-chown-sync.txt";
const promisePath = "/tmp/tsc2c-fs-chown-promise.txt";
const missingPath = "/tmp/tsc2c-fs-chown-missing/file.txt";
const uid = process.getuid();
const gid = process.getgid();

fs.rmSync(syncPath, { force: true });
fs.rmSync(promisePath, { force: true });
fs.writeFileSync(syncPath, "sync");
fs.writeFileSync(promisePath, "promise");

fs.chownSync(syncPath, uid, gid);
console.log("sync:", nodefs.statSync(syncPath).isFile(), fs.readFileSync(syncPath));

nodefs.promises.chown(promisePath, uid, gid).then((_value: any): Promise<string> => {
    console.log("promise:", fs.statSync(promisePath).isFile(), fs.readFileSync(promisePath));
    return nodefs.promises.chown(missingPath, uid, gid).then(
        (_unexpected: any): string => "unexpected success",
        (reason: string): string => reason,
    );
}).then((reason: string): void => {
    console.log("missing:", reason);
    fs.rmSync(syncPath, { force: true });
    fs.rmSync(promisePath, { force: true });
});
