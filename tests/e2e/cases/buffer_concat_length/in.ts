const parts = [Buffer.from("ab"), Buffer.from("cd")];

console.log("exact:", Buffer.concat(parts, 4).toString());
console.log("short:", Buffer.concat(parts, 3).toString());
console.log("long hex:", Buffer.concat(parts, 6).toString("hex"));
