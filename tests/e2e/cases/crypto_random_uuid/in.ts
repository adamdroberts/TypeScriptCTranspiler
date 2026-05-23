import { randomUUID } from "crypto";
import * as nodeCrypto from "node:crypto";

const a = crypto.randomUUID();
const b = randomUUID();
const c = nodeCrypto.randomUUID();
let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
const d = crypto.randomUUID({ disableEntropyCache: true }, mark("g"));
const e = randomUUID(undefined, mark("n"));
const f = nodeCrypto.randomUUID({ disableEntropyCache: false }, mark("m"));
const g = randomUUID({ disableEntropyCache: undefined }, mark("u"));

const variant = b.charAt(19);
console.log("shape:", a.length, a.charAt(8), a.charAt(13), a.charAt(18), a.charAt(23));
console.log("version:", a.charAt(14), b.charAt(14), c.charAt(14));
console.log("variant:", variant === "8" || variant === "9" || variant === "a" || variant === "b");
console.log("ignored:", d.length, e.charAt(14), f.charAt(14), g.length, seen);
