import { execFileSync } from "child_process";

const CWD_OPTIONS = { encoding: "utf8", cwd: "/tmp" } as const;
const ENV_OPTIONS = { encoding: "utf8", env: { TSC2C_EXEC_FILE_SECOND: "second" } } as const;

const cwdOut: string = execFileSync("/bin/pwd", CWD_OPTIONS);
const envOut: string = execFileSync("/usr/bin/env", ENV_OPTIONS);

console.log("cwd second:", cwdOut.indexOf("/tmp") >= 0);
console.log("env second:", envOut.indexOf("TSC2C_EXEC_FILE_SECOND=second") >= 0);
