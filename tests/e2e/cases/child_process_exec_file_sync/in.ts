import * as childProcess from "node:child_process";
import { execFileSync } from "child_process";

const a = execFileSync("/bin/printf", ["file-sync"]);
const b = childProcess.execFileSync("/bin/printf", ["namespace-file"]);

console.log("execFile:", Buffer.isBuffer(a), a.toString());
console.log("namespace:", Buffer.isBuffer(b), b.toString());
