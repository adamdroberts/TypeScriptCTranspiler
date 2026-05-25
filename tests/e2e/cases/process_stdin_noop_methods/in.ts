import proc, { stdin } from "node:process";

let seen = "";
function encoding(label: string): string {
    seen += label;
    return "utf8";
}
function mark(label: string): string {
    seen += label;
    return label;
}

stdin.setEncoding(encoding("e"), mark("x"));
proc.stdin.resume(mark("r"));
process.stdin.pause(mark("p"));
process.stdin.resume();
stdin.pause(mark("q"), mark("w"));

console.log("seen:", seen);
console.log("stdin:", stdin.readable, proc.stdin.isPaused(), process.stdin.read() === null);
