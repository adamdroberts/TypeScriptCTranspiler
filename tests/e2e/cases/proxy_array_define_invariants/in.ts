const events: string[] = [];

function mark(label: string): string {
    events.push("ignored:" + label);
    return label;
}

function trueDefine(target: any, prop: any, desc: any): boolean {
    events.push("define:" + String(prop));
    return true;
}

const closedTarget: any = ["a"];
Object.preventExtensions(closedTarget);
const closedProxy: any = new Proxy(closedTarget, { defineProperty: trueDefine as any });
try {
    console.log(
        "add closed:",
        Reflect.defineProperty(closedProxy, "1", {
            value: "b",
            writable: true,
            enumerable: true,
            configurable: true,
        }, mark("add closed")),
    );
} catch (err: any) {
    console.log("add closed:", err);
}

const openProxy: any = new Proxy(["a"], { defineProperty: trueDefine as any });
try {
    console.log(
        "new nonconfig:",
        Reflect.defineProperty(openProxy, "1", {
            value: "b",
            writable: true,
            enumerable: true,
            configurable: false,
        }, mark("new nonconfig")),
    );
} catch (err: any) {
    console.log("new nonconfig:", err);
}

const frozenTarget: any = ["x"];
Object.freeze(frozenTarget);
const frozenProxy: any = new Proxy(frozenTarget, { defineProperty: trueDefine as any });
try {
    console.log(
        "change frozen:",
        Reflect.defineProperty(frozenProxy, "0", {
            value: "y",
            writable: false,
            enumerable: true,
            configurable: false,
        }, mark("change frozen")),
    );
} catch (err: any) {
    console.log("change frozen:", err);
}

const sealedTarget: any = ["s"];
Object.seal(sealedTarget);
const sealedProxy: any = new Proxy(sealedTarget, { defineProperty: trueDefine as any });
console.log(
    "sealed compatible:",
    Reflect.defineProperty(sealedProxy, "0", {
        value: "s",
        writable: true,
        enumerable: true,
        configurable: false,
    }, mark("sealed compatible")),
);
console.log("events:", events.join("|"));
