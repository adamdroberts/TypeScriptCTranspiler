function mark(label: string): string {
    console.log("ignored:", label);
    return label;
}

const pattern = RegExp.escape("a+b*c?");
console.log("syntax:", pattern);

const exact = new RegExp("^" + pattern + "$");
console.log("match:", exact.test("a+b*c?"), exact.test("aaabbbc"));

console.log("chars:", RegExp.escape("file[1].ts/path"));
console.log("space-hyphen:", RegExp.escape("a-b c"));
console.log("punct:", RegExp.escape("x,y#z"));
console.log("line:", RegExp.escape("line\nnext"));
console.log("extra:", RegExp.escape("extra?", mark("escape-extra")));
