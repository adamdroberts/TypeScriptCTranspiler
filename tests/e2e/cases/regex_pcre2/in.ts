const sample = "café#42 α#7 nope";
const global = sample.match(/(?<letters>\p{L}+)(?=#\d)/gu);
if (global !== null) {
    console.log("unicode lookahead:", global.join("|"));
}

const behind = "ID-123 OK-45".match(/(?<=ID-)\d+/);
if (behind !== null) {
    console.log("lookbehind:", behind[0]);
}

const named = "user:alice".match(/(?<key>\w+):(?<value>\w+)/);
if (named !== null) {
    console.log("named:", named.length, named[1], named[2]);
}

console.log("replace:", "a1 b2".replace(/(?<=\p{L})\d/gu, "#"));
console.log("dotall:", /a.b/s.test("a\nb"));
console.log("script:", /\p{Script=Greek}+/u.test("αβ"), /\p{Script=Greek}+/u.test("ab"));
