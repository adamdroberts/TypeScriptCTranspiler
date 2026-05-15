import { execFileSync, execSync } from "child_process";

const a: string = execSync("/bin/cat", { encoding: "utf8", input: "sync-text" });
const b: string = execFileSync("/bin/printf", ["file-text"], { encoding: "utf8" });

console.log("exec encoding:", typeof a, a);
console.log("file encoding:", typeof b, b);
