import { appendFile, lstat, mkdtemp, readFile, readlink, realpath, stat, writeFile } from "node:fs/promises";

const tmpPath = "/tmp/tsc2c-fs-promises-signal-options.txt";
const dirPrefix = "/tmp/tsc2c-fs-promises-signal-options-dir-";
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

setImmediate((): void => {
    console.log("seen:", seen);
    console.log("read:", readBack.trim().replace(/\n/g, "|"));
});
