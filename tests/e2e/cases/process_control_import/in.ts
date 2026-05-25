import { cpuUsage, kill } from "node:process";
import * as proc from "process";

const usage = cpuUsage();
const nsUsage = proc.cpuUsage();

console.log("cpu:", typeof usage.user, typeof usage.system, usage.user >= 0, nsUsage.system >= 0);
console.log("kill:", kill(process.pid, 0), proc.kill(process.pid, 0));
