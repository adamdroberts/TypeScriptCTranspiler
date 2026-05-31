import cryptoDefault, { timingSafeEqual, timingSafeEqual as timingSafeEqualAlias } from "node:crypto";
import * as cryptoNs from "crypto";

const seen: string[] = [];
function mark(label: string): Buffer {
    seen.push(label);
    return Buffer.from(label);
}

function lengthMismatch(): string {
    try {
        return String(crypto.timingSafeEqual(Buffer.from("a"), Buffer.from("aa")));
    } catch (err) {
        return String(err);
    }
}

const a = Buffer.from("same");
const b = Buffer.from("same");
const c = Buffer.from("diff");

console.log("global:", crypto.timingSafeEqual(a, b, mark("global")), crypto.timingSafeEqual(a, c));
console.log("named:", timingSafeEqual(a, b), timingSafeEqualAlias(a, c));
console.log("modules:", cryptoNs.timingSafeEqual(a, b), cryptoDefault.timingSafeEqual(a, c));
console.log("error:", lengthMismatch());
console.log("seen:", seen.join(","));
