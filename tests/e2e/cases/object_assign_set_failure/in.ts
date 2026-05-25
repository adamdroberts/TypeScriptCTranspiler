function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const locked: any = {};
Object.defineProperty(locked, "x", {
    value: 1,
    writable: false,
    enumerable: true,
    configurable: true,
});

report("locked", (): any => Object.assign(locked, { x: 2 }) === locked);
console.log("locked value:", locked.x);

const closed: any = {};
Object.preventExtensions(closed);

report("closed", (): any => Object.assign(closed, { x: 1 }) === closed);
console.log("closed has:", Object.hasOwn(closed, "x"));
