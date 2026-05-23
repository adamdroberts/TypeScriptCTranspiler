const badTarget: any = 1;
const validTarget: any = { value: 1 };

try {
    console.log("get target:", Reflect.get(badTarget, "value"));
} catch (e: any) {
    console.log("get target:", e);
}

try {
    console.log("set target:", Reflect.set(badTarget, "value", 2));
} catch (e: any) {
    console.log("set target:", e);
}

try {
    console.log("has target:", Reflect.has(badTarget, "value"));
} catch (e: any) {
    console.log("has target:", e);
}

try {
    console.log("delete target:", Reflect.deleteProperty(badTarget, "value"));
} catch (e: any) {
    console.log("delete target:", e);
}

try {
    console.log("ownKeys target:", Reflect.ownKeys(badTarget).join(","));
} catch (e: any) {
    console.log("ownKeys target:", e);
}

try {
    console.log("gopd target:", Reflect.getOwnPropertyDescriptor(badTarget, "value"));
} catch (e: any) {
    console.log("gopd target:", e);
}

try {
    console.log("define target:", Reflect.defineProperty(badTarget, "value", { value: 2 }));
} catch (e: any) {
    console.log("define target:", e);
}

console.log("valid get:", Reflect.get(validTarget, "value"));
console.log("valid set:", Reflect.set(validTarget, "value", 2), validTarget.value);
console.log("valid has:", Reflect.has(validTarget, "value"));
console.log("valid delete:", Reflect.deleteProperty(validTarget, "value"), Reflect.has(validTarget, "value"));
console.log("valid define:", Reflect.defineProperty(validTarget, "next", { value: 3, enumerable: true }), validTarget.next);
console.log("valid keys:", Reflect.ownKeys(validTarget).join(","));
const desc: any = Reflect.getOwnPropertyDescriptor(validTarget, "next");
console.log("valid desc:", desc.value, desc.enumerable);
