import { spawn } from "child_process";

const child: any = spawn("/bin/sh", ["-c", "printf '%s' \"$0\""], {
    argv0: "spawn-argv0",
    windowsHide: true,
    windowsVerbatimArguments: true,
});
const output: string[] = [];
child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk: any) => output.push(chunk));
child.on("close", () => console.log(`argv0:${output.join("")}`));
