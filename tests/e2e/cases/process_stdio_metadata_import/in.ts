import { stdout } from "node:process";
import * as proc from "process";

console.log("fds:", stdout.fd, proc.stderr.fd, proc.stdin.fd);
console.log("tty:", typeof stdout.isTTY, typeof proc.stderr.isTTY, typeof proc.stdin.isTTY);
console.log("readable:", stdout.readable, proc.stderr.readable, proc.stdin.readable);
console.log("writable:", stdout.writable, proc.stderr.writable);
