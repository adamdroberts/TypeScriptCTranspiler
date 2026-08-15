import { spawn } from "child_process";

const child: any = spawn("/bin/sh", ["-c", "printf read-me; sleep 0.05"]);
const outputStream: any = child.stdout;
const events: string[] = [];

outputStream.setEncoding("utf8");
outputStream.pause();
const initial = `${outputStream.isPaused()}:${outputStream.paused}:${outputStream.readable}:${outputStream.readableFlowing}:${outputStream.readableEnded}`;
outputStream.on("data", (chunk: any) => events.push(`data:${chunk}`));
outputStream.on("end", () => events.push("end"));
outputStream.on("close", () => events.push("stream-close"));

setTimeout(() => {
    const zero = outputStream.read(0);
    const first = outputStream.read(4);
    const rest = outputStream.read();
    console.log(
        "read:",
        initial,
        zero === null,
        first,
        rest,
        outputStream.isPaused(),
        outputStream.readable,
        outputStream.readableEnded,
        events.length,
    );
    outputStream.resume();
}, 20);

child.on("close", () => console.log("close:", events.join("|")));
