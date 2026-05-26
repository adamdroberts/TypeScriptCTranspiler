const s: any = "typescript";

console.log("tail:", s.substring(4));
console.log("swap:", s.substring(6, 4));
console.log("nan:", s.substring("x", 2));
console.log("null end:", s.substring(4, null));
