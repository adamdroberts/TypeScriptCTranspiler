import { env } from "node:process";
import * as proc from "process";

const key = "TSC2C_PROCESS_ENV_IMPORT";

delete env.TSC2C_PROCESS_ENV_IMPORT;
console.log("initial:", env.TSC2C_PROCESS_ENV_IMPORT === undefined, proc.env[key] === undefined);

env.TSC2C_PROCESS_ENV_IMPORT = "alpha";
console.log("named property:", env.TSC2C_PROCESS_ENV_IMPORT, proc.env[key]);

proc.env[key] = "beta";
console.log("namespace element:", env.TSC2C_PROCESS_ENV_IMPORT, proc.env[key]);

console.log("delete:", delete proc.env.TSC2C_PROCESS_ENV_IMPORT, env[key] === undefined);
