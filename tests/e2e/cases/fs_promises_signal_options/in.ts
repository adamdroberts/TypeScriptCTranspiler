import { appendFile, lstat, mkdir, mkdtemp, readFile, readlink, realpath, rm, rmdir, stat, writeFile } from "node:fs/promises";

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
appendFile(tmpPath, "append ok\n", { encoding: "utf8", signal: mark("append") } as any);

readFile(tmpPath, { encoding: "utf8", signal: mark("read") }).then((text: string): string => {
    readBack = text;
    return text;
});

writeFile(tmpPath, "signal ok\n", { signal: void 0 });
stat(tmpPath, { signal: mark("stat") } as any);
lstat(tmpPath, { signal: mark("lstat") } as any);
stat(tmpPath, { signal: void 0 } as any);
realpath(tmpPath, { encoding: "utf8", signal: mark("realpath") } as any);
readlink("/proc/self/exe", { encoding: "utf8", signal: mark("readlink") } as any);
mkdtemp(dirPrefix, { encoding: "utf8", signal: mark("mkdtemp") } as any);
mkdir(mkdirPath, { recursive: true, mode: 0o700, signal: mark("mkdir") } as any);
mkdir(rmdirPath, { signal: void 0 } as any);
rmdir(rmdirPath, { signal: mark("rmdir") } as any);
mkdir(rmPath, { recursive: true } as any);
writeFile(rmPath + "/file.txt", "remove me");
rm(rmPath, { recursive: true, force: true, signal: mark("rm") } as any);

setImmediate((): void => {
    console.log("seen:", seen);
    console.log("read:", readBack.trim().replace(/\n/g, "|"));
});
