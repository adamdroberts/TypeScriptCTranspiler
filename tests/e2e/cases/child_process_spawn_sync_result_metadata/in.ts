import { spawnSync } from "child_process";

const result: any = spawnSync("/bin/sh", ["-c", "printf out; printf err >&2"], { encoding: "utf8" });

console.log("meta:", result.status, typeof result.pid, result.pid > 0, result.signal === null, typeof result.error);
console.log("output:", Array.isArray(result.output), result.output.length, result.output[0] === null, result.output[1], result.output[2]);
