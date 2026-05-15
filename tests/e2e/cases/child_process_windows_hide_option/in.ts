import { exec, execFile, execFileSync, execSync, spawnSync } from "child_process";

exec("printf exec-hide", { windowsHide: true }, (error, stdout, stderr) => {
    console.log("exec:", error === null, stdout, stderr.length);
});

execFile("/bin/printf", ["file-hide"], { windowsHide: false }, (error, stdout, stderr) => {
    console.log("file:", error === null, stdout, stderr.length);
});

console.log("sync:", execSync("printf sync-hide", { encoding: "utf8", windowsHide: true }));
console.log("file-sync:", execFileSync("/bin/printf", ["file-sync-hide"], { encoding: "utf8", windowsHide: false }));

const spawned: any = spawnSync("/bin/printf", ["spawn-hide"], {
    encoding: "utf8",
    windowsHide: true,
});
console.log("spawn:", spawned.status, spawned.stdout);
