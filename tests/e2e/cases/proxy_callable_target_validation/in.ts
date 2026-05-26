const events: string[] = [];

function applyTrap(target: any, thisArg: any, args: any): any {
    events.push("apply trap");
    return "apply trap called";
}

function constructTrap(target: any, args: any, newTarget: any): any {
    events.push("construct trap");
    return { ok: true };
}

function args(label: string): any {
    events.push("args:" + label);
    return [];
}

const objectApply: any = new Proxy({ value: 1 }, { apply: applyTrap as any });
try {
    console.log("object apply:", Reflect.apply(objectApply, null, args("apply")));
} catch (e: any) {
    console.log("object apply:", e);
}

const objectConstruct: any = new Proxy({ value: 1 }, { construct: constructTrap as any });
try {
    console.log("object construct:", Reflect.construct(objectConstruct, args("construct")));
} catch (e: any) {
    console.log("object construct:", e);
}

console.log("events:", events.join("|"));
