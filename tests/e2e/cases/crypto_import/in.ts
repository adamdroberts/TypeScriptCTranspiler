import * as nodeCrypto from "node:crypto";
import { createHash, createHash as createHashAlias } from "crypto";

console.log(createHash("sha1").update("abc").digest("hex"));
console.log(nodeCrypto.createHash("sha256").update(Buffer.from("abc")).digest("hex"));
console.log("alias:", createHashAlias("sha1").update(Buffer.from("abc")).digest("hex").slice(0, 8));
