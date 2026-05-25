import proc, { kill } from "node:process";
import * as processModule from "process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

const SIGNAL_ZERO = 0;

console.log("global:", process.kill(process.pid, SIGNAL_ZERO, mark("g")));
console.log("named:", kill(process.pid, SIGNAL_ZERO, mark("n")));
console.log("namespace:", processModule.kill(process.pid, SIGNAL_ZERO, mark("m")));
console.log("default:", proc.kill(process.pid, SIGNAL_ZERO, mark("d")));
console.log("seen:", seen);
