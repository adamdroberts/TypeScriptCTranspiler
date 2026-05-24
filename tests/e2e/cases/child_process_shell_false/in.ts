import { execFile, execFileSync, spawnSync } from "child_process";

const SHELL_FALSE = false;

execFile("/bin/printf", ["callback-false"], { shell: SHELL_FALSE }, (error, stdout, stderr) => {
    console.log("callback:", error, stdout, stderr.length);
});

console.log("sync:", execFileSync("/bin/printf", ["sync-false"], { encoding: "utf8", shell: SHELL_FALSE }));

const spawned: any = spawnSync("/bin/printf", ["spawn-false"], {
    encoding: "utf8",
    shell: SHELL_FALSE,
});
console.log("spawn:", spawned.status, spawned.stdout, spawned.stderr.length);
