const make = Function("left = 7", "...tail", "let total = left; for (const value of tail) total += value; return function(extra) { return total + extra; };");
const retained: any = make(undefined, 11, 13);
console.log("retained:", retained(17));
const ordinary: any = Function("return this;");
const strict: any = Function('"use strict"; return this;');
const receiver = { field: 19 };
console.log("this:", ordinary.call(receiver) === receiver, strict.call(null) === null);
const first: any = Function("value", "return value;"), second: any = Function("value", "return value;");
first.marker = 23;
console.log("fresh:", first !== second, first.prototype !== second.prototype, second.marker === undefined);
console.log("metadata:", first.name, first.length, make.length);
const Constructor: any = new Function("value", "this.value = value;");
const instance = new Constructor(29);
console.log("construct:", instance.value, Object.getPrototypeOf(instance) === Constructor.prototype);
const nested: any = Function('return Function("value", "return value * 2;");');
console.log("transitive:", nested()(31));
try { Function("/*", "*/ ) {"); } catch (error) { console.log("syntax:", error instanceof SyntaxError); }
