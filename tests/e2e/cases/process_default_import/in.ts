import proc from "node:process";

const key = "TSC2C_PROCESS_DEFAULT_IMPORT";

delete proc.env[key];
proc.env[key] = "ok";

console.log("default meta:", proc.pid > 0, proc.platform.length > 0, proc.cwd().length > 0);
console.log("default env:", proc.env.TSC2C_PROCESS_DEFAULT_IMPORT, delete proc.env.TSC2C_PROCESS_DEFAULT_IMPORT);
console.log("default timer:", proc.hrtime().length, proc.hrtime.bigint() > 0n);
