import { execFile, execFileSync, execSync, spawnSync } from "child_process";

execFile("/bin/sh", ["-c", "printf abcdef"], { maxBuffer: 3 }, (error, stdout, stderr) => {
    console.log("callback:", error, stdout, stderr.length);
});

const spawned: any = spawnSync("/bin/sh", ["-c", "printf abcdef"], {
    encoding: "utf8",
    maxBuffer: 3,
});
console.log("spawn:", spawned.error, spawned.stdout, spawned.stderr.length);

console.log("sync:", execSync("printf short", { encoding: "utf8", maxBuffer: 16 }));
console.log("file-sync:", execFileSync("/bin/printf", ["file-short"], { encoding: "utf8", maxBuffer: 16 }));
