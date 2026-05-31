import crypto, { createHmac as makeHmac } from "node:crypto";
import * as cryptoNs from "crypto";

// 1. Basic sha256 with string key
const hmac1 = crypto.createHmac("sha256", "secret-key");
hmac1.update("hello ");
hmac1.update("world");
console.log("sha256 string-key hex:", hmac1.digest("hex"));

// 2. sha1 with Buffer key
const hmac2 = crypto.createHmac("sha1", Buffer.from("secret-key-2"));
hmac2.update(Buffer.from("some data"));
console.log("sha1 buffer-key base64:", hmac2.digest("base64"));

// 3. sha512 with digest as Buffer
const hmac3 = crypto.createHmac("sha512", "another-key");
hmac3.update("more bytes");
const buf = hmac3.digest("buffer");
console.log("sha512 string-key buffer-digest:", Buffer.isBuffer(buf), buf.toString("hex").slice(0, 16));

// 4. Explicit hex encoding
const hmac4 = crypto.createHmac("sha256", "key");
hmac4.update("xyz");
console.log("explicit hex digest:", hmac4.digest("hex"));

// 5. Named import support
console.log("named import:", makeHmac("sha256", "named-key").update("abc").digest("hex"));

// 6. Namespace import support
console.log("namespace import:", cryptoNs.createHmac("sha512", Buffer.from("ns-key")).update("abc").digest("base64").slice(0, 24));

// 7. This subset defaults missing HMAC digest encoding to a hex string, matching CryptoHash.
const defaultDigest: string = crypto.createHmac("sha256", "key").update("xyz").digest();
console.log("default digest:", defaultDigest.slice(0, 16));
