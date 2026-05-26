const events: string[] = [];

function mark(label: string): string {
    events.push("ignored:" + label);
    return label;
}

function falseIsExtensible(target: any): boolean {
    events.push("is false:" + target.length);
    return false;
}

function trueIsExtensible(target: any): boolean {
    events.push("is true:" + target.length);
    return true;
}

function truePreventExtensions(target: any): boolean {
    events.push("prevent true:" + target.length);
    return true;
}

const openTarget: any = [1];
const openMismatch: any = new Proxy(openTarget, { isExtensible: falseIsExtensible as any });
try {
    console.log("open false:", Object.isExtensible(openMismatch, mark("open false")));
} catch (err: any) {
    console.log("open false:", err);
}

const closedTarget: any = [2];
Object.preventExtensions(closedTarget);
const closedMismatch: any = new Proxy(closedTarget, { isExtensible: trueIsExtensible as any });
try {
    console.log("closed true:", Reflect.isExtensible(closedMismatch, mark("closed true")));
} catch (err: any) {
    console.log("closed true:", err);
}

const fakePreventTarget: any = [3];
const fakePrevent: any = new Proxy(fakePreventTarget, { preventExtensions: truePreventExtensions as any });
try {
    console.log("fake prevent:", Reflect.preventExtensions(fakePrevent, mark("fake prevent")));
} catch (err: any) {
    console.log("fake prevent:", err);
}
console.log("fake still extensible:", Object.isExtensible(fakePreventTarget));

const realPreventTarget: any = [4];
Object.preventExtensions(realPreventTarget);
const realPrevent: any = new Proxy(realPreventTarget, { preventExtensions: truePreventExtensions as any });
try {
    console.log("real prevent:", Reflect.preventExtensions(realPrevent, mark("real prevent")));
} catch (err: any) {
    console.log("real prevent:", err);
}

console.log("events:", events.join("|"));
