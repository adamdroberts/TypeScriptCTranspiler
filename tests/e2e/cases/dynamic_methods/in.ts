const text: any = " Ada Lovelace ";

console.log("upper:", text.trim().toUpperCase());
console.log("lower:", text.toLowerCase().trim());
console.log("char:", text.charAt(5));
console.log("includes:", text.includes("Love"));
console.log("starts:", text.trim().startsWith("Ada"));
console.log("ends:", text.trim().endsWith("lace"));
console.log("index:", text.indexOf("Love"));
console.log("slice:", text.slice(5, 9));

const values: any = [1, "two", 3];
console.log("join:", values.join("|"));
console.log("has two:", values.includes("two"));
console.log("idx three:", values.indexOf(3));
console.log("push len:", values.push("four"));
console.log("pop:", values.pop());
console.log("after:", values.join(","));
console.log("slice arr:", values.slice(1).join("/"));
values.reverse();
console.log("reverse:", values.join("-"));
