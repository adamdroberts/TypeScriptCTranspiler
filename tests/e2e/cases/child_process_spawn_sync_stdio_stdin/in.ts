import { spawnSync } from "child_process";

const PIPE = "pipe";
const IGNORE = "ignore";

const piped: any = spawnSync("/bin/cat", [], {
    encoding: "utf8",
    input: "pipe-input",
    stdio: [PIPE, PIPE, PIPE],
});
console.log("pipe:", piped.status, piped.stdout, piped.stderr.length);

const ignored: any = spawnSync("/bin/cat", [], {
    encoding: "utf8",
    input: "ignore-input",
    stdio: [IGNORE, PIPE, PIPE],
});
console.log("ignore:", ignored.status, ignored.stdout.length, ignored.stderr.length);

const eof: any = spawnSync("/bin/cat", [], {
    encoding: "utf8",
    stdio: [PIPE, PIPE, PIPE],
});
console.log("eof:", eof.status, eof.stdout.length);
