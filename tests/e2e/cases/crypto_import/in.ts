import * as nodeCrypto from "node:crypto";
import { createHash } from "crypto";

console.log(createHash("sha1").update("abc").digest("hex"));
console.log(nodeCrypto.createHash("sha256").update(Buffer.from("abc")).digest("hex"));
