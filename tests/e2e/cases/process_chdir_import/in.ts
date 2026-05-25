import proc, { chdir, cwd } from "node:process";
import * as processNs from "process";

const before = cwd();

chdir("/tmp");
console.log("named:", cwd());

processNs.chdir(before);
console.log("namespace restored:", processNs.cwd() === before);

proc.chdir("/tmp");
console.log("default:", proc.cwd());

proc.chdir(before);
console.log("default restored:", cwd() === before);
