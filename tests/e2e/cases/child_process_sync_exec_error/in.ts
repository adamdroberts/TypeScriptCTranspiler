import { execFileSync, execSync } from "child_process";

function missingExecFile(): string {
    try {
        return execFileSync("/definitely/not/tsc2c-missing-binary", { encoding: "utf8" });
    } catch (err) {
        return String(err);
    }
}

function missingExecShell(): string {
    try {
        return execSync("printf no", {
            encoding: "utf8",
            shell: "/definitely/not/tsc2c-missing-shell",
        });
    } catch (err) {
        return String(err);
    }
}

function childExit127(): string {
    try {
        return execFileSync("/bin/sh", ["-c", "exit 127"], { encoding: "utf8" });
    } catch (err) {
        return String(err);
    }
}

console.log("file:", missingExecFile());
console.log("shell:", missingExecShell());
console.log("exit127:", childExit127());
