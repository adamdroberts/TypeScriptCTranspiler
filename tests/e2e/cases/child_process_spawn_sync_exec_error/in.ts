import { spawnSync } from "child_process";

const result: any = spawnSync("/definitely/not/tsc2c-missing-binary", [], { encoding: "utf8" });

console.log("error:", result.status === null, result.signal === null, result.error, typeof result.pid, result.stdout.length, result.stderr.length);
console.log("output:", result.output[0] === null, result.output[1].length, result.output[2].length);
