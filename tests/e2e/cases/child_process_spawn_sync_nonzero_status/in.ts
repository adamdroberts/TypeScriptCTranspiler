import { spawnSync } from "child_process";

const result: any = spawnSync("/bin/sh", ["-c", "printf ok; printf bad >&2; exit 7"], { encoding: "utf8" });

console.log("failure:", result.status, result.stdout, result.stderr, result.signal === null, typeof result.error);
console.log("output:", result.output[1], result.output[2]);
