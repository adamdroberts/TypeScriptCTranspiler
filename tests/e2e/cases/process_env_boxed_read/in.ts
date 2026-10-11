import {env} from "node:process";

async function main(): Promise<void> {
    const key = "TSC2C_PROCESS_ENV_BOXED";
    env.TSC2C_PROCESS_ENV_BOXED = "before";
    const before = env.TSC2C_PROCESS_ENV_BOXED;
    await Promise.resolve();
    delete env[key];
    const after = env.TSC2C_PROCESS_ENV_BOXED;
    console.log("after-delete:", before, after === undefined, after ?? "missing");
    env[key] = "after";
    console.log("after-set:", env.TSC2C_PROCESS_ENV_BOXED, process.env[key]);
    delete env[key];
}

main();
