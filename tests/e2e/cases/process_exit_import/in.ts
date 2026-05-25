import proc, { exit } from "node:process";
import * as processNs from "process";

function defaultExit(): void {
    proc.exit(0);
}

function namespaceExit(): void {
    processNs.exit(0);
}

console.log("before exit", typeof defaultExit, typeof namespaceExit);
exit(0);
console.log("after exit");
