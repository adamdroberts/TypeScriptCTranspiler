import { stdin, stdout, stderr } from "node:process";

console.log("stdin highWaterMark:", stdin.readableHighWaterMark);
console.log("stdout highWaterMark:", stdout.writableHighWaterMark);
console.log("stderr highWaterMark:", stderr.writableHighWaterMark);
