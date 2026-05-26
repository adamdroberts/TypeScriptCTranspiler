import { exec, execFile, execFileSync, execSync } from "child_process";

const events: string[] = [];

function note(label: string): void {
    events.push(label);
}

function mark(label: string): string {
    events.push(label);
    return label;
}

const sync = execSync("printf sync", void note("execSync-options"), mark("execSync-extra")).toString();
const fileSync = execFileSync("/bin/printf", ["file"], void note("execFileSync-options"), mark("execFileSync-extra")).toString();
const fileSyncSecond = execFileSync("/bin/true", void note("execFileSync-second-options"), mark("execFileSync-second-extra")).toString();

console.log("sync:", sync, fileSync, fileSyncSecond.length);

exec("printf exec", void note("exec-options"), (error: any, stdout: string, stderr: string): void => {
    console.log("exec:", error === null, stdout, stderr.length);
}, mark("exec-extra"));

execFile("/bin/printf", ["file-cb"], void note("execFile-options"), (error: any, stdout: string, stderr: string): void => {
    console.log("file-cb:", error === null, stdout, stderr.length);
}, mark("execFile-extra"));

execFile("/bin/true", void note("execFile-second-options"), (error: any, stdout: string, stderr: string): void => {
    console.log("file-second:", error === null, stdout.length, stderr.length);
}, mark("execFile-second-extra"));

console.log("events:", events.join("|"));
