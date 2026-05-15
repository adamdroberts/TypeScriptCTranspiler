import { execFileSync } from "node:child_process";

const cwd: string = "/tmp";
const out = execFileSync("/bin/pwd", [], { cwd: cwd });

console.log("execFile cwd:", Buffer.isBuffer(out), out.toString().indexOf("/tmp") >= 0);
