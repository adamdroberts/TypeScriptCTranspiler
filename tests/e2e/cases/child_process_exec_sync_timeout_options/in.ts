import { execFileSync, execSync } from "child_process";

console.log(execSync("printf exec-sync-timeout", {
    encoding: "utf8",
    timeout: 1000,
    killSignal: "SIGKILL",
}));

console.log(execFileSync("/bin/sh", ["-c", "printf file-sync-timeout"], {
    encoding: "utf8",
    timeout: 1000,
    killSignal: "SIGKILL",
}));
