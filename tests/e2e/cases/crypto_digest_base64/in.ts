console.log(crypto.createHash("sha1").update("abc").digest("base64"));
console.log(crypto.createHash("sha256").update(Buffer.from("abc")).digest("base64"));
