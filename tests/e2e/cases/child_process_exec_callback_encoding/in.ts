import { exec, execFile } from "child_process";

exec("printf exec-utf8", { encoding: "utf8" }, (error, stdout, stderr) => {
    console.log("exec:", error, stdout, stderr.length);
});

execFile("/bin/printf", ["file-utf8"], { encoding: "utf-8" }, (error, stdout, stderr) => {
    console.log("file:", error, stdout, stderr.length);
});
