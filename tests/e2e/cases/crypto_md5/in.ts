import crypto, { createHash, createHmac } from "node:crypto";
import * as cryptoNs from "crypto";

// 1. createHash('md5') basic and Buffer update
const hash1 = crypto.createHash("md5");
hash1.update("hello ");
hash1.update("world");
console.log("hash1:", hash1.digest("hex"));

const hash2 = createHash("md5");
hash2.update(Buffer.from("abc"));
console.log("hash2:", hash2.digest("base64"));

// 2. createHmac('md5') basic with string key and Buffer key
const hmac1 = crypto.createHmac("md5", "secret-key");
hmac1.update("hello ");
hmac1.update("world");
console.log("hmac1:", hmac1.digest("hex"));

const hmac2 = createHmac("md5", Buffer.from("secret-key-2"));
hmac2.update(Buffer.from("some data"));
console.log("hmac2:", hmac2.digest("base64"));

// 3. Namespace import support & buffer digest
const hmac3 = cryptoNs.createHmac("md5", "another-key");
hmac3.update("more bytes");
const buf = hmac3.digest("buffer");
console.log("hmac3 hex from buffer:", buf.toString("hex"));

// 4. Catch that unsupported algorithms still throw in our transpiled runtime
try {
    crypto.createHash("sha384-unsupported" as any);
} catch (e) {
    console.log("sha384 throw caught:", String(e));
}

try {
    crypto.createHmac("sha384-unsupported" as any, "key");
} catch (e) {
    console.log("hmac sha384 throw caught:", String(e));
}
