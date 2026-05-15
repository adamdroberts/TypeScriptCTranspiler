const aa = Buffer.from("aa");
const ab = Buffer.from("ab");

console.log("byte length:", Buffer.byteLength("hello"), Buffer.byteLength("4869", "hex"), Buffer.byteLength(aa));
console.log("encoding:", Buffer.isEncoding("utf8"), Buffer.isEncoding("utf-8"), Buffer.isEncoding("hex"), Buffer.isEncoding("base64"));
console.log("compare:", Buffer.compare(aa, ab), Buffer.compare(ab, aa), Buffer.compare(aa, Buffer.from("aa")));
console.log("instance compare:", aa.compare(ab), ab.compare(aa), aa.compare(Buffer.from("aa")));
console.log("utf-8:", Buffer.from("Hi", "utf-8").toString("utf-8"));
