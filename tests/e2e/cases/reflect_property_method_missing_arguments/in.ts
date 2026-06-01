const reflect: any = Reflect;
const get: any = reflect.get;
const set: any = reflect.set;
const has: any = reflect.has;
const del: any = reflect.deleteProperty;
const desc: any = reflect.getOwnPropertyDescriptor;
const define: any = reflect.defineProperty;
const setProto: any = reflect.setPrototypeOf;

const obj: any = { undefined: "present" };

try {
    console.log("get no target:", get());
} catch (err: any) {
    console.log("get no target:", err);
}

console.log("get omitted key:", get(obj));
console.log("has omitted key:", has(obj));
console.log("desc omitted key:", desc(obj).value);
console.log("delete omitted key:", del(obj), has(obj));
console.log("set omitted key/value:", set(obj), Object.hasOwn(obj, "undefined"), obj.undefined);

try {
    console.log("define no target:", define());
} catch (err: any) {
    console.log("define no target:", err);
}

try {
    console.log("define missing descriptor:", define(obj, "x"));
} catch (err: any) {
    console.log("define missing descriptor:", err);
}

try {
    console.log("setProto no target:", setProto());
} catch (err: any) {
    console.log("setProto no target:", err);
}

try {
    console.log("setProto missing prototype:", setProto(obj));
} catch (err: any) {
    console.log("setProto missing prototype:", err);
}
