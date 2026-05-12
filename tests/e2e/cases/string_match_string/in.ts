const text = "a1 b22 c333";

const first = text.match("\\d+");
const none = text.match("z+");
const all = text.matchAll("[a-z]\\d+");

console.log("first:", first ? first[0] : "none");
console.log("none:", none === null);
console.log("all:", all[0][0], all[1][0], all[2][0], all.length);
