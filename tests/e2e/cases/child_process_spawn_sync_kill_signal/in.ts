import { spawnSync } from "child_process";

const KILL = "SIGKILL";

const result: any = spawnSync("/bin/sleep", ["2"], {
    encoding: "utf8",
    timeout: 50,
    killSignal: KILL,
});

console.log(result.status === null, result.signal, result.error);
console.log(result.stdout.length, result.stderr.length);
