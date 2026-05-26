function install(target: any): any {
    let stored = 4;
    const read = () => stored;
    const write = (value: number) => {
        stored = value;
    };
    return Object.defineProperties(target, {
        a: {
            value: 1,
            writable: true,
            enumerable: true,
            configurable: true,
        },
        hidden: {
            value: "secret",
            writable: true,
            enumerable: false,
            configurable: true,
        },
        closed: {
            get: read,
            set: write,
            enumerable: true,
            configurable: true,
        },
    });
}

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const obj: any = {};
const returned: any = install(obj);
console.log("same:", returned === obj);
console.log("keys:", Object.keys(obj).join("|"));
console.log("values:", Object.values(obj).join("|"));
const hiddenDesc: any = Object.getOwnPropertyDescriptor(obj, "hidden");
const closedDesc: any = Reflect.getOwnPropertyDescriptor(obj, "closed");
console.log("hidden:", hiddenDesc.enumerable, hiddenDesc.writable, hiddenDesc.configurable);
console.log("closed desc:", closedDesc.enumerable, closedDesc.configurable);
console.log("closed:", obj.closed);
obj.closed = 9;
console.log("closed set:", obj.closed);
console.log("json:", JSON.stringify(obj));

const closedTarget: any = {};
Object.preventExtensions(closedTarget);
report("static failed", (): any => Object.defineProperties(closedTarget, {
    blocked: {
        value: 1,
        enumerable: true,
    },
}));
