import { umask, umask as umaskAlias } from "node:process";
import * as proc from "process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

const current = umask();
const restoreNamed = umask(current, mark("n"));
const restoreAlias = umaskAlias(current, mark("a"));
const restoreNamespace = proc.umask(current, mark("p"));

console.log("umask:", current >= 0, restoreNamed >= 0, restoreAlias >= 0, restoreNamespace >= 0);
console.log("restored:", umaskAlias() === current);
console.log("ignored:", seen);
