import * as childProcess from "child_process";
import { spawnSync } from "node:child_process";

const a: any = spawnSync("/bin/printf", ["spawn-sync"], { encoding: "utf8" });
const b: any = childProcess.spawnSync("/bin/sh", ["-c", "printf out; printf err >&2"], { encoding: "utf8" });

console.log("spawn:", a.status, a.stdout, a.stderr.length);
console.log("namespace:", b.status, b.stdout, b.stderr);
