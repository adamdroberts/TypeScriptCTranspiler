function add(left: any, right: any): any {
    return left + right;
}

function Target(this: any, value: any): any {
    this.value = value;
}

const dynamicTarget: any = Target as any;
const obj: any = { undefined: "present" };

try {
    // @ts-ignore
    console.log("apply no args:", Reflect.apply());
} catch (err: any) {
    console.log("apply no args:", err);
}

try {
    // @ts-ignore
    console.log("apply missing list:", Reflect.apply(add));
} catch (err: any) {
    console.log("apply missing list:", err);
}

try {
    // @ts-ignore
    console.log("construct no args:", Reflect.construct());
} catch (err: any) {
    console.log("construct no args:", err);
}

try {
    // @ts-ignore
    console.log("construct missing list:", Reflect.construct(dynamicTarget));
} catch (err: any) {
    console.log("construct missing list:", err);
}

try {
    // @ts-ignore
    console.log("get no target:", Reflect.get());
} catch (err: any) {
    console.log("get no target:", err);
}

// @ts-ignore
console.log("get omitted key:", Reflect.get(obj));
// @ts-ignore
console.log("has omitted key:", Reflect.has(obj));
// @ts-ignore
console.log("desc omitted key:", Reflect.getOwnPropertyDescriptor(obj).value);
// @ts-ignore
console.log("delete omitted key:", Reflect.deleteProperty(obj), Reflect.has(obj));
// @ts-ignore
console.log("set omitted key/value:", Reflect.set(obj), Object.hasOwn(obj, "undefined"), obj.undefined);

try {
    // @ts-ignore
    console.log("define missing descriptor:", Reflect.defineProperty(obj, "x"));
} catch (err: any) {
    console.log("define missing descriptor:", err);
}

try {
    // @ts-ignore
    console.log("getPrototypeOf:", Reflect.getPrototypeOf());
} catch (err: any) {
    console.log("getPrototypeOf:", err);
}

try {
    // @ts-ignore
    console.log("isExtensible:", Reflect.isExtensible());
} catch (err: any) {
    console.log("isExtensible:", err);
}

try {
    // @ts-ignore
    console.log("ownKeys:", Reflect.ownKeys());
} catch (err: any) {
    console.log("ownKeys:", err);
}

try {
    // @ts-ignore
    console.log("preventExtensions:", Reflect.preventExtensions());
} catch (err: any) {
    console.log("preventExtensions:", err);
}

try {
    // @ts-ignore
    console.log("setProto missing prototype:", Reflect.setPrototypeOf(obj));
} catch (err: any) {
    console.log("setProto missing prototype:", err);
}
