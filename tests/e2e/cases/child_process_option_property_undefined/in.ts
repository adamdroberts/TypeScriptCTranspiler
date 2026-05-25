import { exec, execFile, execFileSync, execSync, spawnSync } from "child_process";

const defaultStdio = undefined;

const syncOut = execSync("printf sync", {
    cwd: void 0,
    input: undefined,
    encoding: undefined,
    env: undefined,
    shell: undefined,
    windowsHide: undefined,
    uid: undefined,
    gid: undefined,
    maxBuffer: undefined,
    timeout: undefined,
    killSignal: undefined,
});
console.log("sync:", syncOut.toString());

const fileSyncOut = execFileSync("/bin/printf", ["file-sync"], {
    cwd: undefined,
    input: void 0,
    encoding: undefined,
    env: undefined,
    shell: undefined,
    argv0: undefined,
    windowsHide: undefined,
    windowsVerbatimArguments: undefined,
    uid: undefined,
    gid: undefined,
    maxBuffer: undefined,
    timeout: undefined,
    killSignal: undefined,
});
console.log("file-sync:", fileSyncOut.toString());

const spawned: any = spawnSync("/bin/printf", ["spawn"], {
    encoding: "utf8",
    cwd: undefined,
    input: undefined,
    env: undefined,
    shell: undefined,
    stdio: defaultStdio,
    argv0: undefined,
    detached: undefined,
    windowsHide: undefined,
    windowsVerbatimArguments: undefined,
    uid: undefined,
    gid: undefined,
    maxBuffer: undefined,
    timeout: undefined,
    killSignal: undefined,
});
console.log("spawn:", spawned.status, spawned.stdout, spawned.stderr.length, spawned.error === undefined);

exec("printf cb-exec", {
    cwd: undefined,
    encoding: void 0,
    env: undefined,
    shell: undefined,
    windowsHide: undefined,
    uid: undefined,
    gid: undefined,
    maxBuffer: undefined,
    timeout: undefined,
    killSignal: undefined,
}, (error: any, stdout: string, stderr: string): void => {
    console.log("exec:", error === null, stdout, stderr.length);
});

execFile("/bin/printf", ["file-cb"], {
    cwd: undefined,
    encoding: undefined,
    env: undefined,
    shell: void 0,
    argv0: undefined,
    windowsHide: undefined,
    windowsVerbatimArguments: undefined,
    uid: undefined,
    gid: undefined,
    maxBuffer: undefined,
    timeout: undefined,
    killSignal: undefined,
}, (error: any, stdout: string, stderr: string): void => {
    console.log("file-cb:", error === null, stdout, stderr.length);
});
