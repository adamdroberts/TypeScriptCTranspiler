import { stdout, stderr } from "node:process";

console.log("stdout types:", typeof stdout.columns, typeof stdout.rows);
console.log("stderr types:", typeof stderr.columns, typeof stderr.rows);
console.log("stdout bounds:", stdout.columns > 0, stdout.rows > 0);
console.log("stderr bounds:", stderr.columns > 0, stderr.rows > 0);
