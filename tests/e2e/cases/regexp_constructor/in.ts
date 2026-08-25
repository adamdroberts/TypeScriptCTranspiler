const letters = new RegExp("a+", "gi");
const word = RegExp("b(.)");
const flags = "m" + "s";
const spaced = new RegExp("^x.y$", flags);
const emptyCall = RegExp();
const emptyNew = new RegExp();
const source = new RegExp("c+", "gi");
const same = RegExp(source);
const clone = new RegExp(source);
const override = new RegExp(source, "m");
const dynamicSource: any = source;
const dynamicSame = RegExp(dynamicSource);
let order = "";
const explicitUndefined = new RegExp(
    void (order += "p"),
    void (order += "f"),
    order += "x",
);

console.log("letters:", letters.test("AA"), letters.source, letters.flags, letters.global, letters.ignoreCase);

const match = word.exec("bar");
console.log("word:", match ? match.join("|") : "none");

console.log("spaced:", spaced.test("x\ny"), spaced.flags, spaced.multiline, spaced.dotAll);
console.log("empty:", emptyCall.test(""), emptyNew.test(""), emptyCall.flags === "", emptyNew.flags === "");
console.log("regexp input:", same === source, clone === source, clone.source, clone.flags, override.source, override.flags, dynamicSame === source);
console.log("undefined/order:", explicitUndefined.test(""), order);
