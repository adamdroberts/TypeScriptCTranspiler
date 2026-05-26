import childProcess from "node:child_process";
import { execFileSync, execSync, spawnSync } from "node:child_process";

const events: string[] = [];

function mark(name: string): string {
    events.push(name);
    return name;
}

const UTF8_OPTIONS = { encoding: "utf8" } as const;

const execOut = execSync("printf exec", UTF8_OPTIONS, mark("exec-extra"));
const fileOut = execFileSync("/bin/printf", ["file"], UTF8_OPTIONS, mark("file-extra"));
const fileOptionsOut = childProcess.execFileSync("/bin/true", UTF8_OPTIONS, mark("file-options-extra"));
const spawnOut: any = spawnSync("/bin/printf", ["spawn"], UTF8_OPTIONS, mark("spawn-extra"));
const spawnOptionsOut: any = childProcess.spawnSync("/bin/true", UTF8_OPTIONS, mark("spawn-options-extra"));

console.log("exec:", execOut);
console.log("file:", fileOut);
console.log("file-options-length:", fileOptionsOut.length);
console.log("spawn:", spawnOut.status, spawnOut.stdout);
console.log("spawn-options:", spawnOptionsOut.status, spawnOptionsOut.stdout.length);
console.log("events:", events.join("|"));
