import proc, { stdout, stderr } from "node:process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

stdout.setDefaultEncoding("utf8", mark("e"));
proc.stdout.cork(mark("c"));
process.stdout.uncork(mark("u"));
stderr.setDefaultEncoding("utf8", mark("s"));
proc.stderr.cork(mark("k"));
process.stderr.uncork(mark("r"));

console.log("seen:", seen);
console.log("writable:", stdout.writable, stderr.writable);
