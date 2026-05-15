console.log(crypto.createHash("sha1").update("abc").digest("hex"));

const sha512 = crypto.createHash("sha512");
sha512.update("a");
sha512.update(Buffer.from("bc"));
console.log(sha512.digest("hex"));

const bytes = Buffer.from("4869", "hex");
console.log(crypto.createHash("sha256").update(bytes).digest("hex"));
