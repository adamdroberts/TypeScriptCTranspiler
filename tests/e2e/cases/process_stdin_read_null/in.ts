import proc, { stdin } from "node:process";

let seen = "";
function mark(label: string): number {
    seen += label;
    return 0;
}

const defaultSize = undefined;

const first = stdin.read();
const second = proc.stdin.read(undefined, mark("u"));
const third = process.stdin.read(defaultSize, mark("a"));
const fourth = process.stdin.read(mark("s"));

console.log("nulls:", first === null, second === null, third === null, fourth === null);
console.log("seen:", seen);
