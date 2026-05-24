import { exec, execFile, execFileSync, execSync, spawnSync } from "child_process";

const WINDOWS_HIDE_TRUE = true;
const WINDOWS_HIDE_FALSE = false;

exec("printf exec-hide", { windowsHide: WINDOWS_HIDE_TRUE }, (error, stdout, stderr) => {
    console.log("exec:", error === null, stdout, stderr.length);
});

execFile("/bin/printf", ["file-hide"], { windowsHide: WINDOWS_HIDE_FALSE }, (error, stdout, stderr) => {
    console.log("file:", error === null, stdout, stderr.length);
});

console.log("sync:", execSync("printf sync-hide", { encoding: "utf8", windowsHide: WINDOWS_HIDE_TRUE }));
console.log("file-sync:", execFileSync("/bin/printf", ["file-sync-hide"], { encoding: "utf8", windowsHide: WINDOWS_HIDE_FALSE }));

const spawned: any = spawnSync("/bin/printf", ["spawn-hide"], {
    encoding: "utf8",
    windowsHide: WINDOWS_HIDE_TRUE,
});
console.log("spawn:", spawned.status, spawned.stdout);
