import proc, { chdir, cwd } from "node:process";
import * as processModule from "process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

const here = cwd();

process.chdir(here, mark("g"));
chdir(here, mark("n"));
processModule.chdir(here, mark("m"));
proc.chdir(here, mark("d"));

console.log("same:", cwd() === here);
console.log("seen:", seen);
