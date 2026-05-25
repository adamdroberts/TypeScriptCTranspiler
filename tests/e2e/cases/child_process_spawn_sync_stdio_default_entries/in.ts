import { spawnSync } from "child_process";

const result: any = spawnSync("/bin/cat", [], {
    encoding: "utf8",
    input: "default-pipe",
    stdio: [void 0, null, "pipe"],
});
console.log(result.status, result.stdout, result.stderr.length);
