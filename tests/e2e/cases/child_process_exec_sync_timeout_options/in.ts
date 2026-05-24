import { execFileSync, execSync } from "child_process";

const KILL = "SIGKILL";

console.log(execSync("printf exec-sync-timeout", {
    encoding: "utf8",
    timeout: 1000,
    killSignal: KILL,
}));

console.log(execFileSync("/bin/sh", ["-c", "printf file-sync-timeout"], {
    encoding: "utf8",
    timeout: 1000,
    killSignal: KILL,
}));
