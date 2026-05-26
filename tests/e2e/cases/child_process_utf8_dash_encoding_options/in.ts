import { execFileSync, execSync, spawnSync } from "child_process";

const UTF8_DASH = "utf-8";
const EXEC_OPTIONS = { encoding: UTF8_DASH, input: "exec-alias" } as const;
const FILE_OPTIONS = { encoding: UTF8_DASH } as const;
const SPAWN_OPTIONS = { encoding: UTF8_DASH } as const;

const execOut: string = execSync("/bin/cat", EXEC_OPTIONS);
const fileOut: string = execFileSync("/bin/printf", ["file-alias"], FILE_OPTIONS);
const spawned: any = spawnSync("/bin/printf", ["spawn-alias"], SPAWN_OPTIONS);

console.log("exec:", typeof execOut, execOut);
console.log("file:", typeof fileOut, fileOut);
console.log("spawn:", typeof spawned.stdout, spawned.stdout, typeof spawned.stderr, spawned.stderr.length);
