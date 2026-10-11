import { createHash, randomBytes } from "node:crypto";

const events: string[] = [];

function mark(label: string): string {
    events.push(label);
    return label;
}

const hash = crypto.createHash("sha1", mark("create-global"));
hash.update("a", (mark("update-string"),"utf8"));
hash.update(Buffer.from("bc"), mark("update-buffer"));
console.log("hash:", hash.digest("hex", mark("digest-global")));
const defaultDigest = crypto.createHash("sha1")
    .update("a")
    .digest(undefined, mark("digest-default"));
console.log("default:", defaultDigest.toString("hex").slice(0, 8));

const named = createHash("sha256", mark("create-named"))
    .update("abc", (mark("update-named"),"utf8"))
    .digest("hex", mark("digest-named"));
console.log("named:", named.slice(0, 8));

const a = crypto.randomBytes(2, undefined, mark("random-global"));
const b = randomBytes(1, undefined, mark("random-named"));
console.log("bytes:", a.length, b.length);
console.log("events:", events.join("|"));
