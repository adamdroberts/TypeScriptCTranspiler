import childProcess from "node:child_process";

const UTF8 = "utf8";
const sync = childProcess.execSync("printf default-sync");
const spawn: any = childProcess.spawnSync("/bin/printf", ["default-spawn"], { encoding: UTF8 });

childProcess.exec("printf default-callback", (err: any, stdout: string, stderr: string): void => {
    console.log("default callback:", err === null, stdout, stderr.length);
});

console.log("default sync:", Buffer.isBuffer(sync), sync.toString());
console.log("default spawn:", spawn.status, spawn.stdout, spawn.stderr.length);
const asyncSpawn: any = childProcess.spawn("/bin/printf", ["default-async"]);
asyncSpawn.stdout.setEncoding("utf8");
let asyncOutput = "";
asyncSpawn.stdout.on("data", (chunk: any) => asyncOutput += chunk);
asyncSpawn.on("close", (code: any, signal: any) => console.log("default async:", code, signal, asyncOutput));
