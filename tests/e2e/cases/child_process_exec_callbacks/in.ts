import * as childProcess from "node:child_process";
import { exec } from "child_process";

exec("printf exec-out", (err: any, stdout: string, stderr: string): void => {
    console.log("exec:", err === null, stdout, stderr.length);
});

childProcess.execFile("/bin/sh", ["-c", "printf file-out; printf file-err >&2"], (err: any, stdout: string, stderr: string): void => {
    console.log("execFile:", err === null, stdout, stderr);
});
