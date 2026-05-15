import { spawnSync } from "child_process";

const command: any = spawnSync("printf shell-$TSC2C_SHELL_OPT", {
    encoding: "utf8",
    shell: true,
    env: { TSC2C_SHELL_OPT: "env" },
});
const args: any = spawnSync("printf", ["arg:%s", "two words"], {
    encoding: "utf8",
    shell: true,
});
const input: any = spawnSync("cat", {
    encoding: "utf8",
    shell: true,
    input: "stdin-shell",
});

console.log("shell command:", command.status, command.stdout);
console.log("shell args:", args.status, args.stdout);
console.log("shell input:", input.status, input.stdout);
