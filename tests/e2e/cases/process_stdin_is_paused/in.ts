import proc, { stdin } from "node:process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

console.log("paused:", stdin.isPaused(), proc.stdin.isPaused(mark("p")), process.stdin.isPaused(mark("s")));
console.log("seen:", seen);
