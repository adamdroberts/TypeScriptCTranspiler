const b = Buffer.from("abc abc abc");

console.log("str:", b.indexOf("abc"), b.indexOf("abc", 1), b.indexOf("abc", -4), b.indexOf("zzz"));
console.log("last str:", b.lastIndexOf("abc"), b.lastIndexOf("abc", 5), b.lastIndexOf("abc", -5), b.lastIndexOf("zzz"));

console.log("buf:", b.indexOf(Buffer.from("bc")), b.lastIndexOf(Buffer.from("bc")));
console.log("includes:", b.includes(Buffer.from("c a")), b.includes(Buffer.from("zz")), b.includes("abc", 9));
