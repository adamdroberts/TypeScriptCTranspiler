const original = /a/dg;
original.lastIndex = 4;
const clone = new RegExp(original);
console.log("clone:", clone !== original, clone.lastIndex, original.lastIndex, clone.flags);
console.log("call:", RegExp(original) === original);
console.log("prototype:", Object.getPrototypeOf(clone) === RegExp.prototype, RegExp.prototype.constructor === RegExp);
console.log("metadata:", RegExp.name, RegExp.length);
const alias = RegExp;
console.log("alias:", new alias("a", "i").test("A"));
const prototype = { marker: "custom" };
function Target() {}
Target.prototype = prototype;
const reflected: any = Reflect.construct(RegExp, ["b", "g"], Target);
console.log("reflect:", Object.getPrototypeOf(reflected) === prototype, RegExp.prototype.test.call(reflected, "b"), reflected.lastIndex);
console.log("species:", RegExp[Symbol.species] === RegExp);
const saved = RegExp.escape;
function argument(): string { RegExp.escape = () => "changed"; return "abc"; }
console.log("lookup:", RegExp.escape(argument()));
RegExp.escape = saved;
console.log("escape:", RegExp.escape("a-b"));
