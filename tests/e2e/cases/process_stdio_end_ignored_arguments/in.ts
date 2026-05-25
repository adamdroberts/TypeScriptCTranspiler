import proc, { stdout } from "node:process";
import * as processModule from "process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

function done(): void {
    seen += "c";
}

process.stdout.end("", "utf8", done, mark("g"));
stdout.end("", "utf8", done, mark("n"));
processModule.stderr.end("", "utf8", done, mark("m"));
proc.stderr.end("", "utf8", done, mark("d"));

console.log("end ignored:", seen, process.stdout.writableEnded, process.stderr.writableFinished);
