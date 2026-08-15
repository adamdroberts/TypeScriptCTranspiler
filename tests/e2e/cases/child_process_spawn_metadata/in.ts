import { spawn } from "child_process";

const child: any = spawn("/bin/printf", ["meta"]);
const outputStream: any = child.stdout;
outputStream.setEncoding("utf8");
outputStream.on("data", () => undefined);

console.log(
    "before:",
    child.spawnfile,
    child.spawnargs.length,
    child.spawnargs[0],
    child.spawnargs[1],
);

child.on("close", () => {
    console.log(
        "close:",
        child.spawnfile,
        child.spawnargs[0],
        child.spawnargs[1],
        child.exitCode,
        child.signalCode,
    );
});
