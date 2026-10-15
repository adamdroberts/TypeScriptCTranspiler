function wrap(value: any): any { return Object(value); }
const first: any = wrap("ab"), second: any = wrap("xy");
const descriptor: any = Object.getOwnPropertyDescriptor(first, "0");
console.log("string:", first[0], second[0], first.length, second.length, first !== second);
console.log("index:", descriptor.value, descriptor.writable, descriptor.enumerable, descriptor.configurable, Reflect.set(first, "0", "z"));
first.extra = "first"; second.extra = "second";
console.log("fields:", first.extra, second.extra, first.valueOf(), second.valueOf());
const object: any = {};
console.log("identity:", wrap(object) === object, wrap(7).valueOf() === 7);
const sourceOwner = {body: "41;"};
let counter = 0; counter++;
const boxedCounter = Object(counter);
console.log("boxing-source:", eval(sourceOwner.body), typeof boxedCounter);
function receiver(this: any) { return this; }
const receiverOwner = {body: "43;"};
receiver.call(counter);
console.log("receiver-source:", eval(receiverOwner.body));
