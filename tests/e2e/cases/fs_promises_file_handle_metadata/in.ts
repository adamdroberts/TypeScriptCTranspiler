import { promises as fsp, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";

const path = "/tmp/tsc2c-fs-promises-file-handle-metadata.txt";
writeFileSync(path, "metadata");

const uid = process.getuid();
const gid = process.getgid();
let chmodDone = false;
let chownDone = false;
let utimesDone = false;
let mode = -1;
let owner = false;
let times = "pending";
let content = "pending";
let closedError = "pending";
let error = "pending";

fsp.open(path, "r+")
    .then((handle: FSFileHandle): Promise<string> => {
        return handle.chmod(0o600)
            .then((_value: any): Promise<void> => {
                chmodDone = true;
                return handle.chown(uid, gid);
            })
            .then((_value: any): Promise<void> => {
                chownDone = true;
                return handle.utimes(new Date(13000), 22);
            })
            .then((_value: any): Promise<FSStats> => {
                utimesDone = true;
                return handle.stat();
            })
            .then((_stats: any): Promise<string> => {
                const stats = statSync(path);
                mode = stats.mode % 512;
                owner = stats.uid === uid && stats.gid === gid;
                times = `${Math.round(stats.atimeMs)}/${Math.round(stats.mtimeMs)}`;
                return handle.close().then((_closed: any): Promise<string> => {
                    content = readFileSync(path);
                    return handle.utimes(1, 2)
                        .then((_result: any): string => "unexpected fulfillment")
                        .catch((reason: string): string => reason);
                });
            });
    })
    .then((reason: string): void => {
        closedError = reason.indexOf("FileHandle is closed") >= 0 ? "true" : reason;
    })
    .catch((reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        console.log("chmod:", chmodDone);
        console.log("chown:", chownDone);
        console.log("utimes:", utimesDone);
        console.log("mode:", mode);
        console.log("owner:", owner);
        console.log("times:", times);
        console.log("content:", content);
        console.log("closedError:", closedError);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
