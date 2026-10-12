const key: any = { valueOf() { return 7; } };
console.log(eval(String(key * 3)));
console.log(eval(String(5n / 2n)));
console.log(eval("'" + String(1 / -0) + "'"));
console.log(eval("'" + String(("12" as any) < "9") + "'"));
console.log(eval("'" + String(7n === (7 as any)) + "'"));
const hook: any = { [Symbol.toPrimitive](hint: string) { return hint === "number" ? 3 : 11; } };
console.log(eval(String(key * hook)));
const throwing: any = { valueOf() { throw "1063;"; } };
try { key * throwing; } catch (source) { console.log(eval(source)); }
console.log(eval(String((3 ** 5) % 17)));
