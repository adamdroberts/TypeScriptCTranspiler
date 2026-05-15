import { execFile, execFileSync, spawnSync } from "child_process";

execFile("/bin/printf", ["file-verbatim"], { windowsVerbatimArguments: true }, (error, stdout, stderr) => {
    console.log("file:", error === null, stdout, stderr.length);
});

console.log("file-sync:", execFileSync("/bin/printf", ["file-sync-verbatim"], {
    encoding: "utf8",
    windowsVerbatimArguments: false,
}));

const spawned: any = spawnSync("/bin/printf", ["spawn-verbatim"], {
    encoding: "utf8",
    windowsVerbatimArguments: true,
});
console.log("spawn:", spawned.status, spawned.stdout);
