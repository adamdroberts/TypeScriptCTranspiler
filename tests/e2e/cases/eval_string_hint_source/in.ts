const input: any = { toString(): string { return "499;"; } };
console.log(eval(String(input)));
const parameter: any = { toString(): string { return "value"; } };
const body: any = { toString(): string { return "return value;"; } };
const make: any = Function;
const generated: any = make(parameter, body);
console.log(generated(503));
const throwing: any = { get toString(): any { throw "509;"; } };
try { console.log(String(throwing)); } catch (source: any) { console.log(eval(source)); }
