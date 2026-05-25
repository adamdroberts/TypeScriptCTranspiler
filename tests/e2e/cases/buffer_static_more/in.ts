const aa = Buffer.from("aa");
const ab = Buffer.from("ab");
let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

console.log("byte length:", Buffer.byteLength("hello", void 0, mark("l")), Buffer.byteLength("4869", "hex", mark("h")), Buffer.byteLength(aa, "utf8", mark("b")));
console.log("encoding:", Buffer.isEncoding("utf8", mark("u")), Buffer.isEncoding("utf-8"), Buffer.isEncoding("hex"), Buffer.isEncoding("base64"));
console.log("compare:", Buffer.compare(aa, ab, mark("c")), Buffer.compare(ab, aa), Buffer.compare(aa, Buffer.from("aa")));
console.log("instance compare:", aa.compare(ab), ab.compare(aa), aa.compare(Buffer.from("aa")));
console.log("utf-8:", Buffer.from("Hi", "utf-8").toString("utf-8"));
console.log("ignored:", seen);
