import { exec, execFile, execFileSync, execSync, spawnSync } from "child_process";

const SPAWN_ENV = { TSC2C_CHILD_ENV: "spawn" } as const;
const EXEC_ENV = { TSC2C_CHILD_ENV: "exec" } as const;
const FILE_ENV = { TSC2C_CHILD_ENV: "file" } as const;
const EXEC_CB_ENV = { TSC2C_CHILD_ENV: "exec-cb" } as const;
const FILE_CB_ENV = { TSC2C_CHILD_ENV: "file-cb" } as const;
const SPAWN_OPTIONS = {
    encoding: "utf8",
    env: SPAWN_ENV,
} as const;
const EXEC_OPTIONS = {
    encoding: "utf8",
    env: EXEC_ENV,
} as const;
const FILE_OPTIONS = {
    encoding: "utf8",
    env: FILE_ENV,
} as const;
const EXEC_CB_OPTIONS = { env: EXEC_CB_ENV } as const;
const FILE_CB_OPTIONS = { env: FILE_CB_ENV } as const;

const spawned: any = spawnSync("/bin/sh", ["-c", "printf $TSC2C_CHILD_ENV"], SPAWN_OPTIONS);
const execOut: string = execSync("printf $TSC2C_CHILD_ENV", EXEC_OPTIONS);
const fileOut: string = execFileSync("/bin/sh", ["-c", "printf $TSC2C_CHILD_ENV"], FILE_OPTIONS);

let callbacks = "";
exec("printf $TSC2C_CHILD_ENV", EXEC_CB_OPTIONS, (error: any, stdout: string) => {
    callbacks += (error === null ? "ok" : "bad") + ":" + stdout;
});
execFile("/bin/sh", ["-c", "printf $TSC2C_CHILD_ENV"], FILE_CB_OPTIONS, (error: any, stdout: string) => {
    callbacks += "|" + (error === null ? "ok" : "bad") + ":" + stdout;
});

console.log("env:", spawned.stdout, execOut, fileOut);
console.log("callbacks:", callbacks);
