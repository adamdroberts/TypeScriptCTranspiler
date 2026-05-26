import streamDefault from "node:stream";
import * as streamNs from "stream";
import { isDestroyed, isErrored, isReadable, isWritable } from "node:stream";

let seen = 0;
function mark(): any {
    seen += 1;
    return {};
}

const missing: any = undefined;
const nothing: any = null;
const plain: any = {};

console.log("nullable:", isReadable(missing), isReadable(nothing), streamNs.isWritable(plain), isDestroyed(mark()));
console.log("boolean:", isErrored(plain), streamDefault.isDisturbed(nothing), streamNs.isErrored(mark()), streamDefault.isDisturbed(mark()));
console.log("ignored:", streamDefault.isReadable(plain, mark()), streamNs.isDestroyed(nothing, mark()), seen);
