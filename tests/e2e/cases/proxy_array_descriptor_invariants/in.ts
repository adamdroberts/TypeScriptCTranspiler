function hideDescriptor(target: any, prop: any): any {
    return Reflect.getOwnPropertyDescriptor(target, "__missing__");
}

function dataDescriptor(target: any, prop: any): any {
    return { value: "new", writable: true, enumerable: true, configurable: true };
}

function configurableLength(target: any, prop: any): any {
    return { value: target.length, writable: true, enumerable: false, configurable: true };
}

function writableFrozenLength(target: any, prop: any): any {
    return { value: target.length, writable: true, enumerable: false, configurable: false };
}

function realDescriptor(target: any, prop: any): any {
    return Reflect.getOwnPropertyDescriptor(target, prop);
}

const hideLengthProxy: any = new Proxy(["x"], { getOwnPropertyDescriptor: hideDescriptor as any });
try {
    console.log("hide length:", Reflect.getOwnPropertyDescriptor(hideLengthProxy, "length")?.value);
} catch (err: any) {
    console.log("hide length:", err);
}

const sealedTarget: any = ["s"];
Object.seal(sealedTarget);
const hideSealedProxy: any = new Proxy(sealedTarget, { getOwnPropertyDescriptor: hideDescriptor as any });
try {
    console.log("hide sealed:", Object.getOwnPropertyDescriptor(hideSealedProxy, "0")?.value);
} catch (err: any) {
    console.log("hide sealed:", err);
}

const closedTarget: any = ["c"];
Object.preventExtensions(closedTarget);
const newClosedProxy: any = new Proxy(closedTarget, { getOwnPropertyDescriptor: dataDescriptor as any });
try {
    console.log("new closed:", Reflect.getOwnPropertyDescriptor(newClosedProxy, "2")?.value);
} catch (err: any) {
    console.log("new closed:", err);
}

const lengthConfigProxy: any = new Proxy(["l"], { getOwnPropertyDescriptor: configurableLength as any });
try {
    console.log("length configurable:", Object.getOwnPropertyDescriptor(lengthConfigProxy, "length")?.configurable);
} catch (err: any) {
    console.log("length configurable:", err);
}

const frozenTarget: any = ["f"];
Object.freeze(frozenTarget);
const frozenLengthProxy: any = new Proxy(frozenTarget, { getOwnPropertyDescriptor: writableFrozenLength as any });
try {
    console.log("frozen length writable:", Reflect.getOwnPropertyDescriptor(frozenLengthProxy, "length")?.writable);
} catch (err: any) {
    console.log("frozen length writable:", err);
}

const realProxy: any = new Proxy(frozenTarget, { getOwnPropertyDescriptor: realDescriptor as any });
const real = Reflect.getOwnPropertyDescriptor(realProxy, "0");
console.log("real frozen:", real.value, real.writable, real.configurable);
