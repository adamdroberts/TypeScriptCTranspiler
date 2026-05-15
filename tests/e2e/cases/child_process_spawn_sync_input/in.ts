import { spawnSync } from "child_process";

const result: any = spawnSync("/bin/cat", [], { encoding: "utf8", input: "stdin-text" });

console.log("input:", result.status, result.stdout, result.stderr.length);
