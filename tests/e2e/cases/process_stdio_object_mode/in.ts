import { stdin, stdout, stderr } from "node:process";

console.log("stdin objectMode:", (stdin as any).readableObjectMode);
console.log("stdout objectMode:", (stdout as any).writableObjectMode);
console.log("stderr objectMode:", (stderr as any).writableObjectMode);
