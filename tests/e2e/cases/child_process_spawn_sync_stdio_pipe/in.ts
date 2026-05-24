import { spawnSync } from "child_process";

const PIPE = "pipe";

const single: any = spawnSync("printf", ["one"], { encoding: "utf8", stdio: PIPE });
console.log(single.stdout, single.stderr.length);

const tuple: any = spawnSync("printf", ["two"], { encoding: "utf8", stdio: [PIPE, PIPE, PIPE] });
console.log(tuple.stdout, tuple.stderr.length);
