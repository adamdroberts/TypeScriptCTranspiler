import { exec, execFile } from "child_process";

const UTF8 = "utf8";
const UTF8_DASH = "utf-8";
const EXEC_OPTIONS = { encoding: UTF8 } as const;
const FILE_OPTIONS = { encoding: UTF8_DASH } as const;

exec("printf exec-utf8", EXEC_OPTIONS, (error, stdout, stderr) => {
    console.log("exec:", error, stdout, stderr.length);
});

execFile("/bin/printf", ["file-utf8"], FILE_OPTIONS, (error, stdout, stderr) => {
    console.log("file:", error, stdout, stderr.length);
});
