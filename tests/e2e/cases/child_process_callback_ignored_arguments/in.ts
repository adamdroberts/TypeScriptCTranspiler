import childProcess from "node:child_process";
import { exec, exec as execAlias, execFile, execFile as execFileAlias } from "node:child_process";

const events: string[] = [];

function mark(name: string): string {
    events.push(name);
    return name;
}

function record(label: string) {
    return (error: any, stdout: string, stderr: string): void => {
        events.push(label + ":" + (error === null) + ":" + stdout + ":" + stderr.length);
    };
}

exec("printf exec", record("exec"), mark("exec-extra"));
execAlias("printf exec-alias", record("exec-alias"), mark("exec-alias-extra"));
childProcess.exec("printf ns", { shell: "/bin/sh" }, record("exec-options"), mark("exec-options-extra"));

execFile("/bin/true", record("file-callback"), mark("file-callback-extra"));
execFile("/bin/printf", ["file"], record("file-args"), mark("file-args-extra"));
execFileAlias("/bin/printf", ["file-alias"], record("file-alias"), mark("file-alias-extra"));
execFile("/bin/true", { shell: "/bin/sh" }, record("file-options"), mark("file-options-extra"));
childProcess.execFile("/bin/printf", ["file-opt"], { shell: false }, record("file-args-options"), mark("file-args-options-extra"));

console.log(events.join("|"));
