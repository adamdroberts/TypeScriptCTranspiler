import { promises as fsp, closeSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { fdatasync as namedFdatasync, fchmod as namedFchmod, fsync as namedFsync, futimes as namedFutimes } from "node:fs/promises";

const path = "/tmp/tsc2c-fs-promises-descriptor-operations.txt";
const uid = process.getuid();
const gid = process.getgid();
writeFileSync(path, "descriptor");

const fd = openSync(path, "r+");
let result = "pending";
let error = "pending";
let closed = false;

fsp.ftruncate(fd, 4)
    .then((_value: any): Promise<void> => namedFsync(fd))
    .then((_value: any): Promise<void> => namedFdatasync(fd))
    .then((_value: any): Promise<void> => namedFchmod(fd, 0o600))
    .then((_value: any): Promise<void> => fsp.fchown(fd, uid, gid))
    .then((_value: any): Promise<void> => namedFutimes(fd, 11, new Date(12000)))
    .then((_value: any): Promise<string> => {
        const stats = statSync(path);
        const content = readFileSync(path, "utf8");
        result = `${content}:${stats.mode % 512}:${Math.round(stats.atimeMs)}:${Math.round(stats.mtimeMs)}`;
        closeSync(fd);
        closed = true;
        return fsp.fsync(fd)
            .then((_again: any): string => "unexpected fulfillment")
            .catch((reason: string): string => reason);
    })
    .then((reason: string): void => {
        error = reason.indexOf("fsync") >= 0 ? "true" : reason;
    })
    .catch((reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        if (!closed) closeSync(fd);
        console.log("result:", result);
        console.log("error:", error);
        rmSync(path, { force: true });
    });
