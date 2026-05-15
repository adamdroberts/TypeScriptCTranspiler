import * as childProcess from "node:child_process";
import { exec } from "child_process";

const cwd: string = "/tmp";

exec("/bin/pwd", { cwd: cwd }, (err: any, stdout: string, stderr: string): void => {
    console.log("exec cwd:", err === null, stdout.indexOf("/tmp") >= 0, stderr.length);
});

childProcess.execFile("/bin/pwd", [], { cwd: cwd }, (err: any, stdout: string, stderr: string): void => {
    console.log("execFile cwd:", err === null, stdout.indexOf("/tmp") >= 0, stderr.length);
});
