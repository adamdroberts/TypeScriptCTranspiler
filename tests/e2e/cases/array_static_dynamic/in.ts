const parsed: any = JSON.parse("[1,\"two\",3]");
const obj: any = { length: 2 };

console.log("parsed array:", Array.isArray(parsed));
console.log("object array:", Array.isArray(obj));

const copy: any = Array.from(parsed);
copy.push("four");

console.log("copy:", copy.join("|"));
console.log("original:", parsed.join("|"));
