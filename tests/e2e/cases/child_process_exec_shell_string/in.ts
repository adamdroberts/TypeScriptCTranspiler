import { exec, execSync } from "child_process";

console.log(execSync("printf sync-shell", { encoding: "utf8", shell: "/bin/sh" }));

exec("printf callback-shell", { shell: "/bin/sh" }, (error, stdout, stderr) => {
    console.log(error === null ? "null" : String(error));
    console.log(stdout);
    console.log(stderr.length);
});
