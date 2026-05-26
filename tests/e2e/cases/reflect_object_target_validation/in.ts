const badTarget: any = 1;
const validTarget: any = { value: 1 };
let trace = "";

function proto(label: string, value: any): any {
    trace += label;
    return value;
}

try {
    console.log("get proto target:", Reflect.getPrototypeOf(badTarget));
} catch (e: any) {
    console.log("get proto target:", e);
}

try {
    console.log("set proto target:", Reflect.setPrototypeOf(badTarget, proto("t", null)));
} catch (e: any) {
    console.log("set proto target:", e);
}

try {
    console.log("set proto value:", Reflect.setPrototypeOf(validTarget, proto("p", 1)));
} catch (e: any) {
    console.log("set proto value:", e);
}

try {
    console.log("is extensible target:", Reflect.isExtensible(badTarget));
} catch (e: any) {
    console.log("is extensible target:", e);
}

try {
    console.log("prevent target:", Reflect.preventExtensions(badTarget));
} catch (e: any) {
    console.log("prevent target:", e);
}
console.log("trace:", trace);

console.log("valid before:", Reflect.isExtensible(validTarget));
console.log("valid prevent:", Reflect.preventExtensions(validTarget));
console.log("valid after:", Reflect.isExtensible(validTarget));
