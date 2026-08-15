import { spawn } from "child_process";

const child: any = spawn("/bin/true");
console.log(
    "pipe:",
    child.stdio.length,
    child.stdio[0] === child.stdin,
    child.stdio[1] === child.stdout,
    child.stdio[2] === child.stderr,
);
child.on("close", () => {
    console.log(
        "close:",
        child.stdio.length,
        child.stdio[0] === child.stdin,
        child.stdio[1] === child.stdout,
        child.stdio[2] === child.stderr,
    );
});

const ignored: any = spawn("/bin/true", [], { stdio: "ignore" });
console.log("ignore:", ignored.stdio.length, ignored.stdio[0], ignored.stdio[1], ignored.stdio[2]);
