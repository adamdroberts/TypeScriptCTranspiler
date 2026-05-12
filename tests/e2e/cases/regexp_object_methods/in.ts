const re = /a.b/gimsu;

console.log("source:", re.source);
console.log("flags:", re.flags);
console.log("props:", re.global, re.ignoreCase, re.multiline, re.dotAll, re.unicode);
console.log("toString:", re.toString());
console.log("locale:", re.toLocaleString());
console.log("concat:", "re=" + re);
console.log("value test:", re.valueOf().test("A\nB"));

const plain = /cat/;
console.log("plain props:", plain.global, plain.ignoreCase, plain.multiline, plain.dotAll, plain.unicode);
console.log("plain string:", plain.toString());
