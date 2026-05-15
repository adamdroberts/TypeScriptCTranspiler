import { execFile, spawnSync } from "child_process";

const spawned: any = spawnSync("/bin/sh", ["-c", "sleep 1"], {
    encoding: "utf8",
    timeout: 10,
    killSignal: 9,
});
console.log("spawn:", spawned.error, spawned.signal);

execFile("/bin/sh", ["-c", "sleep 1"], { timeout: 10, killSignal: 15 }, (error, stdout, stderr) => {
    console.log("callback:", error, stdout.length, stderr.length);
});
