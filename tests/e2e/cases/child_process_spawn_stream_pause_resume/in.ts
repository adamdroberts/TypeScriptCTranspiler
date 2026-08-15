import { spawn } from "child_process";

const child: any = spawn("/bin/sh", ["-c", "printf first; sleep 0.05; printf second"]);
const outputStream: any = child.stdout;
const chunks: string[] = [];
let dataBeforeResume = 0;
let resumed = false;

outputStream.setEncoding("utf8");
outputStream.pause();
const initial = `${outputStream.isPaused()}:${outputStream.paused}:${outputStream.readable}:${outputStream.readableFlowing}:${outputStream.readableEnded}`;
outputStream.on("data", (chunk: any) => {
    if (!resumed) dataBeforeResume++;
    chunks.push(chunk);
});

setTimeout(() => {
    console.log("paused:", initial, dataBeforeResume, outputStream.isPaused(), outputStream.readableFlowing);
    resumed = true;
    outputStream.resume();
    console.log("resumed:", outputStream.isPaused(), outputStream.paused, outputStream.readableFlowing);
}, 20);

child.on("close", () => {
    console.log(
        "close:",
        chunks.join(""),
        chunks.length,
        dataBeforeResume,
        outputStream.readable,
        outputStream.readableEnded,
        outputStream.isPaused(),
    );
});
