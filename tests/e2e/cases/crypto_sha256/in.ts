const h = crypto.createHash("sha256");
h.update("hello ");
h.update("world");
console.log(h.digest("hex"));

console.log(crypto.createHash("sha256").update("abc").digest("hex"));
