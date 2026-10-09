console.log("scope:", /(?i:a)b/.test("Ab"), /(?i:a)b/.test("AB"));
console.log("nested:", /(?i:a(?-i:B)c)d/.test("ABCd"), /(?i:a(?-i:B)c)d/.test("AbCd"));
console.log("remove:", /(?-i:a)b/i.test("aB"), /(?-i:a)b/i.test("AB"));
console.log("add-empty:", new RegExp("(?i-:a)b").test("Ab"));
console.log("backtrack:", /(?i:(a|ab))c/.exec("ABc")!.join("|"));
console.log("reference:", /(?i:(a))\1/.test("Aa"), /(?i:(a))(?i:\1)/.test("Aa"));
console.log("assert:", /(?i:(?<=a)b)c/.test("ABc"), /(?i:(?<=a)b)c/.test("ABC"));
console.log("line:", /(?m:^a$)/.test("\na\nb"), /(?-m:^a$)/m.test("\na\nb"));
console.log("dot:", /(?s:.)/.test("\n"), /(?-s:.)/s.test("\n"));
console.log("sets:", new RegExp("(?i:[[^a]&&\\w])(?-i:[[a-z]&&\\w])", "v").test("Ba"),
    new RegExp("(?i:[[^a]&&\\w])(?-i:[[a-z]&&\\w])", "v").test("BA"));
console.log("strings:", new RegExp("(?i:[\\q{ab|a}])b", "v").exec("ABb")!.join("|"));
console.log("properties:", /(?i:a)/.ignoreCase, /(?-ims:a)/ims.flags);
console.log("replace:", "Ab AB ab".replace(/(?i:(a))b/g, "[$1]"));
console.log("split:", "Ab AB ab".split(/(?i:(a))b/g).join("|"));
let errors = "";
for (const header of ["-", "ii", "i-i", "-ii", "g", "i--m", "I"]) {
    try { new RegExp("(?" + header + ":a)"); }
    catch (error) { errors += error instanceof SyntaxError ? "S" : "?"; }
}
console.log("errors:", errors);
