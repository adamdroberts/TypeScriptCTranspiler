import { exec } from "child_process";

exec("printf should-not-run", { cwd: "/tmp/tsc2c-definitely-missing-cwd" }, (error, stdout, stderr) => {
    console.log(error === null ? "null" : String(error));
    console.log(stdout.length);
    console.log(stderr.length);
});
