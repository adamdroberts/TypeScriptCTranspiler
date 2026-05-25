import proc, { stdin, stdout, stderr } from "node:process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

function listener(): void {
    seen += "!";
}

stdin.on(mark("a"), listener, mark("b"));
proc.stdin.once(mark("c"), listener);
process.stdin.off(mark("d"), listener);
stdout.addListener(mark("e"), listener);
proc.stdout.removeListener(mark("f"), listener);
stderr.removeAllListeners(mark("g"), mark("h"));

console.log("seen:", seen);
console.log("stdio:", stdin.readable, stdout.writable, stderr.writable);
