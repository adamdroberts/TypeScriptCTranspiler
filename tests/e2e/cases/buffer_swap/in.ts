let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

const a = Buffer.from("00112233", "hex");
const swapped = a.swap16(mark("a"));
console.log("swap16:", swapped === a, a.toString("hex"));

const b = Buffer.from("0011223344556677", "hex");
console.log("swap32:", b.swap32(mark("b")).toString("hex"));

const c = Buffer.from("0011223344556677", "hex");
console.log("swap64:", c.swap64(mark("c")).toString("hex"));
console.log("ignored:", seen);
