import * as childProcess from "child_process";
import { execSync } from "node:child_process";

const a = execSync("printf child-process");
const b = childProcess.execSync("printf namespace");

console.log("exec:", Buffer.isBuffer(a), a.toString());
console.log("namespace:", Buffer.isBuffer(b), b.toString());
