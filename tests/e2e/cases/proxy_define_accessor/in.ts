const events: string[] = [];
let current = 3;

function readScore(): number {
    return current;
}

function readOtherScore(): number {
    return current + 1;
}

function writeScore(value: number): void {
    current = value + 10;
}

function writeOtherScore(value: number): void {
    current = value + 20;
}

function forwardDefine(target: any, prop: any, desc: any): boolean {
    events.push("define:" + String(prop) + ":" + String(desc.enumerable) + ":" + String(desc.configurable));
    return Reflect.defineProperty(target, "score", {
        get: readScore,
        set: writeScore,
        enumerable: true,
        configurable: true,
    });
}

function trueDefine(target: any, prop: any, desc: any): boolean {
    return true;
}

function report(label: string, run: any): void {
    try {
        console.log(label + ":", String(run()));
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const target: any = {};
const proxy: any = new Proxy(target, { defineProperty: forwardDefine as any });
console.log("define accessor:", Reflect.defineProperty(proxy, "score", {
    get: readScore,
    set: writeScore,
    enumerable: true,
    configurable: true,
}));
console.log("target read:", target.score);
console.log("proxy set:", Reflect.set(proxy, "score", 4), current, target.score);
console.log("events:", events.join("|"));

const fallbackTarget: any = {};
const fallbackProxy: any = new Proxy(fallbackTarget, {});
console.log("fallback define:", Reflect.defineProperty(fallbackProxy, "score", {
    get: readScore,
    enumerable: true,
    configurable: true,
}), fallbackTarget.score);

const badTrapProxy: any = new Proxy({}, { defineProperty: 1 as any });
report("bad accessor trap", function(): any {
    return Reflect.defineProperty(badTrapProxy, "score", {
        get: readScore,
        configurable: true,
    });
});

const closedTarget: any = {};
Object.preventExtensions(closedTarget);
const closedProxy: any = new Proxy(closedTarget, { defineProperty: trueDefine as any });
report("closed accessor", function(): any {
    return Reflect.defineProperty(closedProxy, "score", {
        get: readScore,
        configurable: true,
    });
});

const fixedDataTarget: any = {};
Object.defineProperty(fixedDataTarget, "score", {
    value: 1,
    writable: false,
    enumerable: true,
    configurable: false,
});
const fixedDataProxy: any = new Proxy(fixedDataTarget, { defineProperty: trueDefine as any });
report("fixed data accessor", function(): any {
    return Reflect.defineProperty(fixedDataProxy, "score", {
        get: readScore,
    });
});

const fixedAccessorTarget: any = {};
Object.defineProperty(fixedAccessorTarget, "score", {
    get: readScore,
    set: writeScore,
    enumerable: true,
    configurable: false,
});
const fixedAccessorProxy: any = new Proxy(fixedAccessorTarget, { defineProperty: trueDefine as any });
report("fixed accessor getter", function(): any {
    return Reflect.defineProperty(fixedAccessorProxy, "score", {
        get: readOtherScore,
    });
});
report("fixed accessor setter", function(): any {
    return Reflect.defineProperty(fixedAccessorProxy, "score", {
        set: writeOtherScore,
    });
});
console.log("fixed accessor same:", Reflect.defineProperty(fixedAccessorProxy, "score", {
    get: readScore,
    set: writeScore,
    enumerable: true,
    configurable: false,
}));
