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

const ok = process.stdout.write("global:", "utf8", done, mark("g"));
stdout.write("", "utf8", done, mark("n"));
processModule.stdout.write("", "utf8", done, mark("m"));
proc.stdout.write("", "utf8", done, mark("d"));
stdout.write("", done, mark("s"));
console.log("write ignored:", ok, seen);
