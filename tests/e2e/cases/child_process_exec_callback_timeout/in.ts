import { exec, execFile } from "child_process";

exec("while true; do :; done", { timeout: 50, killSignal: "SIGKILL" }, (error, stdout, stderr) => {
    console.log("exec", error === null ? "null" : String(error), stdout.length, stderr.length);
});

execFile("/bin/sleep", ["2"], { timeout: 50, killSignal: "SIGKILL" }, (error, stdout, stderr) => {
    console.log("execFile", error === null ? "null" : String(error), stdout.length, stderr.length);
});
