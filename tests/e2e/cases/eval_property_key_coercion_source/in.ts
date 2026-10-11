const key: any = { toString(): any { return {}; }, valueOf(): string { return "method"; } };
const object: any = { [key](): void {} };
console.log(eval("'" + object[key].name + "'"));
const receiver: any = { mark: "method", get toString(): any { return function(this: any): string { return this.mark; }; } };
console.log(eval("'" + object[receiver].name + "'"));
const throwing: any = { toString(): never { throw "443;"; } };
try { const value: any = object[throwing]; console.log(value); } catch (source: any) { console.log(eval(source)); }
