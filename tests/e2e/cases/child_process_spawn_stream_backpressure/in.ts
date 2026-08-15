import { spawn } from "child_process";

const payload = Buffer.alloc(32768, 65);
const child: any = spawn("/bin/sh", ["-c", "sleep 0.05; cat"]);
const events: string[] = [];

child.stdin.on("drain", () => events.push("drain"));
child.stdin.on("finish", () => events.push("finish"));
child.stdin.on("error", (error: any) => events.push(`stdin-error:${error}`));
child.stdin.write(payload, () => events.push("write-callback"));
const accepted = child.stdin.write(payload, () => events.push("second-write-callback"));
child.stdout.setEncoding("utf8");
let outputLength = 0;
child.stdout.on("data", (chunk: any) => outputLength += chunk.length);
child.stdin.end(() => events.push("end-callback"));

console.log(
    "write:",
    accepted === false,
    child.stdin.writableLength >= payload.length,
    child.stdin.writableNeedDrain,
    child.stdin.writableHighWaterMark,
);

child.on("close", () => {
    console.log(
        "close:",
        child.stdin.writableEnded,
        child.stdin.writableLength,
        child.stdin.writableNeedDrain,
        outputLength,
        events.join("|"),
    );

    const failing: any = spawn("/bin/true");
    const errors: string[] = [];
    failing.stdin.on("error", (error: any) => errors.push(String(error)));
    failing.on("close", () => {
        const lateAccepted = failing.stdin.write("late");
        console.log("error:", lateAccepted, errors.join("|"), failing.stdin.writableEnded);
    });
});
