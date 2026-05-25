import { cpuUsage } from "node:process";
import * as proc from "process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

const start: any = process.cpuUsage();
let total = 0;
for (let i = 0; i < 2000; i++) {
    total += i;
}

const direct: any = process.cpuUsage(start, mark("d"));
const named: any = cpuUsage(start, mark("n"));
const namespace: any = proc.cpuUsage(undefined, mark("u"));

console.log("total:", total > 0);
console.log("direct:", typeof direct.user, typeof direct.system, direct.user >= 0, direct.system >= 0);
console.log("named:", typeof named.user, typeof named.system, named.user >= 0, named.system >= 0);
console.log("undefined:", typeof namespace.user, typeof namespace.system, namespace.user >= 0, namespace.system >= 0);
console.log("seen:", seen);

try {
    console.log("bad:", process.cpuUsage({}));
} catch (e: any) {
    console.log("bad:", e);
}
