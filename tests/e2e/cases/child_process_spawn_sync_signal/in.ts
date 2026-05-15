import { spawnSync } from "child_process";

const result: any = spawnSync("/bin/sh", ["-c", "kill -TERM $$"], { encoding: "utf8" });

console.log("signal:", result.status === null, result.signal, typeof result.error, result.stdout.length, result.stderr.length);
console.log("output:", result.output[0] === null, result.output[1].length, result.output[2].length);
