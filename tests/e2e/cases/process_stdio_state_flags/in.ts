import proc, { stdin, stdout, stderr } from "node:process";

console.log("stdin:", stdin.destroyed, stdin.closed, stdin.readableEnded);
console.log("stdout:", stdout.destroyed, stdout.closed, stdout.writableEnded, stdout.writableFinished, stdout.writableCorked);
console.log("stderr:", stderr.destroyed, stderr.closed, stderr.writableEnded, stderr.writableFinished, stderr.writableCorked);
console.log("default:", proc.stdin.destroyed, proc.stdout.writableFinished, process.stderr.closed);
console.log("readable:", stdin.errored === null, stdin.readableFlowing === null, stdin.readableLength);
console.log("writable:", stdout.errored === null, stdout.writableLength, stdout.writableNeedDrain, stderr.errored === null, stderr.writableLength, stderr.writableNeedDrain);
