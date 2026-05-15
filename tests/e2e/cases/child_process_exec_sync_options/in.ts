import { execSync } from "child_process";

const cwd: string = "/tmp";
const a = execSync("/bin/pwd", { cwd: cwd });
const b = execSync("/bin/cat", { input: "shell-stdin" });

console.log("cwd:", Buffer.isBuffer(a), a.toString().indexOf("/tmp") >= 0);
console.log("input:", Buffer.isBuffer(b), b.toString());
