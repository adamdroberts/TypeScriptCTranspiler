const buffer = Buffer.from([1, 2]);
const receiver: any = {};
const value = { marker: 7 };
console.log("valid:", Reflect.set(buffer, "0", value, receiver), receiver[0] === value, buffer[0]);
console.log("invalid:", Reflect.set(buffer, "2", value, receiver), Object.hasOwn(receiver, "2"));
console.log("negative zero:", Reflect.set(buffer, "-0", value, receiver), Object.hasOwn(receiver, "-0"));
let calls = 0;
Reflect.set(buffer, "0", { valueOf(): number { calls++; return 258; } });
console.log("converted:", buffer[0], calls);
