import { createHash, randomBytes } from "node:crypto";

const events: string[] = [];

function mark(label: string): string {
    events.push(label);
    return label;
}

const hash = crypto.createHash("sha1", mark("create-global"));
hash.update("a", mark("update-string"));
hash.update(Buffer.from("bc"), mark("update-buffer"));
console.log("hash:", hash.digest("hex", mark("digest-global")));

const named = createHash("sha256", mark("create-named"))
    .update("abc", mark("update-named"))
    .digest("hex", mark("digest-named"));
console.log("named:", named.slice(0, 8));

const a = crypto.randomBytes(2, mark("random-global"));
const b = randomBytes(1, mark("random-named"));
console.log("bytes:", a.length, b.length);
console.log("events:", events.join("|"));
