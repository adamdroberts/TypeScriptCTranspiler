import { randomUUID } from "crypto";
import * as nodeCrypto from "node:crypto";

const a = crypto.randomUUID();
const b = randomUUID();
const c = nodeCrypto.randomUUID();
const DISABLE_CACHE_TRUE = true;
const DISABLE_CACHE_FALSE = false;
let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
const d = crypto.randomUUID({ disableEntropyCache: DISABLE_CACHE_TRUE }, mark("g"));
const e = randomUUID(void 0, mark("n"));
const f = nodeCrypto.randomUUID({ disableEntropyCache: DISABLE_CACHE_FALSE }, mark("m"));
const g = randomUUID({ disableEntropyCache: void 0 }, mark("u"));

const variant = b.charAt(19);
console.log("shape:", a.length, a.charAt(8), a.charAt(13), a.charAt(18), a.charAt(23));
console.log("version:", a.charAt(14), b.charAt(14), c.charAt(14));
console.log("variant:", variant === "8" || variant === "9" || variant === "a" || variant === "b");
console.log("ignored:", d.length, e.charAt(14), f.charAt(14), g.length, seen);
