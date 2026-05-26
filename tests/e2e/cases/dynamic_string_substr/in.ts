const s: any = "abcdef";

console.log("middle:", s.substr(-4, 2));
console.log("tail:", s.substr(3));
console.log("empty:", s.substr(1, -2));
console.log("null start:", s.substr(null, 2));
console.log("null length:[" + s.substr(2, null) + "]");
