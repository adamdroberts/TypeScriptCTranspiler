const letters = new RegExp("a+", "gi");
const word = RegExp("b(.)");
const flags = "m" + "s";
const spaced = new RegExp("^x.y$", flags);

console.log("letters:", letters.test("AA"), letters.source, letters.flags, letters.global, letters.ignoreCase);

const match = word.exec("bar");
console.log("word:", match ? match.join("|") : "none");

console.log("spaced:", spaced.test("x\ny"), spaced.flags, spaced.multiline, spaced.dotAll);
