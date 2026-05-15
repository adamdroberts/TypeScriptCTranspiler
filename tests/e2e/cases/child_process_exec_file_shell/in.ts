import { execFile, execFileSync } from "child_process";

const syncOut: string = execFileSync("printf", ["sync:%s", "shell"], {
    encoding: "utf8",
    shell: true,
});

let callback = "";
execFile("printf", ["cb:%s", "shell"], { shell: true }, (error: any, stdout: string) => {
    callback = (error === null ? "ok" : "bad") + ":" + stdout;
});

console.log("sync shell:", syncOut);
console.log("callback shell:", callback);
