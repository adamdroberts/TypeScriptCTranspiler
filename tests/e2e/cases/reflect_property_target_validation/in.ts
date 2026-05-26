const badTarget: any = 1;
const validTarget: any = { value: 1 };
let trace = "";

function mark(label: string): string {
    trace += label;
    return label;
}

function markValue(label: string): any {
    trace += label;
    return label;
}

function markDesc(label: string): any {
    trace += label;
    return { value: label, enumerable: true };
}

try {
    console.log("get target:", Reflect.get(badTarget, mark("g")));
} catch (e: any) {
    console.log("get target:", e);
}

try {
    console.log("set target:", Reflect.set(badTarget, mark("s"), markValue("v")));
} catch (e: any) {
    console.log("set target:", e);
}

try {
    console.log("has target:", Reflect.has(badTarget, mark("h")));
} catch (e: any) {
    console.log("has target:", e);
}

try {
    console.log("delete target:", Reflect.deleteProperty(badTarget, mark("d")));
} catch (e: any) {
    console.log("delete target:", e);
}

try {
    console.log("ownKeys target:", Reflect.ownKeys(badTarget).join(","));
} catch (e: any) {
    console.log("ownKeys target:", e);
}

try {
    console.log("gopd target:", Reflect.getOwnPropertyDescriptor(badTarget, mark("p")));
} catch (e: any) {
    console.log("gopd target:", e);
}

try {
    console.log("define target:", Reflect.defineProperty(badTarget, mark("f"), markDesc("D")));
} catch (e: any) {
    console.log("define target:", e);
}
console.log("trace:", trace);

console.log("valid get:", Reflect.get(validTarget, "value"));
console.log("valid set:", Reflect.set(validTarget, "value", 2), validTarget.value);
console.log("valid has:", Reflect.has(validTarget, "value"));
console.log("valid delete:", Reflect.deleteProperty(validTarget, "value"), Reflect.has(validTarget, "value"));
console.log("valid define:", Reflect.defineProperty(validTarget, "next", { value: 3, enumerable: true }), validTarget.next);
console.log("valid keys:", Reflect.ownKeys(validTarget).join(","));
const desc: any = Reflect.getOwnPropertyDescriptor(validTarget, "next");
console.log("valid desc:", desc.value, desc.enumerable);
