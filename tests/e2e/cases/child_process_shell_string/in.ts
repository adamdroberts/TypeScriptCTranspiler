import { execFile, execFileSync, spawnSync } from "child_process";

console.log(execFileSync("printf", ["sync-%s", "ok"], { encoding: "utf8", shell: "/bin/sh" }));

const spawned = spawnSync("printf", ["spawn-%s", "ok"], { encoding: "utf8", shell: "/bin/sh" });
console.log(spawned.stdout);

execFile("printf", ["cb-%s", "ok"], { shell: "/bin/sh" }, (error, stdout, stderr) => {
    console.log(error === null ? "null" : String(error));
    console.log(stdout);
    console.log(stderr.length);
});
