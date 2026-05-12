const s: any = "abcdef";

console.log("middle:", s.substr(-4, 2));
console.log("tail:", s.substr(3));
console.log("empty:", s.substr(1, -2));
