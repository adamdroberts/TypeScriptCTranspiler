import { spawn } from "child_process";

const child: any = spawn("/bin/printf", ["closed"]);
const outputStream: any = child.stdout;
const events: string[] = [];

outputStream.setEncoding("utf8");
outputStream.on("data", (chunk: any) => events.push(`data:${chunk}`));
outputStream.on("end", () => events.push("end"));
outputStream.on("close", () => events.push("stream-close"));
child.on("close", () => {
    events.push("child-close");
    console.log(events.join("|"));
});
