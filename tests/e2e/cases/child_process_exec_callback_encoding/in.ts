import { exec, execFile } from "child_process";

const UTF8 = "utf8";
const UTF8_DASH = "utf-8";

exec("printf exec-utf8", { encoding: UTF8 }, (error, stdout, stderr) => {
    console.log("exec:", error, stdout, stderr.length);
});

execFile("/bin/printf", ["file-utf8"], { encoding: UTF8_DASH }, (error, stdout, stderr) => {
    console.log("file:", error, stdout, stderr.length);
});
