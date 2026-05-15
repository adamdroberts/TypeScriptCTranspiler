import { spawnSync } from "child_process";

const single: any = spawnSync("printf", ["one"], { encoding: "utf8", stdio: "pipe" });
console.log(single.stdout, single.stderr.length);

const tuple: any = spawnSync("printf", ["two"], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
console.log(tuple.stdout, tuple.stderr.length);
