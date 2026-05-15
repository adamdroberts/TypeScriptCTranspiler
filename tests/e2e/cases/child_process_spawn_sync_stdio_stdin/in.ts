import { spawnSync } from "child_process";

const piped: any = spawnSync("/bin/cat", [], {
    encoding: "utf8",
    input: "pipe-input",
    stdio: ["pipe", "pipe", "pipe"],
});
console.log("pipe:", piped.status, piped.stdout, piped.stderr.length);

const ignored: any = spawnSync("/bin/cat", [], {
    encoding: "utf8",
    input: "ignore-input",
    stdio: ["ignore", "pipe", "pipe"],
});
console.log("ignore:", ignored.status, ignored.stdout.length, ignored.stderr.length);

const eof: any = spawnSync("/bin/cat", [], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
});
console.log("eof:", eof.status, eof.stdout.length);
