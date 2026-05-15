import * as nodefs from "node:fs";

const syncPath = "/tmp/tsc2c-fs-chown-sync.txt";
const promisePath = "/tmp/tsc2c-fs-chown-promise.txt";
const uid = process.getuid();
const gid = process.getgid();

fs.rmSync(syncPath, { force: true });
fs.rmSync(promisePath, { force: true });
fs.writeFileSync(syncPath, "sync");
fs.writeFileSync(promisePath, "promise");

fs.chownSync(syncPath, uid, gid);
console.log("sync:", nodefs.statSync(syncPath).isFile(), fs.readFileSync(syncPath));

nodefs.promises.chown(promisePath, uid, gid).then((value: any): string => {
    value;
    console.log("promise:", fs.statSync(promisePath).isFile(), fs.readFileSync(promisePath));
    return "done";
});

fs.rmSync(syncPath, { force: true });
fs.rmSync(promisePath, { force: true });
