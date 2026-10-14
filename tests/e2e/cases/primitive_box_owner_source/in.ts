function wrap(value: any): any { return Object(value); }
const first: any = wrap("ab"), second: any = wrap("xy");
const descriptor: any = Object.getOwnPropertyDescriptor(first, "0");
console.log("string:", first[0], second[0], first.length, second.length, first !== second);
console.log("index:", descriptor.value, descriptor.writable, descriptor.enumerable, descriptor.configurable, Reflect.set(first, "0", "z"));
first.extra = "first"; second.extra = "second";
console.log("fields:", first.extra, second.extra, first.valueOf(), second.valueOf());
const object: any = {};
console.log("identity:", wrap(object) === object, wrap(7).valueOf() === 7);
