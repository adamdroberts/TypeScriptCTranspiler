import { execFileSync } from "child_process";

const out = execFileSync("/bin/cat", [], { input: "file-stdin" });

console.log("execFile input:", Buffer.isBuffer(out), out.toString());
