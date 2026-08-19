import { promises as fsp, closeSync, openSync, rmSync, writeFileSync } from "node:fs";
import { fstat as namedFstat } from "node:fs/promises";

const path = "/tmp/tsc2c-fs-promises-fstat.txt";
writeFileSync(path, "fstat data\n");

const fd = openSync(path, "r");
let namespaceResult = "pending";
let namedResult = "pending";
let error = "pending";

fsp.fstat(fd)
    .then((stats: FSStats): Promise<FSStats> => {
        namespaceResult = `${stats.isFile()}:${stats.size > 0}`;
        return namedFstat(fd);
    })
    .then((stats: FSStats): Promise<FSStats> => {
        namedResult = `${stats.isFile()}:${stats.size}`;
        closeSync(fd);
        return fsp.fstat(fd, { bigint: false });
    })
    .then((_value: FSStats): void => {
        error = "unexpected";
    }, (reason: string): void => {
        error = reason;
    })
    .then((_value: any): void => {
        console.log("namespace:", namespaceResult);
        console.log("named:", namedResult);
        console.log("error:", error.indexOf("fstat") >= 0);
        rmSync(path, { force: true });
    });
