const a: any = 3;
const b: any = "4";

console.log("add num:", a + 4);
console.log("concat:", "id-" + b);
console.log("numeric string:", b - 1);
console.log("mul:", a * 5);
console.log("div:", 9 / a);
console.log("mod:", b % a);
console.log("pow:", a ** 2);

let acc: any = 10;
acc += "x";
console.log("plus eq:", acc);

let count: any = "6";
count -= 2;
console.log("minus eq:", count);

console.log("eq1:", a === 3);
console.log("eq2:", a !== 4);
console.log("eq3:", b == "4");
console.log("rel1:", a < 4);
console.log("rel2:", b >= "4");
console.log("rel3:", b > 3);

const missing: any = (JSON.parse("{\"x\":1}") as any)["nope"];
console.log("nullish:", missing ?? "fallback");
console.log("or:", missing || "or");
console.log("and:", a && "ok");
