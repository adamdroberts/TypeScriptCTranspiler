import proc, { stdin } from "node:process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

stdin.setEncoding("utf8", mark("e"));
proc.stdin.resume(mark("r"));
process.stdin.pause(mark("p"));

console.log("seen:", seen);
console.log("readable:", stdin.readable, proc.stdin.fd);
