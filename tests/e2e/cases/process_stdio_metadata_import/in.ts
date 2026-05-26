import { stderr as stderrAlias, stdin as stdinAlias, stdout, stdout as stdoutAlias } from "node:process";
import * as proc from "process";

console.log("fds:", stdout.fd, proc.stderr.fd, proc.stdin.fd);
console.log("alias fds:", stdoutAlias.fd, stderrAlias.fd, stdinAlias.fd);
console.log("tty:", typeof stdout.isTTY, typeof proc.stderr.isTTY, typeof proc.stdin.isTTY);
console.log("alias tty:", typeof stdoutAlias.isTTY, typeof stderrAlias.isTTY, typeof stdinAlias.isTTY);
console.log("readable:", stdout.readable, proc.stderr.readable, proc.stdin.readable);
console.log("alias readable:", stdoutAlias.readable, stderrAlias.readable, stdinAlias.readable);
console.log("writable:", stdout.writable, proc.stderr.writable);
console.log("alias writable:", stdoutAlias.writable, stderrAlias.writable);
