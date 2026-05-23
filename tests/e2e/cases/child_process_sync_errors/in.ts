import { execFileSync, execSync } from "child_process";

function failedExecSync(): string {
    try {
        return execSync("exit 7", { encoding: "utf8" });
    } catch (err) {
        return String(err);
    }
}

function failedExecFileSync(): string {
    try {
        return execFileSync("/bin/sh", ["-c", "exit 9"], { encoding: "utf8" });
    } catch (err) {
        return String(err);
    }
}

function maxBufferExecSync(): string {
    try {
        return execSync("printf abcdef", { encoding: "utf8", maxBuffer: 3 });
    } catch (err) {
        return String(err);
    }
}

function timeoutExecFileSync(): string {
    try {
        return execFileSync("/bin/sh", ["-c", "sleep 1"], { encoding: "utf8", timeout: 1 });
    } catch (err) {
        return String(err);
    }
}

console.log("exec:", failedExecSync());
console.log("file:", failedExecFileSync());
console.log("maxBuffer:", maxBufferExecSync());
console.log("timeout:", timeoutExecFileSync());
console.log("valid:", execSync("printf ok", { encoding: "utf8" }));
