import streamDefault from "node:stream";
import * as streamNs from "stream";
import { isReadable, isWritable } from "node:stream";
import processDefault, { stdin, stdout, stderr } from "node:process";

let ignored = 0;
function mark(): number {
    ignored += 1;
    return ignored;
}

console.log("named readable:", isReadable(stdin), isReadable(stdout), isReadable(stderr));
console.log("named writable:", isWritable(stdin), isWritable(stdout), isWritable(stderr));
console.log("namespace:", streamNs.isReadable(processDefault.stdin), streamNs.isWritable(processDefault.stdout));
console.log("default:", streamDefault.isReadable(processDefault.stderr), streamDefault.isWritable(processDefault.stderr, mark()));
console.log("ignored:", ignored);
