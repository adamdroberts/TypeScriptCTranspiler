import { execFileSync, execSync } from "child_process";

const UTF8 = "utf8";

const a: string = execSync("/bin/cat", { encoding: UTF8, input: "sync-text" });
const b: string = execFileSync("/bin/printf", ["file-text"], { encoding: UTF8 });

console.log("exec encoding:", typeof a, a);
console.log("file encoding:", typeof b, b);
