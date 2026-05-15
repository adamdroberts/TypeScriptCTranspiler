import { spawnSync } from "child_process";

const result: any = spawnSync("/bin/sh", ["-c", "printf '%s %s' $$ $(ps -o sid= -p $$)"], {
    encoding: "utf8",
    detached: true,
});
const parts = result.stdout.split(" ");
console.log(result.status, parts[0] === parts[1], result.stderr.length);
