import { spawn } from "child_process";

const child: any = spawn("/definitely/not-a-tsc2c-child", [], { stdio: "ignore" });
const events: string[] = [];

child.on("spawn", () => events.push("spawn"));
child.on("error", (error: any) => events.push(`error:${error}`));
child.on("exit", (code: any, signal: any) => events.push(`exit:${code}:${signal}`));
child.on("close", (code: any, signal: any) => {
    events.push(`close:${code}:${signal}`);
    console.log(events.join("|"));
});
