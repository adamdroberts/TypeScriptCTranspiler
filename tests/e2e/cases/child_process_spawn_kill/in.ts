import * as childProcess from "node:child_process";

const child: any = childProcess.spawn("/bin/sleep", ["1"], { stdio: "ignore" });
const killed = child.kill("SIGTERM");
child.on("close", (code: any, signal: any) => console.log(`kill:${killed}:${code}:${signal}`));
