import { spawnSync } from "child_process";

const result: any = spawnSync("/bin/printf", ["attached"], {
    detached: false,
    encoding: "utf8",
});
console.log(result.status, result.stdout, result.stderr.length);
