const key = Symbol.for("source-key");
const object: any = { [key]: "827;" };
const { [key]: source } = object;
console.log(eval(source));
const conversion: any = { [Symbol.toPrimitive](hint: string): string { if (hint !== "string") throw "wrong hint"; return "829;"; } };
console.log(eval(String(conversion)));
const throwing: any = { get [Symbol.toPrimitive](): never { throw "839;"; }, toString(): never { throw "unexpected fallback"; } };
try { console.log(eval(String(throwing))); } catch (caught: any) { console.log(eval(caught)); }
function make(): symbol { return Symbol("same"); }
const first = make(), second = make();
const keyed: any = { [first]: "847;" };
console.log(eval(String(keyed[second])));
const named: any = { [key](): void {} };
console.log(eval("'" + named[key].name + "'"));
class C { static [Symbol.iterator](): string { return "853;"; } }
console.log(eval(C[Symbol.iterator]()));
console.log(String(Symbol.iterator));
