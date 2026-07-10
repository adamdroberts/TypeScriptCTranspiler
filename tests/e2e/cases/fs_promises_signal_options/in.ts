import { appendFile, lstat, mkdir, mkdtemp, readFile, readlink, readdir, realpath, rm, rmdir, stat, writeFile } from "node:fs/promises";

declare const AbortController: { new(): any };

const tmpPath = "/tmp/tsc2c-fs-promises-signal-options.txt";
const dirPrefix = "/tmp/tsc2c-fs-promises-signal-options-dir-";
const mkdirPath = "/tmp/tsc2c-fs-promises-signal-options-mkdir";
const rmdirPath = "/tmp/tsc2c-fs-promises-signal-options-rmdir";
const rmPath = "/tmp/tsc2c-fs-promises-signal-options-rm";
let seen = "";
let readBack = "";

function mark(label: string): any {
    seen += label + ";";
    return { aborted: false };
}

writeFile(tmpPath, "signal ok\n", { encoding: "utf8", signal: mark("write") });
appendFile(tmpPath, "append ok\n", { encoding: "utf8", signal: mark("append") });

readFile(tmpPath, { encoding: "utf8", signal: mark("read") }).then((text: string): string => {
    readBack = text;
    return text;
});

writeFile(tmpPath, "signal ok\n", { signal: void 0 });
stat(tmpPath, { signal: mark("stat") });
lstat(tmpPath, { signal: mark("lstat") });
stat(tmpPath, { signal: void 0 });
realpath(tmpPath, { encoding: "utf8", signal: mark("realpath") });
readlink("/proc/self/exe", { encoding: "utf8", signal: mark("readlink") });
mkdtemp(dirPrefix, { encoding: "utf8", signal: mark("mkdtemp") });
mkdir(mkdirPath, { recursive: true, mode: 0o700, signal: mark("mkdir") });
mkdir(rmdirPath, { signal: void 0 });
rmdir(rmdirPath, { signal: mark("rmdir") });
mkdir(rmPath, { recursive: true });
writeFile(rmPath + "/file.txt", "remove me");
rm(rmPath, { recursive: true, force: true, signal: mark("rm") });

const abortedController: any = new AbortController();
abortedController.abort("fs cancelled");
readFile(tmpPath, { encoding: "utf8", signal: abortedController.signal }).catch((reason: any) => {
    console.log("aborted:", reason);
});
writeFile(tmpPath, "should not write\n", { signal: abortedController.signal }).catch((reason: any) => {
    console.log("aborted write:", reason);
});
appendFile(tmpPath, "should not append\n", { signal: abortedController.signal }).catch((reason: any) => {
    console.log("aborted append:", reason);
});
readdir("/tmp", { signal: abortedController.signal }).catch((reason: any) => {
    console.log("aborted readdir:", reason);
});
realpath(tmpPath, { encoding: "utf8", signal: abortedController.signal }).catch((reason: any) => {
    console.log("aborted realpath:", reason);
});
readlink("/proc/self/exe", { encoding: "utf8", signal: abortedController.signal }).catch((reason: any) => {
    console.log("aborted readlink:", reason);
});

setImmediate((): void => {
    console.log("seen:", seen);
    console.log("read:", readBack.trim().replace(/\n/g, "|"));
});
