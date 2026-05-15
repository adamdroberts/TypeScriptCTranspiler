import { spawnSync } from "child_process";

const result: any = spawnSync("/bin/printf", ["fd-out\n"], {
    encoding: "utf8",
    stdio: [0, 1, 2],
});
console.log("meta:", result.stdout, result.stderr);
