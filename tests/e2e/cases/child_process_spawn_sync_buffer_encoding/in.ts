import { spawnSync } from "child_process";

const omitted: any = spawnSync("/bin/printf", ["default-buffer"]);
console.log(
    "omitted:",
    Buffer.isBuffer(omitted.stdout),
    omitted.stdout.toString(),
    Buffer.isBuffer(omitted.stderr),
    omitted.stderr.length,
    Buffer.isBuffer(omitted.output[1]),
    omitted.output[1].toString(),
);

const explicit: any = spawnSync("/bin/sh", ["-c", "printf out; printf err >&2"], { encoding: "buffer" });
console.log(
    "explicit:",
    Buffer.isBuffer(explicit.stdout),
    explicit.stdout.toString(),
    Buffer.isBuffer(explicit.stderr),
    explicit.stderr.toString(),
    Buffer.isBuffer(explicit.output[2]),
    explicit.output[2].toString(),
);

const utf8: any = spawnSync("/bin/printf", ["utf8-text"], { encoding: "utf8" });
console.log("utf8:", typeof utf8.stdout, utf8.stdout);
