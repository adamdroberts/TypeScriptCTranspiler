import { spawn } from "child_process";

const child: any = spawn("/bin/sleep", ["1"], {
    stdio: "ignore",
    timeout: 20,
});

console.log(`before:${child.killed}:${child.exitCode}`);
child.once("spawn", () => console.log("spawn"));
child.once("close", (code: any, signal: any) => {
    console.log(`close:${child.killed}:${code}:${signal}`);
});
