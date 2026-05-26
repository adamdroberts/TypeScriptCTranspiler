import { getgid, getgid as getgidAlias, getuid, getuid as getuidAlias, memoryUsage, memoryUsage as memoryUsageAlias, resourceUsage, resourceUsage as resourceUsageAlias } from "node:process";
import * as proc from "process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

const mem = memoryUsage(mark("m"));
const aliasMem = memoryUsageAlias(mark("a"));
const usage = proc.resourceUsage(mark("r"));
const aliasUsage = resourceUsageAlias(mark("s"));

console.log("named ids:", getuid() >= 0, getgid() >= 0);
console.log("alias ids:", getuidAlias() >= 0, getgidAlias() >= 0);
console.log("namespace ids:", proc.geteuid() >= 0, proc.getegid() >= 0, proc.getgroups().length >= 0);
console.log("memory:", typeof mem.rss, mem.rss >= 0, typeof aliasMem.heapUsed, typeof proc.memoryUsage().heapUsed);
console.log("resource:", typeof resourceUsage().userCPUTime, usage.userCPUTime >= 0, typeof aliasUsage.systemCPUTime, typeof usage.systemCPUTime);
console.log("ignored:", seen);
