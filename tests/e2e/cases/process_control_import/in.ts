import { cpuUsage, cpuUsage as cpuUsageAlias, kill, kill as killAlias } from "node:process";
import * as proc from "process";

const usage = cpuUsage();
const aliasUsage = cpuUsageAlias();
const nsUsage = proc.cpuUsage();

console.log("cpu:", typeof usage.user, typeof usage.system, usage.user >= 0, aliasUsage.system >= 0, nsUsage.system >= 0);
console.log("kill:", kill(process.pid, 0), killAlias(process.pid, 0), proc.kill(process.pid, 0));
