import { spawnSync } from "child_process";

const KILL = "SIGKILL";
const INTERRUPT = "SIGINT";

const result: any = spawnSync("/bin/sleep", ["2"], {
    encoding: "utf8",
    timeout: 50,
    killSignal: KILL,
});

console.log(result.status === null, result.signal, result.error);
console.log(result.stdout.length, result.stderr.length);

const interrupted: any = spawnSync("/bin/sleep", ["2"], {
    encoding: "utf8",
    timeout: 50,
    killSignal: INTERRUPT,
});

console.log(interrupted.status === null, interrupted.signal, interrupted.error);
