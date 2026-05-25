import crypto from "node:crypto";

const hash = crypto.createHash("sha1").update("abc").digest("hex");
const bytes = crypto.randomBytes(4);
const uuid = crypto.randomUUID();

console.log("default hash:", hash);
console.log("default bytes:", bytes.length);
console.log("default uuid:", uuid.length, uuid.charAt(14));
