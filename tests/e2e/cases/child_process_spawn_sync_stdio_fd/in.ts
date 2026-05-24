import { spawnSync } from "child_process";

const STDIN = 0;
const STDOUT = 1;
const STDERR = 2;

const result: any = spawnSync("/bin/printf", ["fd-out\n"], {
    encoding: "utf8",
    stdio: [STDIN, STDOUT, STDERR],
});
console.log("meta:", result.stdout, result.stderr);
