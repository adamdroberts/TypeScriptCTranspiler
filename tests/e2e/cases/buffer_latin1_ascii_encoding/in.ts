console.log("isEncoding latin1:", Buffer.isEncoding("latin1"));
console.log("isEncoding binary:", Buffer.isEncoding("binary"));
console.log("isEncoding ascii:", Buffer.isEncoding("ascii"));

const strAscii = "Hello World!";
const strLatin1 = "héllo \u00ff"; // 'é' is \u00e9, 'ÿ' is \u00ff
const strUnicode = "héllo \u0100 \ud83d\ude00"; // \u0100 is 256, \ud83d\ude00 is surrogate pair for \u{1F600}

console.log("byteLength ascii strAscii:", Buffer.byteLength(strAscii, "ascii"));
console.log("byteLength latin1 strAscii:", Buffer.byteLength(strAscii, "latin1"));
console.log("byteLength binary strAscii:", Buffer.byteLength(strAscii, "binary"));

console.log("byteLength ascii strLatin1:", Buffer.byteLength(strLatin1, "ascii"));
console.log("byteLength latin1 strLatin1:", Buffer.byteLength(strLatin1, "latin1"));
console.log("byteLength binary strLatin1:", Buffer.byteLength(strLatin1, "binary"));

console.log("byteLength ascii strUnicode:", Buffer.byteLength(strUnicode, "ascii"));
console.log("byteLength latin1 strUnicode:", Buffer.byteLength(strUnicode, "latin1"));
console.log("byteLength binary strUnicode:", Buffer.byteLength(strUnicode, "binary"));

// Buffer.from
const bufAscii = Buffer.from(strLatin1, "ascii");
const bufLatin1 = Buffer.from(strLatin1, "latin1");
const bufBinary = Buffer.from(strLatin1, "binary");

console.log("from ascii hex:", bufAscii.toString("hex"));
console.log("from latin1 hex:", bufLatin1.toString("hex"));
console.log("from binary hex:", bufBinary.toString("hex"));

const bufUnicodeAscii = Buffer.from(strUnicode, "ascii");
const bufUnicodeLatin1 = Buffer.from(strUnicode, "latin1");

console.log("from unicode ascii hex:", bufUnicodeAscii.toString("hex"));
console.log("from unicode latin1 hex:", bufUnicodeLatin1.toString("hex"));

// toString
const sourceBuf = Buffer.from("48656c6c6f20c3a920ff", "hex"); // "Hello " + "é" in utf8 + 0xff
console.log("toString ascii:", sourceBuf.toString("ascii"));
console.log("toString latin1:", sourceBuf.toString("latin1"));
console.log("toString binary:", sourceBuf.toString("binary"));

// write
const writeBuf = Buffer.alloc(20, 0);
writeBuf.write("héllo \u00ff", 0, undefined, "latin1");
console.log("write latin1 hex:", writeBuf.toString("hex"));
