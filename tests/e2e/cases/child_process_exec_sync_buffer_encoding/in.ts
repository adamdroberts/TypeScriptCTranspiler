import { execFileSync, execSync } from "child_process";

const shellOut = execSync("printf shell-buffer", { encoding: "buffer" });
console.log(Buffer.isBuffer(shellOut), shellOut.toString());

const fileOut = execFileSync("/bin/printf", ["file-buffer"], { encoding: "buffer" });
console.log(Buffer.isBuffer(fileOut), fileOut.toString());
