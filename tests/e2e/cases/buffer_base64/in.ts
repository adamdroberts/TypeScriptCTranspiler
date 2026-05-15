const hi = Buffer.from("SGk=", "base64");
const hello = Buffer.from("SGVsbG8=", "base64");

console.log("decode:", hi.toString(), hello.toString());
console.log("encode:", Buffer.from("Hi").toString("base64"), Buffer.from("Hello").toString("base64"));
console.log("byte length:", Buffer.byteLength("SGk=", "base64"), Buffer.byteLength("SGVsbG8=", "base64"));
