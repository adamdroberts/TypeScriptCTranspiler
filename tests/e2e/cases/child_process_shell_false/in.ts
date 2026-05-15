import { execFile, execFileSync, spawnSync } from "child_process";

execFile("/bin/printf", ["callback-false"], { shell: false }, (error, stdout, stderr) => {
    console.log("callback:", error, stdout, stderr.length);
});

console.log("sync:", execFileSync("/bin/printf", ["sync-false"], { encoding: "utf8", shell: false }));

const spawned: any = spawnSync("/bin/printf", ["spawn-false"], {
    encoding: "utf8",
    shell: false,
});
console.log("spawn:", spawned.status, spawned.stdout, spawned.stderr.length);
