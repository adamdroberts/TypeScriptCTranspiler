import { readFile, writeFile } from "node:fs/promises";

const tmpPath = "/tmp/tsc2c-fs-promises-signal-options.txt";
let seen = "";
let readBack = "";

function mark(label: string): any {
    seen += label + ";";
    return { aborted: false };
}

writeFile(tmpPath, "signal ok\n", { encoding: "utf8", signal: mark("write") });

readFile(tmpPath, { encoding: "utf8", signal: mark("read") }).then((text: string): string => {
    readBack = text;
    return text;
});

writeFile(tmpPath, "signal ok\n", { signal: void 0 });

setImmediate((): void => {
    console.log("seen:", seen);
    console.log("read:", readBack.trim());
});
