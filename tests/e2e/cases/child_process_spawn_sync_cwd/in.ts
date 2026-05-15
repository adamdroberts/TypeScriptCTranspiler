import { spawnSync } from "child_process";

const cwd: string = "/tmp";
const result: any = spawnSync("/bin/pwd", [], { encoding: "utf8", cwd: cwd });

console.log("cwd:", result.status, result.stdout.indexOf("/tmp") >= 0, result.stderr.length);
