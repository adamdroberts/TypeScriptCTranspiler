import proc, { stdin, stdout, stderr } from "node:process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

stdin.pipe(stdout, mark("p"));
proc.stdin.pipe(process.stderr, mark("q"));
process.stdin.unpipe(stderr, mark("u"));
stdin.unpipe(undefined);

console.log("seen:", seen);
console.log("stdio:", stdin.readable, stdout.writable, stderr.writable);
