const events: string[] = [];

function report(label: string, run: any): void {
    try {
        console.log(label + ":", String(run()));
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

function note(label: string, value: any): any {
    events.push(label);
    return value;
}

function badGetTrapGetter(this: any): any {
    events.push("badGet:" + String(this.marker));
    return 1 as any;
}

function undefinedGetTrapGetter(this: any): any {
    events.push("undefinedGet:" + String(this.marker));
    return undefined;
}

function nullOwnKeysTrapGetter(this: any): any {
    events.push("nullOwnKeys:" + String(this.marker));
    return null as any;
}

const badGetHandler: any = { marker: "bad" };
Object.defineProperty(badGetHandler, "get", {
    get: badGetTrapGetter as any,
    enumerable: true,
    configurable: true,
});
const badGetProxy: any = new Proxy({ a: "A" }, badGetHandler);
report("bad get", function(): any {
    return Reflect.get(badGetProxy, note("badGetKey", "a"), note("badGetReceiver", {}));
});

const undefinedGetHandler: any = { marker: "undefined" };
Object.defineProperty(undefinedGetHandler, "get", {
    get: undefinedGetTrapGetter as any,
    enumerable: true,
    configurable: true,
});
const undefinedGetProxy: any = new Proxy({ a: "A" }, undefinedGetHandler);
console.log("undefined get:", Reflect.get(undefinedGetProxy, note("undefinedGetKey", "a"), note("undefinedGetReceiver", {})));

const nullOwnKeysTarget: any = { visible: "V" };
Object.defineProperty(nullOwnKeysTarget, "hidden", {
    value: "H",
    enumerable: false,
    configurable: true,
});
const nullOwnKeysHandler: any = { marker: "nullish" };
Object.defineProperty(nullOwnKeysHandler, "ownKeys", {
    get: nullOwnKeysTrapGetter as any,
    enumerable: true,
    configurable: true,
});
const nullOwnKeysProxy: any = new Proxy(nullOwnKeysTarget, nullOwnKeysHandler);
console.log("null ownKeys:", Object.keys(nullOwnKeysProxy).join(","));
console.log("events:", events.join("|"));
