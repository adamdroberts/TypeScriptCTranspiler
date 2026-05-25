import proc, { stdout, stderr } from "node:process";

let seen = "";

function mark(label: string): string {
    seen += label;
    return "utf8";
}

function done(): void {
    seen += "d";
}

stdout.end("end:");
const chunk = Buffer.from("bufend:");
proc.stdout.end(chunk, mark("e"), done);
process.stdout.end(done);
stderr.end("", done);

console.log("seen", seen);
console.log("writable", stdout.writable, stderr.writable);
