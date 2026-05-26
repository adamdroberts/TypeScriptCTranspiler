const events: string[] = [];

function report(label: string, run: any): void {
    try {
        console.log(label + ":", String(run()));
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

function add(this: any, value: any): any {
    return this.base + ":" + value;
}

function Target(this: any, value: any): any {
    this.value = value;
}

const badApplyHandler: any = { marker: "bad-apply" };
Object.defineProperty(badApplyHandler, "apply", {
    get: function(this: any): any {
        events.push("badApply:" + this.marker);
        return 1 as any;
    },
    enumerable: true,
    configurable: true,
});
const badApply: any = new Proxy(add as any, badApplyHandler);
report("bad apply", function(): any {
    return Reflect.apply(badApply, { base: "ctx" }, ["x"]);
});

const undefinedApplyHandler: any = { marker: "undefined-apply" };
Object.defineProperty(undefinedApplyHandler, "apply", {
    get: function(this: any): any {
        events.push("undefinedApply:" + this.marker);
        return undefined;
    },
    enumerable: true,
    configurable: true,
});
const undefinedApply: any = new Proxy(add as any, undefinedApplyHandler);
console.log("undefined apply:", Reflect.apply(undefinedApply, { base: "ctx" }, ["x"]));

const badConstructHandler: any = { marker: "bad-construct" };
Object.defineProperty(badConstructHandler, "construct", {
    get: function(this: any): any {
        events.push("badConstruct:" + this.marker);
        return 1 as any;
    },
    enumerable: true,
    configurable: true,
});
const badConstruct: any = new Proxy(Target as any, badConstructHandler);
report("bad construct", function(): any {
    return Reflect.construct(badConstruct, ["x"]);
});

const nullConstructHandler: any = { marker: "null-construct" };
Object.defineProperty(nullConstructHandler, "construct", {
    get: function(this: any): any {
        events.push("nullConstruct:" + this.marker);
        return null as any;
    },
    enumerable: true,
    configurable: true,
});
const nullConstruct: any = new Proxy(Target as any, nullConstructHandler);
const made: any = Reflect.construct(nullConstruct, ["y"]);
console.log("null construct:", made.value);
console.log("events:", events.join("|"));
