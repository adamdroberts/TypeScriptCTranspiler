import { execFile } from "child_process";

let result = "";
execFile("/bin/pwd", (error: any, stdout: string, stderr: string) => {
    result = (error === null ? "ok" : "bad") + ":" + (stdout.length > 0) + ":" + stderr.length;
});

console.log("execFile callback no args:", result);
