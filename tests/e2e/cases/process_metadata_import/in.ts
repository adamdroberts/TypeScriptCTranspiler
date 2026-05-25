import { cwd, uptime } from "node:process";
import * as proc from "process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

console.log("named cwd:", cwd().length > 0);
console.log("named uptime:", uptime() >= 0);
console.log("namespace cwd:", proc.cwd().length > 0);
console.log("namespace uptime:", proc.uptime() >= 0);
console.log("ignored:", cwd(mark("c")).length > 0, proc.uptime(mark("u")) >= 0, seen);
