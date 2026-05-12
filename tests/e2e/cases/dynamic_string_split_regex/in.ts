const text: any = "Ada  Lovelace\t1843";
const parts: any = text.split(/\s+/);
console.log("parts:", parts.join("|"), parts.length, parts[2]);

const unchanged: any = text.split(/Byron/);
console.log("unchanged:", unchanged.join("|"), unchanged.length);
