import { execFile, spawnSync } from "child_process";

const spawned: any = spawnSync("/usr/bin/env", {
    encoding: "utf8",
    env: { TSC2C_SPAWN_SECOND: "spawn-second" },
});

let callback = "";
execFile("/usr/bin/env", { env: { TSC2C_EXEC_FILE_SECOND_CB: "file-second" } }, (error: any, stdout: string) => {
    callback = (error === null ? "ok" : "bad") + ":" + (stdout.indexOf("TSC2C_EXEC_FILE_SECOND_CB=file-second") >= 0);
});

console.log("spawn second:", spawned.status, spawned.stdout.indexOf("TSC2C_SPAWN_SECOND=spawn-second") >= 0);
console.log("execFile second:", callback);
