const s = "abcdef";

console.log("tail:", s.substr(2));
console.log("range:", s.substr(2, 3));
console.log("negative:", s.substr(-2));
console.log("wide:", s.substr(4, 100));
console.log("zero:", s.substr(1, 0));
