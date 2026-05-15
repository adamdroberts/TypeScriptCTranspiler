import { spawnSync } from "child_process";

const tuple = spawnSync("/bin/printf", ["tuple-out\n"], {
    encoding: "utf8",
    stdio: ["inherit", "inherit", "pipe"],
});

const literal = spawnSync("/bin/printf", ["literal-out\n"], {
    encoding: "utf8",
    stdio: "inherit",
});
console.log("tuple:", tuple.stdout, tuple.stderr.length);
console.log("literal:", literal.stdout, literal.stderr);
