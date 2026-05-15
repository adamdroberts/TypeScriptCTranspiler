const text = Buffer.alloc(6);
console.log("text bytes:", text.write("abcdef", 1, 3), text.toString("hex"));

const hex = Buffer.alloc(4);
console.log("hex bytes:", hex.write("4869", 0, 4, "hex"), hex.toString("hex"));

const clipped = Buffer.alloc(3);
console.log("clipped:", clipped.write("hello", 2), clipped.toString("hex"));
