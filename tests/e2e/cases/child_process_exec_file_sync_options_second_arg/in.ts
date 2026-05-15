import { execFileSync } from "child_process";

const cwdOut: string = execFileSync("/bin/pwd", { encoding: "utf8", cwd: "/tmp" });
const envOut: string = execFileSync("/usr/bin/env", { encoding: "utf8", env: { TSC2C_EXEC_FILE_SECOND: "second" } });

console.log("cwd second:", cwdOut.indexOf("/tmp") >= 0);
console.log("env second:", envOut.indexOf("TSC2C_EXEC_FILE_SECOND=second") >= 0);
