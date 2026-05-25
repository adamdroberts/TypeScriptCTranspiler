import streamDefault from "node:stream";
import * as streamNs from "stream";
import { isDestroyed, isErrored } from "node:stream";
import { stdin, stdout, stderr } from "node:process";

let ignored = 0;
function mark(): string {
    ignored += 1;
    return "ignored";
}

console.log("named errored:", isErrored(stdin), isErrored(stdout), isErrored(stderr));
console.log("named destroyed:", isDestroyed(stdin), isDestroyed(stdout), isDestroyed(stderr));
console.log("namespace:", streamNs.isErrored(stdout), streamNs.isDestroyed(stderr));
console.log("default:", streamDefault.isErrored(stdin, mark()), streamDefault.isDestroyed(stdout, mark()));
console.log("ignored:", ignored);
