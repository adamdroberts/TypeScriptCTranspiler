import { exec, execFile, execFileSync, execSync, spawnSync } from "child_process";

const spawned: any = spawnSync("/bin/sh", ["-c", "printf $TSC2C_CHILD_ENV"], {
    encoding: "utf8",
    env: { TSC2C_CHILD_ENV: "spawn" },
});
const execOut: string = execSync("printf $TSC2C_CHILD_ENV", {
    encoding: "utf8",
    env: { TSC2C_CHILD_ENV: "exec" },
});
const fileOut: string = execFileSync("/bin/sh", ["-c", "printf $TSC2C_CHILD_ENV"], {
    encoding: "utf8",
    env: { TSC2C_CHILD_ENV: "file" },
});

let callbacks = "";
exec("printf $TSC2C_CHILD_ENV", { env: { TSC2C_CHILD_ENV: "exec-cb" } }, (error: any, stdout: string) => {
    callbacks += (error === null ? "ok" : "bad") + ":" + stdout;
});
execFile("/bin/sh", ["-c", "printf $TSC2C_CHILD_ENV"], { env: { TSC2C_CHILD_ENV: "file-cb" } }, (error: any, stdout: string) => {
    callbacks += "|" + (error === null ? "ok" : "bad") + ":" + stdout;
});

console.log("env:", spawned.stdout, execOut, fileOut);
console.log("callbacks:", callbacks);
