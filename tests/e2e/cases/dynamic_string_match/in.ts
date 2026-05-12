const text: any = "a1 b22 c333";

const first: any = text.match(/([a-z])(\d+)/);
const globalMatches: any = text.match(/[a-z]\d+/g);
const none: any = text.match(/z+/);
const all: any = text.matchAll(/([a-z])(\d+)/g);

console.log("first:", first[0], first[1], first[2]);
console.log("global:", globalMatches.join("|"));
console.log("none:", none);
console.log("all len:", all.length);
console.log("all second:", all[1][0], all[1][1], all[1][2]);
