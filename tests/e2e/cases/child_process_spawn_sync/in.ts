import * as childProcess from "child_process";
import { spawnSync } from "node:child_process";

const UTF8 = "utf8";
const SPAWN_OPTIONS = { encoding: UTF8 } as const;
const NAMESPACE_OPTIONS = { encoding: UTF8 } as const;

const a: any = spawnSync("/bin/printf", ["spawn-sync"], SPAWN_OPTIONS);
const b: any = childProcess.spawnSync("/bin/sh", ["-c", "printf out; printf err >&2"], NAMESPACE_OPTIONS);

console.log("spawn:", a.status, a.stdout, a.stderr.length);
console.log("namespace:", b.status, b.stdout, b.stderr);
