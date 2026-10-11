const key: any = { number: "1021", default: "1031;", string: "1033;", [Symbol.toPrimitive](hint: string): any { return this[hint]; } };
console.log(eval(String(Number(key))));
console.log(eval(String(+key)));
console.log(eval(String(BigInt(key))));
console.log(eval(key + ""));
console.log(eval(String(key)));
const fallback: any = { valueOf(): object { return {}; }, toString(): string { return "1039"; } };
console.log(eval(String(Number(fallback))));
const throwing: any = { valueOf(): never { throw "1049;"; }, toString(): never { throw "unexpected method"; } };
try { console.log(eval(String(Number(throwing)))); } catch (source: any) { console.log(eval(source)); }
console.log(eval(String(Number())));
