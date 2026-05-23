function falseIsExtensible(target: any): boolean {
    return false;
}

function trueIsExtensible(target: any): boolean {
    return true;
}

function truePreventExtensions(target: any): boolean {
    return true;
}

const openTarget: any = [1];
const openMismatch: any = new Proxy(openTarget, { isExtensible: falseIsExtensible as any });
try {
    console.log("open false:", Object.isExtensible(openMismatch));
} catch (err: any) {
    console.log("open false:", err);
}

const closedTarget: any = [2];
Object.preventExtensions(closedTarget);
const closedMismatch: any = new Proxy(closedTarget, { isExtensible: trueIsExtensible as any });
try {
    console.log("closed true:", Reflect.isExtensible(closedMismatch));
} catch (err: any) {
    console.log("closed true:", err);
}

const fakePreventTarget: any = [3];
const fakePrevent: any = new Proxy(fakePreventTarget, { preventExtensions: truePreventExtensions as any });
try {
    console.log("fake prevent:", Reflect.preventExtensions(fakePrevent));
} catch (err: any) {
    console.log("fake prevent:", err);
}
console.log("fake still extensible:", Object.isExtensible(fakePreventTarget));

const realPreventTarget: any = [4];
Object.preventExtensions(realPreventTarget);
const realPrevent: any = new Proxy(realPreventTarget, { preventExtensions: truePreventExtensions as any });
try {
    console.log("real prevent:", Reflect.preventExtensions(realPrevent));
} catch (err: any) {
    console.log("real prevent:", err);
}
