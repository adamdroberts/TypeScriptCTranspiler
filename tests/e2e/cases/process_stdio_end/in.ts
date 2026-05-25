import proc, { stdout, stderr } from "node:process";

let seen = "";
let finishedInCallback = false;

function mark(label: string): string {
    seen += label;
    return "utf8";
}

function done(): void {
    seen += "d";
    finishedInCallback = stdout.writableFinished;
}

console.log("before", stdout.writableEnded, stderr.writableFinished);
stdout.end("end:");
const chunk = Buffer.from("bufend:");
proc.stdout.end(chunk, mark("e"), done);
process.stdout.end(done);
stderr.end("", done);

console.log("seen", seen, finishedInCallback);
console.log("writable", stdout.writable, stderr.writable);
console.log("after", stdout.writableEnded, proc.stdout.writableFinished, stderr.writableEnded, process.stderr.writableFinished);
