import { execFile, spawnSync } from "child_process";

const SPAWN_SECOND_OPTIONS = {
    encoding: "utf8",
    env: { TSC2C_SPAWN_SECOND: "spawn-second" },
} as const;
const EXEC_FILE_SECOND_OPTIONS = { env: { TSC2C_EXEC_FILE_SECOND_CB: "file-second" } } as const;

const spawned: any = spawnSync("/usr/bin/env", SPAWN_SECOND_OPTIONS);

let callback = "";
execFile("/usr/bin/env", EXEC_FILE_SECOND_OPTIONS, (error: any, stdout: string) => {
    callback = (error === null ? "ok" : "bad") + ":" + (stdout.indexOf("TSC2C_EXEC_FILE_SECOND_CB=file-second") >= 0);
});

console.log("spawn second:", spawned.status, spawned.stdout.indexOf("TSC2C_SPAWN_SECOND=spawn-second") >= 0);
console.log("execFile second:", callback);
