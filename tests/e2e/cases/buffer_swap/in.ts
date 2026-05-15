const a = Buffer.from("00112233", "hex");
const swapped = a.swap16();
console.log("swap16:", swapped === a, a.toString("hex"));

const b = Buffer.from("0011223344556677", "hex");
console.log("swap32:", b.swap32().toString("hex"));

const c = Buffer.from("0011223344556677", "hex");
console.log("swap64:", c.swap64().toString("hex"));
