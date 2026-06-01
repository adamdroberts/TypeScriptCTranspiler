const proto: any = Array.prototype;
const join: any = proto.join;
const objectProto: any = Object.getPrototypeOf({});

console.log("is array:", Array.isArray(proto), proto.length);
console.log("object proto:", Object.getPrototypeOf(proto) === objectProto);
console.log("own keys:", Object.keys(proto).length, Object.values(proto).length, Object.entries(proto).length);
console.log("reflect:", Reflect.ownKeys(proto).includes("length"), Reflect.getOwnPropertyDescriptor(proto, "length") !== undefined);
console.log("method:", Reflect.apply(join, ["a", "b"], ["-"]));
