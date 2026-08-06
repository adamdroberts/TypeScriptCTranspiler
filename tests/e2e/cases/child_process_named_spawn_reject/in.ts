import { spawn } from "child_process";

const child: any = spawn("/bin/true");
child.on("close", (code: any, signal: any) => console.log(`named:${code}:${signal}`));
