const text = Buffer.from("Hi");
console.log("len:", text.length);
console.log("bytes:", text[0], text[1]);
text[1] = 111;
console.log("mutated:", text.toString());

const bytes = Buffer.from([0, 15, 16, 255, 256, -1]);
console.log("array hex:", bytes.toString("hex"));

const hex = Buffer.from("486900ff", "hex");
console.log("hex:", hex.toString("hex"));
console.log("slice:", hex.slice(0, 2).toString());
console.log("subarray:", hex.subarray(1, 3).toString("hex"));

const filled = Buffer.alloc(3, 65);
console.log("filled:", filled.toString());

const joined = Buffer.concat([hex.slice(0, 2), Buffer.from("!")]);
console.log("joined:", joined.toString());
console.log("equals:", hex.equals(Buffer.from("486900ff", "hex")));
console.log("is buffer:", Buffer.isBuffer(hex), Buffer.isBuffer("x"));
console.log("typeof:", typeof hex);
