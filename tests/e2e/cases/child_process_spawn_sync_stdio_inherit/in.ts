import { spawnSync } from "child_process";

const INHERIT = "inherit";
const PIPE = "pipe";

const tuple = spawnSync("/bin/printf", ["tuple-out\n"], {
    encoding: "utf8",
    stdio: [INHERIT, INHERIT, PIPE],
});

const literal = spawnSync("/bin/printf", ["literal-out\n"], {
    encoding: "utf8",
    stdio: INHERIT,
});
console.log("tuple:", tuple.stdout, tuple.stderr.length);
console.log("literal:", literal.stdout, literal.stderr);
