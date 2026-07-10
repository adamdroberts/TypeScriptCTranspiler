const proto: any = Array.prototype;
const join: any = proto.join;

console.log("is array:", Array.isArray(proto), proto.length);
console.log("object proto:", Object.getPrototypeOf(proto) === Object.prototype);
console.log("own keys:", Object.keys(proto).length, Object.values(proto).length, Object.entries(proto).length);
console.log("reflect:", Reflect.ownKeys(proto).includes("length"), Reflect.getOwnPropertyDescriptor(proto, "length") !== undefined);
const lengthDescriptor: any = Reflect.getOwnPropertyDescriptor(proto, "length");
console.log("length descriptor:", lengthDescriptor.value, lengthDescriptor.writable, lengthDescriptor.enumerable, lengthDescriptor.configurable, Reflect.set(proto, "length", 1), proto.length);
const map: any = proto.map;
const mapDescriptor: any = Reflect.getOwnPropertyDescriptor(proto, "map");
console.log("method metadata:", map.name, map.length, Reflect.has(map, "prototype"), mapDescriptor.writable, mapDescriptor.enumerable, mapDescriptor.configurable);
console.log("method:", Reflect.apply(join, ["a", "b"], ["-"]));
