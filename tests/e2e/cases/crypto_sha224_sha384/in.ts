import crypto, { createHash, createHmac } from "node:crypto";
import * as cryptoNs from "crypto";

// 1. SHA-224 Hash Basic & Buffer Update
const hash224_1 = crypto.createHash("sha224");
hash224_1.update("hello ");
hash224_1.update("world");
console.log("sha224 hash hex:", hash224_1.digest("hex"));

const hash224_2 = createHash("sha224");
hash224_2.update(Buffer.from("abc"));
console.log("sha224 hash base64:", hash224_2.digest("base64"));

// 2. SHA-384 Hash Basic & Buffer Update
const hash384_1 = crypto.createHash("sha384");
hash384_1.update("hello ");
hash384_1.update("world");
console.log("sha384 hash hex:", hash384_1.digest("hex"));

const hash384_2 = createHash("sha384");
hash384_2.update(Buffer.from("abc"));
console.log("sha384 hash base64:", hash384_2.digest("base64"));

// 3. SHA-224 HMAC basic with string key and Buffer key
const hmac224_1 = crypto.createHmac("sha224", "secret-key");
hmac224_1.update("hello ");
hmac224_1.update("world");
console.log("sha224 hmac hex:", hmac224_1.digest("hex"));

const hmac224_2 = createHmac("sha224", Buffer.from("secret-key-2"));
hmac224_2.update(Buffer.from("some data"));
console.log("sha224 hmac base64:", hmac224_2.digest("base64"));

// 4. SHA-384 HMAC basic with string key and Buffer key
const hmac384_1 = crypto.createHmac("sha384", "secret-key");
hmac384_1.update("hello ");
hmac384_1.update("world");
console.log("sha384 hmac hex:", hmac384_1.digest("hex"));

const hmac384_2 = createHmac("sha384", Buffer.from("secret-key-2"));
hmac384_2.update(Buffer.from("some data"));
console.log("sha384 hmac base64:", hmac384_2.digest("base64"));

// 5. Default digest and Buffer digest
const hmac224_3 = cryptoNs.createHmac("sha224", "key");
hmac224_3.update("xyz");
console.log("sha224 hmac default:", hmac224_3.digest());

const hmac384_3 = cryptoNs.createHmac("sha384", "key");
hmac384_3.update("xyz");
const buf = hmac384_3.digest("buffer");
console.log("sha384 hmac buffer:", Buffer.isBuffer(buf), buf.toString("hex").slice(0, 16));
