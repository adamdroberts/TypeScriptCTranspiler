import { spawn } from "child_process";

const child: any = spawn("/bin/sh", ["-c", "printf out; printf err >&2"]);
const events: string[] = [];

child.on("spawn", () => events.push("spawn"));
child.stdout.on("data", (chunk: any) => events.push(`stdout:${chunk.toString()}`));
child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk: any) => events.push(`stderr:${chunk}`));
child.stdout.once("end", () => events.push("stdout-end"));
child.stderr.once("end", () => events.push("stderr-end"));
child.on("exit", (code: any, signal: any) => events.push(`exit:${code}:${signal}`));
child.on("close", (code: any, signal: any) => {
    events.push(`close:${code}:${signal}`);
    console.log(events.sort().join("|"));
});
child.on("error", (error: any) => events.push(`error:${error}`));
