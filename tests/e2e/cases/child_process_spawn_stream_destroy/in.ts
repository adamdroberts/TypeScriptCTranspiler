import { spawn } from "child_process";

const child: any = spawn("/bin/sleep", ["0.05"]);
const outputStream: any = child.stdout;
const events: string[] = [];

outputStream.on("error", (error: any) => events.push(`error:${error}`));
outputStream.on("close", () => events.push("stream-close"));
const returned: any = outputStream.destroy("stop", (error: any) => events.push(`callback:${error}`));
const state = `${returned === outputStream}:${outputStream.destroyed}:${outputStream.readable}:${outputStream.readableEnded}`;
outputStream.destroy(() => events.push("second-callback"));

console.log("destroy:", state);
child.on("close", () => {
    console.log("close:", events.join("|"), outputStream.destroyed, outputStream.readableEnded);
});
