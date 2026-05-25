import { execSync } from "child_process";

const cwd: string = "/tmp";
const CWD_OPTIONS = { cwd: cwd } as const;
const INPUT_OPTIONS = { input: "shell-stdin" } as const;
const a = execSync("/bin/pwd", CWD_OPTIONS);
const b = execSync("/bin/cat", INPUT_OPTIONS);

console.log("cwd:", Buffer.isBuffer(a), a.toString().indexOf("/tmp") >= 0);
console.log("input:", Buffer.isBuffer(b), b.toString());
