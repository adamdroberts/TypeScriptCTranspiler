import { execFile, execFileSync, spawnSync } from "child_process";

const spawned: any = spawnSync("/bin/sh", ["-c", "printf $0"], {
    encoding: "utf8",
    argv0: "spawn-argv0",
});
console.log("spawn:", spawned.stdout);

console.log("file:", execFileSync("/bin/sh", ["-c", "printf $0"], {
    encoding: "utf8",
    argv0: "file-argv0",
}));

execFile("/bin/sh", ["-c", "printf $0"], { argv0: "callback-argv0" }, (error, stdout, stderr) => {
    console.log("callback:", error === null, stdout, stderr.length);
});
