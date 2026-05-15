const original = Buffer.from("copy");
const cloned = Buffer.from(original);

original[0] = 67;

console.log("clone:", cloned.toString(), cloned.length);
console.log("original:", original.toString());
console.log("equals:", cloned.equals(Buffer.from("copy")), cloned.equals(original));
