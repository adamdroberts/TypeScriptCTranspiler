import proc, { stdin } from "node:process";

let seen = "";
function mark(label: string): number {
    seen += label;
    return 0;
}

const first = stdin.read();
const second = proc.stdin.read(undefined, mark("u"));
const third = process.stdin.read(mark("s"));

console.log("nulls:", first === null, second === null, third === null);
console.log("seen:", seen);
