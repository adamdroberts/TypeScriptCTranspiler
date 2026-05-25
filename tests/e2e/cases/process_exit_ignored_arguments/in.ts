import proc, { exit } from "node:process";
import * as processModule from "process";

function namedExit(): void {
    exit(0, "named");
}

function namespaceExit(): void {
    processModule.exit(0, "namespace");
}

function defaultExit(): void {
    proc.exit(0, "default");
}

function mark(label: string): number {
    console.log("ignored:", label);
    return 0;
}

console.log("before:", typeof namedExit, typeof namespaceExit, typeof defaultExit);
process.exit(0, mark("global"));
console.log("after");
