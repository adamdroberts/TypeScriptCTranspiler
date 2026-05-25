import { getgid, getuid, memoryUsage, resourceUsage } from "node:process";
import * as proc from "process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

const mem = memoryUsage(mark("m"));
const usage = proc.resourceUsage(mark("r"));

console.log("named ids:", getuid() >= 0, getgid() >= 0);
console.log("namespace ids:", proc.geteuid() >= 0, proc.getegid() >= 0, proc.getgroups().length >= 0);
console.log("memory:", typeof mem.rss, mem.rss >= 0, typeof proc.memoryUsage().heapUsed);
console.log("resource:", typeof resourceUsage().userCPUTime, usage.userCPUTime >= 0, typeof usage.systemCPUTime);
console.log("ignored:", seen);
