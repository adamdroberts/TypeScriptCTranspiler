import { execFileSync } from "child_process";

const output = execFileSync("/bin/sh", ["-c", "printf sync-out; printf sync-err >&2"], {
    encoding: "utf8",
});

console.log(output);
