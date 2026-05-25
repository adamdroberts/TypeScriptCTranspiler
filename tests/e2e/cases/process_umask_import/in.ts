import { umask } from "node:process";
import * as proc from "process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

const current = umask();
const restoreNamed = umask(current, mark("n"));
const restoreNamespace = proc.umask(current, mark("p"));

console.log("umask:", current >= 0, restoreNamed >= 0, restoreNamespace >= 0);
console.log("restored:", umask() === current);
console.log("ignored:", seen);
