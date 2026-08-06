import * as childProcess from "node:child_process";

const reader: any = childProcess.spawn("/bin/cat");
const readerEvents: string[] = [];
reader.stdout.setEncoding("utf8");
reader.stdout.on("data", (chunk: any) => readerEvents.push(`data:${chunk}`));
reader.stdout.on("end", () => readerEvents.push("end"));
reader.on("close", (code: any, signal: any) => {
    readerEvents.push(`close:${code}:${signal}`);
    console.log(readerEvents.join("|"));
});
reader.stdin.end("stdin-ok");
