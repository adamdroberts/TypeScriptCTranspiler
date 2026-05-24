import { execFile, spawnSync } from "child_process";

const SIGKILL_NUM = 9;
const SIGTERM_NUM = 15;

const spawned: any = spawnSync("/bin/sh", ["-c", "sleep 1"], {
    encoding: "utf8",
    timeout: 10,
    killSignal: SIGKILL_NUM,
});
console.log("spawn:", spawned.error, spawned.signal);

execFile("/bin/sh", ["-c", "sleep 1"], { timeout: 10, killSignal: SIGTERM_NUM }, (error, stdout, stderr) => {
    console.log("callback:", error, stdout.length, stderr.length);
});
