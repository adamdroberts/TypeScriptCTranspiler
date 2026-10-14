const text: any = "a1 b22 c333";
const pattern: any = "[a-z]\\d+";

const first: any = text.match("\\d+");
const none: any = text.match("z+");
const iterator: any = text.matchAll(pattern);
const all: any = Array.from(iterator);

console.log("first:", first[0]);
console.log("none:", none);
console.log("all:", all[0][0], all[1][0], all[2][0], all.length);
console.log("iterator:", iterator[Symbol.iterator]() === iterator, iterator.next().done);
