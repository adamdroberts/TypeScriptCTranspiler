const source: any = ["a", "b", "c"];
delete source[0];

const sliced: any = source.slice();
const reversed: any = source.toReversed();

console.log("source:", Object.keys(source).join("|"), Object.hasOwn(source, "0"), String(source[0]));
console.log("slice:", Object.keys(sliced).join("|"), Object.hasOwn(sliced, "0"), Object.hasOwn(sliced, "1"), String(sliced[0]));
console.log("reversed:", Object.keys(reversed).join("|"), Object.hasOwn(reversed, "2"), String(reversed[2]));
