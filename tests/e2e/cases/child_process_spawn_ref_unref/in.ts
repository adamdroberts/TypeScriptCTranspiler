import { spawn } from "child_process";

const refChild: any = spawn("/bin/printf", ["ref-data"]);
const refOutput: string[] = [];
refChild.stdout.setEncoding("utf8");
refChild.stdout.on("data", (chunk: any) => refOutput.push(chunk));
refChild.on("close", () => {
    console.log("ref:", refOutput.join(""));

    const unrefChild: any = spawn("/bin/sh", ["-c", "sleep 0.05; printf late-data"]);
    unrefChild.stdout.setEncoding("utf8");
    unrefChild.stdout.on("data", () => console.log("late-data"));
    unrefChild.unref();
    setTimeout(() => console.log("unref-window"), 10);
});

refChild.unref();
refChild.ref();
