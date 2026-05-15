import { execFile } from "child_process";

execFile("/tmp/tsc2c-definitely-missing-exec-file", (error, stdout, stderr) => {
    console.log(error === null ? "null" : String(error));
    console.log(stdout.length);
    console.log(stderr.length);
});
