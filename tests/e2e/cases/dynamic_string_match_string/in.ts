const text: any = "a1 b22 c333";
const pattern: any = "[a-z]\\d+";

const first: any = text.match("\\d+");
const none: any = text.match("z+");
const all: any = text.matchAll(pattern);

console.log("first:", first[0]);
console.log("none:", none);
console.log("all:", all[0][0], all[1][0], all[2][0], all.length);
