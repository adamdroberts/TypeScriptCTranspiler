import { spawnSync } from "child_process";

const IGNORE = "ignore";
const PIPE = "pipe";

const ignored: any = spawnSync("/bin/sh", ["-c", "printf out; printf err >&2"], {
    encoding: "utf8",
    stdio: IGNORE,
});
console.log("ignore:", ignored.status, ignored.stdout === null, ignored.stderr === null, ignored.output[1] === null, ignored.output[2] === null);

const mixed: any = spawnSync("/bin/sh", ["-c", "printf kept; printf hidden >&2"], {
    encoding: "utf8",
    stdio: [IGNORE, PIPE, IGNORE],
});
console.log("mixed:", mixed.status, mixed.stdout, mixed.stderr === null, mixed.output[1], mixed.output[2] === null);
