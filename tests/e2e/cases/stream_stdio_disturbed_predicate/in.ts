import streamDefault from "node:stream";
import * as streamNs from "stream";
import { isDisturbed } from "node:stream";
import { stdin, stdout, stderr } from "node:process";

let ignored = 0;
function mark(): string {
    ignored += 1;
    return "ignored";
}

console.log("named:", isDisturbed(stdin), isDisturbed(stdout), isDisturbed(stderr));
console.log("namespace:", streamNs.isDisturbed(stdout));
console.log("default:", streamDefault.isDisturbed(stderr, mark()));
console.log("ignored:", ignored);
