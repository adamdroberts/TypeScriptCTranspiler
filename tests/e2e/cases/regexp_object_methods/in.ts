const re = /a.b/gimsu;
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

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
console.log("ignored:", re.test("A\nB", mark("t")), re.exec("A\nB", mark("e"))![0], re.toString(mark("s")), re.toLocaleString(mark("l")), re.valueOf(mark("v")) === re, seen);
